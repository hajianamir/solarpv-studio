import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,mkdirSync,statSync,symlinkSync,readlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
mkdirSync('.cache',{recursive:true});
const root=mkdtempSync(resolve('.cache/snapshot-recovery-'));
const probe=join(root,'probe.mts');
writeFileSync(probe,`
import assert from 'node:assert/strict';
const m=await import(${JSON.stringify(pathToFileURL(resolve('server.ts')).href)});
const blocked=process.env.EXPECT_BLOCKED==='true';
assert.equal(m.isDatabaseRecoveryBlocked(),blocked);
m.setPersistPathForTesting(process.env.SOLARPV_DB_FILE!);
assert.equal(m.saveDatabase(),!blocked,'direct save cannot bypass failed recovery');
assert.equal(m.db.projects.size,Number(process.env.EXPECT_PROJECTS),'failed restore cannot seed or partially import projects');
if(process.env.EXPECT_RESTORED==='true')assert.equal(m.db.projects.get('kept')?.name,'Kept project');
const server=m.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const address=server.address();assert.ok(address&&typeof address==='object');
const health=await fetch('http://127.0.0.1:'+address.port+'/api/health');
assert.equal(health.status,blocked?503:200);
assert.equal((await health.json()).status,blocked?'degraded':'healthy');
server.closeAllConnections();await new Promise(r=>server.close(r));
setInterval(()=>{},1000);
console.log('RECOVERY_READY');
`);
const valid={version:1,projects:[],pvModules:[],inverters:[],batteries:[],outbox:[]};
try{
 for(const test of [
  {name:'broken-json-term',bytes:'{BROKEN_ORIGINAL',blocked:true,signal:'SIGTERM'},
  {name:'broken-json-int',bytes:'{BROKEN_ORIGINAL',blocked:true,signal:'SIGINT'},
  {name:'unsupported-schema',bytes:'{}',blocked:true,signal:'SIGTERM'},
  {name:'malformed-map',bytes:JSON.stringify({...valid,projects:[['bad']]}),blocked:true,signal:'SIGTERM'},
  {name:'valid-empty',bytes:JSON.stringify(valid),blocked:false,signal:'SIGTERM'},
  {name:'valid-populated',bytes:JSON.stringify({...valid,projects:[['kept',{id:'kept',name:'Kept project'}]]}),blocked:false,signal:'SIGTERM'},
  {name:'new-file',bytes:undefined,blocked:false,signal:'SIGTERM'},
  {name:'io-error-directory',bytes:undefined,blocked:true,signal:'SIGTERM',directory:true},
  {name:'dangling-symlink',bytes:undefined,blocked:true,signal:'SIGTERM',symlink:true},
 ] as const){
  if ('symlink' in test && process.platform === 'win32') continue; // Windows symlinks require separate privileges/native gate.
  const file=join(root,test.name+'.json');
  if(test.bytes!==undefined)writeFileSync(file,test.bytes);
  if('directory'in test)mkdirSync(file);
  if('symlink'in test)symlinkSync('missing-original-target.json',file);
  const child=spawn(process.execPath,['--import','tsx',probe],{env:{...process.env,NODE_ENV:'test',VITE_REAL_INTERNET:'false',SOLARPV_DB_FILE:file,EXPECT_BLOCKED:String(test.blocked),EXPECT_PROJECTS:String(test.name==='new-file'||test.name==='valid-populated'?1:0),EXPECT_RESTORED:String(test.name==='valid-populated')},stdio:['ignore','pipe','pipe']});
  let output='',errors='',ready=false;
  child.stdout.on('data',chunk=>{output+=chunk;if(!ready&&output.includes('RECOVERY_READY')){ready=true;child.kill(test.signal);}});
  child.stderr.on('data',chunk=>{errors+=chunk;});
  const code=await new Promise<number|null>((resolveExit,reject)=>{
   const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Recovery probe timed out'));},15000);
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('exit',value=>{clearTimeout(timer);resolveExit(value);});
  });
  assert.equal(code,0,`${test.name}: ${errors}`);assert.ok(ready,test.name);
  if(test.blocked&&test.bytes!==undefined)assert.deepEqual(readFileSync(file),Buffer.from(test.bytes),`${test.name}: original bytes must survive import, explicit save and shutdown`);
  if('symlink'in test)assert.equal(readlinkSync(file),'missing-original-target.json');
  else if('directory'in test)assert.ok(statSync(file).isDirectory());
  else assert.ok(existsSync(file));
  assert.equal(existsSync(file+'.tmp'),false,'blocked recovery must not leave a replacement temp file');
  console.log(`PASS ${test.name}`);
 }
}finally{rmSync(root,{recursive:true,force:true});}
console.log('PASS snapshot recovery: missing vs unreadable/invalid, no seed/partial import, direct-save and SIGINT/SIGTERM preservation, degraded health.');
