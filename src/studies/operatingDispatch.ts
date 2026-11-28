import { z } from "zod";
const n = z.number().finite().nonnegative().max(1e12);
export const OperatingPlanSchema = z
  .object({
    schemaVersion: z.literal("operating-dispatch-v1"),
    mode: z.enum(["powerplant", "ongrid", "offgrid"]),
    source: z.string().trim().min(10).max(1000),
    intervalMinutes: z.number().int().min(1).max(60),
    battery: z
      .object({
        capacityKwh: n,
        minSocFraction: z.number().min(0).max(1),
        initialSocFraction: z.number().min(0).max(1),
        maxChargeKw: n,
        maxDischargeKw: n,
        chargeEfficiency: z.number().positive().max(1),
        dischargeEfficiency: z.number().positive().max(1),
      })
      .strict(),
    records: z
      .array(
        z
          .object({
            timestamp: z.string().datetime({ offset: true }),
            loadW: n,
            gridAvailable: z.boolean(),
            exportLimitW: n,
          })
          .strict(),
      )
      .min(1)
      .max(527040),
  })
  .strict()
  .superRefine((p, c) => {
    if (p.battery.initialSocFraction < p.battery.minSocFraction)
      c.addIssue({ code: "custom", message: "Initial SOC below minimum" });
    if (
      p.mode === "powerplant" &&
      (p.battery.capacityKwh !== 0 || p.records.some((r) => r.loadW !== 0))
    )
      c.addIssue({
        code: "custom",
        message:
          "Powerplant dispatch requires zero local load and zero battery",
      });
    if (p.mode === "offgrid" && p.records.some((r) => r.gridAvailable))
      c.addIssue({ code: "custom", message: "Offgrid cannot enable grid" });
  });
