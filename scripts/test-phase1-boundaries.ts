import assert from 'node:assert/strict';
import {buildDesignSummary} from '../src/presentation/designSummary';
const input = {actualDcKwp: 1234.5, installedAcKw: 1000, requestedAcKw: 1100,
  annualFinancialEnergyKwh: 1987654, waterfallPrPct: 0, hasAdoptedOperationalEnergy: false};
const summary = buildDesignSummary(input);
assert.equal(summary.actualDcKwp, 1234.5);
assert.equal(summary.installedAcKw, 1000);
assert.equal(summary.requestedAcKw, 1100);
assert.equal(summary.annualFinancialEnergyMwh, 1987.654);
assert.equal(summary.waterfallPrPct, 0, 'zero is not a missing PR');
assert.equal(summary.iranianModelAvailable, true);
assert.equal(summary.energyBasis, 'screening_waterfall_net_ac');
assert.equal(buildDesignSummary({...input, waterfallPrPct: 105}).waterfallPrPct, 105, 'no universal 100% ceiling');
const adopted = buildDesignSummary({...input, hasAdoptedOperationalEnergy: true});
assert.equal(adopted.iranianModelAvailable, false, 'never revalue an operational ledger in a scalar tariff model');
assert.equal(adopted.energyBasis, 'operational_financial_boundary');
console.log('Phase 1 boundary unit regressions passed (synthetic arithmetic, not model validation).');

