import assert from 'node:assert/strict';
import {calculateLightningProtection} from '../src/engine/protectionBomEngine';
// Unsupported geometry stays unavailable for every currently reachable screen input.
// These are containment tests, not independent IEC numerical-reference cases.
for(const kw of [0,.5,5,100,1000,100000])
for(const utility of [false,true])
for(const days of [0,5,20,100]){
 const result=calculateLightningProtection(kw,utility,days);
 assert.equal(result.assessmentStatus,'unassessed');
 assert.equal(result.protectionAngleDeg,null);
 assert.equal(result.separationDistanceCm,null);
 assert.ok(result.isPreliminaryAssessment);
 assert.ok([20,30,45,60].includes(result.rollingSphereRadiusM));
 assert.match(result.installationGuidelinesEn!.join(' '),/UNASSESSED.*topology/);
 assert.doesNotMatch(result.installationGuidelinesFa.join(' '),/به میزان \d/);
 const restored=JSON.parse(JSON.stringify(result));
 assert.equal(restored.separationDistanceCm,null);
 assert.equal(restored.assessmentStatus,'unassessed');
}
console.log('PASS LPS containment: 48 screen inputs retain null angle/separation through JSON, qualified rolling sphere and non-imperative installation guidance. No IEC validation claimed.');
