/**
 * PR-2a-6-REPAIR-FINAL-COMPLETE — P0-2: Verify zero production references
 * to deleted climate hubs (internationalHubs.ts, IRANIAN_CLIMATE_CITIES,
 * INDUSTRIAL_PARKS, ALL_CLIMATE_CITIES).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const PATTERNS = [
  'internationalHubs',
  'IRANIAN_CLIMATE_CITIES',
  'INDUSTRIAL_PARKS',
  'ALL_CLIMATE_CITIES',
  'HUB-SNOW-BOULDER',
  'HUB-SNOW-MUNICH',
  'HUB-SNOW-TORONTO',
];

let failures = 0;
let productionRefs = 0;

function scanFile(filePath: string): { line: number; content: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const hits: { line: number; content: string }[] = [];
  lines.forEach((line, idx) => {
    for (const pat of PATTERNS) {
      if (line.includes(pat)) {
        hits.push({ line: idx + 1, content: line.trim() });
      }
    }
  });
  return hits;
}

function walk(dir: string): string[] {
  let results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) results.push(full);
  }
  return results;
}

const files = walk(SRC_DIR);
console.log('================================================================================');
console.log(' P0-2: Grep verification — zero production references to deleted hubs');
console.log('================================================================================\n');

for (const file of files) {
  const hits = scanFile(file);
  if (hits.length > 0) {
    const relPath = path.relative(SRC_DIR, file);
    console.log(`FILE: ${relPath}`);
    for (const h of hits) {
      // Determine if it's a comment-only reference (acceptable) or production code
      const trimmed = h.content;
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.includes('TEST FIXTURE');
      const marker = isComment ? '  [COMMENT-ONLY]' : '  [PRODUCTION-CODE]';
      console.log(`${marker} line ${h.line}: ${h.content}`);
      if (!isComment) {
        productionRefs++;
        failures++;
      }
    }
    console.log('');
  }
}

if (productionRefs === 0) {
  console.log('[PASS] Zero production references to deleted hubs found in src/');
} else {
  console.log(`[FAIL] ${productionRefs} production reference(s) found`);
}

console.log(`\n${failures === 0 ? 'P0-2 GREP VERIFICATION PASSED' : failures + ' ISSUE(S) FOUND'}`);
process.exit(failures === 0 ? 0 : 1);
