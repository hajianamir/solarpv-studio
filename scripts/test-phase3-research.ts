import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateThermalDerate } from '../src/engine/core/thermalDerate';
import { calculateMartinRuizIam } from '../src/engine/optical/iamEngine';
import { calculateBifacialViewFactor } from '../src/engine/bifacial/bifacial2dViewFactor';
import { rearGainFraction } from '../src/engine/bifacialGain';
import { solveCashFlowIrrAndMirr } from '../src/engine/core/financialContract';
import { calculateSolarPump } from '../src/engine/solarPumpEngine';
const path = 'scripts/fixtures/physics/phase3-research-reference.json';
const reference = JSON.parse(readFileSync(path,'utf8'));
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
assert.equal(reference.sourceManifestSha256,hash(readFileSync('docs/audit/dual-independent-audit-review/phase3-research-sources.json')));
assert.equal(reference.pvlibVersion,'0.13.1');
assert.equal(reference.thermal.length,60); assert.equal(reference.bifacial.length,96);
// Quantization budget: production M&R rounds to six decimal places. Not a physical accuracy claim.
let maxIamError=0;
for (const r of reference.iam) {
  const error=Math.abs(calculateMartinRuizIam(r.aoiDeg,r.ar)-r.iam);
  maxIamError=Math.max(maxIamError,error); assert.ok(error<=5.01e-7);
}
const thermal = reference.thermal.map((r: {gWm2:number; windMs:number; ambientC:number; mounting:string; sapmCellC:number; faimanOpenRackC:number}) => {
  const environment = r.mounting==='insulated_back_glass_polymer'?'industrial_shed':r.mounting==='close_mount_glass_glass'?'rooftop_flat_concrete':'ground_mount';
  const legacy=calculateThermalDerate({module:{noctC:45,tempCoeffPmpPct:-.4},ambientTempMaxC:r.ambientC,irradianceWm2:r.gWm2,installationEnvironment:environment});
  return {...r,legacyScreenC:legacy.cellTempHotC,screenMinusSapmC:legacy.cellTempHotC-r.sapmCellC,
    qualification:'Illustrative mapping of distinct mounting categories, not calibrated equivalence. Legacy has no wind input.'};
});
const bifacial = reference.bifacial.map((r: {gcr:number;tiltDeg:number;albedo:number;collectorWidthM:number;groundClearanceM:number;zenithDeg:number;azimuthDeg:number;ghiWm2:number;dniWm2:number;dhiWm2:number;frontPoaWm2:number;rearPoaWm2:number;regime:string}) => {
  const input = {isBifacial:true,bifacialityFactor:.8,groundCoverRatio:r.gcr,albedo:r.albedo,tiltDeg:r.tiltDeg,
    collectorWidthM:r.collectorWidthM,groundClearanceM:r.groundClearanceM,rowLengthM:1e12,sliceCount:100,
    ghiWm2:r.ghiWm2,dniWm2:r.dniWm2,dhiWm2:r.dhiWm2,frontPoaWm2:r.frontPoaWm2,
    solarZenithDeg:r.zenithDeg,solarAzimuthDeg:r.azimuthDeg};
  const result=calculateBifacialViewFactor({tiltDeg:r.tiltDeg,azimuthDeg:180,pitchM:r.collectorWidthM/r.gcr,
    collectorWidthM:r.collectorWidthM,groundClearanceM:r.groundClearanceM,rowLengthM:1e12,albedo:r.albedo,bifacialityFactor:.8,sliceCount:100},
    {ghiWm2:r.ghiWm2,dniWm2:r.dniWm2,dhiWm2:r.dhiWm2,frontPoaWm2:r.frontPoaWm2,solarZenithDeg:r.zenithDeg,solarAzimuthDeg:r.azimuthDeg});
  const proxyPct=100*rearGainFraction({...input,modelMode:'screening_proxy'});
  const cappedChordPct=100*rearGainFraction({...input,modelMode:'view_factor_2d'});
  if(r.regime==='night') {assert.equal(result.meanRearIrradianceWm2,0);assert.ok(proxyPct>0);}
  return {gcr:r.gcr,tiltDeg:r.tiltDeg,albedo:r.albedo,regime:r.regime,externalRearWm2:r.rearPoaWm2,
    legacyRearWm2:result.meanRearIrradianceWm2,rearDifferenceWm2:result.meanRearIrradianceWm2-r.rearPoaWm2,
    legacyProxyPct:proxyPct,legacyCappedChordPct:cappedChordPct,
    qualification:'Matched width/pitch/center-height conversion and external front denominator; infinite-length legacy limit, no tube or external shade/transmission losses. Different model assumptions remain.'};
});
// External annual runs must keep net AC, delivered AC and nighttime consumption distinct.
for (const weather of [...new Set(reference.annual.map((r:{weather:string})=>r.weather))]) {
  for (const geometry of ['fixed','tracker']) {
    const rows=reference.annual.filter((r:{weather:string;geometry:string})=>r.weather===weather&&r.geometry===geometry);
    assert.equal(rows.length,5);
    for(let i=0;i<rows.length;i++) {
      const r=rows[i];assert.equal(r.hours,8760);assert.ok(r.dcKwh>0&&r.clippingKwh>=0);
      assert.ok(Math.abs(r.netAcKwh-(r.positiveAcKwh-r.nightTareKwh))<1e-10);
      if(i>0) assert.ok(r.clippingKwh>=rows[i-1].clippingKwh);
    }
  }
}
// Independent algebra witness: [-100,230,-132] has IRR roots exactly .1 and .2.
const roots=solveCashFlowIrrAndMirr([-100,230,-132],10);
assert.equal(roots.irrStatus,'NON_CONVENTIONAL_MULTIPLE_ROOTS');
assert.equal(roots.irrRootsPct.length,2);
assert.ok(Math.abs(roots.irrRootsPct[0]-10)<1e-5&&Math.abs(roots.irrRootsPct[1]-20)<1e-5);
for (const r of reference.finance) {
  const localNpv=r.cashflows.reduce((sum:number,cf:number,i:number)=>sum+cf/1.1**i,0);
  assert.ok(Math.abs(localNpv-r.npvAt10Pct)<1e-10);
}
for (const r of reference.studentTCdfWitness) assert.ok(Math.abs(r.correctTTransform-r.probability)<1e-10);
const fit=reference.cecTableFit;
assert.ok(fit.defaultInitialGuessOutcome.includes('failed'));
assert.equal(fit.solverSuccess,true);assert.ok(fit.maxAbsoluteResidualA<1e-7);
assert.ok(Math.abs(fit.localGammaPmpPctK-fit.cecTableGammaPmpPctK)>.001);
const pump = reference.pumpDuty.map((r:{dailyVolumeM3:number;psh:number;diameterMm:number;hydraulicW:number;hydraulicKwhDay:number;hoursPolicy:number;shaftWAt60PctEfficiency:number}) => {
  const legacy=calculateSolarPump({wellDepthM:30,tankHeightM:0,pipeLengthM:100,pipeDiameterMm:r.diameterMm,
    dailyWaterRequirementM3:r.dailyVolumeM3,irrigationType:'flooding_storage',peakSunHours:r.psh,pumpEfficiencyOverride:.6});
  assert.ok(Math.abs(r.hydraulicW*r.hoursPolicy/1000-r.hydraulicKwhDay)<1e-10);
  assert.ok(Math.abs(r.hydraulicW/.6-r.shaftWAt60PctEfficiency)<1e-10);
  return {...r,legacyHydraulicW:legacy.hydraulicPowerWatts,legacyMinusUnroundedHydraulicW:legacy.hydraulicPowerWatts-r.hydraulicW,
    legacySelectedMotorKw:legacy.recommendedMotorPowerKw,legacyNameplatePvKwp:legacy.recommendedPvArrayKwp,
    qualification:'Rounding/policy characterization, not water delivery, manufacturer motor selection or startup validation.'};
});
const report={schemaVersion:'phase3-research-comparison-v1',referenceSha256:hash(readFileSync(path)),
  qualification:'Discrepancy characterization, not tolerance-waived model validation. No reference-driven coefficient tuning or automatic adoption; ADR-035 ASHRAE cutoff repair is separate.',
  counts:{thermal:thermal.length,iam:reference.iam.length,bifacial:bifacial.length,annual:reference.annual.length,finance:reference.finance.length,cdf:reference.studentTCdfWitness.length},
  iamMaxAbsoluteError:maxIamError,thermal,bifacial,pump,financialMultiRootResult:roots,
  sourceHashes:Object.fromEntries(['src/engine/core/thermalDerate.ts','src/engine/optical/iamEngine.ts','src/engine/bifacial/bifacial2dViewFactor.ts','src/engine/bifacialGain.ts','src/engine/core/financialContract.ts','src/engine/solarPumpEngine.ts'].map(p=>[p,hash(readFileSync(p))]))};
const target='docs/audit/independent-handoff-935b01a/remaining-research-comparison.json';
const text=JSON.stringify(report,null,2)+'\n';
if(process.argv.includes('--write'))writeFileSync(target,text);else assert.equal(readFileSync(target,'utf8'),text,'Stale comparison: inspect differences before regenerating');
console.log('PASS Phase3 source-hashed research replay: M&R quantization, annual ledger/clipping, De Soto fit failure/residual, exact multi-root witness; thermal/bifacial discrepancies characterized, NOT accepted as accurate');
