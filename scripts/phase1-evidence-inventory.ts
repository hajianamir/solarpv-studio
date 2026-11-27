import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {PHYSICS_MODEL_REGISTRY} from '../src/engine/core/modelRegistry';
const target='docs/audit/dual-independent-audit-review/current-implementation-evidence.json';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['__pycache__','.venv','tests'].includes(e.name)?files(`${dir}/${e.name}`):e.isFile()&&!e.name.includes('.physics-reference-')&&/\.(ts|py)$/.test(e.name)?[`${dir}/${e.name}`]:[]).sort();}
const evidence=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures as {formulaId:string;fixtureFile:string;referenceTitle:string;referenceUrl:string;referenceVersion:string;referenceLocator:string}[];
const modules=[...files('src/engine'),...files('services'),...files('src/contracts'),...files('src/presentation')].map(path=>{
 const text=readFileSync(path,'utf8');
 const refs=evidence.filter(e=>e.formulaId.startsWith(path+'#'));
 const ast=path.endsWith('.ts')?ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true):undefined;
 const inputs=ast?ast.statements.filter(s=>ts.isInterfaceDeclaration(s)||ts.isTypeAliasDeclaration(s)).map(s=>({name:(s as ts.InterfaceDeclaration).name.text,line:ast.getLineAndCharacterOfPosition(s.getStart()).line+1})):Array.from(text.matchAll(/^(?:class |def |async def )(\w+)([^\n]*)/gm),m=>({name:m[1],signature:m[2],line:text.slice(0,m.index).split('\n').length}));
 return {path,sourceSha256:hash(text),inputsAndTypes:inputs,wholeModelConformity:null,
  implementationClassification:path.includes('/benchmarks/')?'internal_verification_support':'current_source_not_independently_validated_as_a_whole',
  independentlyValidatedWholeModelDomain:null,
  evidence:refs.map(e=>({...e,fixtureSha256:hash(readFileSync(e.fixtureFile,'utf8'))})),
  applicability:refs.length?'Component references only; units, tolerances and tested domain are defined in each linked fixture. Not blanket coverage.':'No formula-reference record linked in this registry; unknown evidence is not an accuracy or conformity approval.',
  unresolved:'Whole-model/project applicability, field validation and conformity not established by this inventory. See matrix/ADR-011 for high-risk blocked claims.'};
});
const result={schemaVersion:1,reviewDate:'2026-11-03',scope:'All current src/engine TypeScript, services Python, contracts and presentation boundary sources (tests/venvs excluded). Presence, interfaces and linked evidence, not validated implementation coverage.',
 baseline:'0c4d7cadc7db6001459ea36fdf9a3d1403179a71',modules,
 registryDeclarations:Object.values(PHYSICS_MODEL_REGISTRY).map(entry=>({...entry,assessment:'Declaration only: source/version/domain statements are not automatically verified implementation or applicability. Planned entries are not implemented coverage.',conformity:null})),
 inheritedReferenceDebt:{baseline:'71a7c2b52d8a109cb710e38e561c49e635c54698',missingCadExpressions:56,status:'BLOCKED; not waived by branch-diff gate'}};
const output=JSON.stringify(result,null,2)+'\n';
if(process.argv.includes('--check'))assert.equal(readFileSync(target,'utf8'),output,'Evidence inventory stale: run npx tsx scripts/phase1-evidence-inventory.ts');else writeFileSync(target,output);
console.log(`PASS source/evidence inventory: ${modules.length} modules; declarations not conformity; whole-model unknowns retained.`);
const dispositions=JSON.parse(readFileSync('docs/audit/dual-independent-audit-review/current-finding-dispositions.json','utf8')).findings as {id:string;baselineSourceOwnerEvidence:string;verificationPlan:string}[];
const ids=Array.from(readFileSync('docs/audit/dual-independent-audit-review/REPORT-AND-FOUR-PHASE-PLAN.md','utf8').matchAll(/^\| ([AB]-[A-Z]\d+) \|/gm),m=>m[1]);
assert.equal(ids.length,56);assert.equal(new Set(dispositions.map(d=>d.id)).size,56);
assert.deepEqual(dispositions.map(d=>d.id).sort(),ids.sort());
assert.ok(dispositions.every(d=>d.baselineSourceOwnerEvidence&&d.verificationPlan));
console.log('PASS all 56 audit finding dispositions retain source owners and verification plans.');
