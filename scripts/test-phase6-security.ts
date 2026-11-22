import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {StudyExecutor,StudyError} from '../src/server/pvlibStudy';
import {ResearchExecutor} from '../src/server/researchApi';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {ResearchRequestSchema} from '../src/studies/researchApi';
import {thermalExample} from '../src/studies/researchExamples';
const temp=mkdtempSync(path.join(tmpdir(),'solarpv-phase6-'));
process.env.SOLARPV_DB_FILE=path.join(temp,'db.json');process.env.NODE_ENV='production';
process.env.JWT_SECRET='phase6-test-only-not-a-deployment-secret';process.env.JWT_ISSUER='phase6';process.env.JWT_AUDIENCE='phase6-api';
process.env.PVLIB_RESEARCH_ENABLED='true';process.env.PVLIB_STUDY_ENABLED='true';delete process.env.INTERNAL_GATEWAY_SECRET;
const {app}=await import('../server');const server=app.listen(0,'127.0.0.1');await once(server,'listening');const a=server.address();assert.ok(a&&typeof a==='object');const base=`http://127.0.0.1:${a.port}`;
const token=(changes:Record<string,unknown>={},alg='HS256')=>{const h=Buffer.from(JSON.stringify({alg,typ:'JWT'})).toString('base64url'),c=Buffer.from(JSON.stringify({sub:'alice',iss:'phase6',aud:'phase6-api',exp:Math.floor(Date.now()/1000)+300,...changes})).toString('base64url');return `${h}.${c}.${createHmac('sha256',process.env.JWT_SECRET!).update(`${h}.${c}`).digest('base64url')}`;};
const headers=(t=token())=>({Authorization:`Bearer ${t}`,'Content-Type':'application/json'});
let authCases=0;
try{
 const page=await fetch(`${base}/api/health`);const csp=page.headers.get('content-security-policy')!;assert.ok(csp.includes("script-src 'self';"));assert.ok(!csp.includes('unsafe-eval'));assert.equal(page.headers.get('x-content-type-options'),'nosniff');
 for(const bad of [token({iss:'wrong'}),token({aud:'wrong'}),token({exp:0}),token({exp:undefined}),token({nbf:Date.now()/1000+600}),token({iat:'bad'}),token({},'none'),token()+'corrupt']){
  const r=await fetch(`${base}/api/v1/research/run`,{method:'POST',headers:headers(bad),body:'{'});assert.equal(r.status,401);authCases++;
 }
 for(const spoof of ([{'x-user-id':'alice'},{'x-user-id':'alice','x-gateway-secret':'fake'},{Authorization:'Bearer alice'}] as Record<string,string>[])){const r=await fetch(`${base}/api/v1/research/run`,{method:'POST',headers:{'Content-Type':'application/json',...spoof},body:'{'});assert.equal(r.status,401);authCases++;}
 const malformed=await fetch(`${base}/api/v1/research/run`,{method:'POST',headers:headers(),body:'{'});assert.equal(malformed.status,400);assert.equal(malformed.headers.get('cache-control'),'no-store');
 const projects=await fetch(`${base}/api/v1/projects`);assert.equal(projects.status,401);
 const created=await fetch(`${base}/api/v1/projects/quick-size`,{method:'POST',headers:headers(),body:JSON.stringify({projectName:'phase6-owned',dailyKwh:30,autonomyDays:1,latitude:35,longitude:51,ownerId:'bob'})});
 // Use the public quick-sizing route name from the app's contract.
 assert.equal(created.status,200,await created.clone().text());const id=(await created.json()).projectId;assert.ok(id);
 const own=await fetch(`${base}/api/v1/projects/${id}`,{headers:headers()});assert.equal(own.status,200);assert.equal((await own.json()).ownerId,'alice');
 const other=await fetch(`${base}/api/v1/projects/${id}`,{headers:headers(token({sub:'bob'}))});assert.equal(other.status,403);
 const all=await (await fetch(`${base}/api/v1/projects`,{headers:headers(token({sub:'bob'}))})).json();assert.ok(!all.some((p:{id:string})=>p.id===id));
 const patch=await fetch(`${base}/api/v1/projects/${id}`,{method:'PUT',headers:headers(token({sub:'bob'})),body:JSON.stringify({name:'stolen',requesterId:'alice'})});assert.equal(patch.status,403);
 const study=StudyRequestSchema.parse(JSON.parse(readFileSync('services/pvlib_study/tests/synthetic-study.json','utf8'))),research=ResearchRequestSchema.parse(thermalExample);
 for(const kind of ['study','research']){
  const script=path.join(temp,`${kind}.py`),pidfile=path.join(temp,`${kind}.pid`);
  writeFileSync(script,`import subprocess,sys,time\np=subprocess.Popen([sys.executable,'-c','import time;time.sleep(90)'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)\nopen(${JSON.stringify(pidfile)},'w').write(str(p.pid))\ntime.sleep(90)\n`);
  const abort=new AbortController();
  const running=kind==='study'?new StudyExecutor({script,timeoutMs:15000}).run(study,abort.signal):new ResearchExecutor({script,timeoutMs:15000}).run(research,abort.signal);
  const rejected=assert.rejects(running,(e:unknown)=>e instanceof StudyError&&e.code==='CANCELLED');
  const deadline=Date.now()+10000;while(!existsSync(pidfile)){if(Date.now()>deadline)throw new Error('Child did not start');await new Promise(r=>setTimeout(r,25));}
  const pid=Number(readFileSync(pidfile,'utf8'));abort.abort();await rejected;
  const stopped=()=>{try{process.kill(pid,0);if(process.platform==='linux')return readFileSync(`/proc/${pid}/stat`,'utf8').split(' ')[2]==='Z';return false;}catch{return true;}};
  const killedBy=Date.now()+5000;while(!stopped()&&Date.now()<killedBy)await new Promise(r=>setTimeout(r,25));assert.equal(stopped(),true,`${kind} descendant survived cancellation`);
 }
 mkdirSync('.cache/phase6',{recursive:true});writeFileSync('.cache/phase6/security.json',JSON.stringify({schemaVersion:'phase6-security-v1',sha:process.env.GITHUB_SHA??'local-working-tree',platform:process.platform,authCases,status:'passed',tests:['production CSP','JWT claims/algorithm/signature/header spoofing','auth before research parser','private ownership/read/write/list isolation','study+research actual descendant cancellation']},null,2));
 console.log('PASS phase6 security: JWT/auth/body, CSP, cross-owner isolation, actual study/research process-tree cancellation');
}finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));rmSync(temp,{recursive:true,force:true});}
