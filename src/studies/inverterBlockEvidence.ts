import type {StudyResult} from './studyContract';
import {stable} from './studyComparisonGate';

/** Signed AC is netted before the common plant. Gross self-consumption is diagnostic. */
export function validateInverterBlockEvidence(r:StudyResult,validate:(value:unknown)=>StudyResult):void {
 const blocks=r.request.system.inverterBlocks;
 if(!blocks){if(r.blockResults!==undefined)throw new Error('Unexpected inverter block results');return;}
 const fail=()=>{throw new Error('Independent inverter block evidence mismatch');};
 const close=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a),Math.abs(b));
 if(!r.blockResults||r.blockResults.length!==blocks.length||!r.manifest.models.ac.startsWith('independent inverter blocks;'))fail();
 const children=r.blockResults!.map((raw,index)=>{
  const child=validate(raw),block=blocks[index];
  const {measurements:_,...modelRequest}=r.request;
  const expected={...modelRequest,label:block.id,system:block.system,parameterProvenance:{source:block.source,quality:block.quality}};
  if(stable(child.request)!==stable(expected)||child.manifest.engineVersion!==r.manifest.engineVersion||child.manifest.workerSha256!==r.manifest.workerSha256||child.manifest.requirementsSha256!==r.manifest.requirementsSha256||stable(child.manifest.dependencies)!==stable(r.manifest.dependencies))fail();
  for(const [key,value] of Object.entries(child.manifest.models))if(r.manifest.models[`block${index}.${key}`]!==value)fail();
  return child;
 });
 r.blockResults=children;
 let ownWh=0;const months=new Map<string,number>();
 for(const [index,row] of r.samples.entries()){
  let dc=0,net=0,own=0,gross=0;
  for(const child of children){const sample=child.samples[index];if(!sample||sample.timestamp!==row.timestamp)fail();dc+=Number(sample.dcW);const signed=Number(sample.inverterNetAcW??sample.acW);net+=signed;own+=Math.max(0,-signed);gross+=Math.max(0,signed);}
  if(!close(Number(row.dcW),dc)||!close(Number(row.dcBeforeAdditionalLossW),dc)||!close(Number(row.inverterNetAcW),net)||!close(Number(row.acPlantInputW),net)||!close(Number(row.inverterSelfConsumptionW),own)||!close(Number(row.inverterGrossGenerationW),gross)||'operatingVoltageV' in row||'dcOperatingState' in row)fail();
  const energy=own*r.request.weather.intervalMinutes/60,month=String(row.midpointUtc).slice(0,7);ownWh+=energy;months.set(month,(months.get(month)??0)+energy);
 }
 if(!close(Number(r.summary.inverterSelfConsumptionWh),ownWh)||r.monthly.length!==months.size||r.monthly.some(m=>!months.has(m.month)||!close(Number(m.inverterSelfConsumptionWh),months.get(m.month)!)))fail();
}
