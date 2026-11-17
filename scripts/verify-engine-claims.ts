import assert from 'node:assert/strict';
import { analyzePowerplantHarmonics, analyzeUpstreamGridConditions } from '../src/engine/harmonicsEngine';
import { designMvSubstation } from '../src/engine/mvSubstationEngine';
import { calculateEarthingSystem } from '../src/engine/protectionBomEngine';

const harmonics = analyzePowerplantHarmonics(5, 20, 8);
assert.equal(harmonics.isThdCompliant, null);
assert.equal(harmonics.isTddCompliant, null);
assert.equal(typeof harmonics.thdScreenPassed, 'boolean');
assert.ok(harmonics.individualHarmonics.every((h) => typeof h.withinReferenceLimit === 'boolean'));

const grid = analyzeUpstreamGridConditions({
  plantCapacityMw: 5,
  gridVoltageKv: 20,
  gridShortCircuitMva: 250,
  gridXrRatio: 8,
  inverterPowerFactor: 0.98,
  isPowerFactorLagging: true,
});
assert.equal(grid.pccVoltageRiseCompliant, null);
assert.equal(grid.isFlickerCompliant, null);
assert.equal(typeof grid.pccVoltageRiseScreenPassed, 'boolean');
assert.equal(typeof grid.flickerScreenPassed, 'boolean');
assert.equal(grid.lvrtCompliance.status, 'screening_only');

const substation = designMvSubstation({
  plantCapacityAcMva: 10,
  inverterOutputVoltageV: 800,
  gridConnectionVoltageKv: 20,
  soilResistivityOhmM: 80,
  clearingTimeSec: 0.5,
});
assert.equal(substation.earthing.isCompliant, null);
assert.equal(substation.earthing.isResistanceCompliant, null);
assert.equal(substation.earthing.isTouchSafe, null);
assert.equal(substation.earthing.isStepSafe, null);
assert.equal(substation.earthing.isConductorCompliant, null);
assert.equal(typeof substation.earthing.screeningPassed, 'boolean');

const protectionGrounding = calculateEarthingSystem(5000, 80, 'solidly_grounded', true);
assert.equal(protectionGrounding.isTouchVoltageSafe, null);
assert.equal(protectionGrounding.isStepVoltageSafe, null);
assert.equal(protectionGrounding.isResistanceCompliant, null);
assert.equal(protectionGrounding.isEarthingSafe, null);
assert.equal(typeof protectionGrounding.screeningPassed, 'boolean');

console.log('Engineering claims contract passed (IEEE 519 and IEEE 80 compliance/safety remain unevaluated; only internal screens are reported).');
