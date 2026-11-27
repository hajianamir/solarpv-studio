import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,unlinkSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {calculateFixedTiltTranspositionGain,SCALAR_TRANSPOSITION_POLICY} from '../src/engine/core/scalarTransposition';
import {calculateFixedTiltTranspositionGain as compatibility} from '../src/engine/waterfallLossEngine';
import {WaterfallLossTab} from '../src/components/WaterfallLossTab';
import {executeReferenceFixture,type PhysicsReferenceRecord} from './verify-physics-reference-gate';

const BASE='0d41fd38c8038fb5a2c4f1da8082dc2fbcd2f8fb';
const ref=JSON.parse(readFileSync('scripts/fixtures/physics/scalar-transposition-decimal.json','utf8'));
assert.equal(SCALAR_TRANSPOSITION_POLICY,'legacy_latitude_tilt_screen_v1');
assert.equal(compatibility,calculateFixedTiltTranspositionGain,'Compatibility export must be the same function, not another implementation');
for(const c of ref.cases)assert.equal(calculateFixedTiltTranspositionGain(...c.inputs as [number?,number?]),c.expected,'Independent Decimal Taylor-series policy characterization');
// Execute every newly extracted expression even before Git tracks the file.
const records=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures as PhysicsReferenceRecord[];
const nodes=records.filter(r=>r.formulaId.startsWith('src/engine/core/scalarTransposition.ts#'));
assert.equal(nodes.length,15);
for(const r of nodes)await executeReferenceFixture(r);

const source=execFileSync('git',['show',`${BASE}:src/engine/waterfallLossEngine.ts`],{encoding:'utf8'});
const temp=resolve('src/engine',`.transposition-baseline-${process.pid}.ts`);
writeFileSync(temp,source,{flag:'wx'});
let checked=0;
try {
 const old=await import(pathToFileURL(temp).href);
 const tilts=[undefined,NaN,-Infinity,Infinity,-360,-1,-Number.MIN_VALUE,0,Number.MIN_VALUE,8,20,30,45,60,90,180,360];
 const latitudes=[undefined,NaN,-Infinity,Infinity,-90,-35.69,0,35.69,90];
 for(const tilt of tilts)for(const latitude of latitudes){
  assert.ok(Object.is(calculateFixedTiltTranspositionGain(tilt,latitude),old.calculateFixedTiltTranspositionGain(tilt,latitude)),`${tilt}/${latitude}: legacy exact scalar semantics`);checked++;
 }
} finally {unlinkSync(temp);}
for(const lang of ['en','fa'] as const){
 const html=renderToStaticMarkup(React.createElement(WaterfallLossTab,{lang}));
 assert.match(html,/data-testid="scalar-transposition-policy"/);
 assert.match(html,/legacy_latitude_tilt_screen_v1/);
 assert.match(html,lang==='en'?/Not weather-driven transposition/:/مدل مبتنی بر هواشناسی نیست/);
}
function sources(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?sources(`${dir}/${e.name}`):/\.tsx?$/.test(e.name)?[`${dir}/${e.name}`]:[]);}
// Unused legacy annual interface is not the chosen transposition policy. Do not
// accidentally promote it to a production consumer under its misleading name.
for(const file of sources('src').filter(p=>!p.includes('/benchmarks/'))){
 const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 for(const node of ast.statements)if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&/annualYieldEngine$/.test(node.moduleSpecifier.text)){
  const b=node.importClause?.namedBindings;
  if(b&&ts.isNamedImports(b))for(const n of b.elements)assert.ok(!['calculateUnifiedAnnualYield','calculateStandardDeratingFactor'].includes((n.propertyName??n.name).text),`${file}: deprecated alternate annual policy must not be promoted`);
  assert.ok(!b||!ts.isNamespaceImport(b),`${file}: namespace import bypasses explicit annual ownership`);
 }
}
console.log(`PASS transposition owner: ${ref.cases.length} independent Decimal cases, 15 executed mutation-sensitive nodes, ${checked} actual base scalar comparisons; bilingual UI and legacy-consumer guard. No physical POA validation.`);
