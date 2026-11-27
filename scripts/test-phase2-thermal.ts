import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {thermalStagePercentage} from '../src/engine/core/signedThermalStage';
import {computeWaterfallLosses} from '../src/engine/waterfallLossEngine';
import {buildWaterfallArgs,computeConfiguredWaterfall} from '../src/engine/waterfallArgs';
import {computeCanonicalAnnualYield} from '../src/engine/core/annualYieldEngine';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/pvlib-0131-signed-thermal-stage.json','utf8'));
for(const c of fixture.cases)assert.ok(Math.abs(thermalStagePercentage(c.lossPct)-c.expectedStagePct)<=fixture.tolerances.absolute);
for(const bad of [NaN,Infinity,-Infinity,100.01])assert.throws(()=>thermalStagePercentage(bad));
assert.equal(thermalStagePercentage(0),-0);
for(const installationEnvironment of ['ground_mount','industrial_shed','rooftop_flat_concrete'] as const)
for(const annualThermalDerateOverridePct of [-10,0,10,100]) {
 const input={installedCapacityKwp:100,peakSunHours:5,ambientTempMaxC:40,installationEnvironment,annualThermalDerateOverridePct};
 const named=computeConfiguredWaterfall(input),legacy=computeWaterfallLosses(...buildWaterfallArgs(input));
 assert.equal(named.finalEnergyKwh,legacy.finalEnergyKwh);
 assert.equal(named.stages.find(s=>s.id==='thermal')?.percentageLossRaw,-annualThermalDerateOverridePct);
 const canonical=computeCanonicalAnnualYield({...input,tiltDeg:25,latitudeDeg:35.6892,evaluationMode:'hot_design'});
 const same=computeConfiguredWaterfall({...input,tiltDeg:25,latitudeDeg:35.6892});
 assert.equal(canonical.annualYieldKwh,same.finalEnergyKwh);
}
const wf=(loss:number)=>computeConfiguredWaterfall({installedCapacityKwp:100,peakSunHours:5,ambientTempMaxC:40,annualThermalDerateOverridePct:loss});
assert.ok(wf(-10).finalEnergyKwh>wf(0).finalEnergyKwh,'Cold gain no longer silently clamped away');
assert.equal(wf(100).finalEnergyKwh,0);
console.log('PASS Phase 2 signed thermal: 15 external pvlib component cases; three-mount loss/gain/zero and named/legacy/canonical consumer parity. Annual climate accuracy NOT established.');
