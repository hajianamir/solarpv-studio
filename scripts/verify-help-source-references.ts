import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HELP_SOURCE_REFERENCES } from '../src/helpContent';

const failures: string[] = [];
const referenceCount = Object.keys(HELP_SOURCE_REFERENCES).length;
assert.ok(referenceCount >= 21, `Expected help sources for all 21 primary pages; found ${referenceCount}`);
for (const [page, referenceText] of Object.entries(HELP_SOURCE_REFERENCES)) {
  const entries = [...referenceText.matchAll(/(src\/[A-Za-z0-9_./-]+\.tsx?)\s+—\s+([^.;]+)/g)];
  if (entries.length === 0) failures.push(`${page}: no parseable source path/function reference`);
  for (const [, file, description] of entries) {
    let source: string;
    try { source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8'); }
    catch { failures.push(`${page}: source path does not exist: ${file}`); continue; }
    const codeIdentifiers = [...description.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
    for (const identifier of codeIdentifiers) {
      // Require a token-level match rather than a substring (e.g. foo vs fooLegacy).
      if (!new RegExp(`\\b${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(source)) {
        failures.push(`${page}: referenced function is absent from ${file}: ${identifier}`);
      }
    }
  }
}
assert.deepEqual(failures, [], `F1 source-reference drift detected:\n${failures.join('\n')}`);
console.log(`[PASS] F1 has ${referenceCount} page source maps; every referenced path and called code identifier exists.`);
