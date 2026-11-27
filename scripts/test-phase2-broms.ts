import assert from 'node:assert/strict';
import {calculateBromsPileSizing} from '../src/engine/geotech/bromsMethod';
import {calculateStructuralAndFoundations} from '../src/engine/structuralEngine';
import {FIXTURE_S1} from '../src/engine/core/structuralContract';
let count=0,legacyPasses=0;
for(const soil of ['medium_clay','loose_sand','dense_sand_gravel'] as const)
for(const lateral of [0,.1,5,10000])for(const lever of [0,.8,2,4])for(const target of [1,1.75,2.5]){
 const r=calculateBromsPileSizing(lateral,lever,.5,soil,250,34,35,18,target);
 assert.equal(r.assessmentStatus,'unassessed');assert.equal(r.isFosSafe,false);assert.match(r.notes,/UNASSESSED.*head restraint/);
 if(r.legacyScreenPassed)legacyPasses++;
 if(r.isSearchLimitExhausted)assert.equal(r.legacyScreenPassed,false);
 assert.equal(JSON.parse(JSON.stringify(r)).isFosSafe,false);count++;
}
assert.ok(legacyPasses>0,'Contains cases which previously asserted a safe design');
const structural=calculateStructuralAndFoundations({...FIXTURE_S1,foundationType:'rammed_steel_pile'});
assert.equal(structural.isStructurallySafe,false);assert.match(structural.safetyReasonEn,/UNASSESSED.*regime/);
console.log(`PASS Broms containment: ${count} unsupported domain cases cannot assert safety, ${legacyPasses} previous green-screen witnesses retained as diagnostic only; actual structural consumer blocked.`);
