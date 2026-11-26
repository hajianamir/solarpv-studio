import assert from 'node:assert/strict';
import {calculateStructuralAndFoundations,type FoundationType} from '../src/engine/structuralEngine';
import {exportStructuralSheetRows} from '../src/engine/core/structuralContract';
const types:FoundationType[]=['rammed_steel_pile','pre_drilled_grouted_pile','surface_ballasted_block','concrete_pier','ground_screw','rooftop_ballasted_block','shed_roof_clamp_rail','rooftop_anchor_bolted'];
for(const foundationType of types){
 const result=calculateStructuralAndFoundations({totalModulesCount:28,moduleLengthM:2.278,moduleWidthM:1.134,moduleWeightKg:28.5,tablesCount:1,modulesPerTable:28,arrayTiltDeg:25,groundClearanceM:1,basicWindSpeedKmh:120,groundSnowLoadKgM2:50,foundationType,soilType:'dense_sand_gravel',frostDepthCm:40});
 assert.equal(result.certificationStatus,'not_certified');assert.equal(result.isScreeningPreliminary,true);
 assert.ok(!result.engineeringRemarksEn.includes('compliant with'));
 assert.match(result.screeningDisclaimerEn,/preliminary/);
}
const missingRows=exportStructuralSheetRows(null,true);
assert.ok(missingRows.some(row=>row[0]==='Design Certification'&&row[1]==='NOT CERTIFIED'));
assert.ok(missingRows.some(row=>String(row[0]).includes('NOT CODE CERTIFIED')));
console.log('PASS structural claims: 8 foundation paths retain non-certification independently of diagnostic FoS; report has explicit certification boundary. Not numerical or standards validation.');
