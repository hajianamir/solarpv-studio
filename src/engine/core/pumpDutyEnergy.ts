import {PumpDutyEnergyInputSchema} from '../../contracts/pumpDutyEnergy';

/** Constant-head, constant-efficiency duty identity, not equipment/PV selection.
 * rho*g*V*H gives joules; 3.6e6 joules/kWh. All assumptions must be explicit.
 */
export function assessPumpDutyEnergy(input:unknown) {
  const parsed=PumpDutyEnergyInputSchema.safeParse(input);
  const unavailable=(reason:'invalid_input'|'numerical_failure')=>({status:'unavailable' as const,reason,waterDeliveryGuaranteed:false as const,financialAdoptionEligible:false as const});
  if(!parsed.success)return unavailable('invalid_input');
  const data=parsed.data;
  const flowRateM3PerHour=data.dailyWaterVolumeM3/data.pumpingHoursPerDay;
  const hydraulicEnergyKwhPerDay=data.densityKgPerM3*data.gravityMPerS2*data.dailyWaterVolumeM3*data.totalDynamicHeadM/3600000;
  const hydraulicPowerKw=hydraulicEnergyKwhPerDay/data.pumpingHoursPerDay;
  const pumpShaftPowerKw=hydraulicPowerKw/data.pumpHydraulicEfficiency;
  const motorElectricalPowerKw=pumpShaftPowerKw/data.motorEfficiency;
  const driveDcInputPowerKw=motorElectricalPowerKw/data.driveEfficiency;
  const pumpShaftEnergyKwhPerDay=pumpShaftPowerKw*data.pumpingHoursPerDay;
  const motorElectricalEnergyKwhPerDay=motorElectricalPowerKw*data.pumpingHoursPerDay;
  const requiredDcEnergyKwhPerDay=driveDcInputPowerKw*data.pumpingHoursPerDay;
  const dailyDcEnergyDeficitKwh=Math.max(0,requiredDcEnergyKwhPerDay-data.availableDcEnergyKwhPerDay);
  const metrics={flowRateM3PerHour,hydraulicEnergyKwhPerDay,hydraulicPowerKw,pumpShaftPowerKw,motorElectricalPowerKw,driveDcInputPowerKw,pumpShaftEnergyKwhPerDay,motorElectricalEnergyKwhPerDay,requiredDcEnergyKwhPerDay,dailyDcEnergyDeficitKwh};
  if(Object.values(metrics).some(value=>!Number.isFinite(value)||value<0))return unavailable('numerical_failure');
  if(data.dailyWaterVolumeM3>0&&flowRateM3PerHour===0)return unavailable('numerical_failure');
  if(data.dailyWaterVolumeM3>0&&data.totalDynamicHeadM>0&&Object.entries(metrics).some(([key,value])=>key!=='dailyDcEnergyDeficitKwh'&&value===0))return unavailable('numerical_failure');
  return {status:'available' as const,input:data,modelPolicy:data.modelPolicy,powerBoundary:data.powerBoundary,...metrics,
    dailyEnergyBalance:dailyDcEnergyDeficitKwh>0?'deficit' as const:'no_aggregate_deficit' as const,
    equipmentReadiness:'unassessed' as const,chronologicalWaterDelivery:'unassessed' as const,
    waterDeliveryGuaranteed:false as const,financialAdoptionEligible:false as const};
}
