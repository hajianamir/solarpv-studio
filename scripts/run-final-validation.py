"""Local three-round validation runner; keeps failures, never short-circuits suites.

Run one explicit round at a time; evidence is NOT exact-SHA remote CI. Logs and
machine-time receipts live outside Git in .cache/study-evidence/final-round-N/.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--round',type=int,choices=(1,2,3),required=True)
args=parser.parse_args()
folder=ROOT/f'.cache/study-evidence/final-round-{args.round}'
folder.mkdir(parents=True,exist_ok=True)
receipt=folder/'summary.json'
if receipt.exists():raise SystemExit('Round receipt already exists; preserve it, choose an unexecuted round')
env=os.environ.copy();env['PVLIB_PYTHON']=sys.executable
# child scripts occasionally use python directly; pin PATH for the whole suite.
env['PATH']=str(Path(sys.executable).parent)+os.pathsep+env['PATH']
suites=[
 ('research-python',[sys.executable,'-m','unittest','discover','-s','services/pvlib_research/tests','-v'],180),
 ('production-python',[sys.executable,'-m','unittest','discover','-s','services/pvlib_study/tests','-v'],240),
 ('integrated-contract',['npx','tsx','scripts/test-integrated-study.ts'],180),
 ('study-workflow',['npm','run','test:study:workflow'],300),
 ('lint',['npm','run','lint'],180),
 ('build',['npm','run','build'],180),
 ('core-benchmarks',['npm','test'],180),
 ('direct-http-process',['npm','run','test:study'],180),
 ('study-browser',['npm','run','test:study:browser'],300),
 ('integrated-browser',['npx','tsx','scripts/test-integrated-browser.ts'],180),
 ('general-browser',['npm','run','test:browser'],420),
 ('binary-export-readback',['npm','run','verify:exports'],240),
 ('smoke',['npm','run','test:smoke'],180),
 ('gateway',['npm','run','test:gateway'],180),
 ('remediation',['npm','run','test:remediation'],180),
 ('audit',['npm','run','test:audit'],360),
]
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=ROOT,text=True).splitlines()
h=hashlib.sha256()
for name in sorted(set(paths)):
    file=ROOT/name
    if file.is_file() and (name.startswith(('src/','services/','scripts/')) and file.suffix in ('.ts','.tsx','.py') or name in ('package.json','package-lock.json','.github/workflows/ci.yml')):
        h.update(name.encode()+b'\0'+hashlib.sha256(file.read_bytes()).digest())
state=dict(schemaVersion='local-validation-round-v1',round=args.round,machineStartedUTC=datetime.now(timezone.utc).isoformat(),
           head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
           sourceSnapshotSha256=h.hexdigest(),classification='dirty-working-tree local Linux; not remote exact-SHA CI',suites=[])
for name,cmd,timeout in suites:
    print(f'Round {args.round}: {name} started',flush=True);start=time.monotonic()
    with (folder/f'{name}.log').open('wb') as log:
        p=subprocess.Popen(cmd,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
        try:code=p.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid,signal.SIGKILL);p.wait();code=124
    state['suites'].append(dict(name=name,command=cmd,exitCode=code,seconds=round(time.monotonic()-start,3),log=f'{name}.log'))
    receipt.write_text(json.dumps(state,indent=2)+'\n')
    print(f'Round {args.round}: {name} {"PASS" if code==0 else "FAIL"} ({code})',flush=True)
state['passed']=sum(s['exitCode']==0 for s in state['suites'])
state['failed']=len(suites)-state['passed'];state['machineEndedUTC']=datetime.now(timezone.utc).isoformat()
receipt.write_text(json.dumps(state,indent=2)+'\n')
print(f'Round {args.round}: {state["passed"]}/{len(suites)} PASS; {state["failed"]} failed',flush=True)
sys.exit(1 if state['failed'] else 0)
