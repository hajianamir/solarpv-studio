import { AdvancedStudySchema, runAdvancedStudy } from "./advancedStudy";
import { adoptOperationalEnergy, type OperationalContext } from "./operationalEnergy";
import { weatherSha256 } from "./declaredWeatherAdapter";
import { stable } from "./studyComparisonGate";

type Study = ReturnType<typeof runAdvancedStudy>;
type Outcome = { status: "completed"; study: Study } | { status: "blocked"; error: string };
/** Phase 4 entry point: controlled, replayable policy experiment, never a finance adoption. */
export function compareOperatingPolicies(raw: unknown, context: OperationalContext) {
  if (new TextEncoder().encode(JSON.stringify(raw)).length > 64 * 1024 * 1024)
    throw new Error("Policy comparison exceeds 64 MiB");
  const request = AdvancedStudySchema.parse(raw);
  // Invalid shared evidence/context is a hard error, not two misleading policy failures.
  adoptOperationalEnergy({
    schemaVersion: "operating-study-v1",
    pvResults: request.pvResults,
    plan: request.plan.operatingPlan,
  }, context, "Independent policy comparison; no finance adoption");
  const { controller: _controller, ...sharedPlan } = request.plan;
  const sharedInputSha256 = weatherSha256(stable({
    schemaVersion: "operating-policy-comparison-v1", context,
    pvResults: request.pvResults, plan: sharedPlan,
  }));
  const run = (controller: "load-first" | "optimal-discrete"): Outcome => {
    try {
      return { status: "completed", study: runAdvancedStudy({
        ...request, plan: { ...request.plan, controller },
      }, context) };
    } catch (error) {
      return { status: "blocked", error: String(error) };
    }
  };
  const loadFirst = run("load-first"), optimalDiscrete = run("optimal-discrete");
  const delta = loadFirst.status === "completed" && optimalDiscrete.status === "completed"
    ? {
      objectiveToman: optimalDiscrete.study.result.objectiveToman - loadFirst.study.result.objectiveToman,
      fuelLiters: optimalDiscrete.study.result.fuelLiters - loadFirst.study.result.fuelLiters,
      unmetKwh: optimalDiscrete.study.result.unmetKwh - loadFirst.study.result.unmetKwh,
      gridImportKwh: optimalDiscrete.study.result.gridImportKwh - loadFirst.study.result.gridImportKwh,
      finalStoredKwh: optimalDiscrete.study.result.finalStoredKwh - loadFirst.study.result.finalStoredKwh,
    } : null;
  return {
    schemaVersion: "operating-policy-comparison-v1" as const,
    sharedInputSha256, context, request, loadFirst, optimalDiscrete, delta,
    qualification: "Engineering scenario, not field validated; main finance unchanged",
    limitations: [
      "Deltas are optimal-discrete minus load-first; not NPV or guaranteed savings",
      "SOC lattice and continuous greedy actions differ; no dominance claim",
      "Each policy must meet its own terminal constraint; blocked is not zero output",
      "Perfect foresight is not forecast skill; aging is ex-post, not redispatched",
      "Sequential bounded runs; policy errors never trigger a substitute controller",
    ],
  };
}
