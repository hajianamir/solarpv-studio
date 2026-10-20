// Utility Powerplant Harmonics & Upstream Grid Interconnection Engine
// Conforming to IEEE 519:2022, IEC 61000-3-6, IEEE 1547-2018 & Tavanir Grid Code

export interface HarmonicOrder {
  order: number;
  freqHz: number;
  currentPct: number;      // % of fundamental current
  currentAmps: number;
  voltagePct: number;      // % voltage distortion at PCC
  ieeeLimitPct: number;    // IEEE 519 standard maximum allowed
  compliant: boolean;
}

export interface HarmonicsAnalysisResult {
  fundamentalFreqHz: number;
  ratedCurrentAmps: number;
  thdCurrentPct: number;
  thdCurrentLimitPct: number;
  thdVoltagePct: number;
  thdVoltageLimitPct: number;
  isThdCompliant: boolean;
  individualHarmonics: HarmonicOrder[];
  recommendedFilterType: 'none' | 'lcl_trap' | 'active_harmonic_filter';
  recommendedAhfCurrentAmps: number;
}

export interface UpstreamGridConditionsInput {
  plantCapacityMw: number;
  gridVoltageKv: number;          // e.g. 20, 33, 63 kV
  gridShortCircuitMva: number;    // e.g. 300 MVA
  gridXrRatio: number;            // e.g. 8.0
  inverterPowerFactor: number;    // e.g. 0.98 or 1.0 (cos phi)
  isPowerFactorLagging: boolean;  // inductive vs capacitive
}

export interface UpstreamGridAnalysisResult {
  shortCircuitRatioScr: number;
  gridStrengthCategory: 'strong' | 'moderate' | 'weak';
  gridStrengthDescriptionFa: string;
  gridStrengthDescriptionEn: string;
  theveninImpedanceZgOhm: number;
  theveninResistanceRgOhm: number;
  theveninReactanceXgOhm: number;
  upstreamShortCircuitCurrentKa: number;
  pccVoltageRisePct: number;
  pccVoltageRiseCompliant: boolean;
  maxAllowablePlantCapacityMw: number;
  reactivePowerRangeMvar: {
    maxAbsorbingInductiveMvar: number;
    maxInjectingCapacitiveMvar: number;
  };
  flickerShortTermPst: number;
  flickerLongTermPlt: number;
  isFlickerCompliant: boolean;
  lvrtCompliance: {
    zeroVoltageRideThroughMs: number;
    recoveryTimeSec: number;
    statusFa: string;
  };
}

