import assert from 'node:assert/strict';
import fs from 'node:fs';
import { analyzePowerplantHarmonics, analyzeUpstreamGridConditions } from '../src/engine/harmonicsEngine';
import { designMvSubstation } from '../src/engine/mvSubstationEngine';
import { calculateEarthingSystem } from '../src/engine/protectionBomEngine';

const harmonics = analyzePowerplantHarmonics(5, 20, 8);
assert.equal(harmonics.isThdCompliant, null);
assert.equal(harmonics.isTddCompliant, null);
assert.equal(typeof harmonics.thdScreenPassed, 'boolean');
assert.ok(harmonics.individualHarmonics.every((h) => typeof h.withinReferenceLimit === 'boolean'));

const grid = analyzeUpstreamGridConditions({
  plantCapacityMw: 5,
  gridVoltageKv: 20,
  gridShortCircuitMva: 250,
  gridXrRatio: 8,
  inverterPowerFactor: 0.98,
  isPowerFactorLagging: true,
});
assert.equal(grid.pccVoltageRiseCompliant, null);
assert.equal(grid.isFlickerCompliant, null);
assert.equal(typeof grid.pccVoltageRiseScreenPassed, 'boolean');
assert.equal(typeof grid.flickerScreenPassed, 'boolean');
assert.equal(grid.lvrtCompliance.status, 'screening_only');

const substation = designMvSubstation({
  plantCapacityAcMva: 10,
  inverterOutputVoltageV: 800,
  gridConnectionVoltageKv: 20,
  soilResistivityOhmM: 80,
  clearingTimeSec: 0.5,
});
assert.equal(substation.earthing.isCompliant, null);
assert.equal(substation.earthing.isResistanceCompliant, null);
assert.equal(substation.earthing.isTouchSafe, null);
assert.equal(substation.earthing.isStepSafe, null);
assert.equal(substation.earthing.isConductorCompliant, null);
assert.equal(typeof substation.earthing.screeningPassed, 'boolean');

const protectionGrounding = calculateEarthingSystem(5000, 80, 'solidly_grounded', true);
assert.equal(protectionGrounding.isTouchVoltageSafe, null);
assert.equal(protectionGrounding.isStepVoltageSafe, null);
assert.equal(protectionGrounding.isResistanceCompliant, null);
assert.equal(protectionGrounding.isEarthingSafe, null);
assert.equal(typeof protectionGrounding.screeningPassed, 'boolean');

console.log('Engineering claims contract passed (IEEE 519 and IEEE 80 compliance/safety remain unevaluated; only internal screens are reported).');

