import { compareOperatingPolicies } from "./operatingPolicyComparison";
import { runOperatingLifecycle } from "./operatingLifecycle";
import { stable } from "./studyComparisonGate";
self.onmessage = (event: MessageEvent) => {
  try {
    const { operation, request, context } = event.data;
    let value;
    if (operation === "comparison") value = compareOperatingPolicies(request, context);
    else if (operation === "lifecycle") {
      if (stable(request.context) !== stable(context)) throw new Error("Lifecycle context differs from active project");
      value = runOperatingLifecycle(request);
    } else throw new Error("Unknown operating experiment operation");
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  }
};
