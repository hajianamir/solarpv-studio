import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync, openSync, closeSync, existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const SUITES = Object.freeze({
  baseline: ['test:phase4', 'lint', 'build', 'test', 'test:smoke', 'test:coverage', 'test:phase1', 'test:phase2', 'test:phase3', 'verify:phase1-evidence', 'verify:physics-reference-gate', 'verify:help', 'verify:engine-claims'],
  integration: ['test:accepted-audit', 'test:remaining', 'test:recovery', 'verify:exports', 'test:browser', 'test:ui', 'test:pdf', 'test:browser:download', 'test:uq:worker', 'test:uq:archive', 'test:gateway'],
  platform: ['test:dependencies', 'test:container'],
});
export function planSuite(name, scripts) {
  if (!Object.hasOwn(SUITES, name)) throw new Error('PHASE4_UNKNOWN_SUITE');
  return SUITES[name].map(script => {
    if (typeof scripts[script] !== 'string' || !scripts[script].trim()) throw new Error(`PHASE4_MISSING_SCRIPT:${script}`);
    return {script, definition: scripts[script]};
  });
}
export function commandStatus(result) {
  return !result.error && !result.signal && result.status === 0 ? 'PASS' : 'FAIL';
}
export function assessRun(expected, results, stable) {
  const complete = expected.length > 0 && results.length === expected.length
    && expected.every((p, i) => results[i]?.script === p.script && results[i]?.status === 'PASS');
  return {softwareChecks: complete && stable ? 'PASS_WITHIN_SELECTED_SUITE' : 'FAILED_OR_INCOMPLETE',
    release: 'BLOCKED',
    qualification: 'Selected local command exits only; not Phase4 completion. Phase2/3, inherited references, exact-SHA remote matrix and applicable platform/whole-model evidence require separate acceptance.'};
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function git(args) {
  const r = spawnSync('git', args, {encoding:'utf8',maxBuffer:16*1024*1024});
  if (r.error || r.status !== 0) throw new Error('PHASE4_GIT_IDENTITY_FAILED');
  return r.stdout;
}
export function sourceIdentity() {
  const files = [...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))]
    .filter(p => !p.startsWith('docs/') && p !== 'CHANGELOG.md').sort();
  const hashes = Object.fromEntries(files.map(p => [p, existsSync(p) ? sha(readFileSync(p)) : 'DELETED']));
  return {scope:'All git-visible tracked/untracked non-ignored files excluding docs/ and CHANGELOG.md. Does not attest installed dependencies or external datasets.',
    sha256:sha(JSON.stringify(hashes)),files:hashes};
}
export function main() {
  const suite = process.argv[2] ?? 'baseline';
  if (process.argv.length > 3) throw new Error('PHASE4_UNEXPECTED_ARGUMENTS');
  const pkg = JSON.parse(readFileSync('package.json','utf8'));
  const plan = planSuite(suite,pkg.scripts);
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli)) throw new Error('PHASE4_RUN_VIA_NPM_SCRIPT');
  const startedAt = new Date().toISOString();
  const directory = path.join('.cache','phase4',`${suite}-${startedAt.replace(/[:.]/g,'-')}-${process.pid}`);
  mkdirSync(directory,{recursive:true});
  const before = sourceIdentity();
  const receipt = {schemaVersion:'phase4-local-verification-v1',suite,startedAt,
    checkout:git(['rev-parse','HEAD']).trim(),branch:git(['branch','--show-current']).trim(),
    initialWorkingTree:git(['status','--porcelain']),
    runtime:{node:process.version,platform:process.platform,arch:process.arch},
    packageScriptsSha256:sha(JSON.stringify(pkg.scripts)),lockfileSha256:sha(readFileSync('package-lock.json')),
    sourceBefore:before,results:[],
    scope:'Sequential local verification only; logs may contain project/test data and remain in ignored cache. Historical receipts are not rerun evidence.'};
  const target = path.join(directory,'receipt.json');
  const save = () => writeFileSync(target,JSON.stringify(receipt,null,2)+'\n');
  save();
  for (const step of plan) {
    const log = path.join(directory,`${step.script.replaceAll(':','_')}.log`);
    const fd = openSync(log,'w');
    const start = Date.now();
    let result;
    try {
      result = spawnSync(process.execPath,[npmCli,'run',step.script],
        {stdio:['ignore',fd,fd],timeout:900000,env:process.env});
    } finally { closeSync(fd); }
    const entry = {...step,status:commandStatus(result),exitCode:result.status,signal:result.signal,
      errorCode:result.error?.code ?? null,durationMs:Date.now()-start,log,logSha256:sha(readFileSync(log))};
    receipt.results.push(entry); save();
    console.log(`${entry.status} npm run ${step.script} (${entry.durationMs}ms)`);
    // Continue independent checks; a failure can never be replaced by a later PASS.
  }
  receipt.sourceAfter = sourceIdentity();
  receipt.sourceStable = receipt.sourceBefore.sha256 === receipt.sourceAfter.sha256;
  receipt.finishedAt = new Date().toISOString();
  receipt.assessment = assessRun(plan,receipt.results,receipt.sourceStable);
  save(); console.log(`Receipt: ${target}`);
  if (receipt.assessment.softwareChecks !== 'PASS_WITHIN_SELECTED_SUITE') process.exitCode=1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
