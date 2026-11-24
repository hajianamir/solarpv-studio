#!/usr/bin/env node
// Plain Node preflight: must run even when tsx or a newly added package is missing.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

export function dependencyProblems(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const declared = {...manifest.dependencies, ...manifest.devDependencies};
  const problems = [];
  for (const [name, wanted] of Object.entries(declared)) {
    try {
      const installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
      if (/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(wanted) && installed.version !== wanted) {
        problems.push(`${name}: expected ${wanted}, found ${installed.version}`);
      }
    } catch {
      problems.push(`${name}: missing or unreadable package metadata`);
    }
  }
  const resolve = createRequire(path.join(root, 'package.json')).resolve;
  // Check actual startup entry points, including exported subpaths of hashes.
  for (const [name, entries] of Object.entries({
    tsx: ['tsx'],
    '@noble/hashes': ['@noble/hashes/sha256', '@noble/hashes/utils'],
    dotenv: ['dotenv/config'],
    exceljs: ['exceljs'],
    uuid: ['uuid'],
  })) {
    if (!(name in declared)) continue;
    for (const entry of entries) {
      try { resolve(entry); } catch { problems.push(`${entry}: startup entry point is not resolvable`); }
    }
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const problems = dependencyProblems(process.cwd());
    if (problems.length) {
      console.error('[INFO] Project dependencies need installation or repair:\n' + problems.map(p => `  - ${p}`).join('\n'));
      process.exitCode = 1;
    }
  } catch {
    console.error('[ERROR] Cannot check project dependencies. Run from the SolarPV Studio project folder.');
    process.exitCode = 1;
  }
}
