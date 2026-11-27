import {z} from 'zod';
import {PumpDutyEnergyInputSchema} from './pumpDutyEnergy';

const duty=PumpDutyEnergyInputSchema.shape;
/** Null is incomplete user input, never a physical zero. Ranges have one owner. */
export const PumpDutyDraftInputsSchema=z.object({
  dailyWaterVolumeM3:duty.dailyWaterVolumeM3.nullable(),
  totalDynamicHeadM:duty.totalDynamicHeadM.nullable(),
  pumpingHoursPerDay:duty.pumpingHoursPerDay.nullable(),
  densityKgPerM3:duty.densityKgPerM3.nullable(),
  gravityMPerS2:duty.gravityMPerS2.nullable(),
  pumpHydraulicEfficiency:duty.pumpHydraulicEfficiency.nullable(),
  motorEfficiency:duty.motorEfficiency.nullable(),
  driveEfficiency:duty.driveEfficiency.nullable(),
  availableDcEnergyKwhPerDay:duty.availableDcEnergyKwhPerDay.nullable(),
}).strict();
export const PumpDutySettingsSchema=z.object({
  schemaVersion:z.literal('pump-duty-settings-v1'),
  modelPolicy:duty.modelPolicy,
  powerBoundary:duty.powerBoundary,
  contextBasis:z.literal('user_declared_unmatched'),
  enabled:z.boolean(),
  inputs:PumpDutyDraftInputsSchema,
}).strict();
export type PumpDutySettings=z.infer<typeof PumpDutySettingsSchema>;
export function createDefaultPumpDutySettings():PumpDutySettings {
  return {schemaVersion:'pump-duty-settings-v1',modelPolicy:'pump_steady_duty_energy_v1',powerBoundary:'dc_bus_to_vfd',contextBasis:'user_declared_unmatched',enabled:false,
    inputs:{dailyWaterVolumeM3:null,totalDynamicHeadM:null,pumpingHoursPerDay:null,densityKgPerM3:null,gravityMPerS2:null,pumpHydraulicEfficiency:null,motorEfficiency:null,driveEfficiency:null,availableDcEnergyKwhPerDay:null}};
}
