import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReferenceDiodePanel} from '../src/components/ReferenceDiodePanel';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {evaluateReferenceDiode as publicEvaluate,calculateSingleDiodeCurve} from '../src/engine/singleDiodeModel';
import {ReferenceDiodeInputSchema, type ReferenceDiodeInput} from '../src/contracts/referenceDiode';
import * as solver from '../src/engine/core/referenceDiodeSolver';
import {assertReferenceValue,executeReferenceFixture,extractFormulaUnits,type PhysicsReferenceRecord} from './verify-physics-reference-gate';
const file='scripts/fixtures/physics/bounded-diode-pvlib.json';
const reference=JSON.parse(readFileSync(file,'utf8')) as {cases:{id:string;inputs:[ReferenceDiodeInput];expected:Extract<ReturnType<typeof publicEvaluate>,{status:'available'}>}[];pools:Record<string,{inputs:unknown[];expected:unknown}[]>};
assert.equal(publicEvaluate,solver.evaluateReferenceDiode,'Public module re-exports the separate explicit API, not another implementation');
assert.equal(reference.cases.length,72);
const functions=solver as unknown as Record<string,(...args:unknown[])=>unknown>;
let comparisons=0;
for(const [owner,cases] of Object.entries(reference.pools))for(const c of cases){assertReferenceValue(functions[owner](...c.inputs),c.expected,owner==='translateReferenceDiode'?1e-15:2e-7,1e-8);comparisons++;}
const maxima={vocVolts:0,iscAmps:0,vmpVolts:0,impAmps:0,pmpWatts:0};
for(const c of reference.cases){
 const before=structuredClone(c.inputs[0]);
 const result=publicEvaluate(c.inputs[0]);
 assert.deepEqual(c.inputs[0],before,'Do not mutate user reference data');
 assert.equal(result.financialAdoptionEligible,false);
 assert.equal(result.status,'available');if(result.status!=='available')throw new Error(c.id);
 assert.deepEqual(result.input,before,'Result retains complete explicit policy/provenance/conditions for serialized replay');
 assert.deepEqual(publicEvaluate(JSON.parse(JSON.stringify(result.input))),result);
 const p=result.parameters;
 const upper=p.a*Math.log1p(p.iph/p.i0);
 assert.ok(Math.abs(result.residuals.openCircuitAmps)<=1e-10+1e-12*p.iph);
 assert.ok(Math.abs(result.residuals.shortCircuitVolts)<=1e-10+1e-12*upper);
 assert.ok(Math.abs(result.residuals.mppDerivativeAmps)<=1e-10+1e-12*p.iph);
 assert.ok(result.vmp<=result.voc&&result.imp<=result.isc&&result.pmp>=0);
 maxima.vocVolts=Math.max(maxima.vocVolts,Math.abs(result.voc-c.expected.voc));
 maxima.iscAmps=Math.max(maxima.iscAmps,Math.abs(result.isc-c.expected.isc));
 maxima.vmpVolts=Math.max(maxima.vmpVolts,Math.abs(result.vmp-c.expected.vmp));
 maxima.impAmps=Math.max(maxima.impAmps,Math.abs(result.imp-c.expected.imp));
 maxima.pmpWatts=Math.max(maxima.pmpWatts,Math.abs(result.pmp-c.expected.pmp));
}
for(const lang of ['en','fa'] as const){const html=renderToStaticMarkup(React.createElement(ReferenceDiodePanel,{lang}));assert.match(html,/desoto_reference_bounded_v1/);assert.match(html,/financialAdoptionEligible: false/);assert.doesNotMatch(html,/data-testid="reference-diode-result"/);assert.match(html,/maxLength="32768"/);}
const base=structuredClone(reference.cases[0].inputs[0]);
const noBudget=JSON.parse(JSON.stringify(base));delete noBudget.iterationLimit;
assert.deepEqual(publicEvaluate(noBudget),publicEvaluate(base),'Absent iteration budget defaults only in the validated schema');
let invalidCases=0;
function invalid(raw:unknown){assert.deepEqual(publicEvaluate(raw),{modelPolicy:'desoto_reference_bounded_v1',financialAdoptionEligible:false,status:'unavailable',reason:'invalid_input'});invalidCases++;}
for(const raw of [null,{},[],0,'', {...base,modelPolicy:'future'}, {...base,gammaPmpPct:-.3},{...base,betaVocPct:-.8},{...base,iterationLimit:0},{...base,iterationLimit:129},{...base,iterationLimit:NaN}])invalid(raw);
for(const g of [-1,1,49.9999,1400.0001,NaN,Infinity])invalid({...base,conditions:{...base.conditions,effectiveIrradianceWm2:g}});
for(const temp of [-273.15,-20.001,85.001,NaN,Infinity])invalid({...base,conditions:{...base.conditions,cellTempC:temp}});
for(const count of [0,1.5,101,Infinity])invalid({...base,conditions:{...base.conditions,seriesModules:count}});
for(const key of ['photocurrentA','saturationCurrentA','shuntResistanceOhm','diodeFactorV'] as const)for(const v of [0,-1,NaN,Infinity,'1'])invalid({...base,reference:{...base.reference,[key]:v}});
invalid({...base,reference:{...base.reference,seriesResistanceOhm:-1}});
invalid({...base,reference:{...base.reference,basis:'string'}});
invalid({...base,reference:{...base.reference,referenceCellTempC:20}});
invalid({...base,reference:{...base.reference,provenance:{source:'',recordId:'unknown'}}});
invalid({...base,reference:{...base.reference,measuredGamma:-.3}});
const dark=publicEvaluate({...base,conditions:{...base.conditions,effectiveIrradianceWm2:0}});
assert.equal(dark.status,'dark');assert.equal(dark.financialAdoptionEligible,false);
if(dark.status==='dark')assert.deepEqual([dark.voc,dark.isc,dark.vmp,dark.imp,dark.pmp],[0,0,0,0,0]);
assert.ok(!JSON.stringify(dark).includes('null'),'Dark results do not serialize Infinity Rsh to null');
const exhausted=publicEvaluate({...base,iterationLimit:1});assert.equal(exhausted.status,'unavailable');if(exhausted.status==='unavailable')assert.equal(exhausted.reason,'not_converged');
for(const raw of [
 {...base,reference:{...base.reference,shuntResistanceOhm:1e308},conditions:{...base.conditions,seriesModules:100}},
 {...base,reference:{...base.reference,alphaScAperC:100}},
 {...base,reference:{...base.reference,saturationCurrentA:1e-320}},
])assert.equal(publicEvaluate(raw).status,'unavailable','Overflow, negative translation or ratio singularity cannot become successful metrics');

