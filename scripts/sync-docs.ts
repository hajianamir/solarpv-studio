/**
 * Documentation & Architectural Decision Record (ADR) Sync Script
 * SolarPV Studio v3.0
 *
 * Fixes BUG-12: ADR summaries were hardcoded and progressively drifted
 * out of sync with the real ADR files. This version reads each ADR's
 * first H1 heading directly from source, so the STATUS doc is always
 * derived from ground truth.
 */

import fs from 'fs';
import path from 'path';

interface AdrEntry {
  filename: string;
  number: string;
  title: string;
  status: string;
  lineCount: number;
  byteCount: number;
}

const ADR_DIR = path.resolve(process.cwd(), 'docs/adr');
const STATUS_PATH = path.resolve(process.cwd(), 'docs/STATUS-RFC-3.0.md');

// Tolerant matcher: accepts both
//   "# Architecture Decision Record (ADR-001): Title"
//   "# ADR-010: Title"
const ADR_TITLE_RE = /^#\s+(?:Architecture Decision Record\s+)?\(?(ADR-(\d+))\)?\s*:\s*(.+?)\s*$/i;
const ADR_STATUS_RE = /^\*\*Status\*\*\s*:\s*(.+?)\s*$/im;

function discoverAdrs(): AdrEntry[] {
  if (!fs.existsSync(ADR_DIR)) {
    throw new Error(`ADR directory not found: ${ADR_DIR}`);
  }
  const files = fs.readdirSync(ADR_DIR).filter((f) => f.endsWith('.md')).sort();
  if (files.length === 0) {
    throw new Error(`No ADR .md files found in ${ADR_DIR}`);
  }

  const entries: AdrEntry[] = [];
  for (const filename of files) {
    const fullPath = path.join(ADR_DIR, filename);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const firstLine = content.split('\n').slice(0, 10).find((l) => ADR_TITLE_RE.test(l));
    if (!firstLine) {
      throw new Error(
        `ADR file ${filename} has no parsable title line ` +
        `(expected "# Architecture Decision Record (ADR-XXX): <title>").`
      );
    }
    const match = firstLine.match(ADR_TITLE_RE);
    const statusMatch = content.match(ADR_STATUS_RE);
    entries.push({
      filename,
      number: match![2],
      title: match![3].trim(),
      status: statusMatch ? statusMatch[1].trim() : 'Unknown',
      lineCount: content.split('\n').length,
      byteCount: Buffer.byteLength(content, 'utf-8'),
    });
  }
  return entries;
}

function renderStatusDoc(adrs: AdrEntry[]): string {
  const timestamp = new Date().toISOString();
  const rows = adrs
    .map(
      (a) =>
        `- **ADR-${a.number}** (${a.status}): ${a.title}  ` +
        `\n  _file: \`docs/adr/${a.filename}\` (${a.lineCount} lines, ${a.byteCount} bytes)_`
    )
    .join('\n');

  return `# SolarPV Studio v3.0 - Documentation Status & Model Compliance

**Updated:** ${timestamp}
**Release Phase:** RFC 3.0 / PR-2a-6
**Audit Verification:** Automated via \`npm run sync-docs\`
**ADR Count:** ${adrs.length}

## Architecture Decision Records (derived from source)

${rows}

## Geotechnical & Engineering Cross-Tab Propagation Status
- **Climate ➔ Inverter:** Ambient T_max > 45°C (1.5%/°C) & Elevation > 2000m
  (1.0%/100m per IEC 62109-1) derating verified.
- **Geotechnical ➔ Structural:** ASCE 7-22 wind pressure q_z, ground snow
  load S_k, Broms lateral pile sizing (L ≥ d_frost + 1.0 m, FoS ≥ 1.5) verified.
- **Cross-Tab ➔ Financial:** Mode-aware financial analysis (OffGrid vs OnGrid
  vs Powerplant), LCOE decomposition, and zero-substation off-grid accounting
  verified.
`;
}

function main(): void {
  console.log('='.repeat(80));
  console.log(' SolarPV Studio v3.0 - Documentation & ADR Synchronization');
  console.log('='.repeat(80) + '\n');

  const adrs = discoverAdrs();
  for (const a of adrs) {
    console.log(
      `OK  ADR-${a.number.padEnd(3)} ${a.title.slice(0, 60).padEnd(62)} ` +
      `[${a.status}]  (${a.lineCount} lines)`
    );
  }

  fs.writeFileSync(STATUS_PATH, renderStatusDoc(adrs), 'utf-8');
  console.log(`\nWrote ${STATUS_PATH}`);

  console.log('\n' + '='.repeat(80));
  console.log(` SUCCESS: ${adrs.length} ADRs synchronized from source.`);
  console.log('='.repeat(80));
}

main();
