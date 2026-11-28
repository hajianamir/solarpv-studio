import {historicalSource} from './historical-source';
import {getContextualHelp} from '../src/helpContent';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {assessPumpDutyEnergy} from '../src/engine/core/pumpDutyEnergy';
import {PumpDutyEnergyPanel} from '../src/components/PumpDutyEnergyPanel';
import {SolarPumpingTab} from '../src/components/SolarPumpingTab';
import {calculateSolarPump} from '../src/engine/solarPumpEngine';
import {assertReferenceValue,extractFormulaUnits,executeReferenceFixture,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/pump-duty-energy-decimal.json','utf8'));
for(const c of fixture.cases) {
 const before=JSON.stringify(c.inputs[0]);const result=assessPumpDutyEnergy(c.inputs[0]);
 assertReferenceValue(result,c.expected,fixture.tolerances.absolute,fixture.tolerances.relative);
 assert.equal(JSON.stringify(c.inputs[0]),before);assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
 assert.equal(result.waterDeliveryGuaranteed,false);assert.equal(result.financialAdoptionEligible,false);
 if(result.status==='available') {
  assert.equal(result.equipmentReadiness,'unassessed');assert.equal(result.chronologicalWaterDelivery,'unassessed');
  assert.ok(result.hydraulicPowerKw<=result.pumpShaftPowerKw&&result.pumpShaftPowerKw<=result.motorElectricalPowerKw&&result.motorElectricalPowerKw<=result.driveDcInputPowerKw);
 }
}
const base={modelPolicy:'pump_steady_duty_energy_v1',powerBoundary:'dc_bus_to_vfd',dailyWaterVolumeM3:120,totalDynamicHeadM:50,pumpingHoursPerDay:5,densityKgPerM3:1000,gravityMPerS2:9.81,pumpHydraulicEfficiency:.6,motorEfficiency:.8,driveEfficiency:.95,availableDcEnergyKwhPerDay:100};
for(const key of Object.keys(base)) {
 const missing={...base};delete missing[key as keyof typeof missing];assert.equal(assessPumpDutyEnergy(missing).status,'unavailable');
}
for(const key of Object.keys(base).filter(k=>typeof base[k as keyof typeof base]==='number')) {
 for(const value of [-1,NaN,Infinity,-Infinity,null,'1'])assert.equal(assessPumpDutyEnergy({...base,[key]:value}).status,'unavailable',`${key}=${String(value)}`);
}
for(const patch of [{pumpingHoursPerDay:0},{pumpingHoursPerDay:25},{densityKgPerM3:0},{gravityMPerS2:0},{pumpHydraulicEfficiency:0},{pumpHydraulicEfficiency:1.01},{motorEfficiency:0},{motorEfficiency:1.01},{driveEfficiency:0},{driveEfficiency:1.01},{powerBoundary:'pv_stc'},{modelPolicy:'legacy'},{extra:1}])assert.equal(assessPumpDutyEnergy({...base,...patch}).status,'unavailable');
for(const input of [null,undefined,[],{},'bad'])assert.equal(assessPumpDutyEnergy(input).status,'unavailable');
const result=assessPumpDutyEnergy(base);assert.equal(result.status,'available');
if(result.status==='available') {
 assert.equal(result.hydraulicEnergyKwhPerDay,16.35);assert.ok(Math.abs(result.hydraulicPowerKw-3.27)<1e-12);
 assert.ok(Math.abs(result.requiredDcEnergyKwhPerDay-35.85526315789474)<1e-12);
 assert.equal(result.dailyEnergyBalance,'no_aggregate_deficit');assert.equal(result.dailyDcEnergyDeficitKwh,0);
 const halfTime=assessPumpDutyEnergy({...base,pumpingHoursPerDay:2.5});assert.equal(halfTime.status,'available');
 if(halfTime.status==='available'){assert.equal(halfTime.driveDcInputPowerKw,result.driveDcInputPowerKw*2);assert.equal(halfTime.requiredDcEnergyKwhPerDay,result.requiredDcEnergyKwhPerDay);}
 const exactBudget=assessPumpDutyEnergy({...base,availableDcEnergyKwhPerDay:result.requiredDcEnergyKwhPerDay});assert.equal(exactBudget.status,'available');if(exactBudget.status==='available')assert.equal(exactBudget.dailyDcEnergyDeficitKwh,0);
}
// PSH and legacy rounded TDH/nameplate never serve as hidden duty defaults.
const legacyInput={wellDepthM:30,tankHeightM:0,pipeLengthM:100,pipeDiameterMm:63,dailyWaterRequirementM3:100,irrigationType:'flooding_storage' as const,peakSunHours:5,pumpEfficiencyOverride:.6};
const legacyBefore=calculateSolarPump(legacyInput);assessPumpDutyEnergy(base);assert.deepEqual(calculateSolarPump(legacyInput),legacyBefore);
const oldSource=historicalSource('16d3ff4056b528c2d9a5215a5e44703e58b49db7:src/engine/solarPumpEngine.ts');
const oldJs=ts.transpileModule(oldSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const oldModule=await import(`data:text/javascript;base64,${Buffer.from(oldJs).toString('base64')}`) as typeof import('../src/engine/solarPumpEngine');
for(const peakSunHours of [.5,2,5,8])for(const dailyWaterRequirementM3 of [0,10,120,300])for(const irrigationType of ['drip','sprinkler','flooding_storage'] as const) {
 const input={...legacyInput,peakSunHours,dailyWaterRequirementM3,irrigationType};
 assert.deepEqual(calculateSolarPump(input),oldModule.calculateSolarPump(input),'Actual base-version numerical/result compatibility, not independent physical evidence');
}

for(const lang of ['fa','en'] as const) {
 const help=getContextualHelp('solar_pumping','powerplant',lang);assert.match(help.method,/pump_steady_duty_energy_v1/);assert.ok(help.sources);assert.match(help.sources,/assessPumpDutyEnergy/);assert.match(help.limitations,lang==='en'?/saved in projects/:/در پروژه ذخیره می‌شود/);
 const panel=renderToStaticMarkup(React.createElement(PumpDutyEnergyPanel,{lang}));assert.doesNotMatch(panel,/data-testid="pump-duty-result"|data-testid="pump-duty-unavailable"/);
 assert.match(panel,lang==='en'?/runtime is not inferred from PSH/:/ساعات کار از PSH استنتاج نمی‌شود/);
 assert.match(panel,lang==='en'?/saved in projects/:/در پروژه ذخیره می‌شوند/);
 const page=renderToStaticMarkup(React.createElement(SolarPumpingTab,{lang,peakSunHours:5}));
 assert.match(page,/pump-legacy-disclosure/);assert.match(page,lang==='en'?/Monthly factors are synthetic/:/ضرایب ماهانه مصنوعی‌اند/);
 assert.doesNotMatch(page,/safety service factor of 1.25x/);
}
const file='src/engine/core/pumpDutyEnergy.ts';const units=extractFormulaUnits(file,readFileSync(file,'utf8'));
const records=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures.filter((r:PhysicsReferenceRecord)=>r.formulaId.startsWith(file+'#')) as PhysicsReferenceRecord[];
assert.ok(units.length>0);assert.deepEqual(units.map(u=>u.formulaId).sort(),records.map(r=>r.formulaId).sort());
for(const record of records)await executeReferenceFixture(record);
console.log(`PASS ${fixture.cases.length} Decimal duty cases; ${units.length} reached/sensitive expressions; explicit energy stages, no delivery/finance adoption, invalid/zero/overflow/underflow/serialization/bilingual boundaries`);
