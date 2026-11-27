import {z} from 'zod';

export const PumpDutyEnergyInputSchema=z.object({
  modelPolicy:z.literal('pump_steady_duty_energy_v1'),
  powerBoundary:z.literal('dc_bus_to_vfd'),
  dailyWaterVolumeM3:z.number().finite().nonnegative(),
  totalDynamicHeadM:z.number().finite().nonnegative(),
  pumpingHoursPerDay:z.number().finite().positive().max(24),
  densityKgPerM3:z.number().finite().positive(),
  gravityMPerS2:z.number().finite().positive(),
  pumpHydraulicEfficiency:z.number().finite().positive().max(1),
  motorEfficiency:z.number().finite().positive().max(1),
  driveEfficiency:z.number().finite().positive().max(1),
  availableDcEnergyKwhPerDay:z.number().finite().nonnegative(),
}).strict();
export type PumpDutyEnergyInput=z.infer<typeof PumpDutyEnergyInputSchema>;
