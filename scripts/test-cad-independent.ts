import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {generatePowerplantLayout,generatePowerplantDxf,type PowerplantCadParameters} from '../src/engine/powerplantCadLayout';
const scratch=await mkdtemp(join(tmpdir(),'solarpv-cad-external-'));
try {
 const base:PowerplantCadParameters={structureType:'fixed_tilt',landLengthM:500,landWidthM:500,arrayTiltDeg:30,arrayAzimuthDeg:180,rowPitchM:7,moduleWattage:580,moduleLengthM:2.278,moduleWidthM:1.134,roadWidthM:12};
 const params:PowerplantCadParameters[]=[base];
 for(const structureType of ['fixed_tilt','single_axis_tracker','east_west_rooftop'] as const)
  for(const size of [20,80,300,500])for(const roadWidthM of [0,4,12])params.push({...base,structureType,landLengthM:size,landWidthM:size,roadWidthM});
 for(const rowPitchM of [3,4,4.6,4.601,7.001])params.push({...base,arrayTiltDeg:0,rowPitchM});
 for(const [landLengthM,landWidthM] of [[120,80],[300,100],[200,600],[333.33,222.22]])params.push({...base,landLengthM,landWidthM});
 // Decimal wattages and half-milli-MW rounding boundaries exercise external
 // Decimal accounting without feeding it rounded production capacity targets.
 for(const moduleWattage of [0.125, 312.5, 579.99, 625, 999.999])
  for(const arrayTiltDeg of [0,45,90])params.push({...base,moduleWattage,arrayTiltDeg});
 const cases=[];
 for(const [i,param] of params.entries()){
  const model=generatePowerplantLayout(param);const dxf=generatePowerplantDxf(model,param);
  assert.equal(dxf,generatePowerplantDxf(model,param),'The same layout must produce byte-identical DXF; no random handle collisions');
  const filename=`case-${i}.dxf`;await writeFile(join(scratch,filename),dxf);cases.push({dxf:filename,model});
 }
 const manifest=join(scratch,'manifest.json');await writeFile(manifest,JSON.stringify({cases}));
 const local=resolve(process.platform==='win32'?'.venv/Scripts/python.exe':'.venv/bin/python');
 let python=process.env.CAD_REFERENCE_PYTHON;
 if(!python){try{await access(local);python=local;}catch{python='python';}}
 const result=spawnSync(python,['scripts/cad_reference/verify.py',manifest],{encoding:'utf8',timeout:180000,maxBuffer:2*1024*1024});
 if(result.stdout)process.stdout.write(result.stdout);if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)throw result.error;
 assert.equal(result.status,0,'Independent artifact/GEOS checks failed. Install pinned scripts/cad_reference/requirements.txt; missing dependencies are NOT a skipped PASS.');
} finally {await rm(scratch,{recursive:true,force:true});}
