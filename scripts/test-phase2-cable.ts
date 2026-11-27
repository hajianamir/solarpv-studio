import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candidateVoltageDropVolts} from '../src/engine/core/cableVoltageDrop';
import {calculateAdvancedCableRun,type CableRunConfig} from '../src/engine/protectionBomEngine';
import {CableFeederInputsSchema} from '../src/engine/core/projectMigration';
const fixture=JSON.parse(readFileSync('scripts/fixtures/physics/cable-drop-decimal.json','utf8'));
for(const c of fixture.cases)assert.ok(Math.abs(candidateVoltageDropVolts(...c.inputs as [Parameters<typeof candidateVoltageDropVolts>[0],number,number,number])-c.expected)<1e-9);
const base:CableRunConfig={id:'phase2',sectionNameEn:'SYNTHETIC cable',sectionNameFa:'آزمون',oneWayLengthM:100,designCurrentAmps:180,nominalVoltageVolts:400,conductorMaterial:'copper',insulationType:'xlpe',allowableDropPct:3,isDc:false,isThreePhase:true,powerFactor:.9,ambientTempC:30,expectedIscKa:1,faultClearingTimeSec:.01,protectiveDeviceRatingAmps:180,protectiveDeviceBreakingCapacityKa:10,protectiveDeviceReference:'Synthetic rating, not a field device',motorStartingMethod:'not_applicable',equivalentReactanceOhmPerM:.00008,parallelArrangement:'equal_length_equal_sharing',impedanceSource:'Synthetic equivalent at 50 Hz incl coupling; not site evidence'};
let count=0,passes=0;
for(const phase of ['dc','single','three'])for(const powerFactor of [1,.9,.7])for(const oneWayLengthM of [1,100,1000])for(const designCurrentAmps of [10,180,1500]){
 const config={...base,powerFactor,oneWayLengthM,designCurrentAmps,protectiveDeviceRatingAmps:designCurrentAmps,isDc:phase==='dc',isThreePhase:phase==='three'};
 const result=calculateAdvancedCableRun(config);
 const conductivity=56/(1+.00393*(90-20));
 const drop=candidateVoltageDropVolts(config,conductivity,result.perRunCrossSectionMm2,result.parallelRunsCount);
 assert.ok(Math.abs(result.actualVoltageDropVolts-drop)<=.0051);
 if(result.isCompliant){passes++;assert.ok(result.isVoltageDropCompliant&&result.isAmpacityCompliant&&result.isShortCircuitCompliant);assert.ok(drop<=config.allowableDropPct/100*config.nominalVoltageVolts+1e-10);assert.ok(result.parallelRunsCount<=6);}
 count++;
}
assert.ok(passes>0);
const unknown=calculateAdvancedCableRun({...base,parallelArrangement:undefined});
assert.equal(unknown.isAssessed,false);assert.equal(unknown.isCompliant,false);assert.match(unknown.assessmentNote!,/impedance UNASSESSED/);
const xLimited=calculateAdvancedCableRun({...base,powerFactor:0,equivalentReactanceOhmPerM:.01,oneWayLengthM:1000});
assert.equal(xLimited.isCompliant,false);assert.equal(xLimited.isAssessed,false);assert.match(xLimited.assessmentNote!,/search exhausted/);
for(const powerFactor of [-.1,1.1,NaN,Infinity])assert.throws(()=>calculateAdvancedCableRun({...base,powerFactor}));
for(const equivalentReactanceOhmPerM of [-1,NaN,Infinity])assert.throws(()=>calculateAdvancedCableRun({...base,equivalentReactanceOhmPerM}));
assert.throws(()=>calculateAdvancedCableRun({...base,ambientTempC:90}));
const restored=CableFeederInputsSchema.parse(JSON.parse(JSON.stringify(base)));
assert.equal(restored.equivalentReactanceOhmPerM,base.equivalentReactanceOhmPerM);assert.equal(restored.parallelArrangement,base.parallelArrangement);assert.equal(restored.impedanceSource,base.impedanceSource);
assert.equal(CableFeederInputsSchema.parse({}).parallelArrangement,undefined,'Legacy missing evidence must stay unknown');
console.log(`PASS cable: ${fixture.cases.length} independent Decimal voltage-drop conditions; ${count} candidate/phase/PF/length/current checks, ${passes} accepted screens satisfy all constraints; unknown impedance and X-only exhaustion blocked; schema round trip.`);
