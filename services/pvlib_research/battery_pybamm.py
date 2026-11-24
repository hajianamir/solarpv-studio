"""Optional, pinned PyBaMM cell research. No pack safety or lifetime claims."""
import os
import importlib
import hashlib
import inspect
from importlib.metadata import version
import numpy as np
from .portfolio import bounded, numeric_fields, integer, result


def battery_pybamm(p):
    bounded(p,('schemaVersion','source','model','parameterSet','sei','currentA','initialSoc','temperatureK','durationS','samples','meshPoints','relativeTolerance','voltageToleranceV','temperatureToleranceK','capacityToleranceAh'))
    if p['schemaVersion']!='battery-pybamm-v1' or p['model'] not in ('SPM','SPMe','DFN') or p['parameterSet'] not in ('Chen2020','OKane2022') or type(p['sei']) is not bool:raise ValueError('Battery model/parameter contract')
    if p['sei'] and p['parameterSet']!='OKane2022':raise ValueError('SEI requires same-chemistry published OKane2022 set')
    numeric_fields(p,dict(currentA=(-10,10),initialSoc=(.1,.9),temperatureK=(283.15,313.15),durationS=(1,1800),relativeTolerance=(1e-8,1e-4),voltageToleranceV=(1e-6,.1),temperatureToleranceK=(1e-5,2),capacityToleranceAh=(1e-8,.01)))
    integer(p['samples'],5,121);integer(p['meshPoints'],4,16)
    # Set BEFORE import; never prompt for or send telemetry, including first run.
    os.environ['PYBAMM_DISABLE_TELEMETRY']='true'
    if version('pybamm')!='25.10.2' or version('casadi')!='3.6.7':raise RuntimeError('Pinned optional PyBaMM/CasADi runtime required')
    import pybamm
    pybamm.telemetry.disable()
    times=np.linspace(0,p['durationS'],p['samples']);runs=[]
    options={'thermal':'lumped'}
    if p['sei']:options['SEI']='solvent-diffusion limited'
    parameters=pybamm.ParameterValues(p['parameterSet'])
    parameters.update({'Current function [A]':p['currentA'],'Ambient temperature [K]':p['temperatureK'],'Initial temperature [K]':p['temperatureK']})
    # A source hash of the distributed parameter module, not a fabricated cell calibration.
    source=inspect.getsource(importlib.import_module('pybamm.input.parameters.lithium_ion.'+p['parameterSet']))
    for mesh,tolerance in ((p['meshPoints'],p['relativeTolerance']),(2*p['meshPoints'],p['relativeTolerance']),(2*p['meshPoints'],p['relativeTolerance']/10)):
        model=getattr(pybamm.lithium_ion,p['model'])(options=options)
        solver=pybamm.CasadiSolver(mode='safe',rtol=tolerance,atol=tolerance/10)
        simulation=pybamm.Simulation(model,parameter_values=parameters.copy(),solver=solver,var_pts={k:mesh for k in ('x_n','x_s','x_p','r_n','r_p')})
        solution=simulation.solve(t_eval=times,initial_soc=p['initialSoc'])
        if solution.termination!='final time' or abs(float(solution.t[-1])-p['durationS'])>1e-6:raise ValueError('Battery terminated before requested horizon; no partial result')
        variables={'seiLossAh':'Loss of capacity to negative SEI [A.h]','voltageV':'Voltage [V]','temperatureK':'Volume-averaged cell temperature [K]','capacityAh':'Discharge capacity [A.h]','totalHeatingWm3':'Volume-averaged total heating [W.m-3]','irreversibleHeatingWm3':'Volume-averaged irreversible electrochemical heating [W.m-3]','reversibleHeatingWm3':'Volume-averaged reversible heating [W.m-3]','ohmicHeatingWm3':'Volume-averaged Ohmic heating [W.m-3]'}
        arrays={key:np.asarray(solution[name](times),dtype=float).reshape(-1) for key,name in variables.items()}
        if any(len(a)!=len(times) or not np.isfinite(a).all() for a in arrays.values()):raise ValueError('Battery nonfinite/output shape')
        runs.append(dict(meshPoints=mesh,relativeTolerance=tolerance,trace=[dict(timeS=float(t),**{key:float(a[i]) for key,a in arrays.items()}) for i,t in enumerate(times)]))
    def delta(a,b,key):return max(abs(x[key]-y[key]) for x,y in zip(runs[a]['trace'],runs[b]['trace']))
    mesh_delta={key:delta(0,1,key) for key in ('voltageV','temperatureK','capacityAh')};solver_delta={key:delta(1,2,key) for key in mesh_delta}
    limits=dict(voltageV=p['voltageToleranceV'],temperatureK=p['temperatureToleranceK'],capacityAh=p['capacityToleranceAh'])
    passed=all(d[k]<=limits[k] for d in (mesh_delta,solver_delta) for k in limits)
    capacity_error=max(abs(row['capacityAh']-p['currentA']*row['timeS']/3600) for row in runs[-1]['trace'])
    if capacity_error>1e-6:raise ValueError('Battery coulomb ledger')
    return result(p,'battery_pybamm',dict(runtime=dict(pybamm=version('pybamm'),casadi=version('casadi'),parameterSourceSha256=hashlib.sha256(source.encode()).hexdigest()),runs=runs,meshDelta=mesh_delta,solverDelta=solver_delta,capacityLedgerErrorAh=capacity_error,numericalGate='passed' if passed else 'failed_convergence',scope='Single published-parameter cell; lumped thermal SPM/SPMe/DFN, optional SEI only with OKane2022. Chen2020 reversible entropic heating may be zero by source assumptions. No plating/mechanics/runaway, pack HVAC or field/lifetime qualification.'),'insufficient_evidence')
