"""Final local gate runner. One immutable receipt; not remote CI or field approval."""
import hashlib,json,os,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
folder=ROOT/'.cache/study-evidence/operational-three-stages-final-corrected'
folder.mkdir(parents=True,exist_ok=True)
if (folder/'summary.json').exists():raise SystemExit('Preserve prior final receipt; do not overwrite')
env=os.environ.copy();env['PVLIB_PYTHON']=sys.executable;env['PATH']=str(Path(sys.executable).parent)+os.pathsep+env['PATH']
for k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','MKL_NUM_THREADS'):env[k]='1'
def snapshot():
    paths=[p for d in ('src','services','scripts','docs/examples/research') for p in (ROOT/d).rglob('*') if p.is_file() and p.suffix in ('.py','.ts','.tsx','.json','.txt') and '__pycache__' not in p.parts]
    paths += [ROOT/p for p in ('server.ts','package.json','package-lock.json','.github/workflows/ci.yml')]
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}
files=snapshot()
suites=[
 ('financial-fixture-reproduction',[sys.executable,'scripts/fixtures/physics/generate-grid-import-ledger.py','--check'],30),
 ('independent-reference-gate',['npm','run','verify:physics-reference-gate'],180),
 ('operational-annual-finance',['npm','run','test:operational:energy'],180),
 ('research-python',[sys.executable,'-m','unittest','discover','-s','services/pvlib_research/tests','-v'],180),
 ('production-python',[sys.executable,'-m','unittest','discover','-s','services/pvlib_study/tests','-v'],240),
 ('integrated-contract',['npx','tsx','scripts/test-integrated-study.ts'],180),
 ('workflow',['npm','run','test:study:workflow'],300),
 ('lint',['npm','run','lint'],180),
 ('build',['npm','run','build'],180),
 ('operational-browser',['npm','run','test:operational:browser'],180),
 ('research-api',['npm','run','test:research:api'],180),
 ('research-browser',['npm','run','test:research:browser'],180),
 ('direct-http',['npm','run','test:study'],180),
 ('study-browser',['npm','run','test:study:browser'],300),
 ('integrated-browser',['npx','tsx','scripts/test-integrated-browser.ts'],180),
 ('general-browser',['npm','run','test:browser'],420),
 ('binary-export',['npm','run','verify:exports'],240),
 ('core',['npm','test'],180),
 ('smoke',['npm','run','test:smoke'],180),
 ('gateway',['npm','run','test:gateway'],180),
 ('remediation',['npm','run','test:remediation'],180),
 ('audit',['npm','run','test:audit'],360),
]
rows=[]
for name,cmd,timeout in suites:
    start=time.monotonic();log=folder/(name+'.log')
    with log.open('w') as output:
        try:code=subprocess.run(cmd,cwd=ROOT,env=env,stdout=output,stderr=subprocess.STDOUT,timeout=timeout).returncode
        except subprocess.TimeoutExpired:code=124
    row=dict(suite=name,exitCode=code,seconds=round(time.monotonic()-start,2),logSha256=hashlib.sha256(log.read_bytes()).hexdigest());rows.append(row);print(row,flush=True)
unchanged=files==snapshot()
receipt=dict(schemaVersion='operational-three-stage-validation-v1',timestamp=datetime.now(timezone.utc).isoformat(),branch=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip(),head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),scope='local Linux dirty working tree, not exact-SHA remote CI or field validation',unchangedCode=unchanged,codeSnapshotSha256=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest(),files=files,results=rows)
(folder/'summary.json').write_text(json.dumps(receipt,indent=2)+'\n')
sys.exit(not unchanged or any(r['exitCode'] for r in rows))
