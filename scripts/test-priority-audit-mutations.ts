import {cpSync,mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
// Mutate disposable copies only: never edit the live source tree or running server.
mkdirSync('.cache',{recursive:true});const dir=mkdtempSync(resolve('.cache/priority-mutants-'));
try{
 cpSync('src',`${dir}/src`,{recursive:true});mkdirSync(`${dir}/scripts`);cpSync('scripts/test-priority-audit.ts',`${dir}/scripts/test-priority-audit.ts`);
 const file=`${dir}/src/engine/solarPvEngine.ts`;const original=readFileSync(file,'utf8');
 const run=()=>spawnSync(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),`${dir}/scripts/test-priority-audit.ts`],{encoding:'utf8',timeout:60000});
 const baseline=run();assert.equal(baseline.status,0,baseline.stderr);
 const mutants=[
  ['UTC solar wrap removed','((secondsInDay / 60.0 + timeOffset) % 1440 + 1440) % 1440','secondsInDay / 60.0 + timeOffset'],
  ['Unsafe string clamp restored','maxModules: Math.max(0, maxModules)','maxModules: Math.max(1, maxModules)'],
  ['Separate financial value restored','const lcoeVal = financial.lcoeUsdPerKwh;','const lcoeVal = 1.51;'],
  ['Solar equation-of-time biased','const timeOffset = eqOfTime + 4.0 * longitudeDeg;','const timeOffset = 1.15 * eqOfTime + 4.0 * longitudeDeg;'],
 ];
 for(const[name,from,to]of mutants){
  assert.equal(original.split(from).length,2,`unique mutation target ${name}`);writeFileSync(file,original.replace(from,to));
  const result=run();assert.ok(!result.error,`${name} must execute, not time out`);assert.notEqual(result.status,0,`${name} survived`);assert.match(result.stderr,/AssertionError/,`${name} must be killed by assertion, not import failure`);
  console.log(`KILLED ${name}`);writeFileSync(file,original);
 }
 console.log('PASS focused mutation gate: baseline passes; 4/4 targeted mutants killed. Not a whole-engine mutation score.');
}finally{rmSync(dir,{recursive:true,force:true});}
