import {readFileSync,writeFileSync} from 'node:fs';
import {extractFormulaUnits,executeReferenceFixture,assertReferenceValue,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
import {evaluateIranianBenefitIndicators} from '../src/engine/core/iranianBenefitIndicators';
const file='src/engine/core/iranianBenefitIndicators.ts';
const oracle=JSON.parse(readFileSync('scripts/fixtures/physics/iranian-benefit-indicators-decimal.json','utf8'));
for(const c of oracle.cases)assertReferenceValue(evaluateIranianBenefitIndicators(c.inputs[0]),c.expected,oracle.tolerances.absolute,oracle.tolerances.relative);
const witness=oracle.cases.find((c:{inputs:{capacityKwp:number;annualGenerationMwh:number;penaltyRateTomanPerKwh:number;outageLossMillionTomanPerKwp:number}[]})=>Object.values(c.inputs[0]).filter(x=>typeof x==='number').every(x=>Number(x)>0));
if(!witness)throw new Error('Missing positive independent witness');
const records:PhysicsReferenceRecord[]=[];
for(const unit of extractFormulaUnits(file,readFileSync(file,'utf8'))) {
 const fixtureFile=`scripts/fixtures/physics/iranian-benefit-${unit.formulaId.split('#').at(-1)}.json`;
 const r=oracle.referenceSource;
 const record={formulaId:unit.formulaId,fixtureFile,productionExport:unit.functionName,referenceTitle:r.title,referenceUrl:r.url,referenceVersion:r.version,referenceLocator:r.locator};
 writeFileSync(fixtureFile,JSON.stringify({schemaVersion:1,formulaId:unit.formulaId,independentOfImplementation:true,
  productionExport:unit.functionName,inputs:witness.inputs,expected:witness.expected,
  independentCalculation:oracle.independentCalculation,tolerances:oracle.tolerances,referenceSource:r},null,2)+'\n');
 await executeReferenceFixture(record);records.push(record);
}
if(!records.length)throw new Error('No mathematical expressions extracted');
const manifestFile='scripts/physics-reference-evidence.json';
const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));
manifest.fixtures=manifest.fixtures.filter((r:PhysicsReferenceRecord)=>!r.formulaId.startsWith(file+'#'));
// The independent grid-ledger generator canonicalizes its own records at the end.
// Preserve that existing reproducibility contract; do not rewrite its generator or references.
const gridStart=manifest.fixtures.findIndex((r:PhysicsReferenceRecord)=>r.fixtureFile.startsWith('scripts/fixtures/physics/grid-import-'));
manifest.fixtures.splice(gridStart<0?manifest.fixtures.length:gridStart,0,...records);
writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(`PASS registered ${records.length} executed/reachable/sensitive Decimal reference expressions; full pool independently generated`);
