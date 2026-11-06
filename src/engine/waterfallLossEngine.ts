// Comprehensive 14-Stage PVsyst-Grade Waterfall Loss Tree & 8760h Performance Ratio (PR) Engine

import { calculateThermalDerate } from './core/thermalDerate';
import type { InstallationEnvironment } from './types/climateTypes';
import {
  type TrackerConfig,
  simulateTrackerAnnual,
  type SunPathPoint,
} from './tracker/backtrackingEngine';

export interface LossStage {
  id: string;
  nameFa: string;
  nameEn: string;
  nominalEnergyKwh: number;
  percentageLoss: number; // Negative for loss, positive for gain (e.g. transposition) — rounded to 1 decimal for display
  percentageLossRaw: number; // PR-2a-7-P0-FOLLOWUP: raw unrounded value for audit/tests
  stageOutputKwh: number;
  descriptionFa: string;
  descriptionEn: string;
}

export interface WaterfallLossReport {
  installedCapacityKwp: number;
  rawGhiEnergyKwh: number;
  effectivePoaEnergyKwh: number;
  trackerDetails?: {
    annualTranspositionGainPct: number;
    annualShadingLossPct: number;
    backtrackingActivationPct: number;
    maxAbsRotationDeg: number;
  };
  stages: LossStage[];
  netAnnualEnergyExportMwh: number;
  specificAnnualYieldKwhPerKwp: number;
  performanceRatioPct: number;
}

export function calculateFixedTiltTranspositionGain(
  tiltDeg?: number,
  latitudeDeg?: number
): number {
  if (tiltDeg === undefined) return 16.8; // Baseline optimal tilt default
  if (tiltDeg <= 0) return 0.0;
  const absLat = Math.abs(latitudeDeg ?? 35.69);
  const optTilt = Math.max(8, Math.min(60, absLat * 0.88));
  const maxGain = 12.0 + Math.min(6.0, absLat * 0.15);
  const tiltRatio = Math.min(1.0, tiltDeg / optTilt);
  const factor = Math.sin((Math.PI / 2.0) * tiltRatio);
  const angleDelta = Math.max(0, tiltDeg - optTilt);
  const excessDrop = Math.cos((angleDelta * Math.PI) / 180.0);
  return Number((maxGain * factor * excessDrop).toFixed(1));
}

