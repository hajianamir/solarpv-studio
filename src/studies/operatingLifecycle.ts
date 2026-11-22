import { z } from "zod";
import { AdvancedStudySchema, runAdvancedStudy } from "./advancedStudy";
import { OperationalContextSchema } from "./operationalEnergy";
import { stable } from "./studyComparisonGate";
import { weatherSha256 } from "./declaredWeatherAdapter";
const money = z.number().finite().nonnegative().max(1e16);
export const OperatingLifecycleSchema = z.object({
  schemaVersion: z.literal("operating-lifecycle-v1"),
  source: z.string().trim().min(10).max(1000),
  context: OperationalContextSchema,
  boundaryRule: z.literal("carry-stored-energy-and-soh"),
  initialCapitalToman: money,
  discountRate: z.number().finite().gt(-1),
  years: z.array(z.object({
    study: AdvancedStudySchema,
    replaceBatteryAtStart: z.boolean(),
    replacementCostToman: money,
    baselineOperatingCostToman: z.number().finite().min(-1e16).max(1e16),
    fixedOmToman: money,
    boundaryEnergyTomanPerKwh: money,
    salvageToman: money,
  }).strict()).min(1).max(50),
}).strict();

/** Explicit annual evidence only. Re-dispatches with previous SOH, never repeats a weather year. */
export function runOperatingLifecycle(raw: unknown) {
  if (new TextEncoder().encode(JSON.stringify(raw)).length > 64 * 1024 * 1024)
    throw new Error("Lifecycle input exceeds 64 MiB");
  const request = OperatingLifecycleSchema.parse(raw);
  const work = request.years.reduce((sum, y) => {
    const plan = y.study.plan;
    // SOC resolution is irrelevant when there is no battery; do not block a plant on it.
    const states = plan.operatingPlan.battery.capacityKwh > 0 ? plan.optimizer.socStates + 2 : 1;
    return sum + plan.operatingPlan.records.length * (plan.controller === "optimal-discrete" ? 4 * states ** 2 : 1);
  }, 0);
  if (work > 300_000_000) throw new Error("Lifecycle exceeds explicit 300 million transition budget");
  let previous: ReturnType<typeof runAdvancedStudy> | undefined;
  let previousEndSoh: number | undefined;
  let agingIdentity: string | undefined;
  const years = request.years.map((entry, index) => {
    const studyRequest = structuredClone(entry.study);
    const p = studyRequest.plan, b = p.operatingPlan.battery;
    if (entry.replaceBatteryAtStart && (index === 0 || b.capacityKwh === 0))
      throw new Error("Replacement requires an existing battery and a later year");
    if (!entry.replaceBatteryAtStart && entry.replacementCostToman !== 0)
      throw new Error("Replacement expense without declared replacement");
    if (b.capacityKwh > 0 && !p.aging) throw new Error("Lifecycle battery requires explicit aging coefficients");
    if (p.aging) {
      const { initialSoh: _initial, ...coefficients } = p.aging;
      const identity = stable(coefficients);
      if (agingIdentity !== undefined && identity !== agingIdentity)
        throw new Error("Lifecycle aging coefficients must remain consistent");
      agingIdentity = identity;
      if (previous) p.aging.initialSoh = entry.replaceBatteryAtStart ? 1 : previousEndSoh!;
      if (p.aging.initialSoh <= p.aging.endOfLifeSoh)
        throw new Error("Battery reached end of life; explicitly replace before next dispatch year");
    }
    const capacity = b.capacityKwh * (p.aging?.initialSoh ?? 1);
    let boundarySpillKwh = 0, purchasedBoundaryEnergyKwh = 0;
    if (previous && !entry.replaceBatteryAtStart) {
      const stored = previous.result.finalStoredKwh;
      boundarySpillKwh = Math.max(0, stored - capacity);
      const carried = Math.min(stored, capacity);
      if (carried < capacity * b.minSocFraction - 1e-8)
        throw new Error("Carried stored energy is below next minimum SOC; no implicit energy injection");
      b.initialSocFraction = capacity > 0 ? carried / capacity : 0;
    } else {
      boundarySpillKwh = previous?.result.finalStoredKwh ?? 0;
      purchasedBoundaryEnergyKwh = capacity * b.initialSocFraction;
    }
    if (p.diesel && previous)
      p.diesel.initiallyOn = previous.result.samples.at(-1)!.dieselOn;
    const study = runAdvancedStudy(studyRequest, request.context);
    if (previous && study.baselineReceipt.year !== previous.baselineReceipt.year + 1)
      throw new Error("Require explicit consecutive calendar years; no duplicate or missing annual evidence");
    previousEndSoh = study.result.batteryLife?.endSoh;
    const operatingCashCostToman = study.result.samples.reduce((sum, r) =>
      sum + r.gridCostToman - r.exportRevenueToman + r.dieselFuelCostToman + r.startCostToman, 0);
    const boundaryEnergyCostToman = purchasedBoundaryEnergyKwh * entry.boundaryEnergyTomanPerKwh;
    const cashflowToman = entry.baselineOperatingCostToman - operatingCashCostToman - entry.fixedOmToman -
      entry.replacementCostToman - boundaryEnergyCostToman + entry.salvageToman;
    // Replacements and initialized inventory are paid at the start of the year;
    // operating flows and explicit salvage settle at year end.
    const startOfYearCostToman = entry.replacementCostToman + boundaryEnergyCostToman;
    const endOfYearCashflowToman = entry.baselineOperatingCostToman - operatingCashCostToman - entry.fixedOmToman + entry.salvageToman;
    const discountedCashflowToman = endOfYearCashflowToman / (1 + request.discountRate) ** (index + 1)
      - startOfYearCostToman / (1 + request.discountRate) ** index;
    if (![operatingCashCostToman, cashflowToman, discountedCashflowToman].every(Number.isFinite))
      throw new Error("Lifecycle cashflow outside numeric range");
    previous = study;
    const { request: _effectiveRequest, ...studyRecord } = study;
    return { year: study.baselineReceipt.year, study: { ...studyRecord, effectivePlan: study.request.plan }, startSoh: p.aging?.initialSoh ?? null,
      endSoh: previousEndSoh ?? null, boundarySpillKwh, purchasedBoundaryEnergyKwh,
      boundaryEnergyCostToman, operatingCashCostToman,
      replacementCostToman: entry.replacementCostToman, fixedOmToman: entry.fixedOmToman,
      baselineOperatingCostToman: entry.baselineOperatingCostToman, salvageToman: entry.salvageToman,
      cashflowToman, startOfYearCostToman, endOfYearCashflowToman, discountedCashflowToman };
  });
  return { schemaVersion: "operating-lifecycle-result-v1" as const,
    sourceSha256: weatherSha256(stable(request)), context: request.context, request, years,
    npvToman: -request.initialCapitalToman + years.reduce((s, y) => s + y.discountedCashflowToman, 0),
    qualification: "Independent general-site engineering scenario; active project finance unchanged",
    limitations: ["Annual-boundary capacity fade, not intra-year chemistry or SAM equivalence",
      "Per-year perfect foresight; not a globally optimal multiyear policy",
      "Nominal battery capacity fixed; replacement is explicit, not automatically optimized",
      "Wear and unmet penalties are objectives, not cash expenses; replacements counted explicitly",
      "Discount rate and cashflows must use consistent real or nominal currency assumptions",
      "No automatic weather repetition, escalation, incentives, tax or residual energy salvage",
      "Capacity-fade/replacement spills reported; initialized energy explicitly priced",
      "No grid-forming, protection, transient or DC-coupled claim", "not_field_validated"],
  };
}
