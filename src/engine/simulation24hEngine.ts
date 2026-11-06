// 24-Hour Energy Balance Simulation & Hybrid Diesel Generator Sizing

export interface HourlyEnergyStep {
  hour: number;          // 0 to 23
  timeLabel: string;     // e.g. "12:00"
  solarGenKwh: number;
  loadDemandKwh: number;
  batterySocPct: number;
  batteryChargeKwh: number;
  batteryDischargeKwh: number;
  surplusKwh: number;
  deficitKwh: number;
}

export interface Simulation24hResult {
  hourlySteps: HourlyEnergyStep[];
  totalGeneration24hKwh: number;
  totalConsumption24hKwh: number;
  totalSurplus24hKwh: number;
  totalDeficit24hKwh: number;
  energyNotServedKwh: number;
  lossOfPowerSupplyProbabilityPct: number;
  minBatterySocPct: number;
  maxBatterySocPct: number;
  isSelfSufficient: boolean;
}

export interface GeneratorSizingResult {
  recommendedCapacityKva: number;
  recommendedCapacityKw: number;
  estimatedCapexUsd: number;
  fuelConsumptionLitersPerHour: number;
  dailyFuelConsumptionLiters: number;
  minFuelTankSizeLiters: number;
  powerFactor: number;
  startingCurrentCapabilityAmps: number;
  notesFa: string;
  notesEn: string;
}

export function simulate24hEnergyBalance(
  totalPvCapacityKwp: number,
  peakSunHours: number,
  daytimeKwh: number,
  nighttimeKwh: number,
  batteryUsableKwh: number,
  batteryCapacityTotalKwh: number,
  initialBatterySocPct: number = 50.0
): Simulation24hResult {
  const steps: HourlyEnergyStep[] = [];
  const maxBatteryWh = batteryCapacityTotalKwh * 1000.0;
  const hasBattery = maxBatteryWh > 1e-6; // BUG-3: guard zero-capacity BESS (powerplant mode)
  const minAllowedBatteryWh = (batteryCapacityTotalKwh - batteryUsableKwh) * 1000.0;
  let currentBatteryWh = hasBattery ? (maxBatteryWh * (initialBatterySocPct / 100.0)) : 0;

  // Approximate bell curve irradiance fractions for 24 hours
  // Daylight typically from hour 6 to 18, peaking at 12
  const solarFractions = [
    0, 0, 0, 0, 0, 0.01,
    0.04, 0.08, 0.12, 0.15, 0.18, 0.19, // 6:00 to 11:00
    0.19, 0.18, 0.15, 0.11, 0.07, 0.02, // 12:00 to 17:00
    0, 0, 0, 0, 0, 0
  ];
  const sumFractions = solarFractions.reduce((a, b) => a + b, 0);

  const totalDailyGenerationKwh = totalPvCapacityKwp * peakSunHours * 0.78;

  let totalGen = 0;
  let totalLoad = 0;
  let totalSurplus = 0;
  let totalDeficit = 0;
  let minSoc = 100;
  let maxSoc = 0;

  const chargeEff = 0.95;
  const dischargeEff = 0.95;
  // Maximum continuous PCS / C-rate power limit (1.0C continuous rating)
  const maxPcsPowerKw = batteryCapacityTotalKwh * 1.0;

  for (let h = 0; h < 24; h++) {
    const isDay = h >= 6 && h < 18;
    const solarKwh = (solarFractions[h] / sumFractions) * totalDailyGenerationKwh;

    // Distribute load realistically with strict partition normalization:
    // Day: 3 peak hours @ 1.3 + 9 standard hours @ 0.9 => sum = 12.0
    // Night: 5 evening hours @ 1.4 + 7 night hours @ 0.7 => sum = 11.9
    let loadKwh = 0;
    if (isDay) {
      const dayFactor = (h >= 12 && h <= 14) ? 1.3 : 0.9;
      loadKwh = (daytimeKwh * dayFactor) / 12.0;
    } else {
      const nightFactor = (h >= 18 && h <= 22) ? 1.4 : 0.7;
      loadKwh = (nighttimeKwh * nightFactor) / 11.9;
    }

    const netKwh = solarKwh - loadKwh;
    let chargeKwh = 0;
    let dischargeKwh = 0;
    let surplusKwh = 0;
    let deficitKwh = 0;

    if (netKwh > 0) {
      if (hasBattery) {
        // Solar surplus charges battery up to available capacity and PCS rating
        const spaceInBatWh = Math.max(0, maxBatteryWh - currentBatteryWh);
        const maxAbsorbKwh = (spaceInBatWh / chargeEff) / 1000.0;
        const allowedChargeKwh = Math.min(netKwh, maxAbsorbKwh, maxPcsPowerKw);
        chargeKwh = Math.max(0, allowedChargeKwh);
        currentBatteryWh += chargeKwh * 1000.0 * chargeEff;
        // Surplus is remainder solar that does NOT enter battery; strictly unpenalized by battery efficiency
        surplusKwh = netKwh - chargeKwh;
      } else {
        chargeKwh = 0;
        surplusKwh = netKwh;
      }
    } else {
      const neededKwh = Math.abs(netKwh);
      if (hasBattery) {
        // Net deficit discharges battery down to minimum allowable reserve
        const availableWh = Math.max(0, currentBatteryWh - minAllowedBatteryWh);
        const maxDeliverableKwh = (availableWh * dischargeEff) / 1000.0;
        const allowedDischargeKwh = Math.min(neededKwh, maxDeliverableKwh, maxPcsPowerKw);
        dischargeKwh = Math.max(0, allowedDischargeKwh);
        currentBatteryWh -= (dischargeKwh * 1000.0) / dischargeEff;
        deficitKwh = neededKwh - dischargeKwh;
      } else {
        dischargeKwh = 0;
        deficitKwh = neededKwh;
      }
    }

    const socPct = hasBattery
      ? Math.round((currentBatteryWh / maxBatteryWh) * 100)
      : 100;
    if (hasBattery) {
      if (socPct < minSoc) minSoc = socPct;
      if (socPct > maxSoc) maxSoc = socPct;
    }

    totalGen += solarKwh;
    totalLoad += loadKwh;
    totalSurplus += surplusKwh;
    totalDeficit += deficitKwh;

    steps.push({
      hour: h,
      timeLabel: `${h.toString().padStart(2, '0')}:00`,
      solarGenKwh: Math.round(solarKwh * 100) / 100,
      loadDemandKwh: Math.round(loadKwh * 100) / 100,
      batterySocPct: socPct,
      batteryChargeKwh: Math.round(chargeKwh * 100) / 100,
      batteryDischargeKwh: Math.round(dischargeKwh * 100) / 100,
      surplusKwh: Math.round(surplusKwh * 100) / 100,
      deficitKwh: Math.round(deficitKwh * 100) / 100,
    });
  }

  const lpspPct = totalLoad > 0 ? Number(((totalDeficit / totalLoad) * 100).toFixed(2)) : 0;
  const initialWh = hasBattery ? maxBatteryWh * (initialBatterySocPct / 100.0) : 0;
  const isSelfSufficient = totalDeficit < 0.1 && (!hasBattery || currentBatteryWh >= initialWh * 0.98);

  return {
    hourlySteps: steps,
    totalGeneration24hKwh: Math.round(totalGen * 10) / 10,
    totalConsumption24hKwh: Math.round(totalLoad * 10) / 10,
    totalSurplus24hKwh: Math.round(totalSurplus * 10) / 10,
    totalDeficit24hKwh: Math.round(totalDeficit * 10) / 10,
    energyNotServedKwh: Math.round(totalDeficit * 10) / 10,
    lossOfPowerSupplyProbabilityPct: lpspPct,
    minBatterySocPct: hasBattery ? minSoc : 100,
    maxBatterySocPct: hasBattery ? maxSoc : 100,
    isSelfSufficient,
  };
}

