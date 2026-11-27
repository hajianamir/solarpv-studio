import assert from 'node:assert/strict';
import {planSuite, commandStatus, assessRun, SUITES, sourceIdentity} from './phase4-verification.mjs';
import {readFileSync} from 'node:fs';
const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
for(const suite of Object.keys(SUITES)) {
  const plan=planSuite(suite,scripts);
  assert.equal(new Set(plan.map(p=>p.script)).size,plan.length);
  const good=plan.map(p=>({script:p.script,status:'PASS'}));
  assert.equal(assessRun(plan,good,true).softwareChecks,'PASS_WITHIN_SELECTED_SUITE');
  assert.equal(assessRun(plan,good,true).release,'BLOCKED');
  for (const invalid of [good.slice(1),[...good,{script:'extra',status:'PASS'}],good.map((r,i)=>i===0?{...r,status:'FAIL'}:r),good.map((r,i)=>i===0?{...r,status:'SKIP'}:r),[...good].reverse()]) {
    assert.equal(assessRun(plan,invalid,true).softwareChecks,'FAILED_OR_INCOMPLETE');
  }
  assert.equal(assessRun(plan,good,false).softwareChecks,'FAILED_OR_INCOMPLETE');
  const missing={...scripts};delete missing[plan[0].script];
  assert.throws(()=>planSuite(suite,missing),/MISSING_SCRIPT/);
}
assert.throws(()=>planSuite('__proto__',scripts),/UNKNOWN_SUITE/);
assert.throws(()=>planSuite('unknown',scripts),/UNKNOWN_SUITE/);
assert.equal(assessRun([],[],true).softwareChecks,'FAILED_OR_INCOMPLETE');
assert.equal(commandStatus({status:0,signal:null}),'PASS');
for(const result of [{status:1},{status:null},{status:0,signal:'SIGTERM'},{status:0,error:{code:'ETIMEDOUT'}}])assert.equal(commandStatus(result),'FAIL');
const identity=sourceIdentity();assert.match(identity.sha256,/^[a-f0-9]{64}$/);
assert.ok(identity.files['src/App.tsx']);assert.ok(identity.files['scripts/phase4-verification.mjs']);
assert.ok(!Object.keys(identity.files).some(p=>p.startsWith('.cache/')||p.startsWith('docs/')));
console.log('PASS Phase4 harness: exact script inventory, missing/duplicate/skip/order/failure/stale-source rejection; local PASS cannot authorize release; executable-source identity');
