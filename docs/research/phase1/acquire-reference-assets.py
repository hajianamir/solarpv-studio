import subprocess,json,base64,hashlib
from pathlib import Path
from datetime import datetime,timezone
folder=Path('.cache/phase1-research/assets');folder.mkdir(parents=True,exist_ok=True)
sets=[('pvlib/pvlib-python','6b9476b90892bd05726b237d9098f7536568a43a',['LICENSE','tests/data/inverter_fit_snl_meas.csv','tests/data/singleaxis_tracker_wslope.csv','tests/data/PVsyst_demo_model.csv','tests/test_inverter.py','tests/test_tracking.py']),('pvlib/pvanalytics','06fd59694b2a9461ff29c5d22d691bb23c4f956e',['README.md','pvanalytics/data/nrel_1axis_tracker_mesa_ac_power.csv','pvanalytics/data/rmis_weather_data.csv','pvanalytics/data/snow_data.csv','pvanalytics/data/snow_snowfall.csv']),('NatLabRockies/ssc','6ce13d26f44b3a21f7bf0fbb5b1e3f3f80cf3860',['LICENSE','ssc/cmod_singleowner.cpp','ssc/cmod_utilityrate5.cpp']),('NatLabRockies/bifacial_radiance','aac0f884484c64d7454471b63d33c9b2d2ce5bbb',['README.md','LICENSE'])]
rows=[]
for repo,ref,paths in sets:
 for p in paths:
  call=subprocess.run(['gh','api',f'repos/{repo}/contents/{p}?ref={ref}'],capture_output=True,text=True,timeout=30)
  row=dict(repository=repo,revision=ref,upstreamPath=p,url=f'https://github.com/{repo}/blob/{ref}/{p}')
  if call.returncode:row.update(status='failed',error=call.stderr[:300])
  else:
   data=json.loads(call.stdout);raw=base64.b64decode(data['content']);local=folder/(repo.replace('/','__')+'__'+p.replace('/','__'));local.write_bytes(raw)
   row.update(status='downloaded',localPath=str(local),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),gitBlobSha=data['sha'],classification='upstream_reference_not_project_field_evidence',redistribution='not_redistributed_raw_assets_cache_only_license_review_required')
  rows.append(row)
Path('docs/audit/PHASE1-ACQUISITIONS.json').write_text(json.dumps(dict(schemaVersion='phase1-acquisition-v1',retrievedAt=datetime.now(timezone.utc).isoformat(),assets=rows),indent=2)+'\n')
for r in rows:print(r['status'],r['repository'],r['upstreamPath'],r.get('bytes'))
