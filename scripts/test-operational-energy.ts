import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {adoptOperationalEnergy,activeOperationalEnergy,type OperationalContext} from '../src/studies/operationalEnergy';
import {performFinancialAnalysis,DEFAULT_FINANCIAL_PRICING} from '../src/engine/financialEngine';
const run=spawnSync(process.env.PVLIB_PYTHON??'python',['-m','scripts.operational-energy-fixture'],{encoding:'utf8',timeout:120000});assert.equal(run.status,0,`${run.stderr} ${run.error?.message??''} signal=${run.signal}`);
const direct=JSON.parse(readFileSync('.cache/study-evidence/operational/annual-direct.json','utf8')),batches=JSON.parse(readFileSync('.cache/study-evidence/operational/annual-integrated.json','utf8'));
const context:OperationalContext={latitude:direct.request.site.latitude,longitude:direct.request.site.longitude,dcCapacityKwp:direct.request.system.arrayPdc0W/1000,inverterCapacityKw:direct.request.system.inverterPdc0W*direct.request.system.inverterEtaNom/1000,mode:'powerplant',configurationSha256:'a'.repeat(64)};
const ack='SYNTHETIC test only: explicit engineering scenario acceptance';
const receipt=adoptOperationalEnergy(direct,context,ack);assert.equal(receipt.intervalCount,8760);assert.equal(receipt.year,2025);assert.ok(Math.abs(receipt.exportKwh-direct.summary.acWh/1000)<1e-7);assert.equal(receipt.validationStatus,'not_field_validated');
assert.equal(activeOperationalEnergy(receipt,context),receipt);assert.equal(activeOperationalEnergy(receipt,{...context,configurationSha256:'b'.repeat(64)}),null);assert.equal(activeOperationalEnergy(receipt,null),null);
for(const c of [{...context,latitude:0},{...context,dcCapacityKwp:1},{...context,inverterCapacityKw:1}])assert.throws(()=>adoptOperationalEnergy(direct,c,ack));
assert.throws(()=>adoptOperationalEnergy(direct,context,''));assert.throws(()=>adoptOperationalEnergy({schemaVersion:'two-node-thermal-result-v1'},context,ack));assert.throws(()=>adoptOperationalEnergy([direct,direct],context,ack));
const ic={...context,dcCapacityKwp:batches[0].plan.inputs.reduce((s:number,e:{request:{system:{arrayPdc0W:number}}})=>s+e.request.system.arrayPdc0W,0)/1000,inverterCapacityKw:batches[0].plan.inverter.Paco/1000};
const combined=adoptOperationalEnergy(batches,ic,ack);assert.equal(combined.intervalCount,8760);assert.ok(Math.abs(combined.exportKwh-batches.reduce((s:number,b:{summary:{exportWh:number}})=>s+b.summary.exportWh,0)/1000)<1e-6);assert.ok(combined.importKwh>0);
assert.throws(()=>adoptOperationalEnergy(batches[0],ic,ack),/complete UTC/);assert.throws(()=>adoptOperationalEnergy([batches[0],batches[0]],ic,ack));
const changed=structuredClone(batches);changed[1].plan.inputs[0].request.system.surfaceTiltDeg+=1;assert.throws(()=>adoptOperationalEnergy(changed,ic,ack));
const pricing={...DEFAULT_FINANCIAL_PRICING,annualGridImportKwh:combined.importKwh};
const finance=performFinancialAnalysis(ic.dcCapacityKwp,0,ic.inverterCapacityKw,combined.exportKwh,pricing,25,'powerplant');
const noImport=performFinancialAnalysis(ic.dcCapacityKwp,0,ic.inverterCapacityKw,combined.exportKwh,{...pricing,annualGridImportKwh:0},25,'powerplant');
assert.equal(finance.annualEnergyYieldKwh,Math.round(combined.exportKwh));assert.equal(finance.annualGridImportCostToman,combined.importKwh*pricing.gridTariffTomanPerKwh);
assert.ok(Math.abs((finance.cashFlow25Years[0].opexToman-noImport.cashFlow25Years[0].opexToman)-combined.importKwh*pricing.gridTariffTomanPerKwh)<1);assert.ok(finance.npvToman<noImport.npvToman);
console.log('PASS operational: actual direct full-year + actual bounded integrated annual batches; no extrapolation/double loss; site/capacity/context/config/partial/overlap/nonenergy rejection; actual finance import cost and NPV');

// Batch provenance is part of the executable configuration, not just a label.
for(const key of ['workerSha256','requirementsSha256'] as const){const mixed=structuredClone(batches);mixed[1][key]='0'.repeat(64);assert.throws(()=>adoptOperationalEnergy(mixed,ic,ack),/configuration|receipt|mismatch/i);}
const mixedChild=structuredClone(batches);mixedChild[1].children[0].result.manifest.engineVersion+='-different';assert.throws(()=>adoptOperationalEnergy(mixedChild,ic,ack));
assert.throws(()=>adoptOperationalEnergy(direct,{...context,mode:'offgrid'} as unknown as OperationalContext,ack));

const leap=JSON.parse(readFileSync('.cache/study-evidence/operational/annual-leap.json','utf8'));const leapReceipt=adoptOperationalEnergy(leap,context,ack);assert.equal(leapReceipt.year,2024);assert.equal(leapReceipt.intervalCount,8784);assert.ok(Math.abs(leapReceipt.exportKwh-leap.summary.acWh/1000)<1e-7);