// Provenance is a reporting contract, not proof of physical model accuracy.
const snowSource = fs.readFileSync('src/engine/snow/marionSnowEngine.ts', 'utf8');
assert.match(snowSource, /not an implementation of the Marion model/);
assert.match(snowSource, /gamma = 4.49; not sourced to Marion/);
const soilingSource = fs.readFileSync('src/engine/soiling/kimberSoilingEngine.ts', 'utf8');
assert.match(soilingSource, /NOT a published Kimber table/);
assert.doesNotMatch(soilingSource, /Section IV: "Precipitation Thresholds and Wash-Off Dynamics"/);
const bifacialSource = fs.readFileSync('src/engine/bifacial/bifacial2dViewFactor.ts', 'utf8');
assert.match(bifacialSource, /not independently validated/);
assert.match(bifacialSource, /not Hottel's crossed-strings integration/);
const waterfallSource = fs.readFileSync('src/engine/waterfallLossEngine.ts', 'utf8');
assert.match(waterfallSource, /Assumed\/user-defined input/);
assert.match(waterfallSource, /not the Marion model or an independently validated annual loss/);
assert.match(waterfallSource, /this does not establish a snow-free site/);
assert.doesNotMatch(waterfallSource, /Snow Coverage & Shedding Loss \(Marion\)|Soiling & Environmental Dust Loss \(Kimber\)/);
const reportSource = fs.readFileSync('src/components/OfficialReportModal.tsx', 'utf8');
assert.doesNotMatch(reportSource, /Kimber Arid Climate Deposition Model|Kimber et al\. Arid Model based on/);
assert.match(reportSource, /not rainfall-calibrated or independently validated/);
console.log('Snow/soiling/bifacial provenance contract passed (screening only; no independent field validation claimed).');

// Supervisor-identified legacy paths must not contradict the screening contract.
function assertInternalSnowMetric(metric: { confidence: string; name: string; details: string; sourceStandard: string; sourceUrl?: string }): void {
  assert.equal(metric.confidence, 'estimated', 'Internal snow/soiling targets are not independently calibrated');
  assert.match(metric.name, /Internal .*Not Independent/);
  assert.match(metric.sourceStandard, /Internal assumed target/);
  assert.equal(metric.sourceUrl, undefined, 'Do not attach an independent-source URL to an internal target');
  assert.doesNotMatch(metric.details, /Independent source:/);
}
const { runSystemCrossValidation } = await import('../src/engine/core/benchmarks/crossValidation');
const validation = runSystemCrossValidation();
for (const id of ['VAL-SNOW-09', 'VAL-SOILING-08']) {
  const metric = validation.metrics.find(m => m.testId === id);
  assert.ok(metric, `Missing provenance-covered metric ${id}`);
  assertInternalSnowMetric(metric);
  assert.throws(() => assertInternalSnowMetric({ ...metric, confidence: 'calibrated' }), /not independently calibrated/);
  assert.throws(() => assertInternalSnowMetric({ ...metric, details: 'Independent source: NREL Marion field model' }), /Independent source:/);
}
const targetedClaims = [
  { file: 'src/engine/snow/marionSnowRecalibration.ts', required: /Internal synthetic snow screening regression/,
    forbidden: /successfully recalibrated against|align with empirical cold-region records|accurately reproduces realistic|citation: 'Marion, B\.|citation: 'DWD \(Deutscher|citation: 'Andrews, R\./,
    regression: 'Marion snow engine successfully recalibrated against NREL' },
  { file: 'src/engine/core/benchmarks/goldenDatasets.ts', required: /background only; not implemented-model equivalence or validation/,
    forbidden: /governingStandard: 'NREL Marion|source: 'Marion, B\.|source: 'Kimber, A\./,
    regression: "governingStandard: 'NREL Marion (2013)'" },
  { file: 'src/engine/core/annualYieldEngine.ts', required: /Soiling & Dust Loss \(Assumed Screening Input\)/,
    forbidden: /Kimber Model|Marion Model|Soiling & Environmental Dust Loss \(Kimber\)|Snow Coverage & Shedding Loss \(Marion\)/,
    regression: 'Snow Coverage & Shedding Loss (Marion)' },
  { file: 'src/engine/environmentalAgingEngine.ts', required: /Internal assumed screening baseline; not a Kimber coefficient/,
    forbidden: /Kimber model base annual loss/,
    regression: 'Kimber model base annual loss (~4.0% in Iran)' },
  { file: 'src/engine/core/benchmarks/unitTestsCore.ts', required: /when the snow-loss input is zero/,
    forbidden: /snow-free zones|snow-free climates|NREL Marion Recalibration Suite Status|All 3 empirical cold-climate hubs/,
    regression: '0.0% no-op in snow-free zones' },
];
for (const { file, required, forbidden, regression } of targetedClaims) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, required, file);
  const rejectUnsupportedClaim = (text: string): void => assert.doesNotMatch(text, forbidden, file);
  rejectUnsupportedClaim(source);
  assert.throws(() => rejectUnsupportedClaim(source + '\n' + regression),
    'Restoring an unsupported legacy claim must fail the provenance guard');
}
assert.doesNotMatch(waterfallSource, /In snow-free climates/);
console.log('Targeted legacy snow/soiling provenance guards and negative regressions passed.');

