import {runIranianRegulationFinancialModel} from '../src/engine/iranianRegulationsFinancial';
import {recommendSharedFoundation} from '../src/engine/geotech/foundationRecommendation';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {readFile} from 'node:fs/promises';
import {unzipSync} from 'fflate';
import ExcelJS from 'exceljs';
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright-core';
import {selectLoadMode} from './research-browser-navigation';
const server=await preview({preview:{host:'127.0.0.1',port:0,strictPort:true}});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try {
 let executablePath:string|undefined;
 if(process.platform==='linux'){process.env.AWS_EXECUTION_ENV??='AWS_Lambda_nodejs20.x';executablePath=await(await import('@sparticuz/chromium')).default.executablePath();}
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1536,height:1024},serviceWorkers:'block'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 const address=server.httpServer.address();assert.ok(address&&typeof address==='object');
 await page.goto(`http://127.0.0.1:${address.port}`);
 const tab=async(id:string)=>page.getByTestId(`workflow-tab-${id}`).locator(':visible').first().click();
 // Real controls: independent explicit duty inputs, never inferred from the legacy panel.
 await tab('iran_regulations');
 const pumpingNpvBefore=await page.getByTestId('iranian-equity-npv').getAttribute('data-value');
 await tab('solar_pumping');
 assert.equal(await page.locator('#pump-duty-enable').isChecked(),false);
 await page.locator('#pump-duty-enable').check();
 await page.getByTestId('pump-duty-unavailable').waitFor();
 const pumpOracle=JSON.parse(await readFile('scripts/fixtures/physics/pump-duty-energy-decimal.json','utf8'));
 const duty=pumpOracle.cases.find((c:{inputs:Record<string,unknown>[]})=>{
  const v=c.inputs[0];return v.dailyWaterVolumeM3===120&&v.totalDynamicHeadM===50&&v.pumpingHoursPerDay===5&&v.pumpHydraulicEfficiency===.6&&v.motorEfficiency===.8&&v.driveEfficiency===.95&&v.availableDcEnergyKwhPerDay===100;
 });
 assert.ok(duty);
 for(const [key,value] of Object.entries(duty.inputs[0]))if(typeof value==='number')await page.locator(`#pump-duty-${key}`).fill(String(value));
 const pumpResult=page.getByTestId('pump-duty-result');await pumpResult.waitFor();
 assert.equal(await pumpResult.getAttribute('data-policy'),'pump_steady_duty_energy_v1');
 assert.equal(await pumpResult.getAttribute('data-guaranteed'),'false');
 assert.equal(await pumpResult.getAttribute('data-energy-balance'),'no_aggregate_deficit');
 for(const key of ['hydraulicPowerKw','pumpShaftPowerKw','motorElectricalPowerKw','driveDcInputPowerKw']) {
  const metric=page.getByTestId(`pump-duty-${key}`);const raw=Number(await metric.getAttribute('data-raw'));
  assert.ok(Math.abs(raw-duty.expected[key])<1e-10);assert.equal(await metric.innerText(),raw.toFixed(4));
 }
 assert.ok(Math.abs(Number(await page.getByTestId('pump-duty-required-energy').getAttribute('data-raw'))-duty.expected.requiredDcEnergyKwhPerDay)<1e-10);
 await page.locator('#pump-duty-availableDcEnergyKwhPerDay').fill('10');
 assert.equal(await pumpResult.getAttribute('data-energy-balance'),'deficit');
 assert.ok(Math.abs(Number(await page.getByTestId('pump-duty-deficit').getAttribute('data-raw'))-(duty.expected.requiredDcEnergyKwhPerDay-10))<1e-10);
 await page.locator('#pump-duty-dailyWaterVolumeM3').fill('0');
 assert.equal(Number(await page.getByTestId('pump-duty-required-energy').getAttribute('data-raw')),0);
 assert.equal(await pumpResult.getAttribute('data-guaranteed'),'false');
 await page.locator('#pump-duty-pumpHydraulicEfficiency').fill('0');
 await page.getByTestId('pump-duty-unavailable').waitFor();assert.equal(await pumpResult.count(),0);
 await page.locator('#pump-duty-enable').uncheck();assert.equal(await pumpResult.count(),0);
 await tab('iran_regulations');assert.equal(await page.getByTestId('iranian-equity-npv').getAttribute('data-value'),pumpingNpvBefore,'Duty comparison must not mutate finance');
 await tab('solar_pumping');assert.equal(await page.locator('#pump-duty-enable').isChecked(),false,'Disabled settings survive tab remount');

 await page.locator('#pump-duty-enable').check();
 assert.equal(await page.locator('#pump-duty-dailyWaterVolumeM3').inputValue(),'0','Zero survives remount');
 assert.equal(await page.locator('#pump-duty-pumpHydraulicEfficiency').inputValue(),'','Invalid efficiency is stored as null');
 await page.locator('#pump-duty-pumpHydraulicEfficiency').fill('0.6');
 await tab('iran_regulations');await tab('solar_pumping');
 assert.equal(await page.locator('#pump-duty-enable').isChecked(),true,'Enabled state survives remount');
 assert.equal(await page.locator('#pump-duty-totalDynamicHeadM').inputValue(),'50');
 await page.getByTestId('pump-duty-result').waitFor();

 async function check() {
  await tab('waterfall_loss');
  assert.match(await page.getByTestId('scalar-transposition-policy').innerText(),/legacy_latitude_tilt_screen_v1/);
  assert.equal(await page.getByTestId('thermal-input-qualification').getAttribute('data-basis'),'supplied_signed_annual_loss_unknown_origin');
  const annual=Number(await page.getByTestId('waterfall-annual-mwh').getAttribute('data-annual-mwh'));
  const pr=Number((await page.getByTestId('waterfall-pr-value').innerText()).replace('%',''));
  assert.equal(await page.getByTestId('summary-waterfall-pr').innerText(),pr.toFixed(1)+'%');
  await tab('sld');
  const dc=Number(await page.getByTestId('sld-dc-capacity').getAttribute('data-dc-kwp'));
  assert.ok(dc>0);
  const downloadPromise=page.waitForEvent('download');await page.getByTestId('sld-export-svg').click();
  const downloaded=await downloadPromise;const file=await downloaded.path();assert.ok(file);
  const svg=await readFile(file,'utf8');
  const parsed=await page.evaluate(text=>{
   const doc=new DOMParser().parseFromString(text,'image/svg+xml');
   return {invalid:!!doc.querySelector('parsererror'),dc:doc.querySelector('[data-testid="sld-dc-capacity"]')?.getAttribute('data-dc-kwp'),note:doc.querySelector('desc')?.textContent};
  },svg);
  const pdf=await page.pdf({printBackground:true});
  const pdfDocument=await getDocument({data:new Uint8Array(pdf),useSystemFonts:false,isEvalSupported:false}).promise;
  let pdfText='';for(let i=1;i<=pdfDocument.numPages;i++){const content=await(await pdfDocument.getPage(i)).getTextContent();pdfText+=content.items.map(item=>'str' in item?item.str:'').join(' ');}
  assert.ok(pdfText.replace(/\s+/g,'').includes(`ActualDC:${dc.toFixed(2)}kWp`),pdfText.slice(pdfText.indexOf('Preliminary'),pdfText.indexOf('Preliminary')+700));assert.match(pdfText,/not construction design/);
  await pdfDocument.destroy();
  assert.equal(parsed.invalid,false);assert.equal(Number(parsed.dc),dc);assert.match(parsed.note??'',/not construction design/);

  await tab('iran_regulations');
  assert.equal(Number(await page.getByTestId('iranian-input-summary').getAttribute('data-dc-kwp')),dc);
  assert.equal(Number(await page.getByTestId('iranian-input-summary').getAttribute('data-annual-mwh')),annual);
  const penalty=page.getByTestId('iranian-penalty-proxy');
  assert.equal(await penalty.getAttribute('data-policy'),'iranian_benefit_indicators_full_precision_v1');
  assert.ok(Math.abs(Number(await penalty.getAttribute('data-raw-million-toman'))-annual*4.2)<1e-8);
  assert.ok((await penalty.innerText()).includes((annual*4.2).toFixed(2)));
  assert.ok(Math.abs(Number(await page.getByTestId('iranian-outage-proxy').getAttribute('data-raw-million-toman'))-dc*8.5)<1e-8);
  for(const kind of ['project','equity']) {
   const irr=page.getByTestId(`iranian-${kind}-irr`);
   const status=await irr.getAttribute('data-status');
   assert.ok(status==='available'||status==='unavailable');
   if(status==='available') {
    const raw=Number(await irr.getAttribute('data-raw-pct'));
    assert.ok(Number.isFinite(raw)&&raw>=-90&&raw<=1000);
    assert.equal(await irr.innerText(),raw.toFixed(2)+'%');
   } else {
    assert.ok(await irr.getAttribute('data-reason'));
    assert.equal(await irr.getAttribute('data-raw-pct'),null);
   }
  }
  assert.equal(await page.getByTestId('iranian-equity-irr').getAttribute('data-policy'),'conventional_periodic_irr_bounded_v1');
  await page.getByTestId('iranian-irr-policy').waitFor();
  assert.match(await page.getByTestId('f04-regulatory-annualization-disclosure').innerText(),/cash-flow ledger retains full precision|جریان نقدی دقت کامل/);
  return dc;
 }
 await tab('electrical_requirements');await page.locator('#target-plant-capacity-input').fill('1100');
 const dc=await check();assert.notEqual(dc,1100,'actual module DC must not be the requested AC target');
 for(const mode of ['ongrid','offgrid'] as const){
  await selectLoadMode(page,mode);await check();await tab('scenarios');
  const lcoe=page.getByTestId('scenario-lcoe-optimized_lifepo4');
  assert.equal(await lcoe.getAttribute('data-assessment'),'available');
  const raw=Number(await lcoe.getAttribute('data-raw-lcoe'));
  assert.ok(raw>0);assert.equal(await lcoe.innerText(),`$${raw.toFixed(4)}/kWh`);
  await page.getByTestId('scenario-lcoe-method').waitFor();
 }

 await page.getByRole('button',{name:'EN',exact:true}).click();
 await tab('iv_curve');
 assert.match(await page.getByTestId('single-diode-qualification').innerText(),/gamma_Pmp is not fitted/);
 const unshadedIvMetrics=await page.getByTestId('iv-curve-metrics').innerText();
 await page.locator('#iv-partial-shading-checkbox').check();
 assert.match(await page.getByText('Cosmetic illustration only:',{exact:false}).innerText(),/KPI values remain the unshaded model outputs/);
 assert.equal(await page.getByTestId('iv-curve-metrics').innerText(),unshadedIvMetrics,'Cosmetic shading must not imply recalculated electrical metrics');

 await tab('iran_regulations');
 await page.locator('#iran-reg-interest-rate').fill('0');
 await page.locator('#iran-reg-debt-ratio').fill('35');
 await page.locator('#iran-reg-debt-tenor').fill('6');
 await page.locator('#iran-reg-tariff').fill('5000');
 await page.locator('#iran-policy-discountRatePct').fill('5');
 await page.locator('#iran-policy-tariffEscalationPct').fill('0');
 await page.locator('#iran-policy-opexEscalationPct').fill('3');
 const screenSettings={framework:'article_16',customTariffToman:5000,loanSharePct:35,loanInterestPct:0,loanTermYears:6,economicPolicy:{modelPolicy:'iranian_screen_economics_v1',currency:'TOMAN',rateBasis:'nominal',discountRatePct:5,tariffEscalationPct:0,opexEscalationPct:3}} as const;
 await page.locator('#iran-policy-opexEscalationPct').blur();
 await page.keyboard.press('Control+s');
 const localSettings=await page.evaluate(()=>JSON.parse(localStorage.getItem('solarpv_project_save')??'{}').iranianScreenSettings);
 assert.deepEqual(localSettings,screenSettings,'Local save retains the active economics, not prior tab defaults');
 const savedDuty=await page.evaluate(()=>JSON.parse(localStorage.getItem('solarpv_project_save')??'{}').pumpDutySettings);
 assert.equal(savedDuty.enabled,true);assert.equal(savedDuty.inputs.dailyWaterVolumeM3,0);
 const screenDc=Number(await page.getByTestId('iranian-input-summary').getAttribute('data-dc-kwp'));
 const screenMwh=Number(await page.getByTestId('iranian-input-summary').getAttribute('data-annual-mwh'));
 const expectedIranian=runIranianRegulationFinancialModel(screenDc,screenMwh,'article_16',5000,35,0,6,25,screenSettings.economicPolicy);
 assert.equal(Number(await page.getByTestId('iranian-project-npv').getAttribute('data-value')),expectedIranian.projectNpvMillionToman);
 assert.equal(Number(await page.getByTestId('iranian-equity-npv').getAttribute('data-value')),expectedIranian.equityNpvMillionToman);
 await tab('waterfall_loss');await tab('iran_regulations');
 assert.equal(await page.locator('#iran-reg-interest-rate').inputValue(),'0','Zero interest and policy survive tab unmount');
 assert.equal(await page.locator('#iran-policy-discountRatePct').inputValue(),'5');
 await tab('cables_bom');
 await page.getByTestId('feeder-ac-output-parallelArrangement').selectOption('equal_length_equal_sharing');
 await page.getByTestId('feeder-ac-output-equivalentReactanceOhmPerM').fill('0.000096');
 await page.getByTestId('feeder-ac-output-impedanceSource').fill('SYNTHETIC browser roundtrip at 60 Hz incl coupling; not site evidence');
 await page.getByRole('button',{name:/Lightning \(IEC 62305\)/}).click();
 assert.match(await page.getByTestId('lightning-separation-assessment').innerText(),/UNASSESSED/);
 await tab('structural');
 await page.getByRole('button',{name:/6-Section|6.Section|گزارش.*۶|گزارش.*6/}).click();
 const foundationReport=page.getByTestId('foundation-recommendation-report');await foundationReport.waitFor();
 const foundationInput=JSON.parse((await foundationReport.getAttribute('data-input'))!);
 const sharedFoundation=recommendSharedFoundation(foundationInput);
 const expectedReaction=sharedFoundation.upliftPerPostKn;
 const reportText=await foundationReport.innerText();
 assert.ok(reportText.includes(`**Net Uplift Demand ($T_u$ per post):** ${expectedReaction} kN`));
 assert.match(reportText,/applicability\/conformity UNASSESSED/);
 await page.getByRole('button',{name:'✕ Close',exact:true}).click();
 await page.keyboard.press('Control+e');
 await page.getByTestId('report-phase1-readiness').waitFor();
 assert.match(await page.getByTestId('report-phase1-readiness').innerText(),/unsupported|UNSUPPORTED/);
 const wordPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Word (.docx)',exact:true}).click();
 const wordPath=await (await wordPromise).path();assert.ok(wordPath);
 const xml=new TextDecoder().decode(unzipSync(await readFile(wordPath))['word/document.xml']);
 assert.match(xml,/ILLUSTRATIVE ASSUMPTIONS/);assert.match(xml,/Electrical readiness/);assert.match(xml,/UNSUPPORTED/);
 const excelPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Excel (.xlsx)',exact:true}).click();
 const excelPath=await (await excelPromise).path();assert.ok(excelPath);
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(excelPath);
 let contents='';workbook.eachSheet(sheet=>sheet.eachRow(row=>{contents+=JSON.stringify(row.values);}));
 assert.match(contents,/hemisphere_cosine_equator_flat_v1/);
 assert.match(contents,/positive_reference_irradiation/);
 assert.match(await page.getByTestId('report-thermal-policy').innerText(),/hemisphere_cosine_equator_flat_v1/);
 assert.match(contents,/ILLUSTRATIVE ASSUMPTIONS/);assert.match(contents,/Electrical rating readiness/);assert.match(contents,/unsupported_sensitivity/);

 const jsonPromise=page.waitForEvent('download');await page.getByTitle('Save Project File to Local Machine',{exact:true}).click();
 const jsonPath=await(await jsonPromise).path();assert.ok(jsonPath);
 const envelope=JSON.parse(await readFile(jsonPath,'utf8'));
 assert.deepEqual(envelope.projectData.iranianScreenSettings,screenSettings,'Actual project export preserves economics and all screen settings');
 assert.deepEqual(envelope.projectData.pumpDutySettings,savedDuty,'Report project file uses the canonical duty snapshot');
 const thermalOrigin=envelope.projectData.reportSnapshot.waterfallReport.thermalInputQualification;
 assert.equal(thermalOrigin.basis,'supplied_signed_annual_loss_unknown_origin');
 assert.equal(thermalOrigin.timeSeriesSampleCount,null);assert.equal(thermalOrigin.financialAdoptionEligible,false);
 const thermalSnapshot=envelope.projectData.reportSnapshot.annualThermalProfile;
 assert.equal(thermalSnapshot.seasonalTemperaturePolicy,'hemisphere_cosine_equator_flat_v1');
 assert.equal(thermalSnapshot.energyAvailability,'positive_reference_irradiation');
 assert.equal(thermalSnapshot.isMeasuredHourlyWeather,false);
 assert.ok(Math.abs(thermalSnapshot.annualThermalDeratePct+envelope.projectData.reportSnapshot.waterfallReport.stages.find((s:{id:string})=>s.id==='thermal').percentageLossRaw)<1e-10);
 assert.equal(envelope.projectData.reportSnapshot.phase1Evidence.bifacial.bankabilityEligible,false);
 assert.equal(envelope.projectData.reportSnapshot.phase1Evidence.economicAssumptions[0].effectiveDate,null);
 assert.equal(envelope.projectData.cableFeederInputs['ac-output'].parallelArrangement,'equal_length_equal_sharing');
 assert.equal(envelope.projectData.cableFeederInputs['ac-output'].equivalentReactanceOhmPerM,.000096);
 assert.match(envelope.projectData.cableFeederInputs['ac-output'].impedanceSource,/60 Hz/);
 const ratingEvidence={basis:'factored_array_isc',scope:'per_mppt',source:'SYNTHETIC browser persistence fixture, not manufacturer evidence',sourceDate:null,conditions:'Persistence only; not assessed',requiredMultiplier:1.25,operatingCurrentAmps:envelope.projectData.selectedInverter.imppMaxAmpsPerMppt,shortCircuitCurrentAmps:envelope.projectData.selectedInverter.iscMaxAmpsPerMppt};
 envelope.projectData.selectedInverter.mpptRatingEvidence=ratingEvidence;
 envelope.projectData.pumpDutySettings.inputs.dailyWaterVolumeM3=120;
 envelope.projectData.iranianScreenSettings.loanInterestPct=2;
 envelope.projectData.iranianScreenSettings.economicPolicy.discountRatePct=7;
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('#report-restore-file-input').setInputFiles({name:'phase1-evidence.solarpv.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(envelope))});
 await tab('solar_pumping');
 assert.equal(await page.locator('#pump-duty-dailyWaterVolumeM3').inputValue(),'120','Restore replaces current controlled inputs');
 await tab('array');assert.match(await page.getByTestId('electrical-readiness').innerText(),/unassessed/);
 await tab('iran_regulations');
 assert.equal(await page.locator('#iran-reg-interest-rate').inputValue(),'2');
 assert.equal(await page.locator('#iran-policy-discountRatePct').inputValue(),'7');
 await page.keyboard.press('Control+e');
 const savedPromise=page.waitForEvent('download');await page.getByTitle('Save Project File to Local Machine',{exact:true}).click();
 const savedPath=await(await savedPromise).path();assert.ok(savedPath);
 const restored=JSON.parse(await readFile(savedPath,'utf8'));
 assert.deepEqual(restored.projectData.selectedInverter.mpptRatingEvidence,ratingEvidence);
 assert.deepEqual(restored.projectData.iranianScreenSettings,envelope.projectData.iranianScreenSettings,'Actual import then re-export retains explicit economic policy');
 assert.deepEqual(restored.projectData.cableFeederInputs['ac-output'],envelope.projectData.cableFeederInputs['ac-output']);
 assert.deepEqual(restored.projectData.pumpDutySettings,envelope.projectData.pumpDutySettings);
 const malformed=structuredClone(restored);malformed.projectData.pumpDutySettings.inputs.motorEfficiency=2;
 await page.locator('#report-restore-file-input').setInputFiles({name:'bad-duty.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(malformed))});
 await page.getByRole('status').filter({hasText:/Import blocked/}).waitFor();
 await page.locator('#report-modal-close-btn').click();
 await tab('solar_pumping');assert.equal(await page.locator('#pump-duty-dailyWaterVolumeM3').inputValue(),'120','Blocked import leaves prior project intact');
 await page.locator('input[type="file"]').first().setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...restored,projectData:{...restored.projectData,pumpDutySettings:undefined}}))});
 await page.waitForFunction(()=>!(document.querySelector('#pump-duty-enable') as HTMLInputElement)?.checked);
 assert.equal(await page.locator('#pump-duty-enable').isChecked(),false,'Legacy project resets enabled state');
 await page.locator('#pump-duty-enable').check();assert.equal(await page.locator('#pump-duty-dailyWaterVolumeM3').inputValue(),'','Legacy does not inherit prior inputs');
 assert.deepEqual(errors,[]);
 console.log('PASS: production browser, lightning UNASSESSED rendering, three modes, actual DC/annual financial boundary/HUD PR, SLD SVG and print-PDF readback, qualified DOCX/XLSX/JSON, rating evidence and custom Iranian policy/zero-interest/project-vs-equity NPV import/export. External providers blocked; not field validation.');
} finally {await browser?.close();await new Promise<void>((resolve,reject)=>server.httpServer.close(e=>e?reject(e):resolve()));}
