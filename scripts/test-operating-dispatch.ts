import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  dispatchOperatingEnergy,
  type OperatingPlan,
} from "../src/studies/operatingDispatch";
import {
  adoptOperationalEnergy,
  operationalFinanceInputs,
  activeOperationalEnergy,
} from "../src/studies/operationalEnergy";
import {
  createOperationalStudy,
  validateOperationalStudy,
} from "../src/studies/operationalStudy";
import {
  createOperationalProjectBundle,
  unpackOperationalProject,
} from "../src/studies/operationalProjectTransfer";
import {
  performFinancialAnalysis,
  DEFAULT_FINANCIAL_PRICING,
} from "../src/engine/financialEngine";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const plan: OperatingPlan = {
  schemaVersion: "operating-dispatch-v1",
  mode: "offgrid",
  source: "Explicit synthetic arithmetic witness only",
  intervalMinutes: 60,
  battery: {
    capacityKwh: 10,
    minSocFraction: 0.2,
    initialSocFraction: 0.2,
    maxChargeKw: 3,
    maxDischargeKw: 2,
    chargeEfficiency: 0.8,
    dischargeEfficiency: 0.5,
  },
  records: [
    {
      timestamp: "2025-01-01T01:00:00Z",
      loadW: 1000,
      gridAvailable: false,
      exportLimitW: 0,
    },
    {
      timestamp: "2025-01-01T02:00:00Z",
      loadW: 3000,
      gridAvailable: false,
      exportLimitW: 0,
    },
  ],
};
const pv = [
  { timestamp: plan.records[0].timestamp, exportW: 6000, importW: 0 },
  { timestamp: plan.records[1].timestamp, exportW: 0, importW: 0 },
];
// Independent hand accounting: store 2 + 3*.8 = 4.4; next deliver (4.4-2)*.5 = 1.2.
const ledger = dispatchOperatingEnergy(plan, pv);
close(ledger.samples[0].chargeKwh, 3);
close(ledger.samples[0].endKwh, 4.4);
close(ledger.samples[0].curtailedKwh, 2);
close(ledger.samples[1].dischargeKwh, 1.2);
close(ledger.unmetKwh, 1.8);
close(ledger.finalStoredKwh, 2);
close(ledger.lossKwh, 1.8);
for (const mode of ["powerplant", "ongrid", "offgrid"] as const) {
  for (const minutes of [15, 30, 60]) {
    const p = structuredClone(plan);
    p.mode = mode;
    p.intervalMinutes = minutes;
    p.records = p.records.map((r, i) => ({
      ...r,
      timestamp: new Date(
        Date.UTC(2025, 0, 1, 0, minutes * (i + 1)),
      ).toISOString(),
      loadW: mode === "powerplant" ? 0 : r.loadW,
      gridAvailable: mode !== "offgrid" && i === 0,
      exportLimitW: 500,
    }));
    if (mode === "powerplant")
      p.battery = {
        ...p.battery,
        capacityKwh: 0,
        maxChargeKw: 0,
        maxDischargeKw: 0,
      };
    const input = pv.map((r, i) => ({
      ...r,
      timestamp: p.records[i].timestamp,
      importW: i ? 50 : 0,
    }));
    const before = JSON.stringify([p, input]);
    const result = dispatchOperatingEnergy(p, input);
    assert.equal(JSON.stringify([p, input]), before);
    for (const r of result.samples) {
      close(
        r.pvKwh + r.importKwh + r.dischargeKwh,
        r.loadKwh +
          r.auxKwh -
          r.unmetKwh +
          r.chargeKwh +
          r.exportKwh +
          r.curtailedKwh,
      );
      close(r.startKwh + r.chargeKwh - r.dischargeKwh - r.lossKwh, r.endKwh);
      assert.ok(r.chargeKwh * r.dischargeKwh === 0);
      assert.ok(
        r.endKwh >= p.battery.capacityKwh * p.battery.minSocFraction - 1e-9 &&
          r.endKwh <= p.battery.capacityKwh + 1e-9,
      );
      assert.ok(r.exportKwh <= (500 * minutes) / 60000 + 1e-9);
    }
    if (mode === "offgrid") {
      close(result.importKwh, 0);
      close(result.exportKwh, 0);
    }
  }
}
for (const modify of [
  (p: OperatingPlan) => p.records.pop(),
  (p: OperatingPlan) => (p.records[1].timestamp = p.records[0].timestamp),
  (p: OperatingPlan) => (p.records[0].loadW = -1),
  (p: OperatingPlan) => (p.records[0].gridAvailable = true),
  (p: OperatingPlan) => (p.battery.chargeEfficiency = 0),
  (p: OperatingPlan) => (p.battery.initialSocFraction = 0),
]) {
  const p = structuredClone(plan);
  modify(p);
  assert.throws(() => dispatchOperatingEnergy(p, pv));
}
const evidence = JSON.parse(
    readFileSync(
      ".cache/study-evidence/operational/annual-direct.json",
      "utf8",
    ),
  ),
  r = evidence.request;