// Limited follow-up: human-readable sensitivity/test labels and dataset preamble.
const sensitivitySource = fs.readFileSync('src/engine/core/benchmarks/sensitivityAnalysis.ts', 'utf8');
const unitTestSource = fs.readFileSync('src/engine/core/benchmarks/unitTestsCore.ts', 'utf8');
const goldenPreamble = fs.readFileSync('src/engine/core/benchmarks/goldenDatasets.ts', 'utf8').split('*/', 1)[0];
const remainingLabelChecks = [
  { source: sensitivitySource, required: /legacy compatibility names/,
    forbidden: /Verifies that physical models \(Kimber|disproving overfitting|Verify (Kimber|Marion) Monotonicity|(?:Kimber Soiling|Marion Snow Shedding) Sensitivity Sweep/,
    bad: 'disproving overfitting or circular golden-dataset dependency.' },
  { source: unitTestSource, required: /Internal Snow Sensitivity Regression/,
    forbidden: /Kimber 5-Bin|Kimber Climate Monotonicity|Marion Snow Monotonicity|['"](?:KimberSoiling|MarionSnow|Marion)['"]|Kimber soiling strictly responds|Marion snow loss responds/,
    bad: "'Marion Snow Monotonicity'" },
  { source: goldenPreamble, required: /Kimber et al\.: background only; soiling targets are internal and non-independent/,
    forbidden: /Kimber et al\. \(NREL\) - Arid Soiling|Marion et al\. \(NREL\) - Snow Shedding/,
    bad: 'Kimber et al. (NREL) - Arid Soiling Loss & Rain Wash-Off Recovery' },
];
assert.match(goldenPreamble, /Marion et al\.: background only; snow targets are internal and non-independent/);
for (const { source, required, forbidden, bad } of remainingLabelChecks) {
  assert.match(source, required);
  const rejectClaim = (text: string): void => assert.doesNotMatch(text, forbidden);
  rejectClaim(source);
  assert.throws(() => rejectClaim(source + '\n' + bad),
    'Restoring an unsupported sensitivity/test/source label must fail the guard');
}
console.log('Internal sensitivity/test labels and background-only dataset preamble guards passed.');

// Final bounded follow-up: fixed BIPV assumption, input docs and bibliography.
const tailClaims = [
  { file: 'src/engine/bipv/bipvThermalEngine.ts', required: /fixed internal screening assumption \(3.5%\); not a Kimber model output/,
    forbidden: /Front exterior Kimber soiling|Front glass: exterior Kimber soiling|Standard ambient baseline/,
    bad: 'Front glass: exterior Kimber soiling (~3.5% default arid)' },
  { file: 'src/engine/waterfallArgs.ts', required: /Assumed\/user-defined snow screening loss percentage/,
    forbidden: /Marion snow coverage & shedding loss percentage/,
    bad: 'Marion snow coverage & shedding loss percentage' },
  { file: 'src/engine/core/benchmarks/crossValidation.ts', required: /Internal soiling \/ rain-cleaning regression \(legacy Kimber API identifiers only\)/,
    forbidden: /8\. Kimber Soiling Loss & Complete Rain Wash-off Recovery/,
    bad: '8. Kimber Soiling Loss & Complete Rain Wash-off Recovery' },
  { file: 'src/engine/snow/marionSnowEngine.ts', required: /10\.1016\/j\.solener\.2013\.07\.029/,
    forbidden: /A Snow-Loss Model for Photovoltaic Systems|An Update from Two Cold Climates/,
    bad: 'A Snow-Loss Model for Photovoltaic Systems' },
  { file: 'src/engine/soiling/kimberSoilingEngine.ts', required: /10\.1109\/WCPEC\.2006\.279690/,
    forbidden: /NREL\/CP-520-40123|Modelling the Impact of Soiling on Photovoltaic Performance/,
    bad: 'NREL/CP-520-40123' },
];
for (const { file, required, forbidden, bad } of tailClaims) {
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, required, file);
  const rejectClaim = (text: string): void => assert.doesNotMatch(text, forbidden, file);
  rejectClaim(source);
  assert.throws(() => rejectClaim(source + '\n' + bad), 'Legacy assumption/citation wording must not return');
}
console.log('BIPV/snow-input wording and bounded bibliography guards passed (not model validation).');

// Human-readable npm test output must not upgrade internal scenarios to evidence.
const runnerSource = fs.readFileSync('scripts/run-all-benchmarks.ts', 'utf8');
const forbiddenRunnerClaims = [
  /Overfitting Risk:\s*ZERO/i,
  /site-specific[^\r\n]*calibrated/i,
  /Empirical Recalibration/i,
  /Front Exterior Kimber Soiling Loss/i,
  /RECALIBRATED HUBS/i,
  /Marion Snow Shedding Sensitivity/i,
];
assert.match(runnerSource, /Internal Synthetic Snow Screening Regressions/);
assert.match(runnerSource, /Front Exterior Screening Assumption/);
assert.match(runnerSource, /do not establish an overfitting risk bound or independent validity/);
for (const [index, legacy] of [
  'Overfitting Risk: ZERO',
  'Site-specific NREL/DWD calibrated results',
  'Marion Snow Shedding Empirical Recalibration',
  'Front Exterior Kimber Soiling Loss',
  'RECALIBRATED HUBS',
  'Marion Snow Shedding Sensitivity',
].entries()) {
  const rejectClaim = (source: string): void => assert.doesNotMatch(source, forbiddenRunnerClaims[index]);
  rejectClaim(runnerSource);
  assert.throws(() => rejectClaim(runnerSource + '\n' + legacy),
    'Restoring an unsupported visible benchmark claim must fail the guard');
}
console.log('Visible benchmark runner provenance guards and negative regressions passed.');

// Citation is not conformity; prevent previously surviving whole-model claims.
for (const [path, forbidden] of [
  ['src/engine/core/electricalSizingContract.ts', /IEC 62548 \/ NEC 690 \/ IEEE 1562 \/ IEC 60891 Compliant/],
  ['src/engine/geotech/bromsMethod.ts', /Conforming to:/],
  ['src/engine/structureRecommendationEngine.ts', /estimates adhering to ASCE/],
  ['src/engine/core/financialContract.ts', /Official SATBA commercial baseline/],
  ['src/components/WaterfallLossTab.tsx', /Tier-1 Benchmark: 78% - 84%/],
] as const) {
  const reject = (text: string) => assert.doesNotMatch(text, forbidden, path);
  reject(fs.readFileSync(path, 'utf8'));
  // Positive match exercises the guard itself, not just today's source.
  assert.ok(forbidden.test({
    'src/engine/core/electricalSizingContract.ts': 'IEC 62548 / NEC 690 / IEEE 1562 / IEC 60891 Compliant',
    'src/engine/geotech/bromsMethod.ts': 'Conforming to:',
    'src/engine/structureRecommendationEngine.ts': 'estimates adhering to ASCE',
    'src/engine/core/financialContract.ts': 'Official SATBA commercial baseline',
    'src/components/WaterfallLossTab.tsx': 'Tier-1 Benchmark: 78% - 84%',
  }[path]));
}
console.log('Phase 1 surviving-claim containment guards passed.');

const phase1Readiness = fs.readFileSync('src/presentation/phase1Evidence.ts','utf8');
assert.match(phase1Readiness,/bankabilityEligible: false/);
assert.match(phase1Readiness,/independentlyValidatedDomain: null/);
assert.match(phase1Readiness,/effectiveDate: null/);
assert.doesNotMatch(fs.readFileSync('src/engine/geotech/foundationRecommendation.ts','utf8'),/ASCE 7-22 \/ Eurocode 7 \/ INBC Part 6 compliance/);
for (const path of ['src/components/FinancialTab.tsx','src/components/IranianRegulationsTab.tsx','src/components/OfficialReportModal.tsx']) {
 assert.match(fs.readFileSync(path,'utf8'),/ECONOMIC_DISCLOSURE/);
 assert.match(fs.readFileSync(path,'utf8'),/BIFACIAL_READINESS/);
}
assert.match(fs.readFileSync('src/components/StructuralFoundationTab.tsx','utf8'),/structural-source-readiness/);
assert.match(fs.readFileSync('src/components/OfficialReportModal.tsx','utf8'),/report-phase1-readiness/);
console.log('PASS Phase 1 economic, bifacial, structural and artifact qualification presence guards (not exhaustive semantic claim verification).');

assert.doesNotMatch(fs.readFileSync('src/engine/tracker/backtrackingEngine.ts','utf8'),/Faithful TypeScript port of pvlib 0.16.1/);
assert.match(fs.readFileSync('src/engine/tracker/backtrackingEngine.ts','utf8'),/component geometry fixtures use pvlib 0.13.1/);
assert.match(fs.readFileSync('src/engine/core/benchmarks/trackerFixtures.ts','utf8'),/unverified attribution/);
assert.doesNotMatch(fs.readFileSync('src/engine/core/electricalSizingContract.ts','utf8'),/Arrhenius\/Peukert temperature derating/);
assert.doesNotMatch(fs.readFileSync('src/engine/structureRecommendationEngine.ts','utf8'),/Compliance with ASCE 7-22|\*\*Governing Design Codes:/);
assert.match(fs.readFileSync('src/engine/structureRecommendationEngine.ts','utf8'),/applicability\/conformity UNASSESSED/);