// Direction vectors are independently stated compass definitions, not copied model outputs.
const {resolvePoaAzimuthRequest} = await import('../src/presentation/poaAzimuthRequest');
for(const [north,south] of [[0,-180],[90,-90],[180,0],[270,90]]) {
 assert.equal(resolvePoaAzimuthRequest({surfaceAzimuthNorthDeg:north,surfaceAzimuthSouthDeg:south}).surfaceAzimuthNorthDeg,north);
}
assert.throws(()=>resolvePoaAzimuthRequest({surfaceAzimuthNorthDeg:0,azimuthDeg:0}),/Conflicting/);
const {assessElectricalReadiness,MpptRatingEvidenceSchema}=await import('../src/contracts/electricalReadiness');
const {InverterSpecsSchema}=await import('../src/engine/core/projectMigration');
const evidence={basis:'factored_array_isc',scope:'per_mppt',source:'SYNTHETIC test-only rating definition',sourceDate:'2026-11-03',conditions:'Synthetic STC array Isc, explicit 1.25 multiplier; not manufacturer data',requiredMultiplier:1.25,operatingCurrentAmps:20,shortCircuitCurrentAmps:30} as const;
const ready={evidence,measuredVmpPct:-.3,operatingLimit:20,shortCircuitLimit:30,allocationAssumed:false,allocationValid:true};
assert.equal(assessElectricalReadiness(ready).status,'screening_evidence_complete');
assert.equal(assessElectricalReadiness(ready).conformity,null);
for(const patch of [{evidence:undefined},{measuredVmpPct:undefined},{allocationAssumed:true},{shortCircuitLimit:0},{shortCircuitLimit:65},{shortCircuitLimit:90},{evidence:{...evidence,scope:'per_input' as const}},{evidence:{...evidence,basis:'permissible_module_isc_stc' as const,requiredMultiplier:1}},{evidence:{...evidence,basis:'terminal_short_circuit_capability' as const}}]) {
 assert.equal(assessElectricalReadiness({...ready,...patch}).status,'unassessed');
}
assert.equal(MpptRatingEvidenceSchema.safeParse({...evidence,source:''}).success,false);
const inv={manufacturer:'Synthetic',modelName:'Test',pnomAcKw:10,vdcMaxVolts:1000,vmpptMinVolts:100,vmpptMaxVolts:900,mpptRatingEvidence:evidence};
assert.deepEqual(InverterSpecsSchema.parse(JSON.parse(JSON.stringify(inv))).mpptRatingEvidence,evidence);
assert.equal(InverterSpecsSchema.parse({...inv,mpptRatingEvidence:undefined}).mpptRatingEvidence,undefined);
const {evaluateMpptCompatibility}=await import('../src/engine/core/electricalSizingContract');
const mppt={moduleVoc:40,moduleVmp:32,moduleIsc:10,moduleImp:9,modulePmp:288,tempCoeffVocPct:-.3,tempCoeffVmpPct:-.3,modulesPerString:10,parallelStrings:2,inverterVdcMax:1000,inverterVmpptMin:100,inverterVmpptMax:900,inverterImppMaxPerMppt:20,inverterIscMaxPerMppt:30,inverterMpptChannels:2,inverterPnomAcKw:10,ambientTempMinC:0,ambientTempMaxC:40,stringsPerMpptAllocation:[1,1],mpptRatingEvidence:evidence};
const checked=evaluateMpptCompatibility(mppt);
assert.equal(checked.shortCircuitCurrentAmps,12.5);
assert.equal(checked.electricalReadiness.status,'screening_evidence_complete');
assert.equal(evaluateMpptCompatibility({...mppt,mpptRatingEvidence:undefined}).electricalReadiness.status,'unassessed');
const overloaded=evaluateMpptCompatibility({...mppt,stringsPerMpptAllocation:[2,0],inverterIscMaxPerMppt:20});
assert.equal(overloaded.isCurrentFeasible,false);assert.equal(overloaded.shortCircuitCurrentAmps,25);
// Manufacturer example documents why 1.25 cannot universally be removed. It is
// module-Isc basis / per-input; NOT eligible for the per-MPPT legacy comparison.
const enphase={...evidence,sourceDate:null,basis:'permissible_module_isc_stc' as const,scope:'per_input' as const,source:'https://enphase.com/en-au/download/iq8ac-and-iq8hc-microinverters-data-sheet',conditions:'IQ8AC/IQ8HC: maximum module Isc 20 A calculated with 1.25 factor; input current 14 A; maximum short-circuit input 25 A. Publication effective date not verified.'};
assert.equal(assessElectricalReadiness({...ready,evidence:enphase}).status,'unassessed');
const {ECONOMIC_ASSUMPTIONS,BIFACIAL_READINESS}=await import('../src/presentation/phase1Evidence');
assert.ok(ECONOMIC_ASSUMPTIONS.every(e=>e.source===null&&e.effectiveDate===null&&e.status==='illustrative_unverified'));
assert.equal(BIFACIAL_READINESS.bankabilityEligible,false);
assert.equal(BIFACIAL_READINESS.independentlyValidatedDomain,null);
console.log('PASS explicit azimuth, rating-basis/readiness, persistence, per-channel overload and unsupported economic/bifacial contracts.');
const {computeWaterfallLosses}=await import('../src/engine/waterfallLossEngine');
const {designPvArray}=await import('../src/engine/pvEngineAdvanced');
// Test ratios/nameplate identity without redefining the sizing algorithm.
const moduleSpecs={manufacturer:'Synthetic',modelName:'Boundary fixture',pmpWatts:400,vocVolts:50,vmpVolts:40,iscAmps:11,impAmps:10,tempCoeffVocPct:-.2,tempCoeffPmpPct:-.3,tempCoeffVmpPct:-.4,noctC:45};
const inverterSpecs={manufacturer:'Synthetic',modelName:'Boundary inverter',pnomAcKw:100,vdcMaxVolts:1100,vmpptMinVolts:200,vmpptMaxVolts:1000,iscMaxAmpsPerMppt:90,imppMaxAmpsPerMppt:65,mpptChannelsCount:10,isThreePhase:true,efficiencyMaxPct:98};
const deratings={ambientTempMinC:-10,ambientTempMaxC:40,soilingLossPct:2,dcCableLossPct:1,mismatchAndLidLossPct:1,inverterClippingLossPct:0,systemAvailabilityPct:100,groundAlbedo:.2,arrayTiltDeg:30};
for(const ratio of [1,1.25,1.5]) {
 const design=designPvArray(500,5,moduleSpecs,inverterSpecs,deratings,35,{inverterCount:1,targetDcAcRatio:ratio});
 assert.ok(Math.abs(design.totalPvCapacityKwp-design.totalModulesCount*moduleSpecs.pmpWatts/1000)<1e-9);
 assert.equal(design.electricalReadiness.status,'unassessed','Generic 65/90 A ratings are not manufacturer evidence');
}
assert.throws(()=>designPvArray(500,5,{...moduleSpecs,pmpWatts:NaN},inverterSpecs,deratings,35));
const wf=(thermal:number,bifacial:number,psh=5)=>computeWaterfallLosses(100,psh,25,0,1,false,0,0,45,-.3,undefined,undefined,30,35,0,bifacial,thermal);
const baseWf=wf(0,0),coldWf=wf(-5,0),rearWf=wf(0,10),zeroWf=wf(0,0,0);
assert.ok(coldWf.finalEnergyKwh>=baseWf.finalEnergyKwh,'Cold-gain semantics retained, not replaced in Phase 1');
assert.ok(rearWf.finalEnergyKwh>baseWf.finalEnergyKwh);
assert.equal(zeroWf.performanceRatioPct,0);
for(const r of [baseWf,coldWf,rearWf]) {
 const compound=r.stages.reduce((value,stage)=>value*(1+stage.percentageLossRaw/100),1)*100;
 assert.ok(Math.abs(compound-r.performanceRatioPct)<.051);
}
console.log('PASS ratio/nameplate, invalid input, unknown 65/90A and screening PR denominator/gain regressions.');
// Metadata belongs in contracts; no physical equation is moved/exempted to pass
// the reference gate. Check BOTH additions and removals of engine formula ASTs.
const {extractFormulaUnits}=await import('./verify-physics-reference-gate');
const {execFileSync}=await import('node:child_process');
const {readFileSync}=await import('node:fs');
for(const path of ['src/engine/pvEngineAdvanced.ts','src/engine/core/electricalSizingContract.ts','src/engine/catalogRepository.ts','src/engine/core/projectMigration.ts']) {
 const before=execFileSync('git',['show',`0c4d7cadc7db6001459ea36fdf9a3d1403179a71:${path}`],{encoding:'utf8',maxBuffer:8*1024*1024});
 const previous=extractFormulaUnits(path,before).map(f=>f.formulaId).sort();
 const current=extractFormulaUnits(path,readFileSync(path,'utf8')).map(f=>f.formulaId).sort();
 if(path==='src/engine/core/electricalSizingContract.ts') {
  // ADR-015 hot owner and ADR-019 unrounded current comparisons; exact removals only.
  assert.deepEqual(previous.filter(id=>!current.includes(id)),['317ddba0b12c','76120537b4e4','a1a634c47c18'].map(id=>`${path}#evaluateMpptCompatibility#${id}`));
  assert.deepEqual(current.filter(id=>!previous.includes(id)),[`${path}#evaluateMpptCompatibility#3f70ee8d8180`]);
 } else if(path==='src/engine/pvEngineAdvanced.ts') {
  assert.deepEqual(previous.filter(id=>!current.includes(id)),['c4d9aa7fa817','c95d9d84e124'].map(id=>`${path}#designPvArray#${id}`));
  assert.deepEqual(current.filter(id=>!previous.includes(id)),[]);
 } else assert.deepEqual(current,previous,`${path}: no unreviewed numerical changes`);
}
console.log('PASS numerical AST parity outside explicitly fixture-gated ADR-015 hot ownership and ADR-019 unrounded current comparison replacements.');
const {CatalogRepository}=await import('../src/engine/catalogRepository');
const {CATALOG_INVERTERS}=await import('../src/engine/equipmentCatalogData');
const repo=CatalogRepository.getInstance();
assert.equal(repo.validateInverter({...CATALOG_INVERTERS[0],mpptRatingEvidence:evidence,iscMaxAmpsPerMppt:30,imppMaxAmpsPerMppt:20}).isValid,true);
assert.equal(repo.validateInverter({...CATALOG_INVERTERS[0],mpptRatingEvidence:{...evidence,source:''}}).isValid,false);
assert.equal(repo.validateInverter({...CATALOG_INVERTERS[0],iscMaxAmpsPerMppt:NaN}).isValid,false);
console.log('PASS catalog evidence preserves unknowns and rejects malformed rating metadata.');
for(const body of [{surfaceAzimuthConvention:'guess'},{surfaceAzimuthNorthDeg:null},{surfaceAzimuthSouthDeg:''},{surfaceAzimuthNorthDeg:Infinity},{sunAzimuthDeg:0,solarAzimuthDeg:90}]) assert.throws(()=>resolvePoaAzimuthRequest(body));
assert.equal(resolvePoaAzimuthRequest({}).surfaceAzimuthNorthDeg,180);
assert.equal(resolvePoaAzimuthRequest({surfaceAzimuthConvention:'north_clockwise'}).surfaceAzimuthNorthDeg,180);
assert.equal(resolvePoaAzimuthRequest({surfaceAzimuthConvention:'north_clockwise',azimuthDeg:90,surfaceAzimuthDeg:450}).surfaceAzimuthNorthDeg,90);
assert.equal(resolvePoaAzimuthRequest({surfaceAzimuthConvention:'south_zero',azimuthDeg:-90}).surfaceAzimuthNorthDeg,90);

