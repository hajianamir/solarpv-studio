import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {IntegratedPlanSchema,validateIntegratedResult,makeIntegratedArchive,restoreIntegratedArchive,migrateLegacyMppt} from '../src/studies/integratedStudy';
import {validateResult} from '../src/studies/studyWorkflow';
import {StudyRequestSchema} from '../src/studies/studyContract';
const run=spawnSync(process.env.PVLIB_PYTHON??'python',['-B','scripts/integrated-study-bridge.py'],{encoding:'utf8',maxBuffer:32*1024*1024,timeout:120000});
assert.equal(run.status,0,run.stderr);
const evidence:{index:number;state:string}[]=[];
let runtime=0,rejected=0;
for(const line of run.stdout.trim().split('\n')){
  const row=JSON.parse(line);
  assert.equal(row.pythonAccepted,row.expected,`Python integrated case ${row.index}`);
  assert.equal(IntegratedPlanSchema.safeParse(row.plan).success,row.expected,`TS integrated case ${row.index}`);
  if(row.result){
    const result=validateIntegratedResult(row.result);runtime++;
    // safeParse must reject malformed boundaries without throwing TypeError.
    for(const inputs of [[],result.plan.inputs.slice(0,1),Array(5).fill(result.plan.inputs[0])]){
      let accepted=true;assert.doesNotThrow(()=>{accepted=IntegratedPlanSchema.safeParse({...result.plan,inputs}).success;});assert.equal(accepted,false);
    }
    assert.throws(()=>validateResult(result)); // never mistaken for legacy StudyResult v1
    const archive=makeIntegratedArchive(result);
    assert.deepEqual(restoreIntegratedArchive(JSON.stringify(archive)),result);
    for(const mutate of [
      (r:typeof result)=>{r.samples[1].inverterNetAcW+=10;},
      (r:typeof result)=>{r.samples[0].importW*=2;},
      (r:typeof result)=>{r.summary.netWh+=1;},
      (r:typeof result)=>{r.planCanonicalJson+=' ';},
      (r:typeof result)=>{r.children[0].id='wrong';},
      (r:typeof result)=>{r.budget.childSolves+=1;},
    ]){const corrupt=structuredClone(result);mutate(corrupt);assert.throws(()=>validateIntegratedResult(corrupt));}
    const corrupt=structuredClone(archive);corrupt.result.summary.netWh++;
    assert.throws(()=>restoreIntegratedArchive(JSON.stringify(corrupt)),/checksum/);
    if(row.index===0){
      const legacy=structuredClone(result.plan.inputs[0].request);delete legacy.system.electrical;
      legacy.system.arrayPdc0W=8800;
      legacy.system.mpptInputs=result.plan.inputs.map(e=>({id:e.id,source:'Synthetic migration',quality:'assumed' as const,surfaceTiltDeg:e.request.system.surfaceTiltDeg,surfaceAzimuthDeg:e.request.system.surfaceAzimuthDeg,arrayPdc0W:e.request.system.arrayPdc0W,electrical:e.request.system.electrical!}));
      StudyRequestSchema.parse(legacy);const before=structuredClone(legacy);
      const migrated=migrateLegacyMppt(legacy,result.plan.inverter,'Explicit test migration');
      assert.deepEqual(legacy,before);assert.equal(migrated.inputs.length,2);
      legacy.system.acExportLimitW=1;
      assert.throws(()=>migrateLegacyMppt(legacy,result.plan.inverter,'must not discard'));
    }
  }else rejected++;
  evidence.push({index:row.index,state:row.state});
}
assert.equal(runtime,4);assert.equal(rejected,12);assert.equal(evidence.length,16);
mkdirSync('.cache/study-evidence',{recursive:true});
writeFileSync('.cache/study-evidence/integrated-matrix-v1.json',JSON.stringify({schemaVersion:'integrated-contract-evidence-v1',total:16,runtimeExecuted:runtime,rejected,contractOnly:0,scope:'bounded discrete axes, not all domains or field validation',cases:evidence},null,2));
console.log('Stage55 PASS: 16 dual-language cases, 12 rejected and 4 actual two-worker runtimes; independent JS Sandia equations, shared tare, immutable migration/archive/tamper gates. Not field validated.');
