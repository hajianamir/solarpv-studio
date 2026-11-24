import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {StudyRequestSchema} from '../src/studies/studyContract';
import {validateResult} from '../src/studies/studyWorkflow';
const p=spawnSync(process.env.PVLIB_PYTHON??'python',['-B','scripts/study-matrix-bridge.py'],{encoding:'utf8',maxBuffer:128*1024*1024});assert.equal(p.status,0,p.stderr);
const evidence:{index:number;case:number[];state:string}[]=[];let rejected=0,executed=0;
for(const line of p.stdout.trim().split('\n')){
 const row=JSON.parse(line);assert.equal(row.pythonAccepted,row.expected,`Python case ${row.index}`);assert.equal(StudyRequestSchema.safeParse(row.request).success,row.expected,`TS case ${row.index}`);
 if(!row.expected)rejected++;if(row.result){validateResult(row.result);executed++;}
 evidence.push({index:row.index,case:row.case,state:row.state});
}
assert.equal(evidence.length,8192);assert.equal(rejected,4352);assert.ok(executed>0);
mkdirSync('.cache/study-evidence',{recursive:true});writeFileSync('.cache/study-evidence/contract-matrix-v2.json',JSON.stringify({schemaVersion:'study-contract-matrix-v2',classification:'bounded discrete contracts; no parameter-domain or field proof',axes:['geometry','sky','iam','spectral','thermal','dc','ac','plant','horizon','environment','exportcap'],total:8192,rejected,runtimeExecuted:executed,contractOnly:8192-rejected-executed,cases:evidence},null,2));
console.log(`Dual-language matrix PASS: 8192 independently expected contracts, ${rejected} rejected; ${executed} actual runtime results validated in TS; ${8192-rejected-executed} contract-only. All admissible option pairs covered, not continuous parameter domains.`);
