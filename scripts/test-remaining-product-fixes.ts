import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generatePowerplantLayout,generatePowerplantDxf,type PowerplantCadParameters} from '../src/engine/powerplantCadLayout';
import {calculateBifacialViewFactor} from '../src/engine/bifacial/bifacial2dViewFactor';
import {evaluateBifacialGainWithDiagnostics} from '../src/engine/bifacialGain';
import {computeTrackerState,simulateTrackerAnnual} from '../src/engine/tracker/backtrackingEngine';
import {sizeDieselGenerator} from '../src/engine/simulation24hEngine';
import {calculateLoadModeDailySizingTargetKwh as target} from '../src/engine/systemModeCapacity';
const fixture=JSON.parse(readFileSync('benchmarks/independent/remaining-geometry.json','utf8'));
let maxShadeError=0;
for(const row of fixture.tracker){
 const state=computeTrackerState({zenithRad:row.zenith*Math.PI/180,azimuthRad:row.azimuth*Math.PI/180},{axisTiltDeg:row.axisTilt,gcr:row.gcr,maxRotationDeg:row.maximum,enableBacktracking:row.backtrack});
 assert.ok(Math.abs(state.rotationDeg-row.rotation)<1e-8);
 maxShadeError=Math.max(maxShadeError,Math.abs(state.shadingFraction-row.shade));
 assert.ok(Math.abs(state.shadingFraction-row.shade)<1e-8,JSON.stringify({row,state}));
}
const geometry={tiltDeg:0,azimuthDeg:180,collectorWidthM:2,pitchM:5,groundClearanceM:1,rowLengthM:50,albedo:.2,bifacialityFactor:.8};
const irradiance={ghiWm2:100,dhiWm2:100,dniWm2:0,frontPoaWm2:100,solarZenithDeg:35,solarAzimuthDeg:180};
for(const row of fixture.rear){
 const result=calculateBifacialViewFactor({...geometry,tiltDeg:row.tilt,azimuthDeg:row.azimuth},{...irradiance,dniWm2:row.dni,solarZenithDeg:row.zenith,solarAzimuthDeg:row.sunaz});
 for(const slice of result.chordSlices)assert.ok(Math.abs(slice.rearDirectBeamWm2-row.direct)<.006);
}
for(const n of [4,5,10,256]){
 const result=calculateBifacialViewFactor({...geometry,sliceCount:n},irradiance);assert.equal(result.chordSlices.length,n);
 for(const slice of result.chordSlices){assert.equal(slice.rearDirectBeamWm2,0);assert.equal(slice.viewFactorSky,0);}
 assert.ok(Math.abs(result.meanRearIrradianceWm2-16.3)<.1,'Horizontal diffuse-only rear has no artificial sky or direct term');
}
for(const n of [4.5,NaN,Infinity,3,257])assert.throws(()=>calculateBifacialViewFactor({...geometry,sliceCount:n},irradiance),/sliceCount/);
for(const mode of ['view_factor_2d','screening_proxy'] as const){
 const diag=evaluateBifacialGainWithDiagnostics({modelMode:mode,bifacialityFactor:.8,groundCoverRatio:.4,albedo:.8,frontPoaWm2:70});
 assert.equal(diag.activeCapPct,mode==='view_factor_2d'?25:15);
 assert.ok(Math.abs(diag.clampedExcessPct-Math.max(0,diag.unclampedGainPct-diag.activeCapPct))<1e-3);
 assert.ok(diag.gainPct<=diag.activeCapPct);
}
const params:PowerplantCadParameters={structureType:'fixed_tilt',landLengthM:500,landWidthM:500,arrayTiltDeg:30,arrayAzimuthDeg:180,rowPitchM:7,moduleWattage:580,moduleLengthM:2.278,moduleWidthM:1.134,roadWidthM:12};
const overlap=(a:{xM:number;yM:number;lengthM:number;widthM:number},b:typeof a)=>a.xM<b.xM+b.lengthM-1e-8&&a.xM+a.lengthM>b.xM+1e-8&&a.yM<b.yM+b.widthM-1e-8&&a.yM+a.widthM>b.yM+1e-8;
let layouts=0;
for(const size of [20,80,500])for(const road of [0,4,12])for(const structureType of ['fixed_tilt','single_axis_tracker','east_west_rooftop'] as const){
 const p={...params,landLengthM:size,landWidthM:size,roadWidthM:road,structureType};const layout=generatePowerplantLayout(p);layouts++;
 assert.equal(layout.totalTablesCount,layout.tables.length);assert.equal(layout.totalModulesCount,layout.tables.length*layout.tableConfig.totalModulesPerTable);
 assert.equal(layout.installedCapacityDcMwp,Math.round(layout.totalModulesCount*p.moduleWattage/1000)/1000);
 for(const table of layout.tables){
  assert.ok(table.xM>=10&&table.yM>=10&&table.xM+table.lengthM<=size-10&&table.yM+table.widthM<=size-10);
  for(const zone of layout.reservedZones)assert.ok(!overlap(table,zone),`table intersects ${zone.id}`);
 }
 for(let i=0;i<layout.tables.length;i++)for(let j=i+1;j<layout.tables.length;j++)assert.ok(!overlap(layout.tables[i],layout.tables[j]),'No overlapping drawn table footprints');
 assert.equal(layout.reservedZones.filter(z=>z.kind==='mv_station').length,layout.mvPowerStationsCount);
 const dxf=generatePowerplantDxf(layout,p);assert.ok(dxf.endsWith('EOF\n'));
 if(size===20){assert.equal(layout.totalTablesCount,0);assert.equal(layout.installedCapacityDcMwp,0);assert.equal(layout.mvPowerStationsCount,0);}
}
assert.throws(()=>generatePowerplantLayout({...params,rowPitchM:0}),/positive/);
const fuel=sizeDieselGenerator(200,400,24);assert.ok(Math.abs(fuel.fuelConsumptionLitersPerHour-.0459)<1e-12);assert.ok(Math.abs(fuel.dailyFuelConsumptionLiters-1.1016)<1e-12);assert.equal(fuel.minFuelTankSizeLiters,2);
assert.equal(target('ongrid',0,6),0);assert.equal(target('ongrid',.01,6),.0025);assert.equal(target('offgrid',0,6),0);assert.equal(target('powerplant',0,6),null);assert.throws(()=>target('offgrid',NaN,6));
const path=[{zenithRad:30*Math.PI/180,azimuthRad:Math.PI/2,ghi:500,dni:800,dhi:80},{zenithRad:80*Math.PI/180,azimuthRad:Math.PI/2,ghi:100,dni:100,dhi:20}];
const config={axisTiltDeg:0,gcr:.4,maxRotationDeg:90,enableBacktracking:false};
const annual=simulateTrackerAnnual(path.map((point,i)=>({...point,hourOfYear:i+1})),config);assert.ok(annual.annualShadingLossFraction>0&&annual.annualShadingLossFraction<.2,'Energy weighting is not mean shaded-area fraction');
console.log(JSON.stringify({status:'PASS',trackerCases:fixture.tracker.length,maxShadeError,rearCases:fixture.rear.length,layouts,fuelTankLiters:fuel.minFuelTankSizeLiters,annualShadingFraction:annual.annualShadingLossFraction}));
