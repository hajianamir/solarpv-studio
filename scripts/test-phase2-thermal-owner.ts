import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertReferenceValue} from './verify-physics-reference-gate';
import {calculateThermalDerate} from '../src/engine/core/thermalDerate';
import {evaluateMpptCompatibility} from '../src/engine/core/electricalSizingContract';
import {calculateWindElevationFactor} from '../src/engine/core/windElevationFactor';
import {calculateUnifiedKz,calculateUnifiedWindPressureQz} from '../src/engine/core/structuralContract';
const thermal=JSON.parse(readFileSync('scripts/fixtures/physics/thermal-owner-pvlib.json','utf8'));
for(const c of thermal.cases)assertReferenceValue(calculateThermalDerate(c.inputs[0]),c.expected,1e-10,1e-12);
const mppt=JSON.parse(readFileSync('scripts/fixtures/physics/mppt-hot-owner-independent.json','utf8'));
assertReferenceValue(evaluateMpptCompatibility(mppt.inputs[0]),mppt.expected,1e-9,1e-12);
assert.notEqual(mppt.expected.stringVmpMinHotV,352,'Independent case must expose old ambient+25 fallback');
for(const installationEnvironment of ['ground_mount','industrial_shed','rooftop_flat_concrete'] as const)
for(const noctC of [40,42,45]){
 const input={...mppt.inputs[0],installationEnvironment,noctC};
 const expectedHot=calculateThermalDerate({module:{noctC,tempCoeffPmpPct:-.3},ambientTempMaxC:40,installationEnvironment}).cellTempHotC;
 assert.deepEqual(evaluateMpptCompatibility(input),evaluateMpptCompatibility({...input,cellTempHotC:expectedHot}));
 assert.deepEqual(evaluateMpptCompatibility({...input,cellTempHotC:60}),evaluateMpptCompatibility({...input,noctC:80,cellTempHotC:60}),'Explicit hot temperature remains authoritative');
}
const wind=JSON.parse(readFileSync('scripts/fixtures/physics/wind-elevation-si-decimal.json','utf8'));
for(const c of wind.cases)assert.ok(Math.abs(calculateWindElevationFactor(c.inputs[0])-c.expected)<1e-12);
const pressure=JSON.parse(readFileSync('scripts/fixtures/physics/wind-pressure-elevation-independent.json','utf8'));
assertReferenceValue(calculateUnifiedWindPressureQz(pressure.inputs[0]),pressure.expected,1e-9,1e-12);
for(const bad of [NaN,Infinity,-Infinity])assert.throws(()=>calculateWindElevationFactor(bad));
for(const exposureCategory of ['B','C','D'] as const)for(const elevationM of [0,500,1000,2000]){
 const a=calculateUnifiedWindPressureQz({basicWindSpeedKmh:120,elevationM,exposureCategory,windDirectionalityKd:1});
 const b=calculateUnifiedWindPressureQz({basicWindSpeedKmh:120,elevationM,exposureCategory,windDirectionalityKd:.85});
 assert.ok(Math.abs(b.qzN_M2/a.qzN_M2-.85)<1e-12,'Kd remains applied exactly once in the legacy combined pressure');
}
console.log(`PASS thermal owner: ${thermal.cases.length} external pvlib conditions, independent MPPT hot-window witness, 9 ground/shed/roof parity cases and explicit override authority; ${wind.cases.length} independent SI Ke conditions and pressure propagation/Kd-once checks. Not whole-model validation.`);

for(const exposure of ['B','C','D'] as const){
 assert.equal(calculateUnifiedKz(exposure),calculateUnifiedKz(exposure,3));
 for(const bad of [NaN,Infinity,-1])assert.throws(()=>calculateUnifiedKz(exposure,bad));
}
for(const key of ['windDirectionalityKd','topographicFactorKzt'] as const)
for(const bad of [NaN,Infinity,-1,0])assert.throws(()=>calculateUnifiedWindPressureQz({basicWindSpeedKmh:120,[key]:bad}));
assert.throws(()=>calculateUnifiedWindPressureQz({basicWindSpeedKmh:120,windDirectionalityKd:1.1}));
assert.equal(calculateUnifiedWindPressureQz({basicWindSpeedKmh:120,windDirectionalityKd:.4}).kd,.4,'No silent .5 clamp');
