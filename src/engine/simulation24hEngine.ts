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
  initialBatterySocPct: number;
  finalBatterySocPct: number;
  reliesOnInitialCharge: boolean;
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
  initialBatterySocPct: number = 50.0,
  daylightHoursDesign?: number
): Simulation24hResult {
  const steps: HourlyEnergyStep[] = [];
  const maxBatteryWh = batteryCapacityTotalKwh * 1000.0;
  const hasBattery = maxBatteryWh > 1e-6; // guard zero-capacity BESS
  const minAllowedBatteryWh = (batteryCapacityTotalKwh - batteryUsableKwh) * 1000.0;
  let currentBatteryWh = hasBattery ? (maxBatteryWh * (initialBatterySocPct / 100.0)) : 0;

  // Site Daylight Window around solar noon (12:00)
  // Supports full physical astronomical range [0.0, 24.0] hours (polar night to midnight sun)
  const D = daylightHoursDesign !== undefined
    ? Math.max(0.0, Math.min(24.0, Number(daylightHoursDesign)))
    : 12.0;
  const tSunrise = 12.0 - D / 2.0;
  const tSunset = 12.0 + D / 2.0;

  // Compute astronomical solar generation curve based on site daylight window
  const solarWeights: number[] = new Array(24).fill(0);
  const dayFracs: number[] = new Array(24).fill(0);
  const nightFracs: number[] = new Array(24).fill(0);

  for (let h = 0; h < 24; h++) {
    const hStart = h;
    const hEnd = h + 1;
    const overlapStart = Math.max(hStart, tSunrise);
    const overlapEnd = Math.min(hEnd, tSunset);
    const dayFrac = Math.max(0, overlapEnd - overlapStart);
    dayFracs[h] = dayFrac;
    nightFracs[h] = 1.0 - dayFrac;

    if (dayFrac > 0 && D > 0) {
      const tMid = (overlapStart + overlapEnd) / 2.0;
      const angle = (Math.PI * (tMid - tSunrise)) / D;
      solarWeights[h] = dayFrac * Math.sin(Math.max(0, Math.min(Math.PI, angle)));
    }
  }

  const sumSolarWeights = solarWeights.reduce((a, b) => a + b, 0);
  const totalDailyGenerationKwh = D > 0 ? totalPvCapacityKwp * peakSunHours * 0.78 : 0;

  // Calculate day and night load hourly distributions with strict conservation:
  // Daytime load weights: midday peak (12:00-14:00) 1.3, standard 0.9
  const dayLoadWeights: number[] = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (dayFracs[h] > 0) {
      const middayBoost = (h >= 12 && h <= 14) ? 1.3 : 0.9;
      dayLoadWeights[h] = dayFracs[h] * middayBoost;
    }
  }
  const sumDayLoadWeights = dayLoadWeights.reduce((a, b) => a + b, 0);

  // Nighttime load weights: evening peak (18:00-22:00) 1.4, deep night 0.7
  const nightLoadWeights: number[] = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (nightFracs[h] > 0) {
      const eveningBoost = (h >= 18 && h <= 22) ? 1.4 : 0.7;
      nightLoadWeights[h] = nightFracs[h] * eveningBoost;
    }
  }
  const sumNightLoadWeights = nightLoadWeights.reduce((a, b) => a + b, 0);

  let totalGen = 0;
  let totalLoad = 0;
  let totalSurplus = 0;
  let totalDeficit = 0;
  let minSoc = 100;
  let maxSoc = 0;

  const chargeEff = 0.95;
  const dischargeEff = 0.95;
  const maxPcsPowerKw = batteryCapacityTotalKwh * 1.0;

  // Pre-calculate hourly loads with exact rounding and distribute residual to noon hour (12)
  // BEFORE the simulation loop, guaranteeing load and deficit equality in polar / deficit hours
  const targetTotalLoad = Number((daytimeKwh + nighttimeKwh).toFixed(2));
  const hourlyLoadsKwh: number[] = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    const loadDayKwh = sumDayLoadWeights > 0 ? (dayLoadWeights[h] / sumDayLoadWeights) * daytimeKwh : (daytimeKwh / 24.0);
    const loadNightKwh = sumNightLoadWeights > 0 ? (nightLoadWeights[h] / sumNightLoadWeights) * nighttimeKwh : (nighttimeKwh / 24.0);
    hourlyLoadsKwh[h] = Math.round((loadDayKwh + loadNightKwh) * 100) / 100;
  }
  const preSum = hourlyLoadsKwh.reduce((sum, v) => sum + v, 0);
  const preResidual = Number((targetTotalLoad - preSum).toFixed(2));
  if (Math.abs(preResidual) >= 0.005) {
    hourlyLoadsKwh[12] = Number((hourlyLoadsKwh[12] + preResidual).toFixed(2));
  }

  for (let h = 0; h < 24; h++) {
    const solarKwh = sumSolarWeights > 0
      ? (solarWeights[h] / sumSolarWeights) * totalDailyGenerationKwh
      : 0;

    // Load partition: exactly conserves daytimeKwh and nighttimeKwh
    const loadKwh = hourlyLoadsKwh[h];

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
  const finalSoc = hasBattery ? Math.round((currentBatteryWh / maxBatteryWh) * 100) : 100;
  const reliesOnInitialCharge = hasBattery && totalDeficit < 0.1 && currentBatteryWh < initialWh * 0.98;
  const isSelfSufficient = totalDeficit < 0.1 && (!hasBattery || !reliesOnInitialCharge);

  return {
    hourlySteps: steps,
    totalGeneration24hKwh: Math.round(totalGen * 10) / 10,
    totalConsumption24hKwh: Math.round((daytimeKwh + nighttimeKwh) * 10) / 10,
    totalSurplus24hKwh: Math.round(totalSurplus * 10) / 10,
    totalDeficit24hKwh: Math.round(totalDeficit * 10) / 10,
    energyNotServedKwh: Math.round(totalDeficit * 10) / 10,
    lossOfPowerSupplyProbabilityPct: lpspPct,
    minBatterySocPct: hasBattery ? minSoc : 100,
    maxBatterySocPct: hasBattery ? maxSoc : 100,
    initialBatterySocPct,
    finalBatterySocPct: finalSoc,
    reliesOnInitialCharge,
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