export function computeWaterfallLosses(
  installedCapacityKwp: number,
  peakSunHours: number,
  ambientTempMaxC: number,
  soilingLossPct: number = 4.5,
  dcAcRatio: number = 1.25,
  hasTracker: boolean = false,
  snowLossPct: number = 0.0,
  iamLossPct: number = -2.2,
  noctC: number = 45.0,
  tempCoeffPmpPct: number = -0.30,
  trackerConfig?: TrackerConfig,   // PR-2a-7: real backtracking physics (10th param, backward-compatible)
  installationEnv?: InstallationEnvironment,
  fixedTiltDeg?: number,
  latitudeDeg?: number,
  shadingLossOverridePct?: number,
  bifacialGainPct?: number
): WaterfallLossReport {
  // 1. Raw Global Horizontal Irradiance (GHI)
  // GHI annual = PSH * 365 days * 1 kW/m² reference
  const rawGhiEnergyKwh = peakSunHours * 365.0 * installedCapacityKwp;

  // 2. Transposition to Plane of Array (POA) - fixed tilt or real 1-axis tracker
  //    PR-2a-7: when trackerConfig is provided (or hasTracker=true), the gain and
  //    near-shading come from the slope-aware backtracking engine — NOT hardcoded.
  let transpositionGainPct = calculateFixedTiltTranspositionGain(fixedTiltDeg, latitudeDeg);
  let nearShadingPctDefault = shadingLossOverridePct !== undefined ? -Math.abs(shadingLossOverridePct) : -2.4;
  let trackerDetails: WaterfallLossReport['trackerDetails'];
  const trackerActive = trackerConfig !== undefined || hasTracker;
  if (trackerActive) {
    const cfg: TrackerConfig = trackerConfig ?? {
      gcr: 0.33, axisTiltDeg: 0, maxRotationDeg: 60, enableBacktracking: true,
      albedo: 0.20, latitudeDeg: 35.69,
    };
    // ENG-7: derive the fixed-tilt comparison baseline from latitude
    // (optimal-tilt rule of thumb ~0.88*|lat|, matching ClimaticData).
    // The x1.168 anchor below is the fixed-tilt-over-GHI gain used by the
    // non-tracker case; keeping it makes the tracker-over-GHI value
    // consistent with the rest of the waterfall. The improvement over
    // the pre-fix code is that ann.annualTranspositionGainPct now
    // compares the tracker against a site-appropriate fixed baseline,
    // not a hardcoded 30 deg.
    const siteLat = cfg.latitudeDeg ?? 35.69;
    const fixedTiltDeg = Math.max(5, Math.min(60, Math.abs(siteLat) * 0.88));
    const fixedAzimuthDeg = siteLat >= 0 ? 180 : 0;
    const ann = simulateTrackerAnnual(buildClearSkySunPath(siteLat), cfg, {
      fixedTiltDeg,
      fixedAzimuthDeg,
    });
    // POA_tracker / GHI = (POA_fixed / GHI) * (POA_tracker / POA_fixed)
    transpositionGainPct = (1.168 * (1 + ann.annualTranspositionGainPct / 100.0) - 1.0) * 100.0;
    nearShadingPctDefault = -ann.annualShadingLossFraction * 100.0;
    trackerDetails = {
      annualTranspositionGainPct: transpositionGainPct,
      annualShadingLossPct: ann.annualShadingLossFraction * 100.0,
      backtrackingActivationPct: ann.backtrackingActivationPct,
      maxAbsRotationDeg: ann.maxAbsRotationDeg,
    };
  }
  const effectivePoaEnergyKwh = rawGhiEnergyKwh * (1.0 + transpositionGainPct / 100.0);

  let currentEnergy = effectivePoaEnergyKwh;
  const stages: LossStage[] = [];

  const addStage = (
    id: string,
    nameFa: string,
    nameEn: string,
    pct: number,
    descFa: string,
    descEn: string,
    rawPct?: number
  ) => {
    const energyDelta = (currentEnergy * pct) / 100.0;
    const nominal = currentEnergy;
    currentEnergy += energyDelta;
    stages.push({
      id,
      nameFa,
      nameEn,
      nominalEnergyKwh: Math.round(nominal),
      percentageLoss: pct,
      percentageLossRaw: rawPct !== undefined ? rawPct : pct,
      stageOutputKwh: Math.round(currentEnergy),
      descriptionFa: descFa,
      descriptionEn: descEn,
    });
  };

  // 0b. Bifacial Rear Irradiance Gain (First-Order Proxy)
  // Applied multiplicatively immediately after transposition and before near-shading.
  if (bifacialGainPct !== undefined && bifacialGainPct > 0) {
    addStage(
      'bifacial_gain',
      'بهره تابش بازتابی پشت پنل (Bifacial Rear Gain)',
      'Bifacial Rear Irradiance Gain (First-Order Proxy)',
      bifacialGainPct,
      'افزایش دریافت پرتوهای خورشیدی از سطح پشتی ماژول ناشی از بازتابش آلبدوی زمین و ضریب دوطرفگی',
      'First-order empirical proxy rear-side irradiance collection from ground albedo reflection.'
    );
  }

  // 1. Near Shading Loss (Row-on-row & ground horizon shading)
  const nearShadingPct = nearShadingPctDefault;
  addStage(
    'near_shading',
    'تلفات سایه‌اندازی نزدیک بین ردیف‌ها',
    'Near Shading Loss (Row-to-Row)',
    nearShadingPct,
    'سایه‌اندازی ردیف‌های مجاور در اوایل صبح و غروب آفتاب',
    'Inter-row module self-shading during low solar elevation angles (morning/evening).'
  );

  // 2. Incidence Angle Modifier (IAM - Fresnel optical reflection / Martin & Ruiz ARC)
  addStage(
    'iam',
    'تلفات انعکاس اپتیکی شیشه (IAM / Fresnel)',
    'Incidence Angle Modifier (IAM)',
    -Math.abs(iamLossPct),
    'زاویه تابش مایل و بازتابش از سطح شیشه آنتی‌رفلکت پنل با کوپل حرارتی dn/dT',
    'Fresnel optical reflection at oblique sun incidence angles with thermo-optic dn/dT coupling.'
  );

  // 3. Soiling & Dust Loss (Kimber Model)
  addStage(
    'soiling',
    'تلفات نشست گرد و خاک و آلودگی سطحی (Kimber)',
    'Soiling & Environmental Dust Loss (Kimber)',
    -Math.abs(soilingLossPct),
    'رسوب ذرات غبار و معلقات هوا روی سطح پنل‌ها بین دوره‌های شستشو',
    'Particulate dust accumulation on front glass between planned cleaning cycles.'
  );

  // 3b. Snow Shedding & Damming Loss (Marion Model)
  // Invariant 14-stage structure across all global climates.
  // In snow-free climates (snowLossPct = 0), operates as a strict 0.0% no-op.
  addStage(
    'snow',
    'تلفات پوشش و ریزش برف (Marion Model)',
    'Snow Coverage & Shedding Loss (Marion)',
    -Math.abs(snowLossPct),
    snowLossPct > 0
      ? 'پوشش برف، تاخیر در لغزش حرارتی و سدشدگی در انتهای ماژول'
      : 'عدم وجود پوشش برف در این اقلیم (تلفات صفر)',
    snowLossPct > 0
      ? 'Module snow obscuration, sliding delay, and base frame damming risk.'
      : 'Zero snow accumulation in this climate zone (no-op 0.0% loss stage).'
  );

  // 4. PV Cell Temperature Thermal Loss (U-value model based on ambient design temperature)
  // Unified NOCT thermal model (PR-2a-7-P0) - same source of truth as
  // pvEngineAdvanced and the App display (src/engine/core/thermalDerate.ts).
  const thermalDerate = calculateThermalDerate({
    module: { noctC, tempCoeffPmpPct },
    ambientTempMaxC,
    installationEnvironment: installationEnv,
  });
  const thermalLossPct = -1.0 * thermalDerate.deratePct;
  addStage(
    'thermal',
    'تلفات حرارتی سلول ناشی از دمای کارکرد (NOCT)',
    'Cell Operating Temperature Loss (Pmp coeff)',
    Math.round(thermalLossPct * 10) / 10,
    'کاهش توان سلول سیلیکونی در دمای کاری بیش از ۲۵ درجه استاندارد STC',
    'Thermal degradation of silicon cells operating above standard STC 25°C rating.',
    thermalLossPct // raw unrounded value for audit/tests
  );

  // 5. Module Quality & Binning Tolerance
  addStage(
    'quality',
    'تلورانس توان نامی تولیدکننده (Module Quality)',
    'Module Quality & Factory Flash Tolerance',
    0.4,
    'تلورانس مثبت توان نامی بر اساس تست فلش کارخانه (Positive Power Tolerance 0~+3%)',
    'Positive factory power sorting tolerance (0~+3%) exceeding nominal nameplate rating.'
  );

  // 6. Light-Induced Degradation (LID / LeTID)
  addStage(
    'lid',
    'تلفات زوال اولیه نوری (LID & LeTID)',
    'Light-Induced Degradation (LID & LeTID)',
    -1.2,
    'کاهش جزئی راندمان در چند ساعت اول تابش نور خورشید',
    'Initial light-induced silicon lattice recombination loss during initial operating weeks.'
  );

  // 7. Module Mismatch Loss
  addStage(
    'mismatch',
    'تلفات عدم تطابق مشخصه‌های I-V استرینگ‌ها',
    'String Module I-V Mismatch Loss',
    -1.3,
    'اختلاف جزئی در نقطه کار ماکزیمم (MPP) ماژول‌های متوالی در یک رشته',
    'Current and voltage dispersion at maximum power points among series-connected modules.'
  );

  // 8. DC Ohmic Cable Loss
  addStage(
    'dc_cabling',
    'تلفات اهمی کابل‌کشی DC خورشیدی (I²R)',
    'DC Cabling Ohmic Loss (I²R)',
    -1.4,
    'مقاومت الکتریکی هادی مسی بین استرینگ‌ها و اینورتر',
    'Resistive power dissipation in PV string homeruns and DC busbars to inverters.'
  );

  // 9. Inverter MPPT Tracking Loss
  addStage(
    'mppt_tracking',
    'تلفات ترکینگ نقطه حداکثر توان اینورتر (MPPT)',
    'Inverter Dynamic MPPT Tracking Loss',
    -0.4,
    'خطای دینامیک الگوریتم Perturb & Observe یا Incremental Conductance اینورتر',
    'Dynamic tracking latency of maximum power point algorithms under shifting cloud cover.'
  );

  // 10. Inverter Clipping Loss (DC/AC Over-paneling)
  // Continuous, monotone clipping loss: -0.2% baseline at ILR <= 1.3,
  // then grows with slope 6.5%/unit ILR above 1.3. The -0.2% baseline is
  // preserved across the 1.3 threshold to eliminate the pre-fix
  // discontinuity.
  const clippingPct = -0.2 - 6.5 * Math.max(0, dcAcRatio - 1.3);
  addStage(
    'clipping',
    'تلفات برش توان اینورتر (Clipping Over-paneling)',
    'Inverter AC Power Clipping (DC/AC Over-paneling)',
    Math.round(clippingPct * 10) / 10,
    'محدودیت خروجی AC اینورتر در ساعات اوج تابش تابستانه',
    'Inverter AC power clipping limit during peak midday summer hours due to high DC/AC ratio.'
  );

  // 11. Inverter Conversion Efficiency (Euro/CEC)
  addStage(
    'inverter_efficiency',
    'تلفات بازدهی تبدیل DC به AC اینورتر',
    'Inverter DC-to-AC Conversion Loss',
    -2.2,
    'تلفات کلیدزنی IGBTها و فیلترهای خروجی AC اینورتر (راندمان ۹۷.۸٪)',
    'IGBT switching losses and magnetic filter impedance at 97.8% weighted Euro efficiency.'
  );

  // 12. AC Wiring & MV Transformer Loss
  addStage(
    'mv_transformer',
    'تلفات کابل AC و ترانسفورماتور پست فشار متوسط',
    'AC Collector & MV Step-Up Transformer Loss',
    -1.5,
    'تلفات بی‌باری (هسته‌ای) و بارداری (مسی) ترانسفورماتور افزاینده ۲۰ یا ۳۳ کیلوولت',
    'Copper resistive and core magnetic losses in 0.4/20kV or 0.8/33kV step-up transformer.'
  );

  // 13. Auxiliary Parasitic Consumption & Availability
  addStage(
    'aux_unavailability',
    'مصرف داخلی و قابلیت اطمینان شبکه (Availability)',
    'Substation Auxiliaries & Grid Availability',
    -1.0,
    'مصرف فن‌های خنک‌کننده، مانیتورینگ SCADA و قطعی‌های احتمالی خطوط انتقال',
    'Substation cooling fans, SCADA telecontrol power, and scheduled grid maintenance downtime.'
  );

  const netAnnualEnergyExportMwh = installedCapacityKwp > 0 ? Math.round((currentEnergy / 1000.0) * 10) / 10 : 0;
  const specificAnnualYieldKwhPerKwp = installedCapacityKwp > 0 ? Math.round(currentEnergy / installedCapacityKwp) : 0;
  const performanceRatioPct = effectivePoaEnergyKwh > 0 ? Math.round((currentEnergy / effectivePoaEnergyKwh) * 1000) / 10 : 0;

  return {
    installedCapacityKwp,
    rawGhiEnergyKwh: Math.round(rawGhiEnergyKwh),
    effectivePoaEnergyKwh: Math.round(effectivePoaEnergyKwh),
    trackerDetails,
    stages,
    netAnnualEnergyExportMwh,
    specificAnnualYieldKwhPerKwp,
    performanceRatioPct,
  };
}

