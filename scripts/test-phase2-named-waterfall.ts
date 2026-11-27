import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync, readdirSync, writeFileSync, unlinkSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {buildWaterfallArgs, computeConfiguredWaterfall, WATERFALL_ARG_COUNT, type WaterfallArgsInput} from '../src/engine/waterfallArgs';
import {computeWaterfallLosses} from '../src/engine/waterfallLossEngine';
import {computeCanonicalAnnualYield} from '../src/engine/core/annualYieldEngine';
import {simulateAnnual3dShading, simulateAnnual3dShadingCooperative, annualShadingSteps, type Scene3DState} from '../src/engine/roof3dShadingEngine';
import {extractFormulaUnits,assertReferenceValue,drainReferenceGenerator} from './verify-physics-reference-gate';

const BASE='0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb';
const independent=JSON.parse(readFileSync('scripts/fixtures/physics/named-waterfall-decimal.json','utf8'));
for(const c of independent.cases)assertReferenceValue(computeCanonicalAnnualYield(c.inputs[0]),c.expected,independent.tolerances.absolute,independent.tolerances.relative);
const json=(x:unknown)=>JSON.parse(JSON.stringify(x));
const tracker={gcr:.33,axisTiltDeg:0,maxRotationDeg:60,enableBacktracking:true,albedo:.2,latitudeDeg:-35};
const explicit:WaterfallArgsInput={installedCapacityKwp:123,peakSunHours:4.9,ambientTempMaxC:39,soilingLossPct:3.2,dcAcRatio:1.47,hasTracker:false,snowLossPct:2.1,iamLossPct:-1.8,noctC:42,tempCoeffPmpPct:-.41,trackerConfig:tracker,installationEnv:'ground_mount',fixedTiltDeg:27,latitudeDeg:-35,shadingLossOverridePct:5.7,bifacialGainPct:3.4,annualThermalDerateOverridePct:-4.2};
assert.equal(WATERFALL_ARG_COUNT,17);
assert.deepEqual(buildWaterfallArgs(explicit),[123,4.9,39,3.2,1.47,false,2.1,-1.8,42,-.41,tracker,'ground_mount',27,-35,5.7,3.4,-4.2]);
assert.deepEqual(buildWaterfallArgs({peakSunHours:0}),[1000,0,35,4.5,1.25,false,0,-2.2,45,-.3,undefined,undefined,undefined,undefined,undefined,undefined,undefined]);
const aliases:WaterfallArgsInput={dcCapacityKw:123,peakSunHours:4.9,ambientTempC:39,isSingleAxisTracker:false,snowLossPct:2.1,soilingLossPct:3.2,dcAcRatio:1.47,iamLossPct:-1.8,moduleNoctC:42,tempCoeffPmpPct:-.41,trackerConfig:tracker,installationEnvironment:'ground_mount',tiltDeg:27,latitudeDeg:-35,shadingLoss3dPct:5.7,bifacialGainPct:3.4,annualThermalDerateOverridePct:-4.2};
assert.deepEqual(buildWaterfallArgs(aliases),buildWaterfallArgs(explicit));
assert.deepEqual(buildWaterfallArgs({...aliases,...explicit,dcCapacityKw:999,ambientTempC:99,isSingleAxisTracker:true,moduleNoctC:99,installationEnvironment:'industrial_shed',tiltDeg:99,shadingLoss3dPct:99,nearShadingLossPct:99}),buildWaterfallArgs(explicit));
assert.equal(buildWaterfallArgs({peakSunHours:5,nearShadingLossPct:0})[14],0);
assert.equal(buildWaterfallArgs({peakSunHours:5,shadingLoss3dPct:2,nearShadingLossPct:9})[14],2);
for(const field of ['installedCapacityKwp','ambientTempMaxC','soilingLossPct','dcAcRatio','snowLossPct','iamLossPct','noctC','tempCoeffPmpPct','fixedTiltDeg','latitudeDeg','shadingLossOverridePct','bifacialGainPct','annualThermalDerateOverridePct'] as const) {
 const slot={installedCapacityKwp:0,ambientTempMaxC:2,soilingLossPct:3,dcAcRatio:4,snowLossPct:6,iamLossPct:7,noctC:8,tempCoeffPmpPct:9,fixedTiltDeg:12,latitudeDeg:13,shadingLossOverridePct:14,bifacialGainPct:15,annualThermalDerateOverridePct:16}[field];
 for(const value of [0,NaN])assert.ok(Object.is(buildWaterfallArgs({...explicit,[field]:value})[slot],value),`${field} must not truthy-default or coerce`);
}
const cases:WaterfallArgsInput[]=[{peakSunHours:5},explicit,aliases,{...explicit,trackerConfig:undefined,hasTracker:true},{peakSunHours:0,installedCapacityKwp:0},{peakSunHours:5,trackerConfig:null},{peakSunHours:5,physicalLossConfig:{module:{noctC:42},iam:{aoiBeamDeg:40,tiltDeg:25}}}];
for(const installationEnvironment of ['ground_mount','industrial_shed','rooftop_flat_concrete'] as const)
 for(const annualThermalDerateOverridePct of [-10,0,10,100])cases.push({peakSunHours:5,installationEnvironment,annualThermalDerateOverridePct});
