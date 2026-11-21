"""Bounded 16-case independent contract/runtime evidence for TS/Python parity."""
import copy
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from services.pvlib_research.tests.test_integrated import matrix,fixture
from services.pvlib_research.integrated import validate_plan,run_integrated,migrate_legacy

for index,(plan,expected) in enumerate(matrix()):
    try:validate_plan(plan);accepted=True
    except ValueError:accepted=False
    row=dict(index=index,expected=expected,pythonAccepted=accepted,plan=plan,
             state='runtime' if expected else 'rejected')
    if expected:row['result']=run_integrated(plan)
    print(json.dumps(row,ensure_ascii=False,allow_nan=False),flush=True)
