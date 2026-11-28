import {execFileSync} from 'node:child_process';
/** Exact historical compatibility is required, not silently skipped in shallow clones. */
export function historicalSource(revisionPath: string, cwd = process.cwd()): string {
  const separator = revisionPath.indexOf(':');
  if (separator < 1 || !/^[a-f0-9]{7,40}$/.test(revisionPath.slice(0, separator))) throw new Error('HISTORY_INVALID_REFERENCE');
  const revision = revisionPath.slice(0, separator);
  try {
    return execFileSync('git', ['show', revisionPath], {cwd, encoding:'utf8', maxBuffer:16*1024*1024, stdio:['ignore','pipe','pipe']});
  } catch {
    let shallow = 'unknown';
    try {shallow = execFileSync('git',['rev-parse','--is-shallow-repository'],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();} catch { /* explicit unknown */ }
    throw new Error(`HISTORY_PREREQUISITE: exact baseline ${revision} and path are required for this comparison (shallow=${shallow}). No assertion was skipped. From the repository root, fetch trusted origin history: git fetch --unshallow origin (shallow clone), or git fetch origin main (full clone). Then rerun the original command. CI checkout must use fetch-depth: 0. If the object/path is still unavailable, restore the declared baseline; do not substitute HEAD.`);
  }
}
