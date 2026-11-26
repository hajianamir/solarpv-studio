import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {changedFormulaUnits} from './verify-physics-reference-gate';
const review=JSON.parse(readFileSync('docs/audit/CAD-EXPRESSION-EVIDENCE-REVIEW.json','utf8'));
const source=readFileSync(review.sourceFile,'utf8');
const before=execFileSync('git',['show',`${review.baseline}:${review.sourceFile}`],{encoding:'utf8'});
const units=changedFormulaUnits(review.sourceFile,before,source);
const manifest=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8'));
function validate(entries:typeof review.expressions){
 assert.equal(entries.length,units.length,'Advisory review must cover every changed expression, not silently exclude one');
 assert.equal(new Set(entries.map((e:{formulaId:string})=>e.formulaId)).size,entries.length);
 for(const unit of units){
  const entry=entries.find((e:{formulaId:string})=>e.formulaId===unit.formulaId);assert.ok(entry,unit.formulaId);assert.equal(entry.expression,unit.expression);
  assert.equal(entry.referenceGateSatisfiedByThisReview,false,'Classification is not an independent gate fixture');
  assert.ok(typeof entry.assessment==='string'&&entry.assessment.length>40);
 }
}
assert.equal(createHash('sha256').update(source).digest('hex'),review.sourceSha256,'Source changed: review expression applicability again');
validate(review.expressions);
assert.throws(()=>validate(review.expressions.slice(1)));
assert.throws(()=>validate(review.expressions.map((e:object,i:number)=>i===0?{...e,referenceGateSatisfiedByThisReview:true}:e)));
const absent=units.filter(unit=>!manifest.fixtures.some((record:{formulaId:string})=>record.formulaId===unit.formulaId));
console.log(JSON.stringify({status:'PASS advisory inventory only',expressions:units.length,missingIndependentRecords:absent.length,categories:review.classificationCounts,releaseGate:'NOT_WAIVED'}));
