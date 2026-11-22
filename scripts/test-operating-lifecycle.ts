import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runOperatingLifecycle } from "../src/studies/operatingLifecycle";
import type { AdvancedDispatchPlan } from "../src/studies/advancedDispatch";
import type { StudyResult } from "../src/studies/studyContract";
const pv = ["annual-direct.json", "annual-direct-second-year.json"].map(file =>
  JSON.parse(readFileSync(`.cache/study-evidence/operational/${file}`, "utf8")) as StudyResult);
const close = (a: number, b: number) => assert.ok(Math.abs(a-b) < Math.max(1e-6, Math.abs(b)*1e-9), `${a} != ${b}`);
mkdirSync('.cache/phase5-evidence', { recursive: true });
for (const mode of ["powerplant", "ongrid", "offgrid"] as const) {
  const capacity = mode === "powerplant" ? 0 : 1;
  const context = { latitude: pv[0].request.site.latitude, longitude: pv[0].request.site.longitude,
    dcCapacityKwp: pv[0].request.system.arrayPdc0W/1000,
    inverterCapacityKw: pv[0].request.system.inverterPdc0W*pv[0].request.system.inverterEtaNom/1000,
    batteryCapacityKwh: capacity, configurationSha256: 'a'.repeat(64), mode };
  const years = pv.map((evidence, index) => {
    const plan: AdvancedDispatchPlan = {
      schemaVersion: 'advanced-dispatch-v1', controller: 'optimal-discrete',
      operatingPlan: { schemaVersion: 'operating-dispatch-v1', mode, source: 'SYNTHETIC lifecycle regression only', intervalMinutes: 60,
        battery: { capacityKwh: capacity, minSocFraction: 0, initialSocFraction: capacity ? 1 : 0,
          maxChargeKw: 1, maxDischargeKw: 1, chargeEfficiency: .9, dischargeEfficiency: .9 },
        records: evidence.samples.map(r => ({ timestamp: r.timestamp, loadW: mode === 'powerplant' ? 0 : 500,
          gridAvailable: mode !== 'offgrid', exportLimitW: 1e6 })) },
      optimizer: { socStates: 3, terminalSocFraction: capacity ? 1 : 0, batteryWearTomanPerKwh: 5, unmetPenaltyTomanPerKwh: 10000 },
      diesel: null, aging: capacity ? { source: 'Explicit synthetic calendar aging fixture only', initialSoh: 1,
        endOfLifeSoh: .5, calendarLossFractionPerYear: .1, lossFractionPerEfc: 0, projectionYears: 2 } : null,
      economics: evidence.samples.map(r => ({ timestamp: r.timestamp, importTomanPerKwh: 100,
        exportTomanPerKwh: 10, dieselAvailable: false })),
    };
    return { study: { schemaVersion: 'advanced-study-v1' as const, pvResults: evidence, plan },
      replaceBatteryAtStart: false, replacementCostToman: 0, baselineOperatingCostToman: 0,
      fixedOmToman: 20, boundaryEnergyTomanPerKwh: 100, salvageToman: index === 1 ? 40 : 0 };
  });
  const request = { schemaVersion: 'operating-lifecycle-v1', source: 'Explicit synthetic lifecycle experiment only', context,
    boundaryRule: 'carry-stored-energy-and-soh', initialCapitalToman: 1000, discountRate: .1, years };
  const before = JSON.stringify(request), result = runOperatingLifecycle(request);
  assert.equal(JSON.stringify(request), before);
  assert.equal(result.years.length, 2); assert.deepEqual(result.years.map(r=>r.year), [2025, 2026]);
  if (capacity) {
    close(result.years[0].endSoh!, 1 - .1*8760/(365.25*24));
    close(result.years[1].startSoh!, result.years[0].endSoh!);
    close(result.years[1].study.result.effectiveInitialCapacityKwh, result.years[0].endSoh!);
    close(result.years[1].study.result.initialStoredKwh + result.years[1].boundarySpillKwh, result.years[0].study.result.finalStoredKwh);
    const replacement = structuredClone(request); replacement.years[1].replaceBatteryAtStart = true;
    replacement.years[1].replacementCostToman = 500;
    const replaced = runOperatingLifecycle(replacement);
    close(replaced.years[1].startSoh!, 1); close(replaced.years[1].purchasedBoundaryEnergyKwh, 1);
    assert.equal(replaced.years[1].replacementCostToman, 500);
    close(replaced.years[1].discountedCashflowToman,
      replaced.years[1].endOfYearCashflowToman/1.1**2 - replaced.years[1].startOfYearCostToman/1.1);
    const endOfLife = structuredClone(request); endOfLife.years.forEach(y => { y.study.plan.aging!.endOfLifeSoh = .99; });
    assert.throws(()=>runOperatingLifecycle(endOfLife), /end of life/);
    const missing = structuredClone(request); missing.years[0].study.plan.aging = null;
    assert.throws(()=>runOperatingLifecycle(missing), /aging coefficients/);
  } else {
    // Independent annual energy arithmetic (not dispatch ledger) + Python Decimal discounted cashflow.
    const cash = pv.map((e, i) => e.samples.reduce((s, r) => s + Number(r.acW)/1000*10, 0) - 20 + (i ? 40 : 0));
    result.years.forEach((y, i) => close(y.cashflowToman, cash[i]));
    const oracle = spawnSync(process.env.PVLIB_PYTHON ?? 'python', ['-c',
      'import json,sys;from decimal import Decimal as D;c=json.loads(sys.argv[1]);print(float(-D(1000)+sum(D(str(v))/D("1.1")**(i+1) for i,v in enumerate(c))))', JSON.stringify(cash)], { encoding: 'utf8' });
    assert.equal(oracle.status, 0, oracle.stderr); close(result.npvToman, Number(oracle.stdout));
    const irrelevantResolution = structuredClone(request);
    irrelevantResolution.years.forEach(y => { y.study.plan.optimizer.socStates = 101; });
    close(runOperatingLifecycle(irrelevantResolution).npvToman, result.npvToman);
    const negativeRate = runOperatingLifecycle({ ...request, discountRate: -.1 });
    close(negativeRate.npvToman, -1000 + cash[0]/.9 + cash[1]/.9**2);
    assert.throws(() => runOperatingLifecycle({ ...request, discountRate: -1 }));
  }
  const duplicate = structuredClone(request); duplicate.years[1].study = duplicate.years[0].study;
  assert.throws(()=>runOperatingLifecycle(duplicate), /consecutive calendar years/);
  const wrongSite = structuredClone(request); wrongSite.context.latitude = 0;
  assert.throws(()=>runOperatingLifecycle(wrongSite));
  const expense = structuredClone(request); expense.years[0].replacementCostToman = 500;
  assert.throws(()=>runOperatingLifecycle(expense), /without declared replacement/);
  writeFileSync(`.cache/phase5-evidence/${mode}-lifecycle-input.json`, JSON.stringify(request));
  writeFileSync(`.cache/phase5-evidence/${mode}-lifecycle-summary.json`, JSON.stringify({
    sourceSha256: result.sourceSha256, npvToman: result.npvToman, years: result.years.map(({ study, ...r })=>r) }, null, 2));
  console.log(`PASS ${mode}: explicit two-year dispatch, SOH carry, inventory balance, replacement, NPV, no mutation and invalid evidence gates`);
}
