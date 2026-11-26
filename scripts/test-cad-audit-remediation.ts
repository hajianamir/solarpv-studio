import assert from 'node:assert/strict';
import {generatePowerplantLayout,generatePowerplantDxf,type PowerplantCadParameters} from '../src/engine/powerplantCadLayout';

type Rect={xM:number;yM:number;lengthM:number;widthM:number};
// Independent rectangle interval oracle. These are software geometry constraints,
// not empirical yield/civil-clearance or standards-conformity references.
const area=(a:Rect,b:Rect)=>Math.max(0,Math.min(a.xM+a.lengthM,b.xM+b.lengthM)-Math.max(a.xM,b.xM))*Math.max(0,Math.min(a.yM+a.widthM,b.yM+b.widthM)-Math.max(a.yM,b.yM));
function nonOverlap(a:Rect,b:Rect){assert.ok(area(a,b)<1e-8,`intersecting polygons: ${JSON.stringify({a,b,area:area(a,b)})}`);}
function connected(roads:Rect[]){
 if(!roads.length)return;
 const seen=new Set([0]);let changed=true;
 while(changed){changed=false;for(const i of [...seen])for(let j=0;j<roads.length;j++){
  const a=roads[i],b=roads[j];
  const x=Math.min(a.xM+a.lengthM,b.xM+b.lengthM)-Math.max(a.xM,b.xM);
  const y=Math.min(a.yM+a.widthM,b.yM+b.widthM)-Math.max(a.yM,b.yM);
  // Require positive-width connection, not point-only adjacency.
  if(x>=-1e-8&&y>=-1e-8&&(x>1e-8||y>1e-8)&&!seen.has(j)){seen.add(j);changed=true;}
 }}
 assert.equal(seen.size,roads.length,'All road strips connect through a positive-length shared edge or area');
}
function parseDxf(text:string){
 const lines=text.trimEnd().split('\n');assert.equal(lines.length%2,0);
 const entities:{type:string;codes:[number,string][]}[]=[];
 let current:typeof entities[number]|undefined;
 for(let i=0;i<lines.length;i+=2){const code=Number(lines[i]),value=lines[i+1];
  if(code===0){current={type:value,codes:[]};entities.push(current);}else current?.codes.push([code,value]);
 }
 const rectangles=new Map<string,Rect[]>();
 for(const entity of entities.filter(e=>e.type==='LWPOLYLINE')){
  const layer=entity.codes.find(([c])=>c===8)![1];
  assert.equal(entity.codes.find(([c])=>c===70)![1],'1','Closed polygons');
  const xs=entity.codes.filter(([c])=>c===10).map(([,v])=>Number(v));
  const ys=entity.codes.filter(([c])=>c===20).map(([,v])=>Number(v));
  assert.equal(xs.length,4);assert.equal(ys.length,4);
  const r={xM:Math.min(...xs),yM:Math.min(...ys),lengthM:Math.max(...xs)-Math.min(...xs),widthM:Math.max(...ys)-Math.min(...ys)};
  rectangles.set(layer,[...(rectangles.get(layer)??[]),r]);
 }
 return {rectangles,texts:entities.filter(e=>e.type==='TEXT').map(e=>e.codes.find(([c])=>c===1)![1])};
}
function sameRect(a:Rect,b:Rect){for(const key of ['xM','yM','lengthM','widthM'] as const)assert.ok(Math.abs(a[key]-b[key])<1e-7,`${key}: ${a[key]} != ${b[key]}`);}
const base:PowerplantCadParameters={structureType:'fixed_tilt',landLengthM:500,landWidthM:500,arrayTiltDeg:30,arrayAzimuthDeg:180,rowPitchM:7,moduleWattage:580,moduleLengthM:2.278,moduleWidthM:1.134,roadWidthM:12};
let cases=0;
function check(params:PowerplantCadParameters){
 const r=generatePowerplantLayout(params);cases++;
 const roads=r.reservedZones.filter(z=>z.kind==='road'),stations=r.reservedZones.filter(z=>z.kind==='mv_station');
 connected(roads);
 assert.equal(stations.length,r.mvPowerStationsCount);
 for(const zone of [...r.tables,...r.reservedZones]){
  assert.ok(zone.xM>=0&&zone.yM>=0&&zone.xM+zone.lengthM<=params.landLengthM+1e-8&&zone.yM+zone.widthM<=params.landWidthM+1e-8);
 }
 for(const station of stations){for(const road of roads)nonOverlap(station,road);for(const table of r.tables)nonOverlap(station,table);}
 for(let i=0;i<stations.length;i++)for(let j=i+1;j<stations.length;j++)nonOverlap(stations[i],stations[j]);
 for(const table of r.tables)for(const road of roads)nonOverlap(table,road);
 const rows=new Map<number,Rect[]>();for(const t of r.tables)rows.set(t.row,[...(rows.get(t.row)??[]),t]);
 const ys=[...rows.values()].map(row=>row[0].yM).sort((a,b)=>a-b);
 for(let i=1;i<ys.length;i++)assert.ok(Math.abs(ys[i]-ys[i-1]-r.effectiveRowPitchM)<1e-8);
 assert.ok(r.effectiveRowPitchM>=params.rowPitchM&&r.effectiveRowPitchM>=r.tableConfig.tableWidthM);
 const expectedGcr=Math.round(r.projectedCollectorWidthM/r.effectiveRowPitchM*1000)/1000;
 assert.equal(r.groundCoverageRatioGcr,expectedGcr);assert.ok(r.groundCoverageRatioGcr<=1);
 const height=r.collectorWidthM*Math.sin(params.arrayTiltDeg*Math.PI/180);
 const span=Math.max(.5,r.effectiveRowPitchM-r.collectorWidthM*Math.cos(params.arrayTiltDeg*Math.PI/180));
 assert.equal(r.shadingLimitAngleDeg,Math.round(Math.atan(height/span)*180/Math.PI*10)/10);
 assert.equal(r.totalTablesCount,r.tables.length);assert.equal(r.totalModulesCount,r.tables.length*r.tableConfig.totalModulesPerTable);
 assert.equal(r.installedCapacityDcMwp,Math.round(r.totalModulesCount*params.moduleWattage/1000)/1000);
 const parsed=parseDxf(generatePowerplantDxf(r,params));
 const exportedRoads=parsed.rectangles.get('ROADS')??[],exportedStations=parsed.rectangles.get('MV_SUBSTATIONS')??[],exportedTables=parsed.rectangles.get('PV_TABLES')??[];
 assert.equal(exportedRoads.length,roads.length);assert.equal(exportedStations.length,stations.length);assert.equal(exportedTables.length,r.tables.length);
 exportedRoads.forEach((road,i)=>sameRect(road,roads[i]));exportedStations.forEach((station,i)=>sameRect(station,stations[i]));exportedTables.forEach((table,i)=>sameRect(table,r.tables[i]));
 for(const station of exportedStations){for(const road of exportedRoads)nonOverlap(station,road);for(const table of exportedTables)nonOverlap(station,table);}
 connected(exportedRoads);
 assert.ok(parsed.texts.some(t=>t.includes(`Effective pitch: ${r.effectiveRowPitchM}m`)&&t.includes(`Requested pitch: ${params.rowPitchM}m`)));
 assert.ok(parsed.texts.some(t=>t.includes('NOT A CONSTRUCTION')));
 assert.throws(()=>generatePowerplantDxf(r,{...params,rowPitchM:params.rowPitchM+1}),/do not match/);
 return r;
}
const audit=check(base);assert.equal(audit.totalTablesCount,748);assert.equal(audit.mvPowerStationsCount,7);
const pitchCases=[3,4,4.6].map(rowPitchM=>check({...base,arrayTiltDeg:0,rowPitchM}));
assert.deepEqual(pitchCases.map(r=>r.effectiveRowPitchM),[4.6,4.6,4.6]);assert.deepEqual(pitchCases.map(r=>r.groundCoverageRatioGcr),[.999,.999,.999]);
assert.equal(new Set(pitchCases.map(r=>r.totalTablesCount)).size,1);
for(const structureType of ['fixed_tilt','single_axis_tracker','east_west_rooftop'] as const)
 for(const size of [20,80,300,500])for(const roadWidthM of [0,4,12])check({...base,structureType,landLengthM:size,landWidthM:size,roadWidthM});
