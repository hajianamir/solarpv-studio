import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {calculateSingleDiodeCurve} from '../src/engine/singleDiodeModel';
import {IvCurveTracerTab} from '../src/components/IvCurveTracerTab';
import {extractFormulaUnits} from './verify-physics-reference-gate';

type Inputs=Parameters<typeof calculateSingleDiodeCurve>;
interface Expected {iph:number;i0:number;rs:number;rsh:number;nNsVth:number;voc:number;isc:number;vmp:number;imp:number;pmp:number;voltages:number[];currents:number[];sampledVmp:number;sampledImp:number;sampledPmp:number}
const fixturePath='benchmarks/independent/phase3-single-diode.json';
const fixture=JSON.parse(readFileSync(fixturePath,'utf8')) as {reference:{version:string};cases:{id:string;inputs:Inputs;expected:Expected}[];tolerances:{parameterAbsolute:number;parameterRelative:number;roundedVoltageAbsolute:number;roundedCurrentAbsolute:number;roundedPowerAbsolute:number;roundedRelative:number}};
assert.equal(fixture.reference.version,'0.13.1');assert.equal(fixture.cases.length,48);
const t=fixture.tolerances;
const maxima:Record<string,{absoluteError:number;caseId:string} >={};
function observe(metric:string,error:number,id:string){assert.ok(Number.isFinite(error));if(!maxima[metric]||error>maxima[metric].absoluteError)maxima[metric]={absoluteError:error,caseId:id};}
function close(actual:number,expected:number,absolute:number,relative:number,label:string){assert.ok(Number.isFinite(actual)&&Number.isFinite(expected));assert.ok(Math.abs(actual-expected)<=absolute+relative*Math.abs(expected),`${label}: ${actual} vs ${expected}`);}
let points=0;
for(const c of fixture.cases){
 const a=calculateSingleDiodeCurve(...c.inputs),e=c.expected;
 const p=a.extractedParameters;assert.ok(p);
 const parameters={iph:p.iph,i0:p.i0,rs:p.rs,rsh:p.rsh,nNsVth:p.n*p.vt};
 for(const key of ['iph','i0','rs','rsh','nNsVth'] as const){
  close(parameters[key],e[key],t.parameterAbsolute,t.parameterRelative,`${c.id}/${key}`);
  observe(`${key}Relative`,Math.abs(parameters[key]-e[key])/Math.abs(e[key]),c.id);
 }
 close(a.voc,e.voc,t.roundedVoltageAbsolute,t.roundedRelative,`${c.id}/Voc`);
 close(a.vmp,e.sampledVmp,t.roundedVoltageAbsolute,t.roundedRelative,`${c.id}/sampledVmp`);
 close(a.imp,e.sampledImp,t.roundedCurrentAbsolute,t.roundedRelative,`${c.id}/sampledImp`);
 close(a.pmp,e.sampledPmp,t.roundedPowerAbsolute,t.roundedRelative,`${c.id}/sampledPmp`);
 assert.equal(a.points.length,81);
 for(let k=0;k<81;k++){
  close(a.points[k].v,e.voltages[k],t.roundedVoltageAbsolute,t.roundedRelative,`${c.id}/V${k}`);
  close(a.points[k].i,e.currents[k],t.roundedCurrentAbsolute,t.roundedRelative,`${c.id}/I${k}`);
  close(a.points[k].p,e.voltages[k]*e.currents[k],t.roundedPowerAbsolute,t.roundedRelative,`${c.id}/P${k}`);points++;
 }
 observe('vocVolts',Math.abs(a.voc-e.voc),c.id);
 observe('sampledPmpWatts',Math.abs(a.pmp-e.sampledPmp),c.id);
 // These are measured discrepancies, not broadened acceptance tolerances.
 observe('referenceGridOnlyPmpLossWatts',Math.abs(e.sampledPmp-e.pmp),c.id);
 observe('referenceGridOnlyPmpLossRelative',Math.abs(e.sampledPmp-e.pmp)/e.pmp,c.id);
 observe('truePmpWatts',Math.abs(a.pmp-e.pmp),c.id);
 observe('truePmpRelative',Math.abs(a.pmp-e.pmp)/e.pmp,c.id);
 observe('trueVmpVolts',Math.abs(a.vmp-e.vmp),c.id);
 observe('implicitIscAmps',Math.abs(a.isc-e.isc),c.id);
}
// Defect witnesses: coefficient fit claims cannot be inferred from arithmetic parity.
const common:Inputs=[51.2,14.37,42.65,13.6,580,-.25,.045,-.3,1000,65,1];
const gamma=[...common] as Inputs;gamma[7]=-.9;
assert.deepEqual(calculateSingleDiodeCurve(...common),calculateSingleDiodeCurve(...gamma),'Legacy gamma_Pmp input is unused; do not claim it is fitted');
const beta=[...common] as Inputs;beta[5]=-.5;
assert.deepEqual(calculateSingleDiodeCurve(...common),calculateSingleDiodeCurve(...beta),'At this witness beta changes the seed, not the solved diode relation');
const stressed=[...common] as Inputs;stressed[5]=-.8;
const stable=calculateSingleDiodeCurve(...common),failedSeed=calculateSingleDiodeCurve(...stressed);
assert.deepEqual(stable.extractedParameters,failedSeed.extractedParameters,'beta is not a fitted parameter constraint');
assert.ok(Math.abs(failedSeed.voc-stable.voc)>.01,'Extreme seed witness must retain the unconverged Voc defect');
const fp=failedSeed.extractedParameters;assert.ok(fp);
const failedVocResidual=fp.iph-fp.i0*Math.expm1(failedSeed.voc/(fp.n*fp.vt))-failedSeed.voc/fp.rsh;
assert.ok(Math.abs(failedVocResidual)>.005,'Returned endpoint is not an implicit diode root within current quantization');
const zero=[...common] as Inputs;zero[8]=0;const dark=calculateSingleDiodeCurve(...zero);assert.equal(dark.pmp,0);assert.equal(dark.voc,0);assert.equal(dark.points.length,2);
assert.ok(maxima.implicitIscAmps.absoluteError>.005,'Fixture must expose approximate scalar Isc beyond display quantization');
assert.ok(maxima.truePmpWatts.absoluteError>.05,'Fixture must expose MPP sampling discrepancy beyond power quantization');
for(const lang of ['en','fa'] as const){const html=renderToStaticMarkup(React.createElement(IvCurveTracerTab,{lang}));assert.match(html,/data-testid="single-diode-qualification"/);assert.match(html,lang==='en'?/gamma_Pmp is not fitted/:/gamma_Pmp برازش نمی‌شود/);assert.match(html,lang==='en'?/Cosmetic shading illustration/:/نمایش ظاهری سایه/);}
const engine='src/engine/singleDiodeModel.ts';
const baseline=execFileSync('git',['show',`a5b2c5f8eac89b3be3a9148f786653e0ee11815a:${engine}`],{encoding:'utf8'});
assert.deepEqual(extractFormulaUnits(engine,readFileSync(engine,'utf8')).map(x=>x.formulaId),extractFormulaUnits(engine,baseline).map(x=>x.formulaId),'First Phase3 slice must not change production equations');
const report={schemaVersion:1,scope:'U05 externally supplied parameter translation and sampled curve; not datasheet fitting, physical validation or adoption approval',fixtureSha256:createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),referenceVersion:fixture.reference.version,cases:48,comparedCurvePoints:points,passed:'Explicit reference-parameter translation and sampled-curve arithmetic within declared conversion/quantization budgets',unresolved:['Unused gamma_Pmp input','beta_Voc only influences Newton initialization, not a fitted temperature constraint','Legacy scalar Isc differs from implicit I(V=0)','80step sampled MPP is not exact optimized MPP','Legacy vt is aggregate Ns*kT/q, not per-cell kT/q','Extreme beta seed can return unconverged Voc; no convergence/error status is emitted','Summary-input extraction, invalid temperature/custom parameter domains and full convergence/error contracts not validated','No annual/financial/research adoption'],solverFailureWitness:{inputs:stressed,baselineVoc:stable.voc,failedSeedVoc:failedSeed.voc,implicitCurrentResidualAmps:failedVocResidual,evidenceClass:'Internal equation-residual/seed-invariance defect reproduction, not independent fitting evidence'},maxima};
const reportPath='docs/audit/dual-independent-audit-review/phase3-single-diode-comparison.json';
if(process.argv.includes('--write'))writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
else assert.deepEqual(JSON.parse(readFileSync(reportPath,'utf8')),report,'Comparison receipt stale; investigate before explicitly regenerating');
console.log(`PASS Phase3 U05 bounded reference replay: 48 pvlib cases/${points} points; coefficient/MPP/Isc limitation witnesses retained, bilingual disclosure, production formula AST unchanged. Not full U05 validation.`);
console.log(JSON.stringify(maxima,null,2));
