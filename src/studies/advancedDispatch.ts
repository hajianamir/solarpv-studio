import { z } from "zod";
import { OperatingPlanSchema, type AcInterval } from "./operatingDispatch";
const nonnegative = z.number().finite().min(0).max(1e12);
export const AdvancedDispatchSchema = z
  .object({
    schemaVersion: z.literal("advanced-dispatch-v1"),
    operatingPlan: OperatingPlanSchema,
    controller: z.enum(["load-first", "optimal-discrete"]),
    optimizer: z
      .object({
        socStates: z.number().int().min(2).max(101),
        terminalSocFraction: z.number().finite().min(0).max(1),
        batteryWearTomanPerKwh: nonnegative,
        unmetPenaltyTomanPerKwh: nonnegative,
      })
      .strict(),
    diesel: z
      .object({
        source: z.string().trim().min(10).max(1000),
        ratedKw: nonnegative,
        minLoadFraction: z.number().min(0).max(1),
        interceptLitersPerHour: nonnegative,
        slopeLitersPerKwh: nonnegative,
        fuelTomanPerLiter: nonnegative,
        startCostToman: nonnegative,
        initiallyOn: z.boolean(),
      })
      .strict()
      .nullable(),
    aging: z
      .object({
        source: z.string().trim().min(10).max(1000),
        initialSoh: z.number().positive().max(1),
        endOfLifeSoh: z.number().positive().max(1),
        calendarLossFractionPerYear: z.number().finite().min(0).max(1),
        lossFractionPerEfc: z.number().finite().min(0).max(1),
        projectionYears: z.number().int().min(1).max(50),
      })
      .strict()
      .nullable(),
    economics: z
      .array(
        z
          .object({
            timestamp: z.string().datetime({ offset: true }),
            importTomanPerKwh: nonnegative,
            exportTomanPerKwh: nonnegative,
            dieselAvailable: z.boolean(),
          })
          .strict(),
      )
      .min(1)
      .max(527040),
  })
  .strict()
  .superRefine((p, c) => {
    if (p.aging && p.aging.initialSoh <= p.aging.endOfLifeSoh)
      c.addIssue({
        code: "custom",
        message: "Battery already at/below declared end of life",
      });
    if (
      p.optimizer.terminalSocFraction < p.operatingPlan.battery.minSocFraction
    )
      c.addIssue({ code: "custom", message: "Terminal SOC below minimum" });
    if (p.diesel && p.diesel.ratedKw <= 0)
      c.addIssue({
        code: "custom",
        message: "Enabled diesel requires positive rating",
      });
    if (p.operatingPlan.battery.capacityKwh === 0 && p.aging)
      c.addIssue({
        code: "custom",
        message: "Battery aging requires positive capacity",
      });
  });
export type AdvancedDispatchPlan = z.infer<typeof AdvancedDispatchSchema>;

/** Linear calendar + DC-throughput EFC screening model. Explicit coefficients, no chemistry defaults. */
export function assessBatteryLife(
  p: NonNullable<AdvancedDispatchPlan["aging"]>,
  capacityKwh: number,
  elapsedHours: number,
  dcThroughputKwh: number,
) {
  AdvancedDispatchSchema.shape.aging.unwrap().parse(p);
  if (p.initialSoh <= p.endOfLifeSoh)
    throw new Error("Battery already at end of life");
  if (
    !Number.isFinite(capacityKwh) ||
    capacityKwh <= 0 ||
    !Number.isFinite(elapsedHours) ||
    elapsedHours <= 0 ||
    !Number.isFinite(dcThroughputKwh) ||
    dcThroughputKwh < 0
  )
    throw new Error("Invalid battery-life energy/time boundary");
  const efc = dcThroughputKwh / (2 * capacityKwh),
    years = elapsedHours / (365.25 * 24);
  const calendarLoss = p.calendarLossFractionPerYear * years,
    cycleLoss = p.lossFractionPerEfc * efc;
  const endSoh = Math.max(0, p.initialSoh - calendarLoss - cycleLoss);
  const annualLoss = (calendarLoss + cycleLoss) / years;
  let soh = p.initialSoh;
  const replacementYears: number[] = [];
  const projection = Array.from({ length: p.projectionYears }, (_, i) => {
    const before = soh;
    soh = Math.max(0, soh - annualLoss);
    const beforeReplacementSoh = soh;
    if (soh <= p.endOfLifeSoh) {
      replacementYears.push(i + 1);
      soh = 1;
    }
    return {
      year: i + 1,
      startSoh: before,
      beforeReplacementSoh,
      endSoh: soh,
      replaced: beforeReplacementSoh <= p.endOfLifeSoh,
    };
  });
  return {
    algorithm: "linear-calendar-efc-v1",
    source: p.source,
    equivalentFullCycles: efc,
    elapsedYears: years,
    calendarLoss,
    cycleLoss,
    endSoh,
    annualLoss,
    firstEndOfLifeYears:
      annualLoss > 0 ? (p.initialSoh - p.endOfLifeSoh) / annualLoss : null,
    replacementYears,
    projection,
    limitations: [
      "user_coefficients_not_field_calibrated",
      "repeated_observed_duty_projection",
      "annual_boundary_replacement_only",
      "no_temperature_DoD_Crate_or_rainflow_model",
      "no_intra_horizon_capacity_fade_feedback",
      "not_automatically_applied_to_cashflow",
    ],
  };
}