for (const mode of ["powerplant", "ongrid", "offgrid"] as const) {
  const context = {
    latitude: r.site.latitude,
    longitude: r.site.longitude,
    dcCapacityKwp: r.system.arrayPdc0W / 1000,
    inverterCapacityKw:
      (r.system.inverterPdc0W * r.system.inverterEtaNom) / 1000,
    mode,
    configurationSha256: "a".repeat(64),
    batteryCapacityKwh: mode === "powerplant" ? 0 : 10,
  };
  const p: OperatingPlan = {
    ...structuredClone(plan),
    mode,
    battery: { ...plan.battery, capacityKwh: context.batteryCapacityKwh },
    records: evidence.samples.map((s: any) => ({
      timestamp: s.timestamp,
      loadW: mode === "powerplant" ? 0 : 500,
      gridAvailable: mode !== "offgrid",
      exportLimitW: 100000,
    })),
  };
  const e = {
    schemaVersion: "operating-study-v1",
    pvResults: evidence,
    plan: p,
  };
  const doc = createOperationalStudy(
    e,
    context,
    "Synthetic mode dispatch test only",
  );
  const { receipt } = validateOperationalStudy(
    JSON.parse(JSON.stringify(doc)),
    context,
  );
  assert.ok(receipt.dispatch);
  assert.equal(
    activeOperationalEnergy(receipt, {
      ...context,
      mode: mode === "offgrid" ? "ongrid" : "offgrid",
    }),
    null,
  );
  assert.throws(() =>
    adoptOperationalEnergy(
      e,
      { ...context, batteryCapacityKwh: context.batteryCapacityKwh + 1 },
      "Synthetic explicit acceptance",
    ),
  );

  const mapping = operationalFinanceInputs(receipt);
  const f = performFinancialAnalysis(
    context.dcCapacityKwp,
    context.batteryCapacityKwh,
    context.inverterCapacityKw,
    mapping.annualEnergyKwh,
    { ...DEFAULT_FINANCIAL_PRICING, ...mapping.pricing },
    25,
    mode,
  );
  assert.equal(f.annualEnergyYieldKwh, Math.round(mapping.annualEnergyKwh));
  const expectedRevenue =
    mode === "powerplant"
      ? receipt.exportKwh * DEFAULT_FINANCIAL_PRICING.ppaTariffTomanPerKwh
      : mode === "ongrid"
        ? (receipt.valuedSelfConsumedKwh ?? 0) *
            DEFAULT_FINANCIAL_PRICING.gridTariffTomanPerKwh +
          receipt.exportKwh *
            (DEFAULT_FINANCIAL_PRICING.gridExportTariffTomanPerKwh ??
              DEFAULT_FINANCIAL_PRICING.gridTariffTomanPerKwh)
        : mapping.annualEnergyKwh *
          (DEFAULT_FINANCIAL_PRICING.offgridAvoidedCostTomanPerKwh ?? 21600);
  assert.equal(f.annualRevenueToman, Math.round(expectedRevenue));

  if (mode !== "powerplant") {
    assert.throws(() =>
      adoptOperationalEnergy(
        evidence,
        context,
        "Synthetic explicit acceptance",
      ),
    );
    assert.equal(mapping.pricing.annualGridImportKwh, 0);
  }
  if (mode === "offgrid") {
    close(receipt.exportKwh, 0);
    close(receipt.importKwh, 0);
    assert.ok(receipt.dispatch.unmetKwh > 0);
  }
  const project = {
    format: "solarpv_project_envelope",
    projectData: { operationalStudyId: doc.id },
  };
  const bundle = createOperationalProjectBundle(project, doc);
  assert.equal(
    unpackOperationalProject(JSON.parse(JSON.stringify(bundle))).study?.id,
    doc.id,
  );
  assert.throws(() =>
    createOperationalProjectBundle(
      { ...project, projectData: { operationalStudyId: "b".repeat(64) } },
      doc,
    ),
  );
  const bad = structuredClone(e);
  bad.plan.mode = mode === "ongrid" ? "offgrid" : "ongrid";
  assert.throws(() =>
    adoptOperationalEnergy(bad, context, "Synthetic explicit acceptance"),
  );
}
console.log(
  "PASS all-mode dispatch: independent hand witness, two conservation equations every interval, 15/30/60 min, limits/outages/SOC/efficiencies, strict invalid inputs, actual-worker annual adoption/archive/bundle/finance for three modes",
);

