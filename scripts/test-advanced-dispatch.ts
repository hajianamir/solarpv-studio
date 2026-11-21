import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  AdvancedDispatchSchema,
  runAdvancedDispatch,
  assessBatteryLife,
  type AdvancedDispatchPlan,
} from "../src/studies/advancedDispatch";
import { runAdvancedStudy } from "../src/studies/advancedStudy";
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const p: AdvancedDispatchPlan = {
  schemaVersion: "advanced-dispatch-v1",
  operatingPlan: {
    schemaVersion: "operating-dispatch-v1",
    mode: "ongrid",
    source: "Synthetic independent test only",
    intervalMinutes: 60,
    battery: {
      capacityKwh: 1,
      minSocFraction: 0,
      initialSocFraction: 1,
      maxChargeKw: 1,
      maxDischargeKw: 1,
      chargeEfficiency: 1,
      dischargeEfficiency: 1,
    },
    records: [1, 2].map((h) => ({
      timestamp: `2025-01-01T0${h}:00:00Z`,
      loadW: 1000,
      gridAvailable: true,
      exportLimitW: 0,
    })),
  },
  controller: "optimal-discrete",
  optimizer: {
    socStates: 2,
    terminalSocFraction: 0,
    batteryWearTomanPerKwh: 0,
    unmetPenaltyTomanPerKwh: 1000,
  },
  diesel: null,
  aging: null,
  economics: [1, 100].map((price, i) => ({
    timestamp: `2025-01-01T0${i + 1}:00:00Z`,
    importTomanPerKwh: price,
    exportTomanPerKwh: 0,
    dieselAvailable: false,
  })),
};
const pv = p.operatingPlan.records.map((r) => ({
  timestamp: r.timestamp,
  exportW: 0,
  importW: 0,
}));
const before = JSON.stringify([p, pv]);
const result = runAdvancedDispatch(p, pv);
close(result.objectiveToman, 1);
close(result.samples[0].importKwh, 1);
close(result.samples[1].dischargeKwh, 1);
assert.equal(JSON.stringify([p, pv]), before);
const greedy = runAdvancedDispatch({ ...p, controller: "load-first" }, pv);
close(greedy.objectiveToman, 100);
assert.ok(result.objectiveToman < greedy.objectiveToman);
const oracle = spawnSync(
  process.env.PVLIB_PYTHON ?? "python",
  [
    "-c",
    `import itertools,json\n# Independent exhaustive trajectory enumeration, not dynamic programming.\nvalues=[]\nfor ends in itertools.product([0,1],repeat=2):\n start=1; cost=0; valid=True\n for end,price in zip(ends,[1,100]):\n  discharge=start-end\n  if not 0<=discharge<=1:valid=False;break\n  cost+=(1-discharge)*price;start=end\n if valid:values.append(cost)\nprint(json.dumps(min(values)))`,
  ],
  { encoding: "utf8" },
);
assert.equal(oracle.status, 0, oracle.stderr);
close(result.objectiveToman, JSON.parse(oracle.stdout));
const diesel = structuredClone(p);
diesel.operatingPlan.mode = "offgrid";
diesel.operatingPlan.battery.capacityKwh = 0;
diesel.operatingPlan.records = diesel.operatingPlan.records.map((r) => ({
  ...r,
  gridAvailable: false,
  loadW: 2000,
}));
diesel.economics = diesel.economics.map((e) => ({
  ...e,
  dieselAvailable: true,
}));
diesel.diesel = {
  source: "Explicit synthetic linear diesel curve",
  ratedKw: 4,
  minLoadFraction: 0.25,
  interceptLitersPerHour: 0.2,
  slopeLitersPerKwh: 0.3,
  fuelTomanPerLiter: 10,
  startCostToman: 5,
  initiallyOn: false,
};
for (const controller of ["load-first", "optimal-discrete"] as const) {
  const r = runAdvancedDispatch({ ...diesel, controller }, pv);
  close(r.fuelLiters, 1.6);
  close(r.dieselKwh, 4);
  close(r.objectiveToman, 21);
  assert.equal(r.dieselStarts, 1);
  close(r.unmetKwh, 0);
  close(r.gridExportKwh + r.gridImportKwh, 0);
}
const unavailable = structuredClone(diesel);
unavailable.economics[1].dieselAvailable = false;
close(runAdvancedDispatch(unavailable, pv).unmetKwh, 2);
const fullMin = structuredClone(diesel);
fullMin.diesel!.minLoadFraction = 1;
const dumping = runAdvancedDispatch(fullMin, pv);
close(dumping.dieselDumpKwh, 4);
close(dumping.fuelLiters, 2.8);
const started = structuredClone(diesel);
started.diesel!.initiallyOn = true;
close(runAdvancedDispatch(started, pv).objectiveToman, 16);
const age = {
  source: "User-provided synthetic lifetime coefficients",
  initialSoh: 1,
  endOfLifeSoh: 0.8,
  calendarLossFractionPerYear: 0.02,
  lossFractionPerEfc: 0.01,
  projectionYears: 15,
};
const life = assessBatteryLife(age, 2, 8766, 4);
close(life.equivalentFullCycles, 1);
close(life.endSoh, 0.97);
close(life.firstEndOfLifeYears!, 20 / 3);
assert.equal(life.replacementYears[0], 7);
assert.equal(
  assessBatteryLife(
    { ...age, calendarLossFractionPerYear: 0, lossFractionPerEfc: 0 },
    2,
    8766,
    0,
  ).firstEndOfLifeYears,
  null,
);
const aging = structuredClone(p);
aging.aging = { ...age, initialSoh: 0.9 };
const aged = runAdvancedDispatch(aging, pv);
close(aged.effectiveInitialCapacityKwh, 0.9);
assert.ok(aged.batteryLife);
for (const candidate of [
  result,
  greedy,
  dumping,
  aged,
  runAdvancedDispatch(diesel, pv),
])
  for (const s of candidate.samples) {
    close(
      s.pvKwh + s.importKwh + s.dischargeKwh + s.dieselKwh,
      s.loadKwh +
        s.auxKwh -
        s.unmetKwh +
        s.chargeKwh +
        s.exportKwh +
        s.curtailedKwh +
        s.dieselDumpKwh,
    );
    close(s.startKwh + s.chargeKwh - s.dischargeKwh - s.lossKwh, s.endKwh);
    assert.ok(s.chargeKwh * s.dischargeKwh === 0);
  }
