import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const runtimeSecret=randomBytes(32).toString('hex');
const suffix=randomBytes(6).toString('hex');
const image=`solarpv-runtime-smoke:${suffix}`;
const name=`solarpv-runtime-smoke-${suffix}`;
function docker(args,options={}){
 const result=spawnSync('docker',args,{encoding:'utf8',timeout:600000,maxBuffer:8*1024*1024,...options});
 if(result.error||result.status!==0)throw new Error(`Docker ${args[0]} failed: ${result.error?.message??result.stderr}`);
 return result.stdout.trim();
}
// This is intentionally a real-image gate, not a source-copy approximation.
// Docker unavailable is a failure, never a skipped green release result.
docker(['version']);
try{
 docker(['build','--tag',image,'.']);
 docker(['run','--detach','--name',name,'--publish','127.0.0.1::3000',
  '--env','INTERNAL_GATEWAY_SECRET','--env','SOLARPV_DB_FILE=/tmp/solarpv-smoke-db.json',image],
  {env:{...process.env,INTERNAL_GATEWAY_SECRET:runtimeSecret}});
 const port=docker(['inspect','--format','{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}',name]);
 let healthy=false;
 for(let attempt=0;attempt<60;attempt++){
  if(docker(['inspect','--format','{{.State.Running}}',name])!=='true')break;
  try{
   const res=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(2000)});
   if(res.ok){assert.equal((await res.json()).status,'healthy');healthy=true;break;}
  }catch{}
  await delay(500);
 }
 assert.ok(healthy,'Fresh final image must serve healthy /api/health without a source bind mount');
 console.log('PASS real Docker final image: standalone production boot and health endpoint; no source bind mounts. Python scientific runtimes not certified by this smoke test.');
}catch(error){
 // Surface bounded diagnostics through the Checks API when runner log storage
 // is unreachable. The exit status remains failing; never turn this into skip.
 if(process.env.GITHUB_ACTIONS==='true'){
  const logs=spawnSync('docker',['logs','--tail','40',name],{encoding:'utf8',timeout:10000,maxBuffer:64000});
  const message=(String(error instanceof Error?error.message:error)+'\n'+(logs.stdout??'')+'\n'+(logs.stderr??''))
   .replaceAll(runtimeSecret,'[REDACTED]').slice(-12000)
   .replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
  console.error(`::error title=Standalone container failure::${message}`);
 }
 throw error;
}finally{
 spawnSync('docker',['rm','--force',name],{stdio:'ignore'});
 spawnSync('docker',['image','rm',image],{stdio:'ignore'});
}
