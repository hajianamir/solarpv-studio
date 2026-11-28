import {historicalSource} from './historical-source';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {recommendFoundation,type StructuralRecommendationInput} from '../src/engine/structureRecommendationEngine';
import {recommendSharedFoundation} from '../src/engine/geotech/foundationRecommendation';

// Consumer-contract comparisons, NOT independent structural accuracy references.
// No new aerodynamic/soil coefficient or reaction equation is introduced.
const base:StructuralRecommendationInput={latitude:35,longitude:51,soilClassification:'dense_sand_gravel',soilBearingCapacityKpa:250,soilInternalFrictionAngleDeg:34,soilCohesionKpa:10,soilDensityKnM3:18,frostDepthCm:40,basicWindSpeedKmh:120,groundSnowLoadKgM2:50,slopeDeg:2,tableAreaM2:60,arrayTiltDeg:30,postsPerTable:4,clearanceHeightM:1.2,elevationM:1000};
let cases=0,legacyDisagreements=0;
for(const installationEnvironment of ['ground_mount','industrial_shed','rooftop_flat_concrete'] as const)
for(const arrayTiltDeg of [0,30,60])
for(const basicWindSpeedKmh of [0,120,180])
for(const postsPerTable of [2,4])
for(const moduleWeightKg of [20,40]) {
 const input={...base,installationEnvironment,arrayTiltDeg,basicWindSpeedKmh,postsPerTable,moduleWeightKg,modulesPerTable:28,rackingUnitWeightKgM2:14.5,tableSlopedWidthM:4.606};
 const shared=recommendSharedFoundation(input),wrapped=recommendFoundation(input);
 assert.equal(wrapped.upliftPerPostKn,shared.upliftPerPostKn);
 assert.equal(wrapped.sensitivityPlus20Wind.pileAdequate,false);
 assert.equal(wrapped.sensitivityPlus20Wind.assessmentStatus,'unassessed');
 assert.doesNotMatch(wrapped.reportMarkdown,/SAFE \(No pile resize needed\)/);
 for(const field of ['bendingMomentKnM','allowableMomentKnM','lateralCapacityKn','fosMoment','fosLateral','isFosSafe'] as const)
  assert.equal(wrapped.recommendedPileSizing[field],shared.pileSizing[field],`shared pile ${field}`);
 assert.equal(wrapped.recommendedPileSizing.embedmentDepthM,shared.pileDepthM);
 const perturbed=recommendSharedFoundation({...input,basicWindSpeedKmh:Math.round(input.basicWindSpeedKmh*1.2)});
 assert.equal(wrapped.sensitivityPlus20Wind.lateralShearPerPostKn,Number(perturbed.lateralShearPerPostKn.toFixed(2)));
 assert.equal(wrapped.compressionPerPostKn,shared.compressionPerPostKn);
 assert.equal(wrapped.lateralShearPerPostKn,shared.lateralShearPerPostKn);
 assert.ok(wrapped.reportMarkdown.includes(`**Net Uplift Demand ($T_u$ per post):** ${shared.upliftPerPostKn} kN`));
 assert.match(wrapped.reportMarkdown,/applicability\/conformity UNASSESSED/);
 assert.doesNotMatch(wrapped.reportMarkdown,/\*\*Governing Design Codes:/);
 const legacy=shared.windPressureQzKnM2*input.tableAreaM2*1.15/input.postsPerTable;
 if(Math.abs(legacy-shared.upliftPerPostKn)>1e-6)legacyDisagreements++;
 cases++;
}
assert.ok(legacyDisagreements>0,'Matrix must expose the original wrapper rederivation defect');
const scratch=await mkdtemp(join(tmpdir(),'solarpv-phase2-'));
try {
 const inputFile=join(scratch,'input.json'),reportFile=join(scratch,'foundation.md');
 await writeFile(inputFile,JSON.stringify(base));
 const restored=JSON.parse(await readFile(inputFile,'utf8'));
 const report=recommendFoundation(restored);
 await writeFile(reportFile,report.reportMarkdown);
 const text=await readFile(reportFile,'utf8');
 assert.ok(text.includes(`**Net Uplift Demand ($T_u$ per post):** ${recommendSharedFoundation(restored).upliftPerPostKn} kN`));
 assert.match(text,/preliminary screening/);
} finally {await rm(scratch,{recursive:true,force:true});}
console.log(`PASS Phase 2 uplift forwarding: ${cases} synthetic consumer cases, ${legacyDisagreements} expose original defect; report/input readback. Not physical or conformity validation.`);
const {readFileSync}=await import('node:fs');
const {extractFormulaUnits}=await import('./verify-physics-reference-gate');
for(const path of ['src/engine/geotech/foundationRecommendation.ts','src/engine/core/structuralContract.ts']) {
 const before=historicalSource(`0c4d7cadc7db6001459ea36fdf9a3d1403179a71:${path}`);
 const previous=extractFormulaUnits(path,before).map(f=>f.formulaId).sort();
 const current=extractFormulaUnits(path,readFileSync(path,'utf8')).map(f=>f.formulaId).sort();
 if(path.endsWith('/structuralContract.ts')) {
  const removed=[['calculateUnifiedKz','18d254ab43a1'],['calculateUnifiedKz','b61b3e86cb0f'],['calculateUnifiedKz','e78c0d9c6486'],['calculateUnifiedWindPressureQz','1e81e14a3b50'],['calculateUnifiedWindPressureQz','2110e57b7632'],['calculateUnifiedWindPressureQz','28b077794de8'],['calculateUnifiedWindPressureQz','5354ef8f6b8e'],['calculateUnifiedWindPressureQz','7f8786ba6c7c'],['calculateUnifiedWindPressureQz','7ff499190885']].map(([owner,id])=>`${path}#${owner}#${id}`).sort();
  assert.deepEqual(previous.filter(id=>!current.includes(id)),removed);
  assert.deepEqual(current.filter(id=>!previous.includes(id)),['1ba65c64d4e4','4b9e5a997451'].map(id=>`${path}#calculateUnifiedWindPressureQz#${id}`));
 } else assert.deepEqual(current,previous,`${path}: no unreviewed model changes`);
}
console.log('PASS shared foundation AST parity; only reviewed wind-owner changes are ADR-015 SI conversion, unified default height and explicit input validation.');
