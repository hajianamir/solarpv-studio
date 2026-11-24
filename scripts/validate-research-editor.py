"""Local integration regression receipt; not remote CI or field evidence."""
import hashlib,json,os,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
root=Path(__file__).resolve().parents[1]
folder=root/'.cache/study-evidence/research-editor-final'
folder.mkdir(parents=True,exist_ok=True)
if (folder/'summary.json').exists():raise SystemExit('Preserve existing final receipt')
env=os.environ.copy();env['PVLIB_PYTHON']=sys.executable;env['PATH']=str(Path(sys.executable).parent)+os.pathsep+env['PATH']
suites=[('research-python',[sys.executable,'-m','unittest','discover','-s','services/pvlib_research/tests','-v']),('production-python',[sys.executable,'-m','unittest','discover','-s','services/pvlib_study/tests','-v']),('research-api',['npm','run','test:research:api']),('integrated',['npx','tsx','scripts/test-integrated-study.ts']),('workflow',['npm','run','test:study:workflow']),('lint',['npm','run','lint']),('build',['npm','run','build']),('research-browser',['npm','run','test:research:browser']),('direct-http',['npm','run','test:study']),('existing-browsers',['npm','run','test:study:browser']),('integrated-browser',['npx','tsx','scripts/test-integrated-browser.ts']),('core',['npm','test']),('audit',['npm','run','test:audit'])]
paths=sorted([p for directory in ('src','services','scripts') for p in (root/directory).rglob('*') if p.is_file() and p.suffix in ('.ts','.tsx','.py','.json','.txt') and '__pycache__' not in p.parts]+[root/'server.ts',root/'package.json',root/'.github/workflows/ci.yml'])
files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
snapshot=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()
results=[]
for name,cmd in suites:
    start=time.monotonic();log=folder/(name+'.log')
    with log.open('w') as output:
        try:code=subprocess.run(cmd,cwd=root,env=env,stdout=output,stderr=subprocess.STDOUT,timeout=420).returncode
        except subprocess.TimeoutExpired:code=124
    result=dict(suite=name,exitCode=code,seconds=round(time.monotonic()-start,2),logSha256=hashlib.sha256(log.read_bytes()).hexdigest());results.append(result);print(result,flush=True)
assert files=={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},'Code changed during final validation'
receipt=dict(codeSnapshotSha256=snapshot,files=files,timestamp=datetime.now(timezone.utc).isoformat(),head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),scope='local dirty working tree; not exact-SHA remote CI',results=results)
(folder/'summary.json').write_text(json.dumps(receipt,indent=2))
sys.exit(any(r['exitCode'] for r in results))
