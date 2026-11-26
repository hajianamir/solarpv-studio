import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dependencyProblems} from './check-pc-dependencies.mjs';

import {isSupportedNode} from './check-node-version.mjs';

for (const version of ['20.19.0', '20.20.0', '22.13.0', '22.22.3', '24.0.0', '26.0.0']) assert.ok(isSupportedNode(version), version);
for (const version of ['18.20.0', '20.18.9', '21.7.0', '22.12.9', '23.0.0', 'bad', '24.0.0-rc.1']) assert.ok(!isSupportedNode(version), version);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'solarpv launcher spaces '));
const write = (name, text) => {const target = path.join(fixture, name); fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, text);};
try {
  write('package.json', JSON.stringify({dependencies: {'@noble/hashes': '1.8.0', zod: '^3.0.0'}}));
  // Reproduce an old node_modules directory after pulling a new dependency.
  write('node_modules/zod/package.json', JSON.stringify({name: 'zod', version: '3.24.0'}));
  assert.ok(dependencyProblems(fixture).some(p => p.includes('@noble/hashes')));
  let cli = spawnSync(process.execPath, [path.join(root, 'scripts/check-pc-dependencies.mjs')], {cwd: fixture, encoding: 'utf8'});
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /@noble\/hashes/);
  write('node_modules/@noble/hashes/package.json', JSON.stringify({name: '@noble/hashes', version: '1.8.0', exports: {'./sha256': './sha256.js', './utils': './utils.js'}}));
  // Package folder/metadata alone is not sufficient: exported files must exist.
  assert.ok(dependencyProblems(fixture).some(p => p.includes('not resolvable')));
  write('node_modules/@noble/hashes/sha256.js', 'module.exports = {};');
  write('node_modules/@noble/hashes/utils.js', 'module.exports = {};');
  assert.deepEqual(dependencyProblems(fixture), []);
  cli = spawnSync(process.execPath, [path.join(root, 'scripts/check-pc-dependencies.mjs')], {cwd: fixture, encoding: 'utf8'});
  assert.equal(cli.status, 0);
  write('node_modules/@noble/hashes/package.json', JSON.stringify({name: '@noble/hashes', version: '2.0.0'}));
  assert.ok(dependencyProblems(fixture).some(p => p.includes('expected 1.8.0')));

  // These packages used to be checked by folder-name text in start.bat.
  // Exercise separate CLI processes exactly as start.bat does before/after
  // installation. Node 20/24 cache failed package resolutions in-process.
  const checkFresh = () => spawnSync(process.execPath, [path.join(root, 'scripts/check-pc-dependencies.mjs')], {cwd: fixture, encoding:'utf8'});
  for (const [name, entry] of [['dotenv', 'dotenv/config'], ['uuid', 'uuid']]) {
    write('package.json', JSON.stringify({dependencies: {[name]: '1.0.0'}}));
    let probe = checkFresh();
    assert.equal(probe.status, 1); assert.ok(probe.stderr.includes(name));
    write(`node_modules/${name}/package.json`, JSON.stringify({name, version:'1.0.0', exports: name === 'dotenv' ? {'./config':'./index.js'} : './index.js'}));
    probe = checkFresh();
    assert.equal(probe.status, 1); assert.ok(probe.stderr.includes(entry) && probe.stderr.includes('not resolvable'));
    write(`node_modules/${name}/index.js`, 'module.exports = {};');
    probe = checkFresh();
    assert.equal(probe.status, 0, probe.stderr);
  }
  assert.deepEqual(dependencyProblems(root), []);
  // Exercise the real tsx registration using Node directly with a spaced TS path.
  write('server with spaces.ts', "const value: number = 42; console.log(value, process.argv[2]);");
  const child = spawnSync(process.execPath, ['--import', 'tsx', path.join(fixture, 'server with spaces.ts'), 'space & metacharacters'], {cwd: root, encoding: 'utf8', shell: false});
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), '42 space & metacharacters');
  assert.ok(!child.stderr.includes('DEP0190'));
  const batch = fs.readFileSync(path.join(root, 'start.bat'), 'utf8');
  assert.equal((batch.match(/node scripts\\check-pc-dependencies\.mjs/g) ?? []).length, 2);
  assert.match(batch, /if errorlevel 1 goto :InstallDependencies/);
  assert.ok(batch.includes('call "%~dp0install.bat" --no-pause'));
  assert.ok(!batch.includes('call npm install'));
  assert.ok(batch.includes('node scripts\\check-node-version.mjs'));
  const installer = fs.readFileSync(path.join(root, 'install.bat'), 'utf8');
  assert.ok(installer.includes('cd /d "%~dp0"'));
  assert.ok(installer.includes('call npm ci --include=dev --no-audit --no-fund'));
  assert.match(installer, /if errorlevel 1 goto :InstallFailed/);
  assert.match(installer, /if errorlevel 1 goto :VerifyFailed/);
  assert.ok(installer.indexOf('if exist ".env" goto :Configured') < installer.indexOf('copy /y ".env.example" ".env"'));
  assert.ok(installer.includes('if /i "%~1"=="--no-pause" goto :Exit'));
  assert.ok(installer.includes('exit /b %INSTALL_EXIT_CODE%'));
  assert.ok(installer.includes('if not exist "package-lock.json" goto :MissingLock'));
  assert.ok(installer.includes('node scripts\\check-node-version.mjs'));
  assert.ok(installer.includes('where node >nul 2>&1'));
  assert.ok(installer.includes('where npm >nul 2>&1'));
  assert.ok(installer.includes('set "INSTALL_EXIT_CODE=1"'));
  assert.ok(installer.indexOf('set "INSTALL_EXIT_CODE=0"') > installer.indexOf('if errorlevel 1 goto :VerifyFailed'));
  assert.ok(!installer.includes('pip install'));
  const launcher = fs.readFileSync(path.join(root, 'scripts/run-pc.ts'), 'utf8');
  assert.match(launcher, /spawn\(process\.execPath, \['--import', 'tsx', serverScript\]/);
  assert.ok(!launcher.includes('shell: isWindows'));
  console.log('PASS stale/missing packages, exported files, exact pins, batch repair/recheck, direct Node + tsx and spaced-path argument handling');
} finally {
  fs.rmSync(fixture, {recursive: true, force: true});
}
