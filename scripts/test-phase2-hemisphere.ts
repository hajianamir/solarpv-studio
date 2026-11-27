import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simulateAnnualHourlyThermalDerate, annualEnergyFactor, type HourlyThermalModelInput} from '../src/engine/core/hourlyThermalEngine';
import {computeCanonicalAnnualYield} from '../src/engine/core/annualYieldEngine';
import {computeConfiguredWaterfall} from '../src/engine/waterfallArgs';
import {signedThermalLossFromStage} from '../src/engine/core/signedThermalStage';
import {assertReferenceValue} from './verify-physics-reference-gate';

const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/hemisphere-thermal-pvlib.json','utf8'));
for(const c of fixture.cases) {
  const result=simulateAnnualHourlyThermalDerate(c.inputs[0]);
  assertReferenceValue(result,c.expected,fixture.tolerances.absolute,fixture.tolerances.relative);
  assert.equal(result.irradianceAnnualKwhM2,c.inputs[0].peakSunHours*365);
  assert.equal(result.isMeasuredHourlyWeather,false);
  assert.match(result.methodologyNote,/synthetic/);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
}
const base:HourlyThermalModelInput={latitudeDeg:-35,peakSunHours:5,ambientTempMinC:-20,ambientTempMaxC:40,ambientTempMeanC:10,noctC:40,tempCoeffPmpPct:-.3};
// Compare against independently reconstructed OLD northern-only phase. This is
// a defect witness, not a claim that actual north/south sites have identical climates.
const south=simulateAnnualHourlyThermalDerate(base);
assert.ok(Math.abs(south.annualThermalDeratePct-fixture.previousNorthernOnlyPolicySouthDeratePct)>fixture.tolerances.absolute, 'Independent southern witness must distinguish the original northern-only temperature phase');
const equator=simulateAnnualHourlyThermalDerate({...base,latitudeDeg:0});
assert.equal(equator.seasonalTemperaturePolicy,'hemisphere_cosine_equator_flat_v1');
for(const latitudeDeg of [-90,-35,0,35,90]) {
 const zero=simulateAnnualHourlyThermalDerate({...base,latitudeDeg,peakSunHours:0});
 assert.equal(zero.annualThermalDeratePct,0,'No generation has a neutral loss budget, not the old 100% loss');
 assert.deepEqual(zero.temperatureSensitivityRangePct,{low:0,high:0});
 assert.equal(zero.energyAvailability,'zero_reference_irradiation');
}
for(const bad of [
 {latitudeDeg:NaN},{latitudeDeg:91},{peakSunHours:-1},{peakSunHours:Infinity},
 {ambientTempMinC:undefined},{ambientTempMaxC:undefined},{ambientTempMinC:NaN},{ambientTempMaxC:-30},{ambientTempMinC:-274},
 {ambientTempMeanC:NaN},{ambientTempMeanC:50},{noctC:NaN},{tempCoeffPmpPct:Infinity},
 {ambientBiasSensitivityC:NaN},{ambientBiasSensitivityC:-1},
]) assert.throws(()=>simulateAnnualHourlyThermalDerate({...base,...bad} as HourlyThermalModelInput),RangeError);
for(const installationEnvironment of ['ground_mount','industrial_shed','rooftop_flat_concrete'] as const)
for(const annualThermalDerateOverridePct of [-10,0,10,100]) {
 const input={installedCapacityKwp:100,peakSunHours:5,ambientTempMaxC:40,tiltDeg:25,latitudeDeg:-35,installationEnvironment,annualThermalDerateOverridePct};
 const report=computeConfiguredWaterfall(input);
 const canonical=computeCanonicalAnnualYield(input);
 assert.equal(canonical.annualYieldKwh,report.finalEnergyKwh);
 assert.equal(canonical.thermalDeratePctUsed,annualThermalDerateOverridePct);
 const restored=JSON.parse(JSON.stringify(canonical));
 assert.equal(restored.thermalDeratePctUsed,annualThermalDerateOverridePct);
 assert.ok(restored.waterfallReport.stages.find((s:{id:string})=>s.id==='thermal').percentageLossRaw === -annualThermalDerateOverridePct, 'JSON normalizes signed zero; nonzero gain/loss signs must survive');
}
assert.throws(()=>simulateAnnualHourlyThermalDerate({...base,installationEnvironment:'unknown'} as unknown as HourlyThermalModelInput));
for(const [bias,mean] of [[NaN,10],[0,Infinity],[Infinity,10],[0,-274]]) assert.throws(()=>annualEnergyFactor(base,bias,mean));
assert.equal(signedThermalLossFromStage(),-0);
for(const bad of [NaN,Infinity,-Infinity])assert.throws(()=>signedThermalLossFromStage(bad));
console.log(`PASS hemisphere thermal: ${fixture.cases.length} independent numpy/pvlib policy-integration cases; ±latitude/equator/polar, zero PSH, invalid input and signed canonical/waterfall JSON parity. Synthetic policy verification, NOT measured-weather validation.`);
