import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {computeWaterfallLosses,type WaterfallLossReport} from '../src/engine/waterfallLossEngine';
import {computeConfiguredWaterfall,buildWaterfallArgs} from '../src/engine/waterfallArgs';
import {computeCanonicalAnnualYield} from '../src/engine/core/annualYieldEngine';
import {WaterfallLossTab} from '../src/components/WaterfallLossTab';
const path=resolve(`src/engine/.physics-reference-thermal-origin-${process.pid}.ts`);
const source=execFileSync('git',['show','c171538de7eade1a4090531820adb97306251105:src/engine/waterfallLossEngine.ts'],{encoding:'utf8'});
writeFileSync(path,source);
let count=0;
try{
 const base=await import(pathToFileURL(path).href) as typeof import('../src/engine/waterfallLossEngine');
 const strip=(report:WaterfallLossReport)=>{
  const {thermalInputQualification:ignored,...rest}=report;void ignored;
  return {...rest,stages:rest.stages.map(s=>s.id==='thermal'?{...s,descriptionEn:'corrected origin text',descriptionFa:'corrected origin text'}:s)};
 };
 for(const installationEnvironment of ['ground_mount','industrial_shed','rooftop_flat_concrete'] as const)
 for(const peakSunHours of [0,5])for(const annualThermalDerateOverridePct of [undefined,-10,0,10,100]){
  const input={installedCapacityKwp:100,peakSunHours,ambientTempMaxC:40,installationEnvironment,annualThermalDerateOverridePct};
  const args=buildWaterfallArgs(input),current=computeWaterfallLosses(...args);
  assert.deepEqual(strip(current),strip(base.computeWaterfallLosses(...args)),'Actual base numerical/stage compatibility except corrected thermal text/additive qualification');
  const named=computeConfiguredWaterfall(input);assert.deepEqual(named.thermalInputQualification,current.thermalInputQualification);
  const canonical=computeCanonicalAnnualYield(input);assert.deepEqual(canonical.waterfallReport.thermalInputQualification,current.thermalInputQualification);
  const q=current.thermalInputQualification!;
  assert.equal(q.basis,annualThermalDerateOverridePct===undefined?'scalar_noct_screen':'supplied_signed_annual_loss_unknown_origin');
  assert.equal(q.chronologicalCoverage,'not_established');assert.equal(q.timeSeriesSampleCount,null);
  assert.equal(q.independentlyValidatedApplicability,false);assert.equal(q.financialAdoptionEligible,false);
  assert.deepEqual(JSON.parse(JSON.stringify(current)).thermalInputQualification,q);
  const stage=current.stages.find(s=>s.id==='thermal')!;assert.doesNotMatch(stage.descriptionEn,/8760|Synthetic/);assert.doesNotMatch(stage.descriptionFa,/۸۷۶۰|8760|پروفایل ساعتی مصنوعی/);
  for(const lang of ['en','fa'] as const){
   const html=renderToStaticMarkup(React.createElement(WaterfallLossTab,{report:current,lang}));assert.match(html,new RegExp(`data-basis="${q.basis}"`));
   const {thermalInputQualification:ignored,...old}=current;void ignored;
   const legacy=renderToStaticMarkup(React.createElement(WaterfallLossTab,{report:old,lang}));assert.match(legacy,/data-basis="unknown_legacy_report"/);
  }
  count++;
 }
}finally{unlinkSync(path);}
console.log(`PASS thermal origin: ${count} actual-base whole-report compatibility cases; direct/named/canonical/JSON/bilingual SSR/legacy unknown, no inferred chronology or eligibility.`);
