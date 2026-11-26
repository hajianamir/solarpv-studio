import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {executeReferenceFixture} from './verify-physics-reference-gate';
const manifest=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8'));
const records=manifest.fixtures.filter((r:{fixtureFile:string})=>/\/(solar-spa-|priority-string-)/.test(r.fixtureFile));
assert.equal(records.length,10,'Exactly 3 SPA and 7 integer-feasibility witnesses must remain registered');
for(const record of records)await executeReferenceFixture(record);
console.log('PASS 10 priority registry witnesses: independently generated outputs and exact-node mutation sensitivity. Not full physics-gate or standards certification.');