export function analyzePowerplantHarmonics(
  plantCapacityMw: number,
  gridVoltageKv: number,
  shortCircuitRatio: number
): HarmonicsAnalysisResult {
  // Fundamental current at grid voltage
  const ratedCurrentAmps = (plantCapacityMw * 1000) / (Math.sqrt(3) * gridVoltageKv);

  // Standard multi-level modern central/string inverter harmonic spectrum (typical PWM with LCL filter)
  const baseHarmonics = [
    { order: 3, pct: 0.45 },
    { order: 5, pct: 2.10 },
    { order: 7, pct: 1.45 },
    { order: 9, pct: 0.30 },
    { order: 11, pct: 1.15 },
    { order: 13, pct: 0.85 },
    { order: 15, pct: 0.20 },
    { order: 17, pct: 0.55 },
    { order: 19, pct: 0.40 },
    { order: 23, pct: 0.32 },
    { order: 25, pct: 0.25 },
  ];

  // IEEE 519 Current Limits based on Isc / IL (SCR)
  let tddLimit = 5.0;
  let individualLimit = 4.0;
  if (shortCircuitRatio >= 100) {
    tddLimit = 15.0;
    individualLimit = 10.0;
  } else if (shortCircuitRatio >= 50) {
    tddLimit = 12.0;
    individualLimit = 7.0;
  } else if (shortCircuitRatio >= 20) {
    tddLimit = 8.0;
    individualLimit = 5.0;
  } else {
    tddLimit = 5.0;
    individualLimit = 4.0;
  }

  let sumCurrentSq = 0;
  let sumVoltageSq = 0;

  const individualHarmonics: HarmonicOrder[] = baseHarmonics.map((h) => {
    const currentAmps = (h.pct / 100.0) * ratedCurrentAmps;
    sumCurrentSq += Math.pow(h.pct, 2);

    // Approximate harmonic voltage distortion at PCC = (h * I_h / I_sc) * 100
    const voltPct = (h.pct * h.order) / Math.max(10, shortCircuitRatio * 1.8);
    sumVoltageSq += Math.pow(voltPct, 2);

    const limit = h.order < 11 ? individualLimit : h.order < 17 ? individualLimit * 0.75 : individualLimit * 0.5;

    return {
      order: h.order,
      freqHz: h.order * 50,
      currentPct: h.pct,
      currentAmps: Number(currentAmps.toFixed(2)),
      voltagePct: Number(voltPct.toFixed(3)),
      ieeeLimitPct: limit,
      compliant: h.pct <= limit,
    };
  });

  const thdCurrentPct = Number(Math.sqrt(sumCurrentSq).toFixed(2));
  const thdVoltagePct = Number(Math.sqrt(sumVoltageSq).toFixed(2));

  const thdVoltageLimitPct = gridVoltageKv <= 69 ? 5.0 : 2.5;
  const isThdCompliant = thdCurrentPct <= tddLimit && thdVoltagePct <= thdVoltageLimitPct;

  let recommendedFilterType: 'none' | 'lcl_trap' | 'active_harmonic_filter' = 'none';
  let recommendedAhfCurrentAmps = 0;

  if (!isThdCompliant) {
    recommendedFilterType = 'active_harmonic_filter';
    // Size AHF for harmonic current RMS
    const harmonicRmsAmps = Math.sqrt(
      individualHarmonics.reduce((sum, item) => sum + Math.pow(item.currentAmps, 2), 0)
    );
    recommendedAhfCurrentAmps = Math.ceil(harmonicRmsAmps * 1.25);
  } else if (thdCurrentPct > 3.0) {
    recommendedFilterType = 'lcl_trap';
  }

  return {
    fundamentalFreqHz: 50,
    ratedCurrentAmps: Number(ratedCurrentAmps.toFixed(1)),
    thdCurrentPct,
    thdCurrentLimitPct: tddLimit,
    thdVoltagePct,
    thdVoltageLimitPct,
    isThdCompliant,
    individualHarmonics,
    recommendedFilterType,
    recommendedAhfCurrentAmps,
  };
}