export type OperatingPlan = z.infer<typeof OperatingPlanSchema>;
export interface AcInterval {
  timestamp: string;
  exportW: number;
  importW: number;
}
/** AC-coupled load-first energy bucket. No grid charging, diesel or physical battery lifetime model. */
export function dispatchOperatingEnergy(raw: unknown, pv: AcInterval[]) {
  const p = OperatingPlanSchema.parse(raw),
    b = p.battery,
    dt = p.intervalMinutes / 60;
  if (p.records.length !== pv.length)
    throw new Error("Dispatch and PV interval counts differ");
  let stored = b.capacityKwh * b.initialSocFraction;
  let initialOriginStoredKwh = stored;
  const minimum = b.capacityKwh * b.minSocFraction;
  const samples = p.records.map((r, i) => {
    const s = pv[i];
    if (
      Date.parse(r.timestamp) !== Date.parse(s.timestamp) ||
      !Number.isFinite(s.exportW) ||
      s.exportW < 0 ||
      !Number.isFinite(s.importW) ||
      s.importW < 0
    )
      throw new Error("Dispatch/PV alignment or power invalid");
    if (
      i &&
      Date.parse(r.timestamp) - Date.parse(p.records[i - 1].timestamp) !==
        p.intervalMinutes * 60000
    )
      throw new Error("Dispatch gap or overlap");
    const startKwh = stored,
      pvKwh = (s.exportW * dt) / 1000,
      loadKwh = (r.loadW * dt) / 1000,
      auxKwh = (s.importW * dt) / 1000,
      demand = loadKwh + auxKwh;
    const directKwh = Math.min(pvKwh, demand),
      surplus = pvKwh - directKwh,
      deficit = demand - directKwh;
    const chargeKwh = Math.min(
      surplus,
      b.maxChargeKw * dt,
      (b.capacityKwh - stored) / b.chargeEfficiency,
    );
    stored += chargeKwh * b.chargeEfficiency;
    const dischargeKwh = Math.min(
      deficit,
      b.maxDischargeKw * dt,
      Math.max(0, stored - minimum) * b.dischargeEfficiency,
    );
    // Initial inventory is external, not newly generated PV. Explicit FIFO:
    // remove initial-origin stored energy first, with discharge losses, then PV.
    const initialOriginWithdrawalKwh = Math.min(initialOriginStoredKwh, dischargeKwh / b.dischargeEfficiency);
    const initialOriginDischargeKwh = initialOriginWithdrawalKwh * b.dischargeEfficiency;
    initialOriginStoredKwh -= initialOriginWithdrawalKwh;
    stored -= dischargeKwh / b.dischargeEfficiency;
    const grid = p.mode !== "offgrid" && r.gridAvailable;
    const exportKwh = grid
      ? Math.min(surplus - chargeKwh, (r.exportLimitW * dt) / 1000)
      : 0;
    const importKwh = grid ? deficit - dischargeKwh : 0;
    const unmetKwh = grid ? 0 : deficit - dischargeKwh;
    const curtailedKwh = surplus - chargeKwh - exportKwh;
    const lossKwh =
      chargeKwh * (1 - b.chargeEfficiency) +
      dischargeKwh * (1 / b.dischargeEfficiency - 1);
    // Served includes auxiliaries. Value only local load, not inverter standby.
    const servedLoadKwh = Math.max(0, loadKwh - unmetKwh);
    const selfConsumedKwh = Math.min(
      loadKwh,
      Math.max(0, directKwh + dischargeKwh - auxKwh),
    );
    // Auxiliaries are supplied before local load by direct PV, then discharge.
    // Initial-origin discharge covers remaining auxiliaries before local load.
    const auxFromDischargeKwh = Math.max(0, auxKwh - directKwh);
    const initialOriginSelfConsumedKwh = Math.min(selfConsumedKwh,
      Math.max(0, initialOriginDischargeKwh - auxFromDischargeKwh));
    const pvOriginSelfConsumedKwh = Math.max(0, selfConsumedKwh - initialOriginSelfConsumedKwh);
    return {
      initialOriginDischargeKwh,
      initialOriginSelfConsumedKwh,
      pvOriginSelfConsumedKwh,
      initialOriginEndStoredKwh: initialOriginStoredKwh,
      timestamp: r.timestamp,
      pvKwh,
      loadKwh,
      auxKwh,
      startKwh,
      endKwh: stored,
      directKwh,
      chargeKwh,
      dischargeKwh,
      exportKwh,
      importKwh,
      unmetKwh,
      curtailedKwh,
      lossKwh,
      servedLoadKwh,
      selfConsumedKwh,
    };
  });
  const sum = (k: keyof (typeof samples)[number]) =>
    samples.reduce((v, r) => v + Number(r[k]), 0);
  return {
    schemaVersion: "operating-ledger-v1" as const,
    mode: p.mode,
    algorithm: "ac-load-first-no-grid-charge-v2-source-attribution",
    initialStoredKwh: b.capacityKwh * b.initialSocFraction,
    finalStoredKwh: stored,
    attributionPolicy: 'initial-inventory-first-aux-before-load-v1' as const,
    initialOriginFinalStoredKwh: initialOriginStoredKwh,
    initialOriginDischargeKwh: sum('initialOriginDischargeKwh'),
    initialOriginSelfConsumedKwh: sum('initialOriginSelfConsumedKwh'),
    pvOriginSelfConsumedKwh: sum('pvOriginSelfConsumedKwh'),
    pvKwh: sum("pvKwh"),
    auxiliaryKwh: sum("auxKwh"),
    exportKwh: sum("exportKwh"),
    importKwh: sum("importKwh"),
    loadKwh: sum("loadKwh"),
    servedLoadKwh: sum("servedLoadKwh"),
    selfConsumedKwh: sum("selfConsumedKwh"),
    unmetKwh: sum("unmetKwh"),
    curtailedKwh: sum("curtailedKwh"),
    lossKwh: sum("lossKwh"),
    samples,
    limitations: [
      "engineering_scenario",
      "not_field_validated",
      "AC_coupled_bucket_only",
      "initial_SOC_is_external_energy",
      "no_grid_charging",
      "no_diesel",
      "no_battery_aging",
      "not_optimized_dispatch",
    ],
  };
}