const terminal = structuredClone(p);
terminal.operatingPlan.battery.initialSocFraction = 0;
terminal.optimizer.terminalSocFraction = 1;
assert.throws(() => runAdvancedDispatch(terminal, pv), /No feasible/);
assert.throws(() => runAdvancedDispatch(p, pv.slice(1)), /length/);
const misaligned = structuredClone(p);
misaligned.economics[0].timestamp = misaligned.economics[1].timestamp;
assert.throws(() => runAdvancedDispatch(misaligned, pv), /alignment/);
assert.equal(
  AdvancedDispatchSchema.safeParse({ ...p, aging: { ...age, initialSoh: 0.5 } })
    .success,
  false,
);
// Full-year real-worker evidence stays a separate engineering study, never a covert finance source.
const evidence = JSON.parse(
    readFileSync(
      ".cache/study-evidence/operational/annual-direct.json",
      "utf8",
    ),
  ),
  request = evidence.request;
for (const mode of ["powerplant", "ongrid", "offgrid"] as const) {
  const capacity = mode === "powerplant" ? 0 : 1;
  const plan = {
    ...p,
    operatingPlan: {
      ...p.operatingPlan,
      mode,
      battery: { ...p.operatingPlan.battery, capacityKwh: capacity },
      records: evidence.samples.map((r: any) => ({
        timestamp: r.timestamp,
        loadW: mode === "powerplant" ? 0 : 500,
        gridAvailable: mode !== "offgrid",
        exportLimitW: 1e6,
      })),
    },
    economics: evidence.samples.map((r: any) => ({
      timestamp: r.timestamp,
      importTomanPerKwh: 100,
      exportTomanPerKwh: 10,
      dieselAvailable: false,
    })),
  };
  const context = {
    latitude: request.site.latitude,
    longitude: request.site.longitude,
    dcCapacityKwp: request.system.arrayPdc0W / 1000,
    inverterCapacityKw:
      (request.system.inverterPdc0W * request.system.inverterEtaNom) / 1000,
    mode,
    configurationSha256: "a".repeat(64),
    batteryCapacityKwh: capacity,
  };
  const r = runAdvancedStudy(
    { schemaVersion: "advanced-study-v1", pvResults: evidence, plan },
    context,
  );
  assert.equal(r.result.samples.length, 8760);
  if (mode === "offgrid")
    close(r.result.gridImportKwh + r.result.gridExportKwh, 0);
  assert.match(r.qualification, /unchanged/);
}
console.log(
  "PASS advanced: discrete global optimum vs independent Python enumeration + greedy, diesel curve/start/availability/min-load/dump, battery EFC/calendar/replacements, conservation, SOH, terminal infeasibility, actual-worker annual evidence for all modes",
);
const cases = Array.from({ length: 20 }, (_, seed) => {
  const c = structuredClone(p);
  c.optimizer.socStates = 3;
  c.optimizer.terminalSocFraction = 0.5;
  c.optimizer.batteryWearTomanPerKwh = 2;
  c.operatingPlan.records = Array.from({ length: 4 }, (_, i) => ({
    timestamp: new Date(Date.UTC(2025, 0, 1, i + 1)).toISOString(),
    loadW: ((seed + i) % 3) * 500,
    gridAvailable: (seed + i) % 4 !== 0,
    exportLimitW: 500,
  }));
  c.economics = c.operatingPlan.records.map((r, i) => ({
    timestamp: r.timestamp,
    importTomanPerKwh: 1 + ((seed * 3 + i * 5) % 13),
    exportTomanPerKwh: (seed + i) % 7,
    dieselAvailable: false,
  }));
  const input = c.operatingPlan.records.map((r, i) => ({
    timestamp: r.timestamp,
    exportW: ((seed * 2 + i) % 4) * 500,
    importW: 0,
  }));
  return {
    plan: c,
    pv: input,
    actual: runAdvancedDispatch(c, input).objectiveToman,
  };
});
const independent = spawnSync(
  process.env.PVLIB_PYTHON ?? "python",
  [
    "-c",
    `import sys,json,itertools,math
answers=[]
for case in json.load(sys.stdin):
 p=case['plan'];rows=p['operatingPlan']['records'];best=math.inf
 for ends in itertools.product([0,.5,1],repeat=4):
  if ends[-1]<.5:continue
  start=1;cost=0;ok=True
  for end,r,pv,e in zip(ends,rows,case['pv'],p['economics']):
   demand=r['loadW']/1000;sun=pv['exportW']/1000
   surplus=max(0,sun-demand);deficit=max(0,demand-sun)
   charge=max(0,end-start);discharge=max(0,start-end)
   if charge>min(1,surplus)+1e-9 or discharge>min(1,deficit)+1e-9:ok=False;break
   exported=min(surplus-charge,.5) if r['gridAvailable'] else 0
   bought=deficit-discharge if r['gridAvailable'] else 0
   unmet=0 if r['gridAvailable'] else deficit-discharge
   cost+=bought*e['importTomanPerKwh']-exported*e['exportTomanPerKwh']+2*(charge+discharge)+1000*unmet
   start=end
  if ok:best=min(best,cost)
 answers.append(best)
print(json.dumps(answers))`,
  ],
  { input: JSON.stringify(cases), encoding: "utf8" },
);
assert.equal(independent.status, 0, independent.stderr);
const objectives = JSON.parse(independent.stdout);
cases.forEach((c, i) => close(c.actual, objectives[i]));
const lowerEta = structuredClone(p);
lowerEta.operatingPlan.battery.dischargeEfficiency = 0.5;
close(runAdvancedDispatch(lowerEta, pv).objectiveToman, 51);
assert.throws(() => assessBatteryLife(age, 0, 1, 0));
assert.throws(() => assessBatteryLife(age, 1, 0, 0));
console.log(
  "PASS 20 additional tariff/export/outage/terminal/wear cases vs independent exhaustive Python enumeration; efficiency sensitivity and invalid life domains",
);
const integrated = JSON.parse(
  readFileSync(
    ".cache/study-evidence/operational/annual-integrated.json",
    "utf8",
  ),
);
const first = integrated[0].plan.inputs[0].request;
const integratedContext = {
  latitude: first.site.latitude,
  longitude: first.site.longitude,
  dcCapacityKwp:
    integrated[0].plan.inputs.reduce(
      (n: number, x: any) => n + x.request.system.arrayPdc0W,
      0,
    ) / 1000,
  inverterCapacityKw: integrated[0].plan.inverter.Paco / 1000,
  mode: "offgrid" as const,
  configurationSha256: "a".repeat(64),
  batteryCapacityKwh: 1,
};
const integratedPlan = structuredClone(diesel);
integratedPlan.operatingPlan.battery.capacityKwh = 1;
integratedPlan.operatingPlan.records = integrated
  .flatMap((x: any) => x.samples)
  .map((s: any) => ({
    timestamp: s.timestamp,
    loadW: 500,
    gridAvailable: false,
    exportLimitW: 0,
  }));
integratedPlan.economics = integratedPlan.operatingPlan.records.map((r) => ({
  timestamp: r.timestamp,
  importTomanPerKwh: 0,
  exportTomanPerKwh: 0,
  dieselAvailable: true,
}));
const integratedResult = runAdvancedStudy(
  {
    schemaVersion: "advanced-study-v1",
    pvResults: integrated,
    plan: integratedPlan,
  },
  integratedContext,
);
assert.equal(integratedResult.result.samples.length, 8760);
assert.ok(integratedResult.result.samples.some((r) => r.auxKwh > 0));
assert.throws(
  () =>
    runAdvancedStudy(
      {
        schemaVersion: "advanced-study-v1",
        pvResults: integrated,
        plan: {
          ...integratedPlan,
          optimizer: { ...integratedPlan.optimizer, socStates: 101 },
        },
      },
      integratedContext,
    ),
  /30 million/,
);
console.log(
  "PASS integrated annual advanced source with inverter auxiliaries; explicit oversized optimization rejection without fallback",
);
