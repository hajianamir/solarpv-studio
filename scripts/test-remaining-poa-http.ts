import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
mkdirSync('.cache',{recursive:true});const dir=mkdtempSync(resolve('.cache/poa-contract-'));
process.env.NODE_ENV='test';process.env.SOLARPV_DB_FILE=join(dir,'db.json');process.env.VITE_REAL_INTERNET='false';
const {app}=await import('../server');const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
const address=server.address();assert.ok(address&&typeof address==='object');const port=address.port;
async function post(body:Record<string,unknown>){return fetch(`http://127.0.0.1:${port}/api/v1/solar/poa`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}
try{
 // F17: actual HTTP path against independent SPA, not only direct engine calls.
 const vectors=JSON.parse(readFileSync('scripts/fixtures/physics/audit-remaining-pvlib.json','utf8')).solar;
 for(const c of vectors.filter((c:{input:number[]})=>Math.abs(c.input[0])>89.99)){
  const [latitudeDeg,longitudeDeg,utcTs]=c.input;
  const response=await fetch(`http://127.0.0.1:${port}/api/v1/solar/position`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({latitudeDeg,longitudeDeg,utcTs})});assert.equal(response.status,200);
  const result=await response.json(),delta=((result.azimuthDeg-c.azimuthDeg+540)%360)-180;assert.ok(Math.abs(delta)<.1);assert.ok(Math.abs(result.zenithDeg-c.zenithDeg)<.1);
 }
 const base={ghi:500,dni:1000,dhi:0,tiltDeg:60,sunZenithDeg:60,azimuthDeg:180};
 const results:Record<string,number[]>={};
 for(const convention of [undefined,'south_zero','north_clockwise']){
  const values=[];
  for(const sunAzimuthDeg of [179.999,180,180.001]){const response=await post({...base,sunAzimuthDeg,surfaceAzimuthConvention:convention});assert.equal(response.status,200);values.push((await response.json()).poaIrradiance);}
  assert.ok(Math.max(...values)-Math.min(...values)<1e-5,'Continuity cannot depend on equality of sun/surface angle');results[convention??'implicit']=values;
 }
 assert.deepEqual(results.implicit,results.south_zero);assert.ok(Math.abs(results.implicit[1]-25)<1e-8);assert.equal(results.north_clockwise[1],1025);
 assert.equal((await post({...base,sunAzimuthDeg:180,surfaceAzimuthConvention:'guess'})).status,400);
 for (const north of [0,90,180,270]) {
  const south=((north-180+540)%360)-180;
  const response=await post({...base,sunAzimuthDeg:north,solarAzimuthDeg:north+360,surfaceAzimuthNorthDeg:north,surfaceAzimuthSouthDeg:south,azimuthDeg:south,surfaceAzimuthDeg:south});
  assert.equal(response.status,200);const result=await response.json();
  assert.equal(result.azimuth.surfaceAzimuthNorthDeg,north);
  const explicit=await post({...base,sunAzimuthDeg:north,surfaceAzimuthConvention:'north_clockwise',azimuthDeg:north});
  assert.equal((await explicit.json()).poaIrradiance,result.poaIrradiance);
 }
 for(const bad of [
  {surfaceAzimuthNorthDeg:0,surfaceAzimuthSouthDeg:0},
  {azimuthDeg:0,surfaceAzimuthDeg:90},
  {surfaceAzimuthConvention:'north_clockwise',surfaceAzimuthNorthDeg:180,azimuthDeg:0},
  {sunAzimuthDeg:180,solarAzimuthDeg:0},
  {surfaceAzimuthNorthDeg:null}, {surfaceAzimuthSouthDeg:''},
 ]) assert.equal((await post({...base,sunAzimuthDeg:180,...bad})).status,400,JSON.stringify(bad));
 const legacy=await (await post({...base,sunAzimuthDeg:180})).json();
 assert.equal(legacy.azimuth.legacyDefaultUsed,true);assert.match(legacy.deprecation,/v1/);
 console.log('PASS real HTTP POA: deterministic legacy south-zero default, both explicit conventions continuous around 180°, unknown convention rejected.');
}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));rmSync(dir,{recursive:true,force:true});}