for(const input of cases) {
 const before=structuredClone(input);
 assert.deepEqual(json(computeConfiguredWaterfall(input)),json(computeWaterfallLosses(...buildWaterfallArgs(input))));
 assert.deepEqual(input,before,'Named routing must not mutate project input');
}
for(const bad of [NaN,Infinity,-Infinity,100.01]) {
 const input={peakSunHours:5,annualThermalDerateOverridePct:bad};
 assert.throws(()=>computeConfiguredWaterfall(input));
 assert.throws(()=>computeWaterfallLosses(...buildWaterfallArgs(input)));
}

// Consumer guard: reject even renamed imports, namespace/destructuring bypasses,
// re-exports and dynamic imports. Type-only reports and the configured API remain valid.
function violations(source:string):string[] {
 const file=ts.createSourceFile('consumer.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const errors:string[]=[];
 const forbidden=new Set(['computeWaterfallLosses','buildWaterfallArgs','withReferenceLossMetadata']);
 const isBoundary=(s:string)=>/\/(waterfallArgs|waterfallLossEngine)(\.ts)?$/.test(s);
 function visit(node:ts.Node) {
  if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&isBoundary(node.moduleSpecifier.text)) {
   const clause=node.importClause;
   if(clause&&!clause.isTypeOnly) {
    if(clause.name)errors.push('default import bypass');
    const bindings=clause.namedBindings;
    if(bindings&&ts.isNamespaceImport(bindings))errors.push('namespace import bypass');
    if(bindings&&ts.isNamedImports(bindings))for(const e of bindings.elements)if(!e.isTypeOnly&&forbidden.has((e.propertyName??e.name).text))errors.push('legacy value import');
   }
  }
  if(ts.isExportDeclaration(node)&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)&&isBoundary(node.moduleSpecifier.text)&&!node.isTypeOnly) {
   if(!node.exportClause)errors.push('wildcard re-export bypass');
   else if(ts.isNamedExports(node.exportClause)&&node.exportClause.elements.some(e=>!e.isTypeOnly&&forbidden.has((e.propertyName??e.name).text)))errors.push('legacy re-export');
  }
  if(ts.isCallExpression(node)&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&isBoundary(node.arguments[0].text))errors.push('dynamic boundary load');
  ts.forEachChild(node,visit);
 }
 visit(file);return errors;
}
for(const witness of [
 "import {computeWaterfallLosses as x} from './waterfallLossEngine'; x();",
 "import {buildWaterfallArgs as x} from './waterfallArgs'; x({});",
 "import {withReferenceLossMetadata} from './waterfallArgs';",
 "import * as w from './waterfallArgs'; const {buildWaterfallArgs:x}=w;",
 "export {computeWaterfallLosses as x} from './waterfallLossEngine';",
 "export * from './waterfallArgs';",
 "import('./waterfallArgs');",
])assert.ok(violations(witness).length,`Guard must reject ${witness}`);
assert.deepEqual(violations("import type {WaterfallLossReport} from './waterfallLossEngine'; import {computeConfiguredWaterfall,type WaterfallArgsInput} from './waterfallArgs';"),[]);
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(`${dir}/${e.name}`):/\.tsx?$/.test(e.name)?[`${dir}/${e.name}`]:[]);}
for(const path of sources('src').filter(p=>!p.includes('/benchmarks/')&&!['src/engine/waterfallArgs.ts','src/engine/waterfallLossEngine.ts'].includes(p)))assert.deepEqual(violations(readFileSync(path,'utf8')),[],`${path}: route through configured API`);

