import {z} from 'zod';
import {studyTimestamp} from './studyTime';
import {stable} from './studyComparisonGate';
const n=z.number().finite();
const positive=n.positive().max(1e100);
const nonnegative=n.min(0).max(1e12);
const eff=n.positive().max(1);
const source=z.string().min(10).max(1000).refine(s=>s.trim().length>=10);
const time={start:studyTimestamp,durationS:positive};
function contiguous(rows:{start:string;durationS:number}[],ctx:z.RefinementCtx){
 for(let i=1;i<rows.length;i++)if(Math.abs(Date.parse(rows[i].start)-Date.parse(rows[i-1].start)-rows[i-1].durationS*1000)>.001)ctx.addIssue({code:'custom',message:'Intervals must be contiguous'});
}
export const DcCoupledPlanSchema=z.object({schemaVersion:z.literal('dc-coupled-plan-v1'),source,
 mode:z.enum(['powerplant','ongrid','offgrid']),allowGridCharging:z.boolean(),islandCapable:z.boolean(),dcChargingWhenIslanded:z.boolean(),
 equipment:z.object({pvMpptEfficiency:eff,inverterEfficiency:eff,rectifierEfficiency:eff,inverterAcRatingW:positive,inverterDcLimitW:positive,converterBusLimitW:positive,chargeConverterEfficiency:eff,dischargeConverterEfficiency:eff}).strict(),
 battery:z.object({capacityKwh:nonnegative,initialKwh:nonnegative,minimumKwh:nonnegative,maximumChargeW:nonnegative,maximumDischargeW:nonnegative,storageChargeEfficiency:eff,storageDischargeEfficiency:eff}).strict(),
 intervals:z.array(z.object({...time,pvAvailableDcW:nonnegative,loadAcW:nonnegative,batteryBusCommandW:n.min(-1e12).max(1e12),gridAvailable:z.boolean(),gridImportLimitW:nonnegative,exportLimitW:nonnegative}).strict()).min(1).max(17568),
}).strict().superRefine((p,ctx)=>{
 contiguous(p.intervals,ctx);
 if(p.battery.initialKwh>p.battery.capacityKwh||p.battery.minimumKwh>p.battery.initialKwh)ctx.addIssue({code:'custom',message:'Battery energy bounds'});
 if(p.mode==='offgrid'&&(p.allowGridCharging||p.intervals.some(r=>r.gridAvailable||r.exportLimitW!==0)))ctx.addIssue({code:'custom',message:'Offgrid grid connection prohibited'});
});
const electrode=z.object({radiusM:positive,diffusivityM2S:positive,maximumConcentrationMolM3:positive,activeVolumeM3:positive,initialStoichiometry:n.min(1e-8).max(1-1e-8),reactionRate:positive,activationEnergyJMol:n.min(0).max(1e6),referenceTemperatureK:positive,ocp:z.array(z.tuple([n.min(0).max(1),n.min(-10).max(10)])).min(2).max(10001)}).strict().superRefine((p,ctx)=>{
 if(p.ocp.some((r,i)=>i>0&&r[0]<=p.ocp[i-1][0])||p.initialStoichiometry<=p.ocp[0][0]||p.initialStoichiometry>=p.ocp[p.ocp.length-1][0])ctx.addIssue({code:'custom',message:'OCP domain/order'});
});
export const SpmPlanSchema=z.object({schemaVersion:z.literal('spm-plan-v1'),source,temperatureK:n.min(250).max(350),electrolyteConcentrationMolM3:positive,seriesCells:z.number().int().min(1).max(100000),parallelCells:z.number().int().min(1).max(100000),ohmicResistanceOhm:n.min(0).max(1000),lowerCellVoltageV:n.min(0).max(10),upperCellVoltageV:n.min(0).max(10),radialCells:z.number().int().min(4).max(100),maximumStepS:n.min(.001).max(60),relativeTolerance:n.min(1e-10).max(1e-4),negative:electrode,positive:electrode,intervals:z.array(z.object({...time,packCurrentA:n.min(-1e6).max(1e6)}).strict()).min(1).max(2000)}).strict().superRefine((p,ctx)=>{
 contiguous(p.intervals,ctx);const duration=p.intervals.reduce((s,r)=>s+r.durationS,0);
 if(p.lowerCellVoltageV>=p.upperCellVoltageV||duration>86400||duration/p.maximumStepS>200000)ctx.addIssue({code:'custom',message:'SPM voltage/time budget'});
});
export const DqControlPlanSchema=z.object({schemaVersion:z.literal('dq-control-plan-v1'),source,
 sampleS:n.min(1e-7).max(.001),outputEvery:z.number().int().min(1).max(1000000),
 plant:z.object({inductanceH:positive,resistanceOhm:positive,dcVoltageV:positive,maximumModulation:n.min(.001).max(1),openCircuitDumpResistanceOhm:positive,initialCurrentAlphaA:n.min(-1e9).max(1e9),initialCurrentBetaA:n.min(-1e9).max(1e9)}).strict(),
 controller:z.object({currentKpOhm:n.min(0).max(1e9),currentKiOhmPerS:n.min(0).max(1e12),antiWindupPerS:n.min(0).max(1e9),maximumCurrentPeakA:positive,pllKpPerS:positive,pllKiPerS2:positive,nominalFrequencyHz:n.min(40).max(70),maximumFrequencyDeviationHz:positive,initialPllAngleRad:n.min(-1000).max(1000),initialGridAngleRad:n.min(-1000).max(1000),minimumPllVoltagePeakV:positive}).strict(),
 protection:z.object({pickupRmsA:positive,curve:z.enum(['normal_inverse','very_inverse','extremely_inverse']),timeMultiplier:positive,minimumOperateS:n.min(0).max(1e6),instantaneousRmsA:positive,breakerDelayS:n.min(0).max(1000),underVoltagePeakV:n.min(0).max(1e9),overVoltagePeakV:n.min(0).max(1e9),voltageDelayS:n.min(0).max(1000),underFrequencyHz:n.min(0).max(1000),overFrequencyHz:n.min(0).max(1000),frequencyDelayS:n.min(0).max(1000),startupBlankingS:n.min(0).max(1000)}).strict(),
 intervals:z.array(z.object({...time,gridVoltagePeakV:n.min(0).max(1e9),gridFrequencyHz:n.min(1).max(1000),gridPhaseJumpRad:n.min(-2*Math.PI).max(2*Math.PI),currentReferenceDPeakA:n.min(-1e9).max(1e9),currentReferenceQPeakA:n.min(-1e9).max(1e9)}).strict()).min(1).max(2000),
}).strict().superRefine((p,ctx)=>{
 contiguous(p.intervals,ctx);const a=p.plant,c=p.controller,r=p.protection;
 const fail=(message:string)=>ctx.addIssue({code:'custom',message});
 if(p.sampleS*Math.max(a.resistanceOhm/a.inductanceH,(a.resistanceOhm+a.openCircuitDumpResistanceOhm)/a.inductanceH,c.currentKpOhm/a.inductanceH,c.pllKpPerS,c.antiWindupPerS,Math.sqrt(c.pllKiPerS2),Math.sqrt(c.currentKiOhmPerS/a.inductanceH))>.2)fail('Sample too coarse for supplied dynamics');
 if(r.instantaneousRmsA<r.pickupRmsA||r.overVoltagePeakV<r.underVoltagePeakV||r.overFrequencyHz<r.underFrequencyHz)fail('Protection threshold order');
 let steps=0;
 for(const row of p.intervals){const count=Math.round(row.durationS/p.sampleS);if(count<1||Math.abs(count*p.sampleS-row.durationS)>1e-9)fail('Duration not multiple of sampleS');steps+=count;}
 if(steps>500000||Math.floor(steps/p.outputEvery)+2*p.intervals.length>100000)fail('Transient execution/output budget');
});
export const physicalOperations=['dc_coupled','electrochemical_spm','dq_protection_control'] as const;
export type PhysicalPlan=z.infer<typeof DcCoupledPlanSchema>|z.infer<typeof SpmPlanSchema>|z.infer<typeof DqControlPlanSchema>;
const hash=z.string().regex(/^[a-f0-9]{64}$/);
const base=z.object({schemaVersion:z.string(),algorithmVersion:z.literal('1.0.0'),plan:z.unknown(),planSha256:hash,validationStatus:z.literal('not_field_validated'),safetyApproval:z.literal('not_assessed'),projectApproval:z.literal('blocked'),limitations:z.array(z.string()).min(1),status:z.string(),trace:z.array(z.record(z.string(),z.unknown()))}).passthrough();
function finiteTree(value:unknown):void{
 if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Nonfinite physical result');
 if(Array.isArray(value))value.forEach(finiteTree);else if(value&&typeof value==='object')Object.values(value).forEach(finiteTree);
}
function numeric(row:Record<string,unknown>,key:string){return n.parse(row[key]);}
function near(a:number,b:number,scale=1){if(Math.abs(a-b)>1e-7*Math.max(scale,Math.abs(a),Math.abs(b)))throw new Error('Independent physical balance/binding failure');}
export function validatePhysicalResult(value:unknown,plan:PhysicalPlan){
 finiteTree(value);const r=base.parse(value);if(stable(r.plan)!==stable(plan))throw new Error('Physical plan mismatch');
 if(plan.schemaVersion==='dc-coupled-plan-v1'){
  if(r.schemaVersion!=='dc-coupled-result-v1'||r.status!=='completed'||r.trace.length!==plan.intervals.length)throw new Error('DC result contract');
  let stored=plan.battery.initialKwh;
  r.trace.forEach((row,i)=>{const input=plan.intervals[i],e=plan.equipment,b=plan.battery;
   const v=(key:string)=>numeric(row,key),dt=input.durationS/3600000;
   near(v('initialStoredKwh'),stored);near(v('durationS'),input.durationS);if(row.start!==input.start)throw new Error('DC timestamp binding');
   const ch=v('batteryChargeBusW'),dis=v('batteryDischargeBusW'),forward=v('inverterDcW'),rect=v('rectifierDcW');
   const ac=v('inverterAcW'),rectAc=v('rectifierAcW'),imp=v('gridImportW'),exp=v('exportW'),served=v('servedLoadW'),curt=v('curtailedDcW');
   for(const x of [ch,dis,forward,rect,ac,rectAc,imp,exp,served,curt])if(x< -1e-7)throw new Error('Negative physical flow');
   near(v('pvBusW'),input.pvAvailableDcW*e.pvMpptEfficiency);near(ac,forward*e.inverterEfficiency);near(rect,rectAc*e.rectifierEfficiency);
   near(v('pvBusW')+dis+rect,ch+forward+curt);near(ac+imp,served+exp+rectAc);
   stored+=(ch*e.chargeConverterEfficiency*b.storageChargeEfficiency-dis/(e.dischargeConverterEfficiency*b.storageDischargeEfficiency))*dt;
   near(v('finalStoredKwh'),stored);near(served+v('unmetLoadW'),input.loadAcW);
   near(v('pvConversionLossW'),input.pvAvailableDcW*(1-e.pvMpptEfficiency));
   near(v('converterLossW'),ch*(1-e.chargeConverterEfficiency)+dis*(1/e.dischargeConverterEfficiency-1));
   near(v('storageLossW'),ch*e.chargeConverterEfficiency*(1-b.storageChargeEfficiency)+dis/e.dischargeConverterEfficiency*(1/b.storageDischargeEfficiency-1));
   near(v('inverterLossW'),forward-ac+rectAc-rect);
   const losses=v('pvConversionLossW')+v('converterLossW')+v('storageLossW')+v('inverterLossW');
   near((input.pvAvailableDcW+imp-served-exp-curt-losses)*dt,stored-v('initialStoredKwh'));
   near(v('energyResidualKwh'),0);near(v('dcResidualW'),0);near(v('acResidualW'),0);
   if(stored<b.minimumKwh-1e-7||stored>b.capacityKwh+1e-7||ac>e.inverterAcRatingW+1e-6||forward>e.inverterDcLimitW+1e-6||Math.max(ch,dis)>e.converterBusLimitW+1e-6||ch*dis>1e-7||forward*rect>1e-7||imp*exp>1e-7||imp>(input.gridAvailable?input.gridImportLimitW:0)+1e-6||exp>(input.gridAvailable?input.exportLimitW:0)+1e-6)throw new Error('DC constraint');
  });near(n.parse(r.finalStoredKwh),stored);
 }else if(plan.schemaVersion==='spm-plan-v1'){
  if(r.schemaVersion!=='spm-result-v1'||!['completed','cutoff'].includes(r.status))throw new Error('SPM result contract');
  const cn=z.array(n).length(plan.radialCells).parse(r.finalNegativeConcentrationMolM3),cp=z.array(n).length(plan.radialCells).parse(r.finalPositiveConcentrationMolM3);
  const average=(cs:number[])=>cs.reduce((s,c,i)=>s+c*((i+1)**3-i**3)/cs.length**3,0);
  const inventory=average(cn)*plan.negative.activeVolumeM3+average(cp)*plan.positive.activeVolumeM3;
  const initial=plan.negative.initialStoichiometry*plan.negative.maximumConcentrationMolM3*plan.negative.activeVolumeM3+plan.positive.initialStoichiometry*plan.positive.maximumConcentrationMolM3*plan.positive.activeVolumeM3;
  near(inventory,initial);near(n.parse(r.initialLithiumMolPerCell),initial);near(n.parse(r.finalLithiumMolPerCell),inventory);
  near(n.parse(r.lithiumResidualMolPerCell),inventory-initial);near(n.parse(r.coulombResidualNegativeMolM3),0,.1);near(n.parse(r.coulombResidualPositiveMolM3),0,.1);
  const elapsed=n.parse(r.elapsedS),duration=plan.intervals.reduce((s,row)=>s+row.durationS,0);
  if(elapsed<0||elapsed>duration+1e-6||(r.status==='completed'&&(r.trace.length===0||Math.abs(elapsed-duration)>1e-6)))throw new Error('SPM completion/time contract');
  let remaining=elapsed,coulombs=0;for(const row of plan.intervals){const used=Math.min(remaining,row.durationS);coulombs+=used*row.packCurrentA/plan.parallelCells;remaining-=used;}
  near(average(cn),plan.negative.initialStoichiometry*plan.negative.maximumConcentrationMolM3-coulombs/(96485.33212*plan.negative.activeVolumeM3));
  near(average(cp),plan.positive.initialStoichiometry*plan.positive.maximumConcentrationMolM3+coulombs/(96485.33212*plan.positive.activeVolumeM3));
  for(const [values,electrode] of [[cn,plan.negative],[cp,plan.positive]] as const)if(values.some(x=>x < -1e-5||x>electrode.maximumConcentrationMolM3+1e-5))throw new Error('SPM concentration bounds');
  let last=0;for(const row of r.trace){const t=numeric(row,'elapsedS');if(t<last||t>elapsed+1e-6)throw new Error('SPM time order');last=t;
   for(const [field,electrode] of [['surfaceNegativeStoichiometry',plan.negative],['surfacePositiveStoichiometry',plan.positive]] as const){const x=numeric(row,field);if(x<electrode.ocp[0][0]-1e-7||x>electrode.ocp[electrode.ocp.length-1][0]+1e-7)throw new Error('SPM surface/OCP domain');}near(numeric(row,'cellLithiumResidualMol'),0);
   if(row.cellVoltageV!==null){const v=numeric(row,'cellVoltageV');near(numeric(row,'packVoltageV'),v*plan.seriesCells);if(v<plan.lowerCellVoltageV-1e-5||v>plan.upperCellVoltageV+1e-5)throw new Error('SPM voltage domain');}
  }
  if(r.trace.length)near(last,elapsed);near(elapsed+n.parse(r.unexecutedDurationS),duration);
 }else{
  if(r.schemaVersion!=='dq-control-result-v1'||!['completed','tripped'].includes(r.status))throw new Error('Control result contract');
  const supplied=n.parse(r.converterEnergyJ),grid=n.parse(r.gridEnergyJ),loss=n.parse(r.resistiveEnergyJ),initial=n.parse(r.initialMagneticEnergyJ),end=n.parse(r.finalMagneticEnergyJ);
  const tolerance=1e-5*Math.max(1,Math.abs(supplied)+Math.abs(grid)+loss+initial);
  if(loss<0||Math.abs(supplied-grid-loss-end+initial)>tolerance||n.parse(r.maximumEnergyResidualJ)>tolerance)throw new Error('Control energy balance');
  let time=0,opened=false,tripped=false;const vmax=plan.plant.maximumModulation*plan.plant.dcVoltageV/Math.sqrt(3);
  for(const row of r.trace){const v=(key:string)=>numeric(row,key),t=v('elapsedS');if(t<=time)throw new Error('Control time order');time=t;
   near(v('magneticEnergyJ'),.75*plan.plant.inductanceH*(v('currentAlphaA')**2+v('currentBetaA')**2));
   if(Math.hypot(v('converterVoltageAlphaV'),v('converterVoltageBetaV'))>vmax+1e-6||Math.abs(v('energyResidualJ'))>tolerance)throw new Error('Control physical bound');
   if((opened&&row.breakerOpen!==true)||(tripped&&row.tripLatched!==true))throw new Error('Trip must latch');
   opened=row.breakerOpen===true;tripped=row.tripLatched===true;
  }
  near(time,plan.intervals.reduce((s,row)=>s+row.durationS,0));
 }
 return r;
}