// F08 now repairs legacy roots too; explicit reference API remains separate.
// Cross-check the unchanged legacy translated parameters with reference kernel.
const bad=calculateSingleDiodeCurve(51.2,14.37,42.65,13.6,580,-.8,.045,-.3,1000,65,1);
const lp=bad.extractedParameters;assert.ok(lp);assert.equal(bad.voc,45);assert.ok(bad.solverDiagnostics);assert.ok(Math.abs(bad.solverDiagnostics.openCircuitResidualA)<1e-9);
const p={iph:lp.iph,i0:lp.i0,rs:lp.rs,rsh:lp.rsh,a:lp.n*lp.vt};
const root=solver.solveBoundedDiodeRoot(p,'voc',128);assert.notEqual(root,null);if(root===null)throw new Error('Seed-free root unavailable');
const resolved=solver.evaluateDiodeState(p,root);
assert.ok(Math.abs(resolved.current)<=1e-10+1e-12*p.iph);
assert.ok(Math.abs(resolved.voltage-45)<.005,'Bounded root matches the converged legacy witness within old display quantization');
assert.ok(!ReferenceDiodeInputSchema.safeParse({...base,betaVocPct:-.8}).success,'A Newton seed is not an explicit fit constraint');
const records=JSON.parse(readFileSync('scripts/physics-reference-evidence.json','utf8')).fixtures as PhysicsReferenceRecord[];
const owner='src/engine/core/referenceDiodeSolver.ts';
const units=extractFormulaUnits(owner,readFileSync(owner,'utf8'));
const witnesses=records.filter(r=>r.formulaId.startsWith(owner+'#'));
assert.equal(units.length,66);assert.deepEqual(witnesses.map(r=>r.formulaId).sort(),units.map(r=>r.formulaId).sort());
for(const r of witnesses)await executeReferenceFixture(r);
const report={schemaVersion:1,scope:'Explicit reference De Soto translation and bounded continuous single-diode metrics only; no fitting/operational adoption',oracleSha256:createHash('sha256').update(readFileSync(file)).digest('hex'),cases:72,componentAndPolicyComparisons:comparisons,invalidCases,executedSensitiveExpressions:witnesses.length,maxima,legacyWitness:{legacyVoc:bad.voc,boundedVoc:resolved.voltage,boundedResidualAmps:resolved.current,legacyApiUnchanged:false,legacyRootRepairPolicy:bad.solverDiagnostics.policy},limitations:['No arbitrary datasheet fitting or beta/gamma constraint','No field/manufacturer/whole-model applicability approval','Only temporary explicit I-V metrics UI selection; no catalog/persistence/HTTP/annual-energy/financial adoption','Legacy roots repaired separately under ADR-035; extraction remains heuristic; reference API is explicit only']};
const out='docs/audit/independent-handoff-935b01a/remaining-bounded-diode-comparison.json';
if(process.argv.includes('--write'))writeFileSync(out,JSON.stringify(report,null,2)+'\n');else assert.deepEqual(JSON.parse(readFileSync(out,'utf8')),report,'Investigate reference/result drift before explicit receipt regeneration');
console.log(`PASS bounded reference diode:72 external cases,${comparisons} independent component/policy vectors,${invalidCases} invalid contracts,66 executed mutation-sensitive expressions; dark/exhaustion/domain failure and explicit-kernel cross-check of separately repaired legacy roots (ADR-035).`);
console.log(JSON.stringify(report,null,2));
