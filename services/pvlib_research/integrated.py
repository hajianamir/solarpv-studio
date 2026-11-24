"""Stage 55 opt-in composition; does NOT expand legacy StudyResult v1.

Independent constrained DC workers -> ONE shared Sandia multi-input inverter.
Child AC diagnostics are intentionally ignored. No plant/finance attachment.
"""
import copy
import hashlib
from importlib.metadata import version
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import numpy as np
import pvlib
from services.pvlib_study import worker
from .electrical import keys, number

ROOT=Path(__file__).resolve().parents[2]
SCRIPT=ROOT/'services/pvlib_study/worker.py'
FORBIDDEN=('mpptInputs','inverterBlocks','sandia','acCable','transformer','auxiliaryPowerW','auxiliarySchedule',
           'acAvailability','acExportLimitW','acExportLimitSchedule')
MAX_INPUT=8*1024*1024
MAX_OUTPUT=32*1024*1024


def canonical(obj):
    return json.dumps(obj,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)


def validate_plan(plan):
    keys(plan,('schemaVersion','source','inverter','inputs'))
    if plan['schemaVersion']!='integrated-mppt-plan-v1':raise ValueError('Unsupported integrated version')
    if not isinstance(plan['source'],str) or not plan['source'].strip() or len(plan['source'])>500:raise ValueError('Source required')
    if len(canonical(plan).encode())>MAX_INPUT:raise ValueError('Integrated input exceeds 8 MiB')
    inputs=plan['inputs']
    if not isinstance(inputs,list) or not 2<=len(inputs)<=4:raise ValueError('Require 2..4 independent inputs')
    seen=set();shared=None;cost=0
    for entry in inputs:
        keys(entry,('id','request'))
        ident=entry['id']
        if not isinstance(ident,str) or not re.fullmatch('[A-Za-z0-9_-]{1,40}',ident) or ident in seen:raise ValueError('Unique input id required')
        seen.add(ident);req=entry['request'];worker.validate(req);s=req['system']
        if 'measurements' in req or 'electrical' not in s or any(k in s for k in FORBIDDEN) or s['additionalDcLossPct']!=0:
            raise ValueError('Independent electrical inputs only, no nested inverter/plant/measurements/additional loss')
        common=canonical(dict(site=req['site'],weather=req['weather']))
        if shared is not None and common!=shared:raise ValueError('Exact shared site/weather required; no resampling')
        shared=common;cost+=len(req['weather']['records'])
        stub=copy.deepcopy(req);stub['system']['sandia']=copy.deepcopy(plan['inverter'])
        stub['system']['inverterPdc0W']=plan['inverter'].get('Pdco')
        worker.validate(stub)  # Reuse strict numeric/window/fit-domain validation.
    if cost>8784:raise ValueError('Integrated budget exceeds 8784 total input-intervals')
    return cost


def migrate_legacy(req, inverter, source):
    """Explicit copy migration only; rejects data it would otherwise drop."""
    worker.validate(req)
    if 'mpptInputs' not in req['system'] or 'measurements' in req or any(k in req['system'] for k in FORBIDDEN if k!='mpptInputs'):
        raise ValueError('Migration requires bare legacy MPPT; plant/measurement data must not be discarded')
    p=dict(schemaVersion='integrated-mppt-plan-v1',source=source,inverter=copy.deepcopy(inverter),
           inputs=[dict(id=e['id'],request=worker.mppt_request(req,e)) for e in req['system']['mpptInputs']])
    validate_plan(p)
    return p


