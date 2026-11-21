"""Generate all bounded cases for an independent TS contract pass and runtime-result validation.
No expected outcome is inferred from either validator. Streams JSONL; no operational data.
"""
import sys
import json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'services/pvlib_study/tests'))
from test_review_combinations import all_cases,allowed,candidate,selected_cases,worker
cases=all_cases();selected=set(selected_cases([c for c in cases if allowed(c)]))
for index,case in enumerate(cases):
    request=candidate(case)
    try:worker.validate(request);accepted=True
    except worker.InputError:accepted=False
    row=dict(index=index,case=case,expected=allowed(case),pythonAccepted=accepted,request=request,state='contract_rejected' if not allowed(case) else 'runtime_executed' if case in selected else 'not_numerically_executed')
    if case in selected:row['result']=worker.run_study(request)
    print(json.dumps(row,allow_nan=False,separators=(',',':')))