// Exit-review gaps: a supplied invalid allocation is not actual wiring evidence.
for(const date of ['2026-02-30','2026-13-01','2026-00-01','not-a-date']) {
 assert.equal(MpptRatingEvidenceSchema.safeParse({...evidence,sourceDate:date}).success,false);
}
assert.equal(MpptRatingEvidenceSchema.safeParse({...evidence,sourceDate:'2024-02-29'}).success,true);
assert.equal(MpptRatingEvidenceSchema.safeParse({...evidence,sourceDate:'2025-02-29'}).success,false);
assert.equal(assessElectricalReadiness({...ready,allocationValid:false}).status,'unassessed');
const badWiring=evaluateMpptCompatibility({...mppt,stringsPerMpptAllocation:[2]});
assert.equal(badWiring.isCurrentFeasible,false);
assert.equal(badWiring.electricalReadiness.status,'unassessed');
assert.match(badWiring.electricalReadiness.reasons.join(' '),/allocation invalid/);
assert.equal(InverterSpecsSchema.safeParse({...inv,mpptRatingEvidence:{...evidence,sourceDate:'2026-02-30'}}).success,false);
assert.equal(repo.validateInverter({...CATALOG_INVERTERS[0],mpptRatingEvidence:{...evidence,sourceDate:'2026-02-30'}}).isValid,false);
const invalidDesignWiring=designPvArray(500,5,moduleSpecs,{...inverterSpecs,imppMaxAmpsPerMppt:20,iscMaxAmpsPerMppt:30,mpptRatingEvidence:evidence},deratings,35,{stringsPerMpptAllocation:[-1]});
assert.equal(invalidDesignWiring.electricalReadiness.status,'unassessed');
assert.match(invalidDesignWiring.electricalReadiness.reasons.join(' '),/allocation invalid/);
