// Agricultural Solar Pumping Station & Hydraulic Sizing Engine

export interface SolarPumpInput {
  wellDepthM: number;             // Static water level + drawdown
  tankHeightM: number;            // Elevation to reservoir/irrigation head
  pipeLengthM: number;            // Delivery pipeline length
  pipeDiameterMm: number;         // Internal diameter (e.g. 63mm, 75mm, 90mm, 110mm)
  dailyWaterRequirementM3: number;// Required water volume per day (m³/day)
  irrigationType: 'drip' | 'sprinkler' | 'flooding_storage';
  peakSunHours: number;           // Site PSH
}

export interface SolarPumpResult {
  staticHeadM: number;
  frictionHeadM: number;
  pressureHeadM: number;
  totalDynamicHeadTdhM: number;
  flowRateM3PerHour: number;
  flowRateLitersPerSecond: number;
  hydraulicPowerWatts: number;
  recommendedMotorPowerKw: number;
  recommendedMotorPowerHp: number;
  recommendedVfdDriveKw: number;
  recommendedPvArrayKwp: number;
  arrayToPumpRatio: number;
  monthlyWaterDeliveryM3: number[];
  waterDeliveryCostPerM3Toman: number;
  notesFa: string[];
}

export function calculateSolarPump(input: SolarPumpInput): SolarPumpResult {
  const {
    wellDepthM,
    tankHeightM,
    pipeLengthM,
    pipeDiameterMm,
    dailyWaterRequirementM3,
    irrigationType,
    peakSunHours,
  } = input;

  // 1. Static Head: well depth to ground + ground to tank surface
  const staticHeadM = wellDepthM + tankHeightM;

  // 2. Effective pumping hours per day (typically PSH * 0.90 for high efficiency band)
  const pumpingHours = Math.max(3.5, peakSunHours * 0.95);
  const flowRateM3PerHour = dailyWaterRequirementM3 / pumpingHours;
  const flowRateM3PerSec = flowRateM3PerHour / 3600.0;
  const flowRateLitersPerSecond = flowRateM3PerHour / 3.6;

  // 3. Pipe friction head loss (Hazen-Williams formula for polyethylene pipe C=140)
  // h_f = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
  const dMeters = Math.max(0.02, pipeDiameterMm / 1000.0);
  const frictionFactor = 10.67 * pipeLengthM * Math.pow(flowRateM3PerSec, 1.852);
  const denom = Math.pow(140.0, 1.852) * Math.pow(dMeters, 4.87);
  const frictionHeadM = Math.max(0.5, Math.round((frictionFactor / denom) * 10) / 10);

  // 4. Pressure Head needed at irrigation nozzle
  let pressureHeadM = 0;
  if (irrigationType === 'sprinkler') {
    pressureHeadM = 25.0; // ~2.5 bar for impact sprinklers
  } else if (irrigationType === 'drip') {
    pressureHeadM = 15.0; // ~1.5 bar for drip tape
  } else {
    pressureHeadM = 2.0;  // Open pipe to pool / storage
  }

  // 5. Total Dynamic Head (TDH)
  const totalDynamicHeadTdhM = Math.round((staticHeadM + frictionHeadM + pressureHeadM) * 10) / 10;

  // 6. Hydraulic Power (W) = (rho * g * Q * TDH) / 3600
  // rho = 1000 kg/m³, g = 9.81 m/s²
  const theoreticalHydraulicWatts = (1000.0 * 9.81 * flowRateM3PerHour * totalDynamicHeadTdhM) / 3600.0;

  // 7. Submersible Pump Mechanical Efficiency (typically 55% to 65%)
  const pumpEfficiency = 0.58;
  const motorShaftWatts = theoreticalHydraulicWatts / pumpEfficiency;

  // Recommended Motor Rating (in kW and HP)
  const standardHpRatings = [1.0, 1.5, 2.0, 3.0, 4.0, 5.5, 7.5, 10.0, 15.0, 20.0, 25.0, 30.0, 40.0, 50.0, 60.0, 75.0, 100.0];
  const requiredHp = motorShaftWatts / 746.0;
  const recommendedMotorPowerHp = standardHpRatings.find(hp => hp >= requiredHp) || Math.ceil(requiredHp / 10) * 10;
  const recommendedMotorPowerKw = Math.round((recommendedMotorPowerHp * 0.746) * 10) / 10;

  // 8. Solar Pump Inverter / VFD Drive Sizing
  // Drive should be sized 1.25x motor power to handle starting inrush without trip
  const recommendedVfdDriveKw = Math.round((recommendedMotorPowerKw * 1.25) * 10) / 10;

  // 9. Solar PV Array Sizing
  // Ratio typically 1.30 to 1.35 to ensure pump starts early in morning (from ~8:00 AM)
  const arrayToPumpRatio = 1.35;
  const recommendedPvArrayKwp = Math.round((recommendedMotorPowerKw * arrayToPumpRatio) * 10) / 10;

  // 10. Monthly water delivery simulation (12 months from Farvardin to Esfand)
  const monthlyPshFactors = [1.0, 1.1, 1.2, 1.25, 1.2, 1.1, 1.0, 0.9, 0.85, 0.8, 0.75, 0.85];
  const monthlyWaterDeliveryM3 = monthlyPshFactors.map(factor =>
    Math.round(dailyWaterRequirementM3 * 30 * factor)
  );

  const waterDeliveryCostPerM3Toman = Math.round(
    ((recommendedPvArrayKwp * 350 * 90000) / (dailyWaterRequirementM3 * 300 * 15)) * 10
  ) / 10;

  const notesFa = [
    `هد دینامیکی کل (TDH): شامل ${staticHeadM} متر هد استاتیک، ${frictionHeadM} متر افت اصطکاک لوله و ${pressureHeadM} متر فشار پشت نازل.`,
    `پمپ شناور ${recommendedMotorPowerHp} اسب بخار با درایو خورشیدی VFD به توان ${recommendedVfdDriveKw} کیلووات بدون نیاز به باتری (سیستم خورشیدی مستقیم Direct-Drive).`,
    `آرایه خورشیدی ${recommendedPvArrayKwp} کیلووات با ضریب بیش‌پوشانی ${arrayToPumpRatio} جهت کارکرد مطمئن از ساعت ۸ صبح تا ۵ بعدازظهر.`,
  ];

  return {
    staticHeadM,
    frictionHeadM,
    pressureHeadM,
    totalDynamicHeadTdhM,
    flowRateM3PerHour: Math.round(flowRateM3PerHour * 10) / 10,
    flowRateLitersPerSecond: Math.round(flowRateLitersPerSecond * 10) / 10,
    hydraulicPowerWatts: Math.round(theoreticalHydraulicWatts),
    recommendedMotorPowerKw,
    recommendedMotorPowerHp,
    recommendedVfdDriveKw,
    recommendedPvArrayKwp,
    arrayToPumpRatio,
    monthlyWaterDeliveryM3,
    waterDeliveryCostPerM3Toman,
    notesFa,
  };
}