// Load the actual base-version consumers beside their relative dependencies.
// Temporary source is removed after import even when the import fails.
async function baseline(path:string) {
 const source=execFileSync('git',['show',`${BASE}:${path}`],{encoding:'utf8',maxBuffer:8*1024*1024});
 const oldUnits=extractFormulaUnits(path,source).map(f=>f.formulaId),newUnits=extractFormulaUnits(path,readFileSync(path,'utf8')).map(f=>f.formulaId);
 if(path.endsWith('annualYieldEngine.ts')) {
  assert.deepEqual(oldUnits.filter(id=>!newUnits.includes(id)),[`${path}#computeCanonicalAnnualYield#02820d20092d`]);
  assert.deepEqual(newUnits.filter(id=>!oldUnits.includes(id)),[`${path}#computeCanonicalAnnualYield#2c3d77e814c1`]);
 } else {
  assert.deepEqual(oldUnits.filter(id=>!newUnits.includes(id)),[`${path}#annualShadingSteps#24f8170b9aa0`]);
  assert.deepEqual(newUnits.filter(id=>!oldUnits.includes(id)),[`${path}#annualShadingSteps#a3427c625e63`]);
 }
 const temp=resolve(dirname(path),`.phase2-baseline-${process.pid}.ts`);
 writeFileSync(temp,source,{flag:'wx'});
 try {return await import(pathToFileURL(temp).href);}finally{unlinkSync(temp);}
}
const oldAnnual=await baseline('src/engine/core/annualYieldEngine.ts');
for(const latitudeDeg of [-35,0,35])for(const installedCapacityKwp of [0,100])for(const annualThermalDerateOverridePct of [-10,0,10]) {
 const input={installedCapacityKwp,peakSunHours:5,ambientTempMaxC:40,latitudeDeg,annualThermalDerateOverridePct};
 assert.deepEqual(json(computeCanonicalAnnualYield(input)),json(oldAnnual.computeCanonicalAnnualYield(input)),'Actual canonical consumer JSON parity');
}
const oldRoof=await baseline('src/engine/roof3dShadingEngine.ts');
for(const latitude of [-35,35])for(const totalPvCapacityKwp of [0,10]) {
 const scene:Scene3DState={anchorLocation:{latitude,longitude:51,elevationM:0},roofPlanes:[],obstacles:[],pvTables:[],updatedAt:'2026-01-01T00:00:00Z',totalPvCapacityKwp,tiltDeg:25};
 const options={simulationMode:'screening_3day' as const};
 assert.deepEqual(json(simulateAnnual3dShading(scene,5,40,options)),json(oldRoof.simulateAnnual3dShading(scene,5,40,options)),'Actual roof consumer JSON parity');
}
const roofReference=JSON.parse(readFileSync('scripts/fixtures/physics/roof-named-waterfall-decimal.json','utf8'));
for(const c of roofReference.cases) {
 const actual=drainReferenceGenerator(annualShadingSteps(c.inputs[0],c.inputs[1],c.inputs[2],c.inputs[3]));
 assertReferenceValue(actual,c.expected,roofReference.tolerances.absolute,roofReference.tolerances.relative);
 assert.deepEqual(actual,simulateAnnual3dShading(c.inputs[0],c.inputs[1],c.inputs[2],c.inputs[3]));
}
let populatedCases=0;
for(const latitude of [-35,35])for(const tiltDeg of [0,30])for(const obstaclesPresent of [false,true]) {
 const scene:Scene3DState={anchorLocation:{latitude,longitude:51,elevationM:0},roofPlanes:[],obstacles:obstaclesPresent?[{id:'obstacle',name:'test',geometryType:'cuboid',positionEnu:{x:0,y:-3,z:0},dimensionsM:{widthM:4,lengthM:2,heightM:4}}]:[],pvTables:[{id:'table',tableIndex:0,positionEnu:{x:0,y:0,z:1},widthM:4,slopedLengthM:2.3,tiltDeg,azimuthDeg:latitude>0?0:180,moduleCount:4,ratedPowerWp:2320}],updatedAt:'2026-01-01T00:00:00Z',totalPvCapacityKwp:2.32,totalModulesCount:4,tiltDeg};
 const options={simulationMode:'screening_3day' as const,stepDays:30};
 const before=structuredClone(scene);
 const current=simulateAnnual3dShading(scene,5,40,options);
 assert.deepEqual(json(current),json(oldRoof.simulateAnnual3dShading(scene,5,40,options)),'Populated scene preserves base report, shading and capacity reconciliation');
 assert.deepEqual(await simulateAnnual3dShadingCooperative(scene,5,40,options),current,'Cooperative and synchronous final reports agree');
 assert.deepEqual(scene,before,'Generator routing does not mutate scene');
 populatedCases++;
}
for(const psh of [0,-1,NaN,Infinity]) {
 const scene:Scene3DState={anchorLocation:{latitude:0,longitude:0,elevationM:0},roofPlanes:[],obstacles:[],pvTables:[],updatedAt:'2026-01-01T00:00:00Z'};
 assert.throws(()=>simulateAnnual3dShading(scene,psh));
 assert.throws(()=>oldRoof.simulateAnnual3dShading(scene,psh));
 await assert.rejects(()=>simulateAnnual3dShadingCooperative(scene,psh));
}
console.log(`PASS named waterfall: 17 slots/defaults/aliases, ${cases.length} report cases, invalid overrides; 5 canonical and 4 roof independent Decimal cases; two gated call replacements only; 36 canonical, 4 empty and ${populatedCases} populated roof baseline JSON comparisons plus cooperative parity. No production positional exception; not physical validation.`);
