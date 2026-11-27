import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {legacyClippingScreen} from '../src/engine/core/legacyClippingScreen';
import {calculatePhysicalClippingLossPct} from '../src/engine/core/annualYieldEngine';
import {computeConfiguredWaterfall} from '../src/engine/waterfallArgs';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/legacy-clipping-decimal.json','utf8'));
for(const c of fixture.cases) {
 const ratio=c.inputs[0];
 assert.ok(Math.abs(legacyClippingScreen(ratio).clippingPct-c.expected.clippingPct)<1e-12);
 const oldApi=calculatePhysicalClippingLossPct(ratio);
 assert.equal(oldApi.clippingLossPct,Number(c.expected.clippingPct.toFixed(4)));
 assert.equal(oldApi.rawClippingLossPct,Number(c.expected.rawClippingPct.toFixed(4)),'Preserve raw loss before policy clamp');
 const report=computeConfiguredWaterfall({installedCapacityKwp:100,peakSunHours:5,dcAcRatio:ratio});
 const clip=report.stages.find(s=>s.id==='clipping');assert.ok(clip);
 assert.ok(Math.abs(clip.percentageLossRaw-c.expected.clippingPct)<1e-12,'Waterfall retains raw precision, not the four-decimal adapter output');
}
for(const ratio of [undefined,NaN,Infinity,-Infinity]) {
 // Preserve different historical boundary normalization; consolidation is NOT
 // permission to silently turn a waterfall NaN into valid assessed production.
 assert.equal(calculatePhysicalClippingLossPct(ratio as number).clippingLossPct,-.2);
}
assert.ok(Number.isNaN(legacyClippingScreen(NaN).clippingPct));
assert.equal(legacyClippingScreen(Infinity).clippingPct,-85);
assert.equal(legacyClippingScreen(-Infinity).clippingPct,-.2);
console.log(`PASS unchanged clipping consolidation: ${fixture.cases.length} independent Decimal arithmetic characterizations, annual/waterfall precision adapters and historical nonfinite boundaries. NOT external physical clipping validation.`);
