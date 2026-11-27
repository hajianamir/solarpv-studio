import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PumpDutySettingsSchema,createDefaultPumpDutySettings} from '../src/contracts/pumpDutySettings';
import {createDefaultProjectV3,migrateProjectToV3} from '../src/engine/core/projectMigration';
import {restoreProjectTransferEnvelope} from '../src/engine/offlineTransferEngine';
import {PumpDutyEnergyPanel} from '../src/components/PumpDutyEnergyPanel';
const defaults=createDefaultPumpDutySettings();
const project=createDefaultProjectV3();
assert.deepEqual(project.pumpDutySettings,defaults);
const {pumpDutySettings:ignored,...legacy}=project;void ignored;
assert.deepEqual(migrateProjectToV3(legacy).project.pumpDutySettings,defaults);
const custom={...defaults,enabled:true,inputs:{...defaults.inputs,dailyWaterVolumeM3:0,totalDynamicHeadM:50}};
const encoded=JSON.parse(JSON.stringify({...project,pumpDutySettings:custom}));
assert.deepEqual(migrateProjectToV3(encoded).project.pumpDutySettings,custom);
assert.equal(restoreProjectTransferEnvelope(encoded).success,true);
const before=structuredClone(encoded);
const invalid:unknown[]=[null,{}, {...custom,schemaVersion:'v2'},{...custom,contextBasis:'matched'},{...custom,enabled:1},{...custom,result:42},{...custom,powerBoundary:'ac'}];
for(const key of Object.keys(defaults.inputs)) {
 for(const value of [undefined,'0',NaN,Infinity,-1])invalid.push({...custom,inputs:{...custom.inputs,[key]:value}});
}
for(const key of ['pumpHydraulicEfficiency','motorEfficiency','driveEfficiency','pumpingHoursPerDay','densityKgPerM3','gravityMPerS2'])invalid.push({...custom,inputs:{...custom.inputs,[key]:0}});
invalid.push({...custom,inputs:{...custom.inputs,pumpingHoursPerDay:25}});
for(const bad of invalid){
 assert.equal(PumpDutySettingsSchema.safeParse(bad).success,false);
 const payload={...encoded,pumpDutySettings:bad};
 const result=migrateProjectToV3(payload);
 assert.equal(result.success,false);assert.equal(result.migrationStatus,'BLOCKED_INCONSISTENT');
 assert.equal(restoreProjectTransferEnvelope(payload).success,false);
}
assert.deepEqual(encoded,before,'Validation never mutates source project');
const fresh=createDefaultPumpDutySettings();fresh.inputs.totalDynamicHeadM=20;assert.equal(createDefaultPumpDutySettings().inputs.totalDynamicHeadM,null);
for(const lang of ['en','fa'] as const){
 const html=renderToStaticMarkup(React.createElement(PumpDutyEnergyPanel,{lang,settings:custom}));
 assert.match(html,/pump-duty-unavailable/);assert.match(html,/user_declared_unmatched/);
 assert.match(html,/id="pump-duty-dailyWaterVolumeM3"[^>]*value="0"/);
 const off=renderToStaticMarkup(React.createElement(PumpDutyEnergyPanel,{lang,settings:defaults}));
 assert.doesNotMatch(off,/pump-duty-result/);
}
console.log(`Pump settings: ${invalid.length} invalid schema/migration/transfer cases, legacy defaults, roundtrip, no mutation, bilingual SSR passed.`);
