// Select reach/sensitivity witnesses only from the independently generated
// oracle pool. Never generate expected values by executing production code.
import {readFileSync,writeFileSync} from 'node:fs';
import {extractFormulaUnits,executeReferenceFixture,assertReferenceValue,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
import * as solver from '../src/engine/core/referenceDiodeSolver';
const source='src/engine/core/referenceDiodeSolver.ts';
const oracle=JSON.parse(readFileSync('scripts/fixtures/physics/bounded-diode-pvlib.json','utf8')) as {pools:Record<string,{inputs:unknown[];expected:unknown;evidenceClass:string}[]>;referenceSource:{title:string;url:string;version:string;locator:string};independentCalculation:string};
const exports=solver as unknown as Record<string,(...args:unknown[])=>unknown>;
// Full pool must agree before any per-expression witness selection can proceed.
for(const [owner,cases] of Object.entries(oracle.pools))for(const c of cases)assertReferenceValue(exports[owner](...c.inputs),c.expected,owner==='translateReferenceDiode'?1e-15:2e-7,1e-8);
const records:PhysicsReferenceRecord[]=[];
for(const unit of extractFormulaUnits(source,readFileSync(source,'utf8'))){
 const fixtureFile=`scripts/fixtures/physics/bounded-diode-${unit.formulaId.split('#').at(-1)}.json`;
 const r=oracle.referenceSource;
 const record={formulaId:unit.formulaId,fixtureFile,productionExport:unit.functionName,referenceTitle:r.title,referenceUrl:r.url,referenceVersion:r.version,referenceLocator:r.locator};
 const cases=oracle.pools[unit.functionName];
 if(!cases)throw new Error(`No independent owner pool for ${unit.formulaId}`);
 // Interleave endpoints, analytic and iteration-budget witnesses before the
 // full reference matrix to avoid repeated redundant probe compilations.
 const candidates=unit.functionName==='solveBoundedDiodeRoot'?[...cases.slice(219,226),cases[0],cases[1],cases[2],cases[213],...cases.slice(226),...cases]:[cases[0],...cases.slice(-4),...cases.slice(1)];
 let accepted=false,lastError:unknown;
 for(const c of candidates){
  writeFileSync(fixtureFile,JSON.stringify({schemaVersion:1,formulaId:unit.formulaId,independentOfImplementation:true,productionExport:unit.functionName,inputs:c.inputs,expected:c.expected,independentCalculation:oracle.independentCalculation+' Selected vector evidence class: '+c.evidenceClass+'. Solver-budget and analytic/invalid boundaries are explicitly specified numerical-policy tests, not field evidence. Witness selected only for exact-node reach/sensitivity; complete oracle pool is independently replayed.',tolerances:{absolute:unit.functionName==='translateReferenceDiode'?1e-15:2e-7,relative:1e-8},referenceSource:r},null,2)+'\n');
  try{await executeReferenceFixture(record);accepted=true;break;}catch(error){lastError=error;}
 }
 if(!accepted)throw new Error(`No executed sensitive independent witness for ${unit.formulaId}`,{cause:lastError});
 records.push(record);
}
const file='scripts/physics-reference-evidence.json';
const manifest=JSON.parse(readFileSync(file,'utf8')) as {fixtures:PhysicsReferenceRecord[]};
manifest.fixtures=[...manifest.fixtures.filter(r=>!r.formulaId.startsWith(source+'#')),...records];
writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
console.log(`Registered ${records.length} executed mutation-sensitive reference expressions; no tolerance or production-output target generation.`);
