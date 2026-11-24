"""Offline comparison with published measurements, never a physical pass certificate."""
import csv
import hashlib
import importlib
from importlib.metadata import version
import inspect
import json
import math
import os
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'docs/reference-data/chen-validation'
CASES=((7,8,.5),(12,13,2.5),(17,18,5.),(22,23,7.5))
FIELDS=('Test Time [s]','Step Time [s]','Current [A]','Voltage [V]','Temperature Cell [degC]','Temperature Chamber [degC]')


def measurements(cell):
    if cell not in ('02','03','04'):raise ValueError('Pinned measured cells only')
    manifest=json.loads((DATA/'manifest.json').read_text());name=f'LGM50_cell{cell}.csv';record=next(r for r in manifest['files'] if r['path'].endswith('/'+name));raw=(DATA/name).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=record['sha256'] or hashlib.md5(raw).hexdigest()!=record['publisherMd5'] or len(raw)!=record['size']:raise ValueError('Measured data identity')
    with (DATA/name).open(newline='') as stream:
        for _ in range(13):next(stream)
        rows=list(csv.DictReader(stream))
    for row in rows:
        for key in FIELDS:
            row[key]=float(row[key])
            if not math.isfinite(row[key]):raise ValueError('Nonfinite measured data')
        if row['Current [A]']<0:raise ValueError('Expected original unsigned current magnitudes')
    if any(b['Test Time [s]']<a['Test Time [s]'] for a,b in zip(rows,rows[1:])):raise ValueError('Measured chronology')
    return rows,record


def segments(rows,discharge,rest):
    d=[r for r in rows if r['Step']==str(discharge)];s=[r for r in rows if r['Step']==str(rest) and r['Md'] in ('R','SBr')]
    if not d or not s or any(r['Md']!='D' for r in d) or any(r['Current [A]']!=0 for r in s):raise ValueError('Measured phase semantics')
    for group in (d,s):
        if any(b['Step Time [s]']<a['Step Time [s]'] for a,b in zip(group,group[1:])):raise ValueError('Within-phase time order')
    # Absolute clocks witness that step-relative clocks share the same origin.
    end_origin=d[-1]['Test Time [s]'];rest_origin=s[0]['Test Time [s]']-s[0]['Step Time [s]']
    if abs(end_origin-rest_origin)>.02:raise ValueError('Measured phase boundary clock mismatch')
    return d,s


def metrics(predicted,observed):
    a=np.asarray(predicted,dtype=float);b=np.asarray(observed,dtype=float)
    if a.ndim!=1 or a.shape!=b.shape or not np.isfinite(a).all() or not np.isfinite(b).all():raise ValueError('Metric shape/nonfinite')
    if not len(a):return None
    e=a-b
    return dict(count=len(a),mae=float(np.mean(abs(e))),rmse=float(np.sqrt(np.mean(e*e))),bias=float(np.mean(e)),maxAbs=float(np.max(abs(e))))


def score(solution,rows,origin):
    # Never ask ProcessedVariable to extrapolate beyond actual solver coverage.
    lower=float(solution.t[0]);upper=float(solution.t[-1]);selected=[r for r in rows if lower<=origin+r['Step Time [s]']<=upper]
    if not selected:return dict(totalSamples=len(rows),scoredSamples=0,sampleCoverage=0.,timeCoverage=0.,voltageV=None,temperatureK=None,trace=[])
    query=np.array([origin+r['Step Time [s]'] for r in selected]);voltage=np.asarray(solution['Voltage [V]'](query),dtype=float).reshape(-1);temperature=np.asarray(solution['Volume-averaged cell temperature [K]'](query),dtype=float).reshape(-1)
    observed_v=[r['Voltage [V]'] for r in selected];observed_t=[r['Temperature Cell [degC]']+273.15 for r in selected]
    vm=metrics(voltage,observed_v);tm=metrics(temperature,observed_t)
    return dict(totalSamples=len(rows),scoredSamples=len(selected),sampleCoverage=len(selected)/len(rows),timeCoverage=max(0,min(upper-origin,rows[-1]['Step Time [s]']))/rows[-1]['Step Time [s]'],voltageV=vm,temperatureK=tm,trace=[dict(stepTimeS=r['Step Time [s]'],predictedV=float(v),measuredV=r['Voltage [V]'],predictedK=float(t),measuredK=r['Temperature Cell [degC]']+273.15) for r,v,t in zip(selected,voltage,temperature)])


def refinement(coarse,fine):
    result={}
    for phase in ('discharge','rest'):
        a=coarse.get(phase);b=fine.get(phase)
        if a is None or b is None:result[phase]=None;continue
        mapping={r['stepTimeS']:r for r in a['trace']};common=[r for r in b['trace'] if r['stepTimeS'] in mapping]
        result[phase]=dict(commonSamples=len(common),maxVoltageDeltaV=max((abs(r['predictedV']-mapping[r['stepTimeS']]['predictedV']) for r in common),default=None),maxTemperatureDeltaK=max((abs(r['predictedK']-mapping[r['stepTimeS']]['predictedK']) for r in common),default=None))
    return result