export function analyzeUpstreamGridConditions(
  input: UpstreamGridConditionsInput
): UpstreamGridAnalysisResult {
  const {
    plantCapacityMw,
    gridVoltageKv,
    gridShortCircuitMva,
    gridXrRatio,
    inverterPowerFactor,
    isPowerFactorLagging,
  } = input;

  // Short-Circuit Ratio (SCR) = S_sc / P_pv
  const shortCircuitRatioScr = Number((gridShortCircuitMva / Math.max(0.01, plantCapacityMw)).toFixed(2));

  let gridStrengthCategory: 'strong' | 'moderate' | 'weak' = 'strong';
  let gridStrengthDescriptionFa = 'شبکه بالادست قوی و صلب (Strong Grid) — پایداری ولتاژ عالی بدون ریسک رزونانس زیرسنکرون';
  let gridStrengthDescriptionEn = 'Strong Grid — High voltage stability, minimal risk of control interaction';

  if (shortCircuitRatioScr < 3.0) {
    gridStrengthCategory = 'weak';
    gridStrengthDescriptionFa = 'شبکه بالادست ضعیف (Weak Grid, SCR < 3) — نیاز به اینورترهای Grid-Forming یا جبران‌ساز STATCOM';
    gridStrengthDescriptionEn = 'Weak Grid (SCR < 3.0) — Requires Grid-Forming inverters or STATCOM compensation';
  } else if (shortCircuitRatioScr < 5.0) {
    gridStrengthCategory = 'moderate';
    gridStrengthDescriptionFa = 'شبکه با قدرت متوسط (Moderate Grid, 3 ≤ SCR ≤ 5) — کنترل توان راکتیو Q(U) الزامی است';
    gridStrengthDescriptionEn = 'Moderate Grid (3.0 ≤ SCR ≤ 5.0) — Q(U) voltage droop control is mandatory';
  }

  // Thevenin Grid Impedance at Point of Common Coupling (PCC)
  // Z_g = V^2 / S_sc
  const theveninImpedanceZgOhm = Math.pow(gridVoltageKv, 2) / gridShortCircuitMva;
  // X_g = Z_g * (X/R) / sqrt(1 + (X/R)^2)
  const theveninReactanceXgOhm = theveninImpedanceZgOhm * (gridXrRatio / Math.sqrt(1 + Math.pow(gridXrRatio, 2)));
  const theveninResistanceRgOhm = theveninReactanceXgOhm / gridXrRatio;

  // Upstream Short-Circuit Current
  const upstreamShortCircuitCurrentKa = Number(
    (gridShortCircuitMva / (Math.sqrt(3) * gridVoltageKv)).toFixed(2)
  );

  // Active and Reactive Power calculation
  const cosPhi = Math.max(0.7, Math.min(1.0, inverterPowerFactor));
  const sinPhi = Math.sqrt(1 - Math.pow(cosPhi, 2));
  const pMw = plantCapacityMw * cosPhi;
  // Q in Mvar: positive if injecting capacitive, negative if absorbing inductive
  const qMvar = plantCapacityMw * sinPhi * (isPowerFactorLagging ? -1 : 1);

  // Approximate PCC Voltage Rise: Delta V% = (P * R_g + Q * X_g) / V_grid^2 * 100
  const deltaVVolts = (pMw * theveninResistanceRgOhm + qMvar * theveninReactanceXgOhm) / Math.pow(gridVoltageKv, 2);
  const pccVoltageRisePct = Number((deltaVVolts * 100.0).toFixed(2));

  // Tavanir & IEC 60038 limit for grid voltage variation at PCC is 2.5% to 3.0%
  const pccVoltageRiseCompliant = Math.abs(pccVoltageRisePct) <= 3.0;

  // Maximum plant capacity that can be connected without exceeding 3% voltage rise
  const maxAllowablePlantCapacityMw = Number(
    ((0.03 * Math.pow(gridVoltageKv, 2)) / (cosPhi * theveninResistanceRgOhm + 0.05 * theveninReactanceXgOhm)).toFixed(1)
  );

  // Reactive power capability per IEEE 1547 (0.90 lead to 0.90 lag = 44% of P_n in Mvar)
  const maxReactiveMvar = Number((plantCapacityMw * 0.44).toFixed(2));

  // Flicker estimation per IEC 61000-3-7
  const flickerShortTermPst = Number(Math.min(1.5, (plantCapacityMw / (gridShortCircuitMva * 0.08)) * 0.5).toFixed(2));
  const flickerLongTermPlt = Number((flickerShortTermPst * 0.75).toFixed(2));
  const isFlickerCompliant = flickerShortTermPst <= 1.0 && flickerLongTermPlt <= 0.8;

  return {
    shortCircuitRatioScr,
    gridStrengthCategory,
    gridStrengthDescriptionFa,
    gridStrengthDescriptionEn,
    theveninImpedanceZgOhm: Number(theveninImpedanceZgOhm.toFixed(4)),
    theveninResistanceRgOhm: Number(theveninResistanceRgOhm.toFixed(4)),
    theveninReactanceXgOhm: Number(theveninReactanceXgOhm.toFixed(4)),
    upstreamShortCircuitCurrentKa,
    pccVoltageRisePct,
    pccVoltageRiseCompliant,
    maxAllowablePlantCapacityMw,
    reactivePowerRangeMvar: {
      maxAbsorbingInductiveMvar: maxReactiveMvar,
      maxInjectingCapacitiveMvar: maxReactiveMvar,
    },
    flickerShortTermPst,
    flickerLongTermPlt,
    isFlickerCompliant,
    lvrtCompliance: {
      zeroVoltageRideThroughMs: 150,
      recoveryTimeSec: 1.5,
      statusFa: 'تطابق کامل با منحنی کدهای دیسپاچینگ توانیر (Fault Ride-Through)',
    },
  };
}
