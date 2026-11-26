import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { resolveVmpTemperatureCoefficient } from '../src/engine/core/vmpTemperatureCoefficient';
import { calculateStringSizing } from '../src/engine/solarPvEngine';
import { designPvArray, type ModuleSpecs, type InverterSpecs } from '../src/engine/pvEngineAdvanced';
import { evaluateMpptCompatibility } from '../src/engine/core/electricalSizingContract';
import { CATALOG_MODULES } from '../src/engine/equipmentCatalogData';
import { CatalogRepository } from '../src/engine/catalogRepository';
import { catalogModuleToEngine } from '../src/engine/catalogAdapters';
import { ModuleSpecsSchema } from '../src/engine/core/projectMigration';

// Analytical synthetic fixture: NOT manufacturer measurements or external model validation.
// beta=-.004, Vmp=40: at 75 C ->32V; at -25 C ->48V; STC ->40V.
const base = {panelVoc:50,panelVmp:40,tempMinC:-25,tempMaxC:75,cellTempMaxC:75,betaVocPerC:-.002,betaPmpPerC:-.003,inverterVdcMax:1100,inverterMpptMin:550,inverterMpptMax:900};
const measured = calculateStringSizing({...base,betaVmpPerC:-.004});
assert.equal(measured.minModules,18); assert.equal(measured.maxModules,18);
assert.equal(measured.warnings?.length,0);
const proxy = calculateStringSizing(base);
assert.equal(proxy.minModules,17); assert.equal(proxy.maxModules,19);
assert.match(proxy.warnings!.join(' '),/not guaranteed conservative/);
assert.equal(calculateStringSizing({...base,betaVmpPerC:-.004,inverterMpptMin:600}).status,'infeasible');
const stc=calculateStringSizing({...base,betaVmpPerC:-.004,tempMinC:25,tempMaxC:25,cellTempMaxC:25});
assert.equal(stc.minModules,14);assert.equal(stc.maxModules,22);
for(const invalid of [0,.001,NaN,Infinity,-Infinity]) {
 assert.throws(()=>calculateStringSizing({...base,betaVmpPerC:invalid}),/finite and negative/);
 assert.throws(()=>resolveVmpTemperatureCoefficient(invalid,-.3),/finite and negative/);
}
for (const invalid of [0,.3,NaN,Infinity]) assert.throws(()=>resolveVmpTemperatureCoefficient(undefined,invalid),/finite and negative/);
assert.equal(resolveVmpTemperatureCoefficient(-.4,-.3,.05).coefficientPct,-.4);
assert.equal(resolveVmpTemperatureCoefficient(undefined,-.3,.05).coefficientPct,-.35);
assert.match(resolveVmpTemperatureCoefficient(undefined,-.3,.05).warning!,/not Imp/);
const module:ModuleSpecs={id:'synthetic',manufacturer:'SYNTHETIC',modelName:'not manufacturer data',pmpWatts:400,vocVolts:50,vmpVolts:40,iscAmps:11,impAmps:10,tempCoeffVocPct:-.2,tempCoeffPmpPct:-.3,tempCoeffVmpPct:-.4,noctC:20};
const inverter:InverterSpecs={id:'inv',manufacturer:'synthetic',modelName:'synthetic',pnomAcKw:10,vdcMaxVolts:1100,vmpptMinVolts:550,vmpptMaxVolts:900,imppMaxAmpsPerMppt:100,iscMaxAmpsPerMppt:150,mpptChannelsCount:2,isThreePhase:true,efficiencyMaxPct:98};
const deratings={ambientTempMinC:-25,ambientTempMaxC:75,soilingLossPct:0,dcCableLossPct:0,mismatchAndLidLossPct:0,inverterClippingLossPct:0,systemAvailabilityPct:100,groundAlbedo:.2,arrayTiltDeg:30};
const advanced=designPvArray(50,5,module,inverter,deratings,35);
assert.equal(advanced.modulesPerString,18);
const checkInput={moduleVoc:50,moduleVmp:40,moduleIsc:11,moduleImp:10,modulePmp:400,tempCoeffVocPct:-.2,tempCoeffVmpPct:-.4,tempCoeffPmpPct:-.3,modulesPerString:18,parallelStrings:1,inverterVdcMax:1100,inverterVmpptMin:550,inverterVmpptMax:900,inverterImppMaxPerMppt:100,inverterIscMaxPerMppt:150,inverterMpptChannels:2,inverterPnomAcKw:10,ambientTempMinC:-25,ambientTempMaxC:75,cellTempHotC:75};
const checked=evaluateMpptCompatibility(checkInput);
assert.equal(checked.stringVmpMinHotV,576);assert.equal(checked.stringVmpMaxColdV,864);assert.equal(checked.isVoltageFeasible,true);
for(const invalid of [0,.4,NaN,Infinity]) {
 assert.throws(()=>designPvArray(50,5,{...module,tempCoeffVmpPct:invalid},inverter,deratings,35),/finite and negative/);
 assert.throws(()=>evaluateMpptCompatibility({...checkInput,tempCoeffVmpPct:invalid}),/finite and negative/);
 assert.equal(ModuleSpecsSchema.safeParse({...module,tempCoeffVmpPct:invalid}).success,false);
}
assert.match(evaluateMpptCompatibility({...checkInput,tempCoeffVmpPct:undefined}).warnings.join(' '),/not guaranteed conservative/);
const catalog={...CATALOG_MODULES[0],tempCoeffVmpPct:-.4};
assert.equal(catalogModuleToEngine(catalog).tempCoeffVmpPct,-.4);
assert.equal(catalogModuleToEngine(CATALOG_MODULES[0]).tempCoeffVmpPct,undefined);
const repo=CatalogRepository.getInstance();
assert.equal(repo.validateModule(catalog).isValid,true);
assert.equal(repo.validateModule({...catalog,tempCoeffVmpPct:0}).isValid,false);
assert.equal(ModuleSpecsSchema.parse(JSON.parse(JSON.stringify(module))).tempCoeffVmpPct,-.4);
assert.equal(ModuleSpecsSchema.parse({...module,tempCoeffVmpPct:undefined}).tempCoeffVmpPct,undefined);
// Guard the actual UI selection projection; browser-wide regression suite runs separately.
assert.match(readFileSync('src/components/PvArrayEngineeringTab.tsx','utf8'),/tempCoeffVmpPct: found.tempCoeffVmpPct/);
assert.match(readFileSync('src/components/CatalogTab.tsx','utf8'),/id="cat-mod-tc-vmp"/);
for(const path of ['AGENTS.md','skills/pv-formula-audit/SKILL.md','skills/pv-string-sizing-iec62548/SKILL.md','skills/solarpv-studio-navigation/SKILL.md']) {
 const text=readFileSync(path,'utf8');assert.doesNotMatch(text,/ACCEPTABLE conservative substitute|\(trust\)|keep as-is|ALL.*verified/i);
}
mkdirSync('.cache',{recursive:true});const dir=mkdtempSync(resolve('.cache/vmp-audit-'));
process.env.NODE_ENV='test';process.env.SOLARPV_DB_FILE=join(dir,'db.json');process.env.VITE_REAL_INTERNET='false';
const {app}=await import('../server');const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));
const address=server.address();assert.ok(address&&typeof address==='object');const port=address.port;
const post=(body:object)=>fetch(`http://127.0.0.1:${port}/api/v1/electrical/string-sizing`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
try {
 for(const fields of [{betaVmpPerC:-.004},{tempCoeffVmpPct:-.4},{betaVmpPerC:-.004,tempCoeffVmpPct:-.4}]) {
  const response=await post({...base,...fields});assert.equal(response.status,200);assert.deepEqual(await response.json(),measured);
 }
 for(const fields of [{betaVmpPerC:0},{tempCoeffVmpPct:0},{betaVmpPerC:.004},{tempCoeffVmpPct:'-.4'},{betaVmpPerC:null},{betaVmpPerC:-.004,tempCoeffVmpPct:-.3}]) assert.equal((await post({...base,...fields})).status,400);
 const absent=await post(base);assert.equal(absent.status,200);assert.deepEqual(await absent.json(),proxy);
 assert.equal((await post({...base,betaVmpPerC:-.004,inverterMpptMin:600})).status,422);
} finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));rmSync(dir,{recursive:true,force:true});}
console.log('PASS accepted Vmp audit: synthetic hot/cold/STC windows, bias counterexample, three-engine validation, catalog adapter/selection guard, schema roundtrip, HTTP aliases/conflicts/legacy/infeasibility, guidance provenance. Not field or standards validation.');