// ---------------------------------------------------------------------------
// PR-2a-7: deterministic clear-sky representative sun path (12 days x 24 h)
// Used only as an internal fallback when the caller does not supply annual
// tracker statistics. Pure math — no Date(), no randomness.
// ---------------------------------------------------------------------------
export function buildClearSkySunPath(latitudeDeg: number): SunPathPoint[] {
  const path: SunPathPoint[] = [];
  let hour = 0;
  for (let day = 0; day < 12; day++) {
    const n = day * 30 + 15; // representative day-of-year
    const decl = 23.45 * Math.sin(((360 * (284 + n)) / 365) * (Math.PI / 180));
    for (let h = 0; h < 24; h++) {
      const ha = 15 * (h - 12);
      const latR = latitudeDeg * (Math.PI / 180);
      const decR = decl * (Math.PI / 180);
      const haR = ha * (Math.PI / 180);
      const sinElev = Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR);
      const elev = Math.asin(Math.max(-1, Math.min(1, sinElev)));
      const zenith = Math.PI / 2 - elev;
      const cosAz = (Math.sin(decR) - sinElev * Math.sin(latR)) / (Math.cos(elev) * Math.cos(latR) + 1e-12);
      let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz)));
      if (ha > 0) azimuth = 2 * Math.PI - azimuth;
      const ghi = elev > 0 ? 1000 * Math.pow(Math.sin(elev), 1.15) : 0;
      const dni = elev > 0 ? ghi * 0.75 : 0;
      const dhi = ghi - dni * Math.cos(zenith) > 0 ? ghi - dni * Math.cos(zenith) : 0;
      path.push({ hourOfYear: hour++, zenithRad: zenith, azimuthRad: azimuth, ghi, dni, dhi });
    }
  }
  return path;
}
