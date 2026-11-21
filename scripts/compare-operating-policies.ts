import { readFile, writeFile, stat } from "node:fs/promises";
import { compareOperatingPolicies } from "../src/studies/operatingPolicyComparison";
import { parseStudyJson } from "../src/studies/strictStudyJson";
import type { OperationalContext } from "../src/studies/operationalEnergy";
const [input, contextFile, output] = process.argv.slice(2);
if (!input || !contextFile || !output) throw new Error(
  "Usage: npx tsx scripts/compare-operating-policies.ts study.json context.json comparison.json",
);
for (const [path, limit] of [[input, 64 * 1024 * 1024], [contextFile, 64 * 1024]] as const)
  if ((await stat(path)).size > limit) throw new Error(`Input too large: ${path}`);
const study = parseStudyJson(await readFile(input, "utf8"), 64 * 1024 * 1024);
const context = parseStudyJson(await readFile(contextFile, "utf8"), 64 * 1024) as OperationalContext;
const result = compareOperatingPolicies(study, context);
await writeFile(output, JSON.stringify(result), { flag: "wx" });
console.log(JSON.stringify({ sharedInputSha256: result.sharedInputSha256,
  loadFirst: result.loadFirst.status, optimalDiscrete: result.optimalDiscrete.status, delta: result.delta }));
if (result.loadFirst.status !== "completed" || result.optimalDiscrete.status !== "completed") process.exitCode = 2;