def execute_child(request, deadline, cancel, script=SCRIPT):
    """Bounded disk-backed capture avoids unbounded communicate stdout memory."""
    env=os.environ.copy()
    env.update(OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1',MKL_NUM_THREADS='1',PYTHONNOUSERSITE='1')
    with tempfile.TemporaryFile() as incoming,tempfile.TemporaryFile() as out,tempfile.TemporaryFile() as err:
        # Disk-backed stdin has deterministic EOF even when a large request takes
        # longer than the polling interval. Retrying communicate(input=None)
        # after a write timeout can otherwise strand a child waiting for EOF.
        incoming.write(canonical(request).encode());incoming.seek(0)
        child=subprocess.Popen([sys.executable,'-I','-B',str(script)],stdin=incoming,stdout=out,stderr=err,env=env)
        try:
            while True:
                if cancel():raise RuntimeError('Integrated execution cancelled; no partial result')
                if time.monotonic()>=deadline:raise TimeoutError('Integrated execution deadline exceeded; no fallback')
                if os.fstat(out.fileno()).st_size>MAX_OUTPUT or os.fstat(err.fileno()).st_size>65536:
                    raise RuntimeError('Integrated child output budget exceeded')
                try:
                    child.wait(timeout=min(.05,max(.001,deadline-time.monotonic())))
                    break
                except subprocess.TimeoutExpired:pass
            if os.fstat(out.fileno()).st_size>MAX_OUTPUT or os.fstat(err.fileno()).st_size>65536:raise RuntimeError('Integrated child output budget exceeded')
            if child.returncode!=0:raise RuntimeError('Direct child worker failed; no fallback')
            out.seek(0);result=json.loads(out.read(),parse_constant=lambda v: (_ for _ in ()).throw(ValueError('Nonfinite child JSON')))
        finally:
            if child.poll() is None:child.kill()
            child.wait()
    expected=hashlib.sha256(canonical(request).encode()).hexdigest()
    if result.get('schemaVersion')!='pvlib-study-result-v1' or result.get('status')!='completed' or result.get('manifest',{}).get('inputSha256')!=expected:
        raise RuntimeError('Child receipt mismatch')
    return result


def shared_ac(volts, powers, inv):
    """Zero-total-power and inactive-bus guard for pinned sandia_multi."""
    volts=np.asarray(volts,float);powers=np.asarray(powers,float);total=powers.sum(axis=0)
    if not np.isfinite(volts).all() or not np.isfinite(powers).all() or (powers<0).any():raise ValueError('Invalid DC point')
    active=powers>0
    if ((volts[active]<inv['modelMinDcV']-1e-7)|(volts[active]>inv['modelMaxDcV']+1e-7)).any() or (total>inv['modelMaxDcPowerW']).any():
        raise ValueError('Integrated Sandia point outside declared fitted domain')
    # Inactive buses contribute zero weight. Reference voltage avoids evaluating
    # an out-of-domain 0 V sentinel and potential 0*NaN in the upstream formula.
    safe=np.where(active,volts,float(inv['Vdco']))
    net=np.full(total.shape,-float(inv['Pnt']))
    lit=total>0
    if lit.any():
        with np.errstate(divide='raise',invalid='raise',over='raise'):
            net[lit]=pvlib.inverter.sandia_multi(tuple(safe[:,lit]),tuple(powers[:,lit]),inv)
    if not np.isfinite(net).all() or (net>total+np.maximum(1e-6,total*1e-7)).any():raise ValueError('Invalid shared AC exceeds DC or nonfinite')
    return net


def run_integrated(plan, cancel=lambda:False, timeout_s=120):
    timeout_s=number(timeout_s,.001,600,'timeout_s');deadline=time.monotonic()+timeout_s
    cost=validate_plan(plan)
    children=[]
    for entry in plan['inputs']:
        if cancel():raise RuntimeError('Integrated execution cancelled')
        if time.monotonic()>=deadline:raise TimeoutError('Integrated execution deadline exceeded')
        children.append(dict(id=entry['id'],result=execute_child(entry['request'],deadline,cancel)))
    if cancel():raise RuntimeError('Integrated execution cancelled')
    samples_by_input=[c['result']['samples'] for c in children]
    n=len(samples_by_input[0]);expected=plan['inputs'][0]['request']['weather']['records']
    for rows in samples_by_input:
        if len(rows)!=n or any(worker.timestamp(a['timestamp'])!=worker.timestamp(b['timestamp']) for a,b in zip(rows,expected)):
            raise RuntimeError('Child sample alignment mismatch')
    volts=np.array([[r['operatingVoltageV'] for r in rows] for rows in samples_by_input])
    powers=np.array([[r['dcW'] for r in rows] for rows in samples_by_input]);total=powers.sum(axis=0)
    net=shared_ac(volts,powers,plan['inverter'])
    rows=[dict(timestamp=expected[i]['timestamp'],dcW=float(total[i]),inverterNetAcW=float(net[i]),
        exportW=max(0.,float(net[i])),importW=max(0.,-float(net[i]))) for i in range(n)]
    dt=plan['inputs'][0]['request']['weather']['intervalMinutes']/60
    if time.monotonic()>=deadline:raise TimeoutError('Integrated execution deadline exceeded')
    raw=canonical(plan)
    result = dict(schemaVersion='integrated-mppt-result-v1',algorithmVersion='1.0.0',status='completed',
        validationStatus='not_field_validated',projectApproval='blocked',plan=plan,planCanonicalJson=raw,
        planSha256=hashlib.sha256(raw.encode()).hexdigest(),workerSha256=hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),
        requirementsSha256=hashlib.sha256(SCRIPT.with_name('requirements.txt').read_bytes()).hexdigest(),pvlibVersion=version('pvlib'),
        budget=dict(inputIntervals=cost,childSolves=len(children)),children=children,samples=rows,
        summary=dict(dcWh=float(total.sum()*dt),exportWh=float(np.maximum(0,net).sum()*dt),
                     importWh=float(np.maximum(0,-net).sum()*dt),netWh=float(net.sum()*dt)),
        limitations=['static_independent_MPPT_not_controller','single_shared_sandia_multi_inverter',
            'child_AC_is_unused_diagnostic_not_to_be_summed','no_AC_plant_exportcap_or_finance_attachment',
            'no_conversion_from_module_back_to_independent_cell','caller_fit_domains_not_authenticated',
            'period_totals_only_no_annualization','not_legacy_StudyResult_v1_no_implicit_archive_migration'])
    if len(canonical(result).encode())>MAX_OUTPUT:raise RuntimeError('Integrated result exceeds output budget')
    if cancel():raise RuntimeError('Integrated execution cancelled')
    if time.monotonic()>=deadline:raise TimeoutError('Integrated execution deadline exceeded')
    return result
