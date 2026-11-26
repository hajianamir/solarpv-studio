import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createDefaultProjectV3,migrateProjectToV3} from '../src/engine/core/projectMigration';
const base=createDefaultProjectV3('ac-retirement-regression');
for(const systemMode of ['powerplant','ongrid','offgrid'] as const){
 const current={...base,systemMode,mvVoltageKv:20};
 const expected=migrateProjectToV3(current);
 const old=migrateProjectToV3({...current,acRequirements:{loadService:{powerFactor:0.1,confirmed:true},inverterOutput:{lineToLineVolts:-999,confirmed:true},injection:{nominalKv:999,confirmed:true},loadOverrides:{arbitrary:{confirmed:true}}}});
 assert.notEqual(old.migrationStatus,'BLOCKED_INCONSISTENT');
 assert.deepEqual(old.project,expected.project,'legacy AC data changed current engineering inputs');
 assert.equal('acRequirements' in old.project,false);
 assert.ok(old.warnings.some(w=>w.includes('Retired acRequirements')));
 assert.ok(old.requiresUserConfirmation,'legacy data removal must be disclosed before import');
 assert.equal(old.project.mvVoltageKv,20);
 assert.equal(old.project.systemMode,systemMode);
}
assert.equal(existsSync('src/engine/acRequirements.ts'),false);
for(const file of ['src/App.tsx','src/components/ProtectionBomTab.tsx','src/components/OfficialReportModal.tsx','src/components/SingleLineDiagram.tsx']){
 const source=readFileSync(file,'utf8');
 assert.ok(!/acRequirements|acOutputRequirement|setAcRequirements/.test(source),file);
}
const protection=readFileSync('src/components/ProtectionBomTab.tsx','utf8');
for(const field of ['expectedIscKa','faultClearingTimeSec','protectiveDeviceBreakingCapacityKa','protectiveDeviceReference','modelPhaseMatches','modelVoltageMatches','createUnassessedCableRun'])assert.ok(protection.includes(field),field);
console.log('PASS all three modes: legacy AC data removed with confirmation, identical migrated engineering inputs, live AC references absent, independent feeder safety inputs retained.');
