import {readFileSync,writeFileSync} from 'node:fs';
import {extractFormulaUnits,executeReferenceFixture,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
const file='src/engine/core/pumpDutyEnergy.ts';
const oracle=JSON.parse(readFileSync('scripts/fixtures/physics/pump-duty-energy-decimal.json','utf8'));
const records:PhysicsReferenceRecord[]=[];
for(const unit of extractFormulaUnits(file,readFileSync(file,'utf8'))) {
 const fixtureFile=`scripts/fixtures/physics/pump-duty-energy-${unit.formulaId.split('#').at(-1)}.json`;
 const r=oracle.referenceSource;
 const record={formulaId:unit.formulaId,fixtureFile,productionExport:unit.functionName,referenceTitle:r.title,referenceUrl:r.url,referenceVersion:r.version,referenceLocator:r.locator};
 const candidates=oracle.cases;
 let passed=false;let last:unknown;
 for(const witness of candidates) {
  writeFileSync(fixtureFile,JSON.stringify({schemaVersion:1,formulaId:unit.formulaId,independentOfImplementation:true,productionExport:unit.functionName,inputs:witness.inputs,expected:witness.expected,independentCalculation:oracle.independentCalculation,tolerances:oracle.tolerances,referenceSource:r},null,2)+'\n');
  try {await executeReferenceFixture(record);passed=true;break;} catch(error){last=error;}
 }
 if(!passed)throw last;
 records.push(record);
}
const manifestFile='scripts/physics-reference-evidence.json';const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
manifest.fixtures=manifest.fixtures.filter((r:PhysicsReferenceRecord)=>!r.formulaId.startsWith(file+'#'));
const index=manifest.fixtures.findIndex((r:PhysicsReferenceRecord)=>r.fixtureFile.startsWith('scripts/fixtures/physics/grid-import-'));
manifest.fixtures.splice(index<0?manifest.fixtures.length:index,0,...records);
writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(`PASS registered ${records.length} reached and mutation-sensitive independent pump duty expressions`);
