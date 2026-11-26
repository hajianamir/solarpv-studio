import assert from 'node:assert/strict';
import {once} from 'node:events';
process.env.NODE_ENV='test';process.env.VITE_REAL_INTERNET='false';delete process.env.JWT_SECRET;
const {app}=await import('../server');
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
const address=server.address();assert.ok(address&&typeof address==='object');
const base=`http://127.0.0.1:${address.port}`;
const payload={projectName:'screening HTTP',latitude:35.69,longitude:51.39,dailyKwh:20,autonomyDays:1.5,persist:false};
async function post(body:unknown){return fetch(`${base}/api/v1/projects/quick-size`,{method:'POST',headers:{'content-type':'application/json','x-user-id':'audit-test'},body:JSON.stringify(body)});}
try{
 assert.equal((await post({...payload,longitude:undefined,allowAnalyticalEstimate:true})).status,400);
 for(const consent of [undefined,false,'true',1]){
  const res=await post({...payload,allowAnalyticalEstimate:consent});assert.equal(res.status,422);assert.equal((await res.json()).code,'SCREENING_CONSENT_REQUIRED');
 }
 const response=await post({...payload,allowAnalyticalEstimate:true});assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.assessment.designGrade,false);assert.equal(data.assessment.climateConfidence,'analytical_estimate');assert.equal(data.assessment.status,'screening_only');
 const string=await fetch(`${base}/api/v1/electrical/string-sizing`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({panelVoc:60,panelVmp:50,tempMinC:25,tempMaxC:25,betaVocPerC:-.0028,betaVmpPerC:-.003,inverterVdcMax:48,inverterMpptMin:10,inverterMpptMax:48,isCellTemp:true})});
 assert.equal(string.status,422);const invalid=await string.json();assert.equal(invalid.status,'infeasible');assert.equal(invalid.maxModules,0);
 console.log('PASS HTTP: required longitude, strict screening opt-in, provenance and non-design-grade response.');
}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
