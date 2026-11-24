import { readFile, stat, writeFile } from "node:fs/promises";
import { parseStudyJson } from "../src/studies/strictStudyJson";
import { runOperatingLifecycle } from "../src/studies/operatingLifecycle";
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: npx tsx scripts/run-operating-lifecycle.ts input.json output.json");
const limit = 64 * 1024 * 1024;
if ((await stat(input)).size > limit) throw new Error("Lifecycle file exceeds 64 MiB");
const parsed = parseStudyJson(await readFile(input, "utf8"), limit) as { schemaVersion?: string; request?: unknown };
const result = runOperatingLifecycle(parsed.schemaVersion === "operating-lifecycle-result-v1" ? parsed.request : parsed);
const json = JSON.stringify(result);
if (Buffer.byteLength(json) > limit) throw new Error("Lifecycle archive exceeds 64 MiB replay limit; no partial output written");
await writeFile(output, json, { flag: "wx" });
console.log(JSON.stringify({ sourceSha256: result.sourceSha256, npvToman: result.npvToman,
  years: result.years.map(y => ({ year: y.year, cashflowToman: y.cashflowToman, startSoh: y.startSoh, endSoh: y.endSoh })) }));
