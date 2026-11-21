import type { StudyResult } from './studyContract';

/** Import-boundary arithmetic evidence, not re-simulation or source certification. */
export function validateMultiMpptEvidence(r: StudyResult) {
  const inputs=r.request.system.mpptInputs;
  if(!inputs)return;
  const s=r.request.system,dt=r.request.weather.intervalMinutes/60;
  const close=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-6*Math.max(1,Math.abs(a),Math.abs(b));
  const fail=()=>{throw new Error('Independent MPPT evidence mismatch');};
  if(!r.manifest.models.dc.startsWith('independent_mppt;')||!r.manifest.models.mppt.startsWith('independent voltage/current/cable')||!r.manifest.electricalChecks||r.samples.length!==r.request.weather.records.length)fail();
  type Sum={dc:number;mpp:number;loss:number;gap:number;ac:number};
  const empty=():Sum=>({dc:0,mpp:0,loss:0,gap:0,ac:0}),total=empty(),months=new Map<string,Sum>();
  for(const [n,row] of r.samples.entries()){
    let dc=0,mpp=0,loss=0;
    for(const [index,input] of inputs.entries()){
      const prefix=`m${index}_`,e=input.electrical;
      const num=(key:string)=>{const v=row[prefix+key];if(typeof v!=='number'||!Number.isFinite(v))fail();return v as number;};
      for(const key of ['arrayVocV','arrayVmpV','arrayMppW','operatingVoltageV','operatingCurrentA','dcOperatingState','poaGlobalWm2','effectiveIrradianceWm2','dcW','dcCableLossW','dcCableVoltageDropV','arrayOperatingVoltageV'])if(num(key)<0)fail();
      const voltage=num('operatingVoltageV'),current=num('operatingCurrentA'),state=num('dcOperatingState'),power=num('dcW'),heat=num('dcCableLossW'),available=num('arrayMppW'),arrayV=num('arrayOperatingVoltageV');
      const resistance=e.dcCable?e.dcCable.stringLoopResistanceOhm/e.stringsInParallel+e.dcCable.sharedLoopResistanceOhm:0;
      if(![0,1,2,3,4].includes(state)||num('arrayVocV')>e.maxDcV+1e-6||current>e.maxInputCurrentA+1e-6||([0,4].includes(state)?voltage!==0||current!==0:voltage<e.mpptMinV-1e-6||voltage>e.mpptMaxV+1e-6)||arrayV>num('arrayVocV')+1e-6||!close(power,voltage*current)||!close(heat,current*current*resistance)||!close(num('dcCableVoltageDropV'),current*resistance)||!close(arrayV,voltage+current*resistance)||available-power-heat < -Math.max(1e-5,available*1e-7))fail();
      const weather=r.request.weather.records[n],poa=num('poaGlobalWm2'),temp=num('cellTemperatureC');
      const thermal=s.pvsystTemperature,faiman=s.faiman;
      const expected=thermal?weather.tempAirC+thermal.alphaAbsorption*poa*(1-thermal.moduleEfficiency)/(thermal.uc+thermal.uv*weather.windSpeedMs):faiman?weather.tempAirC+poa/(faiman.u0+faiman.u1*weather.windSpeedMs):weather.tempAirC+poa*Math.exp(s.temperature.a+s.temperature.b*weather.windSpeedMs)+poa/1000*s.temperature.deltaT;
      if(temp < -100 || temp > 150 || !close(temp,expected))fail();
      for(const key of ['moduleStcMppW','modeledArrayStcW','specifiedDesignStringVocV'])if(!Number.isFinite(r.manifest.electricalChecks?.[prefix+key]))fail();
      dc+=power;mpp+=available;loss+=heat;
    }
    if('operatingVoltageV' in row||'dcOperatingState' in row||!close(Number(row.dcW),dc)||!close(Number(row.dcBeforeAdditionalLossW),dc)||!close(Number(row.arrayMppW),mpp)||!close(Number(row.dcCableLossW),loss))fail();
    const z=dc/s.inverterPdc0W;
    const ac=Math.max(0,Math.min(s.inverterEtaNom*s.inverterPdc0W,s.inverterEtaNom/.9637*s.inverterPdc0W*(-.0162*z*z-.0059+.9858*z)));
    const actual=row.acPlantInputW??row.acBeforeExportLimitW??row.acW;
    if(!close(Number(actual),ac))fail();
    const month=String(row.midpointUtc).slice(0,7),bucket=months.get(month)??empty();
    for(const sum of [total,bucket]){sum.dc+=dc*dt;sum.mpp+=mpp*dt;sum.loss+=loss*dt;sum.gap+=Math.max(0,mpp-dc-loss)*dt;sum.ac+=Number(row.acW)*dt;}
    months.set(month,bucket);
  }
  const check=(a:StudyResult['summary'],b:Sum)=>close(a.dcWh,b.dc)&&close(a.acWh,b.ac)&&close(a.dcBeforeAdditionalLossWh,b.dc)&&close(Number(a.availableMppWh),b.mpp)&&close(Number(a.dcCableLossWh),b.loss)&&close(Number(a.mpptConstraintLossWh),b.gap);
  if(!check(r.summary,total)||r.monthly.length!==months.size||r.monthly.some(m=>!months.has(m.month)||!check(m,months.get(m.month)!)))fail();
}

/** Derived input/UTC-month ledger from retained terminal samples; not new simulation. */
export function multiMpptEnergy(r: StudyResult) {
  return (r.request.system.mpptInputs??[]).map((input,index)=>{
    const prefix=`m${index}_`,dt=r.request.weather.intervalMinutes/60;
    const empty=()=>({dcWh:0,availableMppWh:0,dcCableLossWh:0,mpptConstraintLossWh:0});
    const total=empty(),months=new Map<string,ReturnType<typeof empty>>();
    for(const row of r.samples){
      const dc=Number(row[prefix+'dcW']),mpp=Number(row[prefix+'arrayMppW']),loss=Number(row[prefix+'dcCableLossW']);
      const month=String(row.midpointUtc).slice(0,7),bucket=months.get(month)??empty();
      for(const sum of [total,bucket]){sum.dcWh+=dc*dt;sum.availableMppWh+=mpp*dt;sum.dcCableLossWh+=loss*dt;sum.mpptConstraintLossWh+=Math.max(0,mpp-dc-loss)*dt;}
      months.set(month,bucket);
    }
    return {id:input.id,index,...total,monthly:[...months].map(([month,energy])=>({month,...energy}))};
  });
}
