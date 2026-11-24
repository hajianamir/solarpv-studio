"""Synthetic clear-sky year for software tests ONLY; never project weather."""
import os
# Bound numerical-library threads before importing pandas/pvlib in this test tool.
for key in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):os.environ[key]='1'
import copy,json
from pathlib import Path
import pandas as pd
import pvlib
from services.pvlib_study.worker import run_study as run
from services.pvlib_research.integrated import run_integrated
root=Path(__file__).resolve().parents[1]
folder=root/'.cache/study-evidence/operational'
folder.mkdir(parents=True,exist_ok=True)
request=json.loads((root/'services/pvlib_study/tests/synthetic-study.json').read_text())
request['label']='SYNTHETIC annual software test; not operational data'
request['weather']['source']='SYNTHETIC pvlib clear-sky fixture, not operational weather'
request['weather']['quality']='assumed'
ends=pd.date_range('2025-01-01T01:00:00Z',periods=8760,freq='h');mids=ends-pd.Timedelta(minutes=30)
site=request['site'];loc=pvlib.location.Location(site['latitude'],site['longitude'],altitude=site['altitudeM'])
cs=loc.get_clearsky(mids)
pos=pvlib.solarposition.get_solarposition(mids,site['latitude'],site['longitude'],altitude=site['altitudeM'],temperature=25,delta_t=67.0)
cs.loc[pos.apparent_zenith>=89,:]=0 # Explicit synthetic horizon convention; never operational gapfill.
records=[dict(timestamp=t.isoformat(),ghiWm2=float(c.ghi),dniWm2=float(c.dni),dhiWm2=float(c.dhi),tempAirC=25,windSpeedMs=2) for t,c in zip(ends,cs.itertuples())]
request['weather']['records']=records
result=run(request)
(folder/'annual-direct.json').write_text(json.dumps(result,separators=(',',':'),allow_nan=False))
# Actual second worker run for leap-year calendar acceptance, not a relabelled summary.
leap=copy.deepcopy(request)
leapends=pd.date_range('2024-01-01T01:00:00Z',periods=8784,freq='h');leapmids=leapends-pd.Timedelta(minutes=30)
leapcs=loc.get_clearsky(leapmids)
leappos=pvlib.solarposition.get_solarposition(leapmids,site['latitude'],site['longitude'],altitude=site['altitudeM'],temperature=25,delta_t=67.0)
leapcs.loc[leappos.apparent_zenith>=89,:]=0
leap['weather']['records']=[dict(timestamp=t.isoformat(),ghiWm2=float(c.ghi),dniWm2=float(c.dni),dhiWm2=float(c.dhi),tempAirC=25,windSpeedMs=2) for t,c in zip(leapends,leapcs.itertuples())]
(folder/'annual-leap.json').write_text(json.dumps(run(leap),separators=(',',':'),allow_nan=False))

# Same physical configuration across two independently bounded half-year solves.
plan=json.loads((root/'docs/examples/research/integrated-synthetic-plan.json').read_text())
for entry in plan['inputs']:
    entry['request']['weather']=copy.deepcopy(request['weather'])
    entry['request']['site']=copy.deepcopy(site)
    # Stable provenance and fitted configuration, no automatic module parameter splitting.
    entry['request']['label']='SYNTHETIC integrated annual software fixture'
    entry['request']['system'].pop('cellTemperatureSchedule',None)
outputs=[]
for lo,hi in [(0,4380),(4380,8760)]:
    chunk=copy.deepcopy(plan)
    for entry in chunk['inputs']:entry['request']['weather']['records']=copy.deepcopy(records[lo:hi])
    outputs.append(run_integrated(chunk))
(folder/'annual-integrated.json').write_text(json.dumps(outputs,separators=(',',':'),allow_nan=False))
print('Synthetic test fixtures only:',folder)
