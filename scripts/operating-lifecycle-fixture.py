"""Second explicit synthetic test year; not a production weather adapter."""
import os
os.environ['OPENBLAS_NUM_THREADS'] = '1'
import copy
import json
from datetime import datetime, timedelta
from pathlib import Path
from services.pvlib_study.worker import run_study
folder = Path('.cache/study-evidence/operational')
r = copy.deepcopy(json.loads((folder/'annual-direct.json').read_text())['request'])
r['label'] = 'SYNTHETIC second-year lifecycle software test only'
r['weather']['source'] = 'SYNTHETIC prior test forcing shifted explicitly 365 days; NOT measured weather'
for row in r['weather']['records']:
    row['timestamp'] = (datetime.fromisoformat(row['timestamp'].replace('Z', '+00:00')) + timedelta(days=365)).isoformat()
(folder/'annual-direct-second-year.json').write_text(json.dumps(run_study(r)))
