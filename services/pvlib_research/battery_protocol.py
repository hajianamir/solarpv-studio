"""Pinned electrochemical cell current steps; not cell qualification or runaway."""
import hashlib
import importlib
from importlib.metadata import version
import inspect
import math
import os
import numpy as np
from .science_d import header
from .portfolio import numeric_fields,integer,result
from .electrical import keys
from .reference_models import evidence

VARIABLES={'voltageV':'Voltage [V]','temperatureK':'Volume-averaged cell temperature [K]','capacityAh':'Discharge capacity [A.h]','totalHeatingWm3':'Volume-averaged total heating [W.m-3]','irreversibleHeatingWm3':'Volume-averaged irreversible electrochemical heating [W.m-3]','reversibleHeatingWm3':'Volume-averaged reversible heating [W.m-3]','ohmicHeatingWm3':'Volume-averaged Ohmic heating [W.m-3]','seiLossAh':'Loss of capacity to negative SEI [A.h]','currentA':'Current [A]'}


def battery_protocol(p):
    header(p,'battery-protocol-v1',('model','parameterSet','sei','initialSoc','temperatureK','samplesPerStep','meshPoints','relativeTolerance','maxTimeStepS','voltageToleranceV','temperatureToleranceK','capacityToleranceAh','steps'))
    if p['model'] not in ('SPM','SPMe','DFN') or p['parameterSet'] not in ('Chen2020','OKane2022') or type(p['sei']) is not bool or p['sei'] and p['parameterSet']!='OKane2022':raise ValueError('Published cell model/parameter/SEI contract')
    numeric_fields(p,dict(initialSoc=(.1,.9),temperatureK=(283.15,313.15),relativeTolerance=(1e-8,1e-4),maxTimeStepS=(1,60),voltageToleranceV=(1e-6,.1),temperatureToleranceK=(1e-5,2),capacityToleranceAh=(1e-8,.01)))
    integer(p['samplesPerStep'],3,21);integer(p['meshPoints'],4,12)
    if not isinstance(p['steps'],list) or not 1<=len(p['steps'])<=12:raise ValueError('Protocol step budget')
    for s in p['steps']:keys(s,('currentA','durationS'));numeric_fields(s,dict(currentA=(-10,10),durationS=(1,600)))
    if math.fsum(s['durationS'] for s in p['steps'])>1800:raise ValueError('Protocol horizon budget')
    os.environ['PYBAMM_DISABLE_TELEMETRY']='true'
    if version('pybamm')!='25.10.2' or version('casadi')!='3.6.7':raise RuntimeError('Pinned optional PyBaMM/CasADi runtime required')
    import pybamm
    pybamm.telemetry.disable();parameters=pybamm.ParameterValues(p['parameterSet']);parameters.update({'Current function [A]':'[input]','Ambient temperature [K]':p['temperatureK'],'Initial temperature [K]':p['temperatureK']})
    source=inspect.getsource(importlib.import_module('pybamm.input.parameters.lithium_ion.'+p['parameterSet']))
    paths=['docs/reference-data/pybamm/'+p['parameterSet']+'.txt','docs/reference-data/pybamm/simulation-tests.txt','docs/reference-data/pybamm/LICENSE.txt'];hashes=evidence(paths)
    if hashlib.sha256(source.encode()).hexdigest()!=hashes[paths[0]]:raise RuntimeError('Installed parameter module differs from registered source')
    options={'thermal':'lumped'}
    if p['sei']:options['SEI']='solvent-diffusion limited'
    configurations=[(p['meshPoints'],p['relativeTolerance'],p['maxTimeStepS']),(2*p['meshPoints'],p['relativeTolerance'],p['maxTimeStepS']),(2*p['meshPoints'],p['relativeTolerance']/10,p['maxTimeStepS']),(2*p['meshPoints'],p['relativeTolerance']/10,p['maxTimeStepS']/2)];runs=[];capacity_error=heat_error=0.
    for mesh,tolerance,maxstep in configurations:
        model=getattr(pybamm.lithium_ion,p['model'])(options=options);solver=pybamm.CasadiSolver(mode='safe',rtol=tolerance,atol=tolerance/10,dt_max=maxstep,extra_options_setup={'max_step_size':maxstep,'max_num_steps':10000})
        sim=pybamm.Simulation(model,parameter_values=parameters.copy(),solver=solver,var_pts={k:mesh for k in ('x_n','x_s','x_p','r_n','r_p')});sim.build(initial_soc=p['initialSoc'],inputs={'Current function [A]':p['steps'][0]['currentA']});elapsed=net=0.;segments=[]
        for index,step in enumerate(p['steps']):
            times=np.linspace(0,step['durationS'],p['samplesPerStep']);solution=sim.step(step['durationS'],t_eval=times,save=False,inputs={'Current function [A]':step['currentA']})
            if solution.termination!='final time' or abs(float(solution.t[-1])-(elapsed+step['durationS']))>1e-6:raise ValueError('Battery protocol cutoff/early termination; no partial output')
            query=np.linspace(float(solution.t[0]),float(solution.t[-1]),p['samplesPerStep']);arrays={k:np.asarray(solution[v](query),dtype=float).reshape(-1) for k,v in VARIABLES.items()}
            if any(len(a)!=len(times) or not np.isfinite(a).all() for a in arrays.values()):raise ValueError('Protocol output shape/nonfinite')
            rows=[dict(timeS=elapsed+float(t),stepTimeS=float(t),**{k:float(v[j]) for k,v in arrays.items()}) for j,t in enumerate(times)]
            for row in rows:
                capacity_error=max(capacity_error,abs(row['capacityAh']-(net+step['currentA']*row['stepTimeS']/3600)));heat_error=max(heat_error,abs(row['totalHeatingWm3']-row['irreversibleHeatingWm3']-row['reversibleHeatingWm3']-row['ohmicHeatingWm3']))
                if abs(row['currentA']-step['currentA'])>1e-9:raise ValueError('Protocol current discontinuity semantics')
            if segments:
                previous=segments[-1]['trace'][-1]
                if abs(previous['capacityAh']-rows[0]['capacityAh'])>1e-8 or abs(previous['temperatureK']-rows[0]['temperatureK'])>1e-6:raise ValueError('Protocol state continuity')
            segments.append(dict(stepIndex=index,trace=rows));elapsed+=step['durationS'];net+=step['currentA']*step['durationS']/3600
        runs.append(dict(meshPoints=mesh,relativeTolerance=tolerance,maxTimeStepS=maxstep,segments=segments))
    if capacity_error>1e-6 or heat_error>1e-5:raise ValueError('Protocol coulomb/heating ledger')
    def delta(a,b):return {k:max(abs(x[k]-y[k]) for s,t in zip(runs[a]['segments'],runs[b]['segments']) for x,y in zip(s['trace'],t['trace'])) for k in ('voltageV','temperatureK','capacityAh')}
    mesh_delta=delta(0,1);solver_delta=delta(1,2);time_delta=delta(2,3);limits=dict(voltageV=p['voltageToleranceV'],temperatureK=p['temperatureToleranceK'],capacityAh=p['capacityToleranceAh']);passed=all(d[k]<=limits[k] for d in (mesh_delta,solver_delta,time_delta) for k in limits)
    return result(p,'battery_protocol',dict(runtime=dict(pybamm=version('pybamm'),casadi=version('casadi'),parameterSourceSha256=hashlib.sha256(source.encode()).hexdigest()),referenceHashes=hashes,runs=runs,meshDelta=mesh_delta,solverDelta=solver_delta,timeDelta=time_delta,capacityLedgerErrorAh=capacity_error,heatingLedgerErrorWm3=heat_error,netDischargeAh=net,numericalGate='passed' if passed else 'failed_convergence',scope='Single published-parameter cell, piecewise-constant signed current with preserved electrochemical/thermal state. Mesh, tolerance and configured IDAS internal-step-bound sensitivity are distinct; small deltas do not prove general convergence order. No CV/event cycling, plating, mechanics, runaway, pack control, measured project-cell calibration, lifetime or safety qualification.'),'insufficient_evidence')
