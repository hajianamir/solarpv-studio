"""Explicit build-time GitHub acquisition. Runtime engines never invoke this script.

Pinned commits, git blob and SHA256 provenance. Default verifies committed bytes;
--fetch performs acquisition. No credentials are read or recorded by this script.
"""
import argparse
import base64
import csv
from datetime import datetime,timedelta,timezone
import io
import hashlib
from importlib import resources
from importlib.metadata import version
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'docs/reference-data'
SOURCES=[
 ('pybamm','pybamm-team/PyBaMM','313dd7f5793ae24429b1c5f814bd795637600305','LICENSE.txt','LICENSE.txt'),
 ('pybamm','pybamm-team/PyBaMM','313dd7f5793ae24429b1c5f814bd795637600305','src/pybamm/input/parameters/lithium_ion/Chen2020.py','Chen2020.txt'),
 ('pybamm','pybamm-team/PyBaMM','313dd7f5793ae24429b1c5f814bd795637600305','src/pybamm/input/parameters/lithium_ion/OKane2022.py','OKane2022.txt'),
 ('pybamm','pybamm-team/PyBaMM','313dd7f5793ae24429b1c5f814bd795637600305','tests/unit/test_simulation.py','simulation-tests.txt'),

 ('conformal','aangelopoulos/conformal-prediction','0426de356dbfa71c4c46be81d1973255ac66d050','notebooks/correctness_checks.ipynb','correctness-checks.ipynb'),
 ('conformal','aangelopoulos/conformal-prediction','0426de356dbfa71c4c46be81d1973255ac66d050','LICENSE','LICENSE.txt'),
 ('pvlib','pvlib/pvlib-python','6b9476b90892bd05726b237d9098f7536568a43a','tests/test_inverter.py','inverter-tests.txt'),
 ('pvlib','pvlib/pvlib-python','6b9476b90892bd05726b237d9098f7536568a43a','tests/test_pvsystem.py','pvsystem-tests.txt'),
 ('pvlib','pvlib/pvlib-python','6b9476b90892bd05726b237d9098f7536568a43a','LICENSE','LICENSE.txt'),
 ('tz','eggert/tz','7e1145bfdb9630c127841dc8ce808a937a300938','northamerica','northamerica.txt'),
 ('tz','eggert/tz','7e1145bfdb9630c127841dc8ce808a937a300938','europe','europe.txt'),
 ('tz','eggert/tz','7e1145bfdb9630c127841dc8ce808a937a300938','australasia','australasia.txt'),
 ('tz','eggert/tz','7e1145bfdb9630c127841dc8ce808a937a300938','LICENSE','LICENSE.txt'),
 ('silicon','polyanskiy/refractiveindex.info-database','e6d15e364f70de1cad8a96a20f75689f2fba8b21','database/data/main/Si/nk/Green-2008.yml','Green-2008.yml'),
 ('silicon','polyanskiy/refractiveindex.info-database','e6d15e364f70de1cad8a96a20f75689f2fba8b21','LICENSE','LICENSE.txt'),
 ('pvdeg','NatLabRockies/PVDegradationTools','7df7544b6ef848b6c94c379a16dcaefd864a89ce','tests/data/psm3_pytest.csv','weather.csv'),
 ('pvdeg','NatLabRockies/PVDegradationTools','7df7544b6ef848b6c94c379a16dcaefd864a89ce','tests/test_degradation.py','upstream-tests.txt'),
 ('pvdeg','NatLabRockies/PVDegradationTools','7df7544b6ef848b6c94c379a16dcaefd864a89ce','LICENSE.md','LICENSE.txt'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','tests/baseline_module_test.csv','test-module.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','tests/baseline_material_test.csv','test-glass.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_modules_mass_US.csv','us-module.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_glass.csv','us-glass.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_silicon.csv','us-silicon.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_silver.csv','us-silver.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_copper.csv','us-copper.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_aluminium_frames.csv','us-aluminium_frames.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_encapsulant.csv','us-encapsulant.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','PV_ICE/baselines/baseline_material_mass_backsheet.csv','us-backsheet.csv'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','tests/test_main.py','upstream-tests.txt'),
 ('pvice','NatLabRockies/PV_ICE','378a012a0602062ad52f14120d672f362dcc018a','LICENSE.md','LICENSE.txt'),
 ('tmm','sbyrnes321/tmm','9c265c20e2c5f75b5ac46d63ab466665948eb821','tests.py','upstream-tests.txt'),
 ('tmm','sbyrnes321/tmm','9c265c20e2c5f75b5ac46d63ab466665948eb821','tmm_core.py','engine-source.txt'),
 ('tmm','sbyrnes321/tmm','9c265c20e2c5f75b5ac46d63ab466665948eb821','LICENSE.txt','LICENSE.txt'),
]


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--fetch',action='store_true');args=parser.parse_args()
    manifest=DEST/'manifest.json'
    if not args.fetch:
        data=json.loads(manifest.read_text())
        for r in data['files']:
            raw=(ROOT/r['path']).read_bytes()
            if hashlib.sha256(raw).hexdigest()!=r['sha256']:raise ValueError('Reference SHA mismatch: '+r['path'])
        print('PASS frozen reference SHA256:',len(data['files']));return
    records=[]
    for group,repo,commit,remote,local in SOURCES:
        response=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/contents/{remote}?ref={commit}'],text=True))
        raw=base64.b64decode(response['content']);gitsha=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        if gitsha!=response['sha']:raise ValueError('Git blob identity')
        path=DEST/group/local;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
        records.append(dict(path=path.relative_to(ROOT).as_posix(),repository=repo,commit=commit,upstreamPath=remote,gitBlobSha1=gitsha,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),url=f'https://github.com/{repo}/blob/{commit}/{remote}',licensePath=f'docs/reference-data/{group}/LICENSE.txt',role='upstream_test_or_baseline_not_independent_field_qualification'))
    summary={}
    for key,prefix in [('upstream_test','test'),('us_glass_baseline','us')]:
        def table(name):
            reader=csv.DictReader(io.StringIO((DEST/'pvice'/name).read_text(encoding='utf-8-sig')));next(reader);return list(reader)
        module=table(prefix+'-module.csv');glass=table(prefix+'-glass.csv')
        summary[key]=[dict(year=int(m['year']),installedMw=float(m['new_Installed_Capacity_[MW]']),efficiencyPct=float(m['mod_eff']),glassGM2=float(g['mat_massperm2'])) for m,g in zip(module,glass)]
    path=DEST/'pvice/input-summary.json';path.write_text(json.dumps(summary,indent=2)+'\n');raw=path.read_bytes()
    records.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),role='deterministic_csv_projection_not_independent_dataset',derivedFrom=['test-module.csv','test-glass.csv','us-module.csv','us-glass.csv']))
    names=['glass','silicon','silver','copper','aluminium_frames','encapsulant','backsheet']
    module=table('us-module.csv');materials={name:table('us-'+name+'.csv') for name in names}
    if any([r['year'] for r in material]!=[r['year'] for r in module] for material in materials.values()):raise ValueError('Material baseline calendar mismatch')
    data=[dict(year=int(m['year']),installedMw=float(m['new_Installed_Capacity_[MW]']),efficiencyPct=float(m['mod_eff']),massGM2={name:float(materials[name][i]['mat_massperm2']) for name in names}) for i,m in enumerate(module)]
    path=DEST/'pvice/material-summary.json';path.write_text(json.dumps(data,indent=2)+'\n');raw=path.read_bytes();records.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),role='deterministic_seven_material_csv_projection_not_independent_dataset',derivedFrom=['us-module.csv']+['us-'+n+'.csv' for n in names]))
    reader=csv.reader(io.StringIO((DEST/'pvdeg/weather.csv').read_text()));next(reader);meta=next(reader);columns=next(reader);weather=[dict(zip(columns,row)) for row in reader if row]
    start=datetime(*(int(weather[0][k]) for k in ('Year','Month','Day','Hour','Minute')),tzinfo=timezone(timedelta(hours=-7)))
    for i,row in enumerate(weather):
        stamp=datetime(*(int(row[k]) for k in ('Year','Month','Day','Hour','Minute')),tzinfo=start.tzinfo)
        if stamp!=start+timedelta(hours=i):raise ValueError('Frozen weather time grid')
    forcing=dict(year=int(weather[0]['Year']),startTimestamp=start.isoformat(),intervalHours=1,poaWm2=[float(r['poa_global']) for r in weather],cellC=[float(r['temp_cell']) for r in weather],source='Upstream PVDeg PSM3 fixture computed POA/cell temperature columns; not independent measured PV power')
    path=DEST/'pvlib/forcing.json';path.write_text(json.dumps(forcing,separators=(',',':'))+'\n');raw=path.read_bytes();records.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),role='deterministic_csv_projection_not_independent_dataset',derivedFrom=['docs/reference-data/pvdeg/weather.csv']))
    if version('tzdata')!='2025.2':raise RuntimeError('Acquire TZ projection only with tzdata2025.2')
    zones=['UTC','America/New_York','Europe/Berlin','Asia/Tehran','Asia/Kolkata','Australia/Lord_Howe']
    data=dict(tzdataVersion='2025.2',ianaVersion='2025b',zones={n:hashlib.sha256(resources.files('tzdata.zoneinfo').joinpath(*n.split('/')).read_bytes()).hexdigest() for n in zones})
    path=DEST/'tz/tzif-manifest.json';path.write_text(json.dumps(data,indent=2)+'\n');raw=path.read_bytes();records.append(dict(path=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),role='pinned_package_TZif_hash_projection',derivedFrom=['tzdata==2025.2','IANA2025b']))
    manifest.write_text(json.dumps(dict(schemaVersion='frozen-reference-manifest-v1',files=records,limitations=['Upstream software test fixtures/baselines, not experimental qualification of SolarPV Studio.','PVDeg PSM3 is weather-model test input, not PVDAQ SCADA or failure labels.','PV ICE baselines include historical estimates and future projections, not site inventory.','Repository licenses retained; no independent warranty of third-party data rights.']),indent=2)+'\n')
    print('Acquired',len(records),'pinned files')


if __name__=='__main__':main()