/** Exact finite-horizon DP optimum ONLY on the enumerated SOC and diesel-action lattice.
 * Perfect foresight, no grid/diesel charging or battery-to-grid export. No hidden fallback.
 */
export function runAdvancedDispatch(raw: unknown, pv: AcInterval[]) {
  const p = AdvancedDispatchSchema.parse(raw),
    o = p.operatingPlan,
    b = o.battery,
    dt = o.intervalMinutes / 60,
    n = pv.length;
  if (n !== o.records.length || n !== p.economics.length)
    throw new Error("PV/operating/economics length mismatch");
  if (n > 17568)
    throw new Error(
      "Advanced dispatch bound: 17568 intervals; no automatic resampling",
    );
  for (let i = 0; i < n; i++) {
    const t = Date.parse(pv[i].timestamp);
    if (
      !Number.isFinite(t) ||
      t !== Date.parse(o.records[i].timestamp) ||
      t !== Date.parse(p.economics[i].timestamp) ||
      (i && t - Date.parse(pv[i - 1].timestamp) !== o.intervalMinutes * 60000)
    )
      throw new Error("Advanced interval alignment/gap/overlap");
    if (
      !Number.isFinite(pv[i].exportW) ||
      pv[i].exportW < 0 ||
      pv[i].exportW > 1e12 ||
      !Number.isFinite(pv[i].importW) ||
      pv[i].importW < 0 ||
      pv[i].importW > 1e12
    )
      throw new Error("Invalid PV boundary");
  }
  const capacity = b.capacityKwh * (p.aging?.initialSoh ?? 1),
    minimum = capacity * b.minSocFraction,
    initial = capacity * b.initialSocFraction,
    target = capacity * p.optimizer.terminalSocFraction;
  const lattice =
    capacity > 0
      ? Array.from(
          { length: p.optimizer.socStates },
          (_, i) =>
            minimum + ((capacity - minimum) * i) / (p.optimizer.socStates - 1),
        )
      : [0];
  lattice.push(initial, target);
  const levels = [...new Set(lattice)].sort((a, b) => a - b),
    count = levels.length,
    states = count * 2;
  if (p.controller === "optimal-discrete" && n * states * count * 2 > 30000000)
    throw new Error(
      "DP exceeds 30 million state transitions; explicitly reduce SOC states or period",
    );
  const transition = (
    i: number,
    start: number,
    end: number,
    on: boolean,
    previousOn: boolean,
  ) => {
    const r = o.records[i],
      e = p.economics[i],
      sun = (pv[i].exportW * dt) / 1000,
      aux = (pv[i].importW * dt) / 1000,
      load = (r.loadW * dt) / 1000,
      demand = load + aux;
    const direct = Math.min(sun, demand),
      surplus = sun - direct,
      deficit = demand - direct;
    const charge = Math.max(0, end - start) / b.chargeEfficiency,
      discharge = Math.max(0, start - end) * b.dischargeEfficiency;
    if (
      charge > Math.min(surplus, b.maxChargeKw * dt) + 1e-8 ||
      discharge > Math.min(deficit, b.maxDischargeKw * dt) + 1e-8
    )
      return null;
    const remaining = Math.max(0, deficit - discharge),
      grid = o.mode !== "offgrid" && r.gridAvailable;
    if (on && (!p.diesel || !e.dieselAvailable)) return null;
    const d = p.diesel;
    // For a linear fuel curve, min stable or load/rated endpoint spans the economic extrema.
    const maximum =
      on && d
        ? Math.max(
            d.ratedKw * d.minLoadFraction * dt,
            Math.min(remaining, d.ratedKw * dt),
          )
        : 0;
    const outputs =
      on && d
        ? p.controller === "load-first"
          ? [maximum]
          : [d.ratedKw * d.minLoadFraction * dt, maximum]
        : [0];
    let best: ReturnType<typeof finish> | null = null;
    function finish(dieselKwh: number) {
      const dieselServed = Math.min(remaining, dieselKwh),
        unserved = Math.max(0, remaining - dieselServed),
        dieselDumpKwh = Math.max(0, dieselKwh - dieselServed);
      const importKwh = grid ? unserved : 0,
        unmetKwh = grid ? 0 : unserved,
        exportKwh = grid
          ? Math.min(
              Math.max(0, surplus - charge),
              (r.exportLimitW * dt) / 1000,
            )
          : 0;
      const fuelLiters =
          on && d
            ? d.interceptLitersPerHour * dt + d.slopeLitersPerKwh * dieselKwh
            : 0,
        startCostToman = on && !previousOn && d ? d.startCostToman : 0;
      const gridCostToman = importKwh * e.importTomanPerKwh,
        exportRevenueToman = exportKwh * e.exportTomanPerKwh,
        dieselFuelCostToman = fuelLiters * (d?.fuelTomanPerLiter ?? 0);
      const wearCostToman =
          (charge + discharge) * p.optimizer.batteryWearTomanPerKwh,
        unmetPenaltyToman = unmetKwh * p.optimizer.unmetPenaltyTomanPerKwh;
      const objectiveToman =
        gridCostToman -
        exportRevenueToman +
        dieselFuelCostToman +
        startCostToman +
        wearCostToman +
        unmetPenaltyToman;
      return {
        timestamp: r.timestamp,
        pvKwh: sun,
        loadKwh: load,
        auxKwh: aux,
        startKwh: start,
        endKwh: end,
        directKwh: direct,
        chargeKwh: charge,
        dischargeKwh: discharge,
        lossKwh:
          charge * (1 - b.chargeEfficiency) +
          discharge * (1 / b.dischargeEfficiency - 1),
        dieselOn: on,
        dieselKwh,
        dieselServedKwh: dieselServed,
        dieselDumpKwh,
        fuelLiters,
        startCostToman,
        gridCostToman,
        exportRevenueToman,
        dieselFuelCostToman,
        wearCostToman,
        unmetPenaltyToman,
        objectiveToman,
        importKwh,
        exportKwh,
        unmetKwh,
        curtailedKwh: Math.max(0, surplus - charge - exportKwh),
        servedLoadKwh: Math.max(0, load - unmetKwh),
        pvSelfConsumedKwh: Math.min(
          load,
          Math.max(0, direct + discharge - aux),
        ),
      };
    }
    for (const output of outputs) {
      const item = finish(output);
      if (!best || item.objectiveToman < best.objectiveToman) best = item;
    }
    return best;
  };
  type Sample = NonNullable<ReturnType<typeof transition>>;
  const samples: Sample[] = [];
  if (p.controller === "load-first") {
    let stored = initial,
      on = p.diesel?.initiallyOn ?? false;
    for (let i = 0; i < n; i++) {
      const demand = ((o.records[i].loadW + pv[i].importW) * dt) / 1000,
        sun = (pv[i].exportW * dt) / 1000;
      const end =
        stored +
        Math.min(
          Math.max(0, sun - demand),
          b.maxChargeKw * dt,
          (capacity - stored) / b.chargeEfficiency,
        ) *
          b.chargeEfficiency -
        Math.min(
          Math.max(0, demand - sun),
          b.maxDischargeKw * dt,
          Math.max(0, stored - minimum) * b.dischargeEfficiency,
        ) /
          b.dischargeEfficiency;
      const deficit = demand - sun - (stored - end) * b.dischargeEfficiency;
      const dieselOn = Boolean(
        p.diesel &&
          p.economics[i].dieselAvailable &&
          !(o.mode !== "offgrid" && o.records[i].gridAvailable) &&
          deficit > 1e-9,
      );
      const step = transition(
        i,
        stored,
        Math.max(minimum, Math.min(capacity, end)),
        dieselOn,
        on,
      );
      if (!step) throw new Error("Load-first infeasible transition");
      samples.push(step);
      stored = step.endKwh;
      on = step.dieselOn;
    }
    if (samples[n - 1].endKwh < target - 1e-8)
      throw new Error(
        "Load-first terminal SOC constraint not met; no fallback",
      );
  } else {
    let costs = new Float64Array(states).fill(Infinity);
    const initialIndex =
      levels.indexOf(initial) * 2 + Number(p.diesel?.initiallyOn ?? false);
    costs[initialIndex] = 0;
    const parents = new Int16Array(n * states).fill(-1);
    for (let i = 0; i < n; i++) {
      const next = new Float64Array(states).fill(Infinity);
      for (let prev = 0; prev < states; prev++) {
        if (!Number.isFinite(costs[prev])) continue;
        for (let j = 0; j < count; j++)
          for (const on of [false, true]) {
            const step = transition(
              i,
              levels[Math.floor(prev / 2)],
              levels[j],
              on,
              Boolean(prev % 2),
            );
            if (!step) continue;
            const to = j * 2 + Number(on),
              cost = costs[prev] + step.objectiveToman;
            if (cost < next[to] - 1e-9) {
              next[to] = cost;
              parents[i * states + to] = prev;
            }
          }
      }
      costs = next;
    }
    let at = -1,
      best = Infinity;
    for (let j = 0; j < states; j++)
      if (levels[Math.floor(j / 2)] >= target - 1e-8 && costs[j] < best) {
        best = costs[j];
        at = j;
      }
    if (at < 0)
      throw new Error(
        "No feasible discrete dispatch for requested terminal SOC",
      );
    for (let i = n - 1; i >= 0; i--) {
      const prev = parents[i * states + at];
      if (prev < 0) throw new Error("Invalid optimizer traceback");
      const step = transition(
        i,
        levels[Math.floor(prev / 2)],
        levels[Math.floor(at / 2)],
        Boolean(at % 2),
        Boolean(prev % 2),
      );
      if (!step) throw new Error("Invalid optimizer transition");
      samples.push(step);
      at = prev;
    }
    samples.reverse();
  }
  const sum = (k: keyof Sample) =>
    samples.reduce((v, r) => v + Number(r[k]), 0);
  const throughput = samples.reduce(
    (v, r) =>
      v +
      r.chargeKwh * b.chargeEfficiency +
      r.dischargeKwh / b.dischargeEfficiency,
    0,
  );
  return {
    schemaVersion: "advanced-ledger-v1",
    algorithm:
      p.controller === "optimal-discrete"
        ? "perfect-foresight-discrete-DP-v1"
        : "load-first-diesel-backup-v1",
    mode: o.mode,
    controller: p.controller,
    optimality:
      p.controller === "optimal-discrete"
        ? "global_optimum_on_declared_lattice_only"
        : "not_optimized",
    socLevelsKwh: levels,
    effectiveInitialCapacityKwh: capacity,
    initialStoredKwh: initial,
    finalStoredKwh: samples[n - 1].endKwh,
    objectiveToman: sum("objectiveToman"),
    gridImportKwh: sum("importKwh"),
    gridExportKwh: sum("exportKwh"),
    unmetKwh: sum("unmetKwh"),
    dieselKwh: sum("dieselKwh"),
    dieselDumpKwh: sum("dieselDumpKwh"),
    fuelLiters: sum("fuelLiters"),
    dieselStarts: samples.filter(
      (s, i) =>
        s.dieselOn && !(i ? samples[i - 1].dieselOn : p.diesel?.initiallyOn),
    ).length,
    dieselRunHours: samples.filter((s) => s.dieselOn).length * dt,
    batteryLife: p.aging
      ? assessBatteryLife(p.aging, b.capacityKwh, n * dt, throughput)
      : null,
    samples,
    limitations: [
      "not_field_validated",
      "AC_coupled_only",
      "perfect_foresight_is_not_forecast_skill",
      "no_grid_or_diesel_charging",
      "no_battery_export",
      "diesel_linear_fuel_no_ramp_min_updown_or_start_delay",
      "aging_ex_post_not_intra_horizon_feedback",
      "standalone_analysis_not_automatically_adopted_into_finance",
    ],
  };
}