export function sizeDieselGenerator(
  continuousLoadWatts: number,
  peakSurgeWatts: number,
  continuousOutageHours: number = 24
): GeneratorSizingResult {
  const continuousKw = continuousLoadWatts / 1000.0;
  const peakKw = peakSurgeWatts / 1000.0;

  // Generator sizing rules:
  // 1. Run at max 75-80% load for prime continuous service
  // 2. Motor starting surge capacity: genset can briefly supply ~1.3-1.5x kVA
  const requiredPrimeKw = Math.max(continuousKw * 1.30, peakKw / 1.5);
  const powerFactor = 0.8;
  const recommendedKva = Math.ceil((requiredPrimeKw / powerFactor) / 2.5) * 2.5;
  const recommendedKw = recommendedKva * powerFactor;

  // Fuel consumption estimate: ~0.26 to 0.28 liters per kWh of generated power
  const averageHourlyLoadKw = continuousKw * 0.85;
  const fuelConsumptionLitersPerHour = Math.round(averageHourlyLoadKw * 0.27 * 10) / 10;
  const dailyFuelConsumptionLiters = Math.round(fuelConsumptionLitersPerHour * 24);

  // Minimum fuel tank size based on user outage hours + 20% reserve
  const minFuelTankSizeLiters = Math.ceil(fuelConsumptionLitersPerHour * continuousOutageHours * 1.20);

  const startingCurrentCapabilityAmps = Math.round((recommendedKva * 1000.0) / (Math.sqrt(3) * 400.0) * 1.8);

  const notesFa = `دیزل ژنراتور کمکی با توان نامی ${recommendedKva} kVA (${recommendedKw.toFixed(1)} kW) جهت شارژ اضطراری باتری‌ها و راه‌اندازی بارهای القایی هجومی. مصرف میانگین سوخت حدود ${fuelConsumptionLitersPerHour} لیتر در ساعت.`;
  const notesEn = `Auxiliary diesel backup generator rated at ${recommendedKva} kVA (${recommendedKw.toFixed(1)} kW) for emergency battery charging, substation auxiliary power, and motor inrush handling. Estimated average diesel fuel burn is ~${fuelConsumptionLitersPerHour} L/h.`;

  return {
    recommendedCapacityKva: recommendedKva,
    recommendedCapacityKw: recommendedKw,
    estimatedCapexUsd: Math.round(recommendedKw * 380),
    fuelConsumptionLitersPerHour,
    dailyFuelConsumptionLiters,
    minFuelTankSizeLiters,
    powerFactor,
    startingCurrentCapabilityAmps,
    notesFa,
    notesEn,
  };
}