// Decimal hand witness is independent of TS floating-point implementation and uses no product imports.
const oracle = spawnSync(
  process.env.PVLIB_PYTHON ?? "python",
  [
    "-c",
    `from decimal import Decimal as D
import json
initial=D('2'); accepted=D('3'); charged=accepted*D('.8'); delivered=charged*D('.5'); unmet=D('3')-delivered; losses=accepted-charged+charged-delivered
print(json.dumps([float(initial+charged),float(delivered),float(unmet),float(losses)]))`,
  ],
  { encoding: "utf8" },
);
assert.equal(oracle.status, 0, oracle.stderr);
const expected = JSON.parse(oracle.stdout);
[
  ledger.samples[0].endKwh,
  ledger.samples[1].dischargeKwh,
  ledger.unmetKwh,
  ledger.lossKwh,
].forEach((v, i) => close(v, expected[i]));
for (const mutate of [
  (p: OperatingPlan) => (p.battery.chargeEfficiency = 0.6),
  (p: OperatingPlan) => (p.battery.dischargeEfficiency = 0.9),
  (p: OperatingPlan) => (p.battery.maxChargeKw = 1),
  (p: OperatingPlan) => (p.battery.maxDischargeKw = 0.5),
]) {
  const p = structuredClone(plan);
  mutate(p);
  assert.notEqual(dispatchOperatingEnergy(p, pv).unmetKwh, ledger.unmetKwh);
}
console.log(
  "PASS independent Python Decimal witness and parameter sensitivity for charge/discharge efficiency and both PCS limits",
);

const batches = JSON.parse(
  readFileSync(
    ".cache/study-evidence/operational/annual-integrated.json",
    "utf8",
  ),
);
for (const mode of ["ongrid", "offgrid"] as const) {
  const context = {
    latitude: batches[0].plan.inputs[0].request.site.latitude,
    longitude: batches[0].plan.inputs[0].request.site.longitude,
    dcCapacityKwp:
      batches[0].plan.inputs.reduce(
        (n: number, c: any) => n + c.request.system.arrayPdc0W,
        0,
      ) / 1000,
    inverterCapacityKw: batches[0].plan.inverter.Paco / 1000,
    mode,
    configurationSha256: "a".repeat(64),
    batteryCapacityKwh: 10,
  };
  const records = batches
    .flatMap((b: any) => b.samples)
    .map((s: any) => ({
      timestamp: s.timestamp,
      loadW: 500,
      gridAvailable: mode === "ongrid",
      exportLimitW: 1e6,
    }));
  const wrapped = {
    schemaVersion: "operating-study-v1",
    pvResults: batches,
    plan: { ...plan, mode, records },
  };
  const receipt = adoptOperationalEnergy(
    wrapped,
    context,
    "Synthetic integrated mode validation",
  );
  assert.equal(receipt.source, "integrated-batches");
  assert.equal(receipt.intervalCount, 8760);
  assert.ok(receipt.dispatch!.auxiliaryKwh > 0);
  if (mode === "offgrid") close(receipt.importKwh + receipt.exportKwh, 0);
}
console.log(
  "PASS integrated annual batches connected to on-grid and off-grid, preserving modeled auxiliary loads",
);

const zero = {
  ...structuredClone(plan),
  mode: "ongrid" as const,
  battery: {
    ...plan.battery,
    capacityKwh: 0,
    maxChargeKw: 0,
    maxDischargeKw: 0,
  },
  records: plan.records.map((r) => ({
    ...r,
    gridAvailable: true,
    exportLimitW: 500,
  })),
};
const z = dispatchOperatingEnergy(zero, pv);
close(z.samples[0].exportKwh, 0.5);
close(z.samples[0].curtailedKwh, 4.5);
close(z.samples[1].importKwh, 3);
close(z.unmetKwh, 0);
const outage = structuredClone(zero);
outage.records[1].gridAvailable = false;
const o = dispatchOperatingEnergy(outage, pv);
close(o.samples[1].importKwh, 0);
close(o.samples[1].unmetKwh, 3);
const full = {
  ...structuredClone(plan),
  battery: { ...plan.battery, initialSocFraction: 1 },
};
close(dispatchOperatingEnergy(full, pv).samples[0].chargeKwh, 0);
console.log(
  "PASS explicit no-battery, full-battery, export cap and outage hand witnesses",
);