for(const structureType of ['fixed_tilt','single_axis_tracker','east_west_rooftop'] as const)
 for(const [landLengthM,landWidthM] of [[120,80],[300,100],[200,600]])check({...base,structureType,landLengthM,landWidthM});
check({...base,landLengthM:333.33,landWidthM:222.22,roadWidthM:12.05});
for(const rowPitchM of [3.001,4.601,7.001])check({...base,rowPitchM});
for(const arrayTiltDeg of [0,30,60,90])check({...base,arrayTiltDeg});
const empty=check({...base,landLengthM:20,landWidthM:20});assert.equal(empty.totalTablesCount,0);assert.equal(empty.mvPowerStationsCount,0);
assert.throws(()=>generatePowerplantLayout({...base,landLengthM:10000,landWidthM:30}),/MV stations do not fit/);
assert.throws(()=>generatePowerplantLayout({...base,roadWidthM:501}),/road width/);
assert.throws(()=>generatePowerplantLayout({...base,landLengthM:500.001,roadWidthM:500.001}),/Rounded CAD road/);
// Oracle sensitivity: the original on-road bay must fail the same intersection assertion.
assert.throws(()=>nonOverlap({xM:244,yM:12,lengthM:12,widthM:8},{xM:244,yM:6,lengthM:12,widthM:488}));
console.log(JSON.stringify({status:'PASS',cases,auditTables:audit.totalTablesCount,auditStations:audit.mvPowerStationsCount,stationRoadOverlapM2:0,pitchCases:pitchCases.map(r=>({requested:r.requestedRowPitchM,effective:r.effectiveRowPitchM,gcr:r.groundCoverageRatioGcr,tables:r.totalTablesCount})),scope:'Analytical rectangle constraints, DXF readback and geometric route connectivity; not civil/turning-radius or field validation'}));