def run_benchmark():
    os.environ['PYBAMM_DISABLE_TELEMETRY']='true'
    if version('pybamm')!='25.10.2' or version('casadi')!='3.6.7':raise RuntimeError('Pinned optional battery runtime required')
    import pybamm
    pybamm.telemetry.disable()
    source=inspect.getsource(importlib.import_module('pybamm.input.parameters.lithium_ion.Chen2020')).encode();frozen=ROOT/'docs/reference-data/pybamm/Chen2020.txt'
    if source!=frozen.read_bytes():raise ValueError('Installed Chen2020 differs from frozen source')
    cases=[]
    for cell in ('02','03','04'):
        rows,record=measurements(cell)
        for discharge,rest,current in CASES:
            d,s=segments(rows,discharge,rest);duration=d[-1]['Step Time [s]'];rest_duration=s[-1]['Step Time [s]'];runs=[]
            for mesh in (8,16):
                run=dict(meshPoints=mesh,solverStatus='not_run',discharge=None,rest=None)
                try:
                    p=pybamm.ParameterValues('Chen2020');p.update({'Current function [A]':'[input]','Ambient temperature [K]':d[0]['Temperature Chamber [degC]']+273.15,'Initial temperature [K]':d[0]['Temperature Cell [degC]']+273.15})
                    solver=pybamm.CasadiSolver(mode='safe',rtol=1e-7,atol=1e-8,dt_max=60,extra_options_setup={'max_step_size':10,'max_num_steps':10000})
                    sim=pybamm.Simulation(pybamm.lithium_ion.DFN(options={'thermal':'lumped'}),parameter_values=p,solver=solver,var_pts={k:mesh for k in ('x_n','x_s','x_p','r_n','r_p')});sim.build(initial_soc=1,inputs={'Current function [A]':current})
                    # Fixed regular solver output grid avoids integrator rebuild for every irregular sensor timestamp.
                    # ProcessedVariable interpolates within support only; no extrapolation.
                    solution=sim.step(duration,t_eval=np.r_[np.arange(0,duration,10.),duration],save=False,inputs={'Current function [A]':current})
                    run.update(solverStatus='completed',termination=solution.termination,modelDischargeEndS=float(solution.t[-1]),measuredDischargeEndS=duration,endTimeDifferenceS=float(solution.t[-1])-duration,discharge=score(solution,d,0))
                    if solution.termination=='final time' and abs(float(solution.t[-1])-duration)<1e-6:
                        end_capacity=float(solution['Discharge capacity [A.h]'](solution.t[-1]));end_temperature=float(solution['Volume-averaged cell temperature [K]'](solution.t[-1]))
                        rested=sim.step(rest_duration,t_eval=np.r_[np.arange(0,rest_duration,10.),rest_duration],save=False,inputs={'Current function [A]':0})
                        if rested.termination!='final time' or abs(float(rested.t[-1])-duration-rest_duration)>1e-6:raise ValueError('Rest horizon incomplete')
                        capacity_jump=abs(float(rested['Discharge capacity [A.h]'](rested.t[0]))-end_capacity);temperature_jump=abs(float(rested['Volume-averaged cell temperature [K]'](rested.t[0]))-end_temperature)
                        if capacity_jump>1e-8 or temperature_jump>1e-6:raise ValueError('Rest state discontinuity')
                        run.update(rest=score(rested,s,duration),restStatus='scored',capacityBoundaryJumpAh=capacity_jump,temperatureBoundaryJumpK=temperature_jump)
                    else:run['restStatus']='blocked_model_cutoff_before_measured_switch'
                except (pybamm.SolverError,ValueError,RuntimeError) as error:
                    # Failed runs remain explicit, and cannot qualify a model.
                    run.update(solverStatus='failed',failureType=type(error).__name__,restStatus='blocked_solver_failure')
                runs.append(run)
            print(f'completed cell={cell} nominalCurrentA={current}',flush=True)
            currents=[r['Current [A]'] for r in d];chamber=[r['Temperature Chamber [degC]'] for r in d+s]
            cases.append(dict(cell=cell,split='development_reference' if cell=='02' else 'retrospective_evaluation_not_blinded',dischargeStep=discharge,restStep=rest,nominalCurrentA=current,initialSoc=1,ambientK=d[0]['Temperature Chamber [degC]']+273.15,initialTemperatureK=d[0]['Temperature Cell [degC]']+273.15,maxCurrentDeviationA=max(abs(i-current) for i in currents),chamberRangeC=[min(chamber),max(chamber)],dataSha256=record['sha256'],runs=runs,meshSensitivity=refinement(*runs)))
    return dict(schemaVersion='chen-measured-benchmark-v1',physicalQualification='not_established',projectApproval='blocked',safetyApproval='not_assessed',automaticEnergyAdoption=False,financeMutation=False,runtime=dict(pybamm=version('pybamm'),casadi=version('casadi')),configuration=dict(model='DFN',parameterSet='Chen2020',thermal='lumped',initialSoc=1,meshPoints=[8,16],relativeTolerance=1e-7,absoluteTolerance=1e-8,configuredGlobalStepS=60,configuredIdasMaxStepS=10,solverOutputGridS=10,measurementSampling='within_support_processed_variable_interpolation',currentBasis='nominal_constant_not_measured_drive_cycle',ambientBasis='first_measured_chamber_constant',initialTemperatureBasis='first_measured_surface_temperature'),parameterSourceSha256=hashlib.sha256(source).hexdigest(),cases=cases,limitations=['No parameter fitting or post-hoc physical acceptance threshold. All selected cells/currents retained.','Retrospective published data comparison, not prospective independent project calibration.','Lumped temperature is not a calibrated surface-sensor observable. Constant ambient/current and ideal full initial SOC are assumptions.','First partial discharge with unknown initial SOC excluded by specification before execution. Full CC/CV and preceding history not reproduced.','Early model cutoff scores only supported measurement prefix and blocks rest; no extrapolation or threshold relaxation.','Fixed 10-second solver output grid is interpolated at irregular measurement timestamps within support; interpolation error is not separately calibrated.', 'Mesh sensitivity is not a general convergence-order proof, safety, life or runaway qualification.'])
