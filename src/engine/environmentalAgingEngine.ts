// Environmental Temperature, Dust & Equipment Lifespan / Aging Engine
// Models the differentiated impact of environmental ambient conditions
// (ambient temperature, mounting ventilation, dust/soiling accumulation)
// on the efficiency, degradation, and operational lifespan of:
// - PV Modules (always exposed on roof/ground)
// - Inverters:
//     * In 'ground_mount' (open outdoor environment): inverter is exposed to outdoor
//       ambient temperature, direct solar radiation heating, and sand/dust ingress.
//     * In 'industrial_shed' & 'rooftop_flat_concrete': inverters are installed INDOORS
//       (in electrical switchboard room / factory interior / sheltered enclosure),
//       so environmental temperature/dust degradation is calculated ONLY for PV modules.

import type { InstallationEnvironment } from './types/climateTypes';

export interface EnvironmentalAgingInput {
  installationEnvironment: InstallationEnvironment;
  ambientTempMaxC: number;
  ambientTempMinC?: number;
  elevationM: number;
  moduleNoctC?: number;             // Default 45°C
  moduleTempCoeffPmpPct?: number;   // Default -0.30%/°C
  inverterPnomAcKw?: number;
  pvTechnology?: 'topcon' | 'perc' | 'hjt';
  dustDepositionRatePctPerDay?: number; // e.g. 0.20%/day in arid zones
  siteTiltDeg?: number;
}

export interface PvEnvironmentalImpact {
  mountingThermalOffsetDeltaTC: number; // e.g. 0°C ground, +14°C shed roof, +6.5°C flat concrete
  effectiveOperatingCellTempHotC: number;
  thermalPowerLossPct: number;
  annualDegradationPct: number;        // e.g. 0.45% ground, 0.70% shed roof, 0.58% rooftop
  twentyFiveYearCapacityRetentionPct: number; // e.g. 89.3% ground, 83.9% shed roof
  expectedUsefulLifespanYears: number; // useful life until 80% capacity retention
  soilingLossAnnualPct: number;        // adjusted for tilt & roof industrial soot
  soilingWashOffEfficiencyPct: number; // lower at flat roof slopes
  environmentalRiskSummaryFa: string;
  environmentalRiskSummaryEn: string;
}

export interface InverterEnvironmentalImpact {
  isInstalledIndoors: boolean;
  effectiveAmbientTempC: number;       // outdoor or indoor sheltered
  directSolarRadiationHeatingDeltaTC: number; // 0°C indoor, +5°C outdoor
  dustHeatsinkFoulingFactorPct: number; // 0% indoor, 15-25% outdoor
  thermalDeratePct: number;            // IEC 62109-1 derate above 45°C
  elevationDeratePct: number;          // 1%/100m above 2000m
  totalInverterDeratePct: number;
  internalComponentTempEstC: number;   // internal DC capacitor operating temperature
  expectedInverterLifespanYears: number; // Arrhenius capacitor life model
  recommendedReplacementYear: number | null; // e.g. Year 10 for outdoor harsh desert, null if indoor
  inverterStatusSummaryFa: string;
  inverterStatusSummaryEn: string;
}

export interface EnvironmentalAgingResult {
  environment: InstallationEnvironment;
  pvImpact: PvEnvironmentalImpact;
  inverterImpact: InverterEnvironmentalImpact;
  combinedLifetimeEnergyPenaltyPct: number;
  mitigationRecommendationsFa: string[];
  mitigationRecommendationsEn: string[];
}

/**
 * Calculates environmental temperature, dust, efficiency and aging parameters
 * for PV modules and inverters according to mounting environment.
 */
export function calculateEnvironmentalAging(input: EnvironmentalAgingInput): EnvironmentalAgingResult {
  const env = input.installationEnvironment || 'ground_mount';
  const tAmbMax = input.ambientTempMaxC;
  const noct = input.moduleNoctC ?? 45.0;
  const gammaPmp = Math.abs(input.moduleTempCoeffPmpPct ?? 0.30);
  const elevation = input.elevationM || 0;
  const tilt = input.siteTiltDeg ?? (env === 'industrial_shed' ? 10 : env === 'rooftop_flat_concrete' ? 12 : 25);
  const baseDeposition = input.dustDepositionRatePctPerDay ?? 0.20;

  // -------------------------------------------------------------
  // 1. PV MODULE CALCULATIONS
  // -------------------------------------------------------------
  // Mounting ventilation factor Delta-T per King / Faiman / IEC 61853
  // Ground Mount: Open rack, free rear convection -> Delta-T = 0.0°C
  // Industrial Shed: Flush/close trapezoidal sheet -> trapped air layer -> Delta-T = +14.0°C
  // Rooftop Flat: Ballasted/short legs on concrete -> concrete re-radiation -> Delta-T = +6.5°C
  let mountingDeltaT = 0.0;
  let baseDegradationPct = 0.45; // N-type TOPCon base rate at standard operating temp
  let industrialDustMultiplier = 1.0;
  let washOffEfficiency = 85.0; // % rain cleaning effectiveness

  if (env === 'industrial_shed') {
    mountingDeltaT = 14.0;
    baseDegradationPct = 0.70; // Accelerated thermal aging of EVA/solder ribbons under trapped roof heat
    industrialDustMultiplier = 1.45; // Factory particulate, boiler soot, exhaust fumes
    washOffEfficiency = tilt < 15 ? 65.0 : 75.0; // Poor rain self-cleaning on low sloped roofs
  } else if (env === 'rooftop_flat_concrete') {
    mountingDeltaT = 6.5;
    baseDegradationPct = 0.58; // Moderate thermal aging above hot concrete slab
    industrialDustMultiplier = 1.20; // Urban rooftop dust
    washOffEfficiency = tilt < 15 ? 70.0 : 80.0;
  } else {
    // ground_mount
    mountingDeltaT = 0.0;
    baseDegradationPct = 0.45;
    industrialDustMultiplier = 1.0;
    washOffEfficiency = 90.0;
  }

  // Operating cell temperature at peak noon (G = 1000 W/m²):
  // T_cell = T_amb + Delta_T_mount + (NOCT - 20) * (1000 / 800)
  const cellTempHotC = Number((tAmbMax + mountingDeltaT + (noct - 20.0) * (1000.0 / 800.0)).toFixed(1));
  const deltaTFromStc = Math.max(0, cellTempHotC - 25.0);
  const pvThermalLossPct = Number((gammaPmp * deltaTFromStc).toFixed(2));

  // 25-Year capacity retention & useful life:
  // Capacity(25y) = (1 - baseDegradationPct / 100)^25
  const retention25y = Number((Math.pow(1.0 - baseDegradationPct / 100.0, 25) * 100.0).toFixed(1));
  // Lifespan until 80% remaining capacity:
  // 0.80 = (1 - D)^N => N = ln(0.80) / ln(1 - D)
  const usefulLifespanYears = Math.min(35, Math.round(Math.log(0.80) / Math.log(1.0 - baseDegradationPct / 100.0)));

  // Annual Soiling Loss Estimation
  // Kimber model base annual loss (~4.0% in Iran) scaled by dust rate & wash-off
  const baseSoilingAnnual = 4.2;
  const pvSoilingLossAnnualPct = Number(
    (baseSoilingAnnual * industrialDustMultiplier * (100.0 / washOffEfficiency) * (20.0 / Math.max(10, tilt))).toFixed(2)
  );

  let pvRiskSummaryFa = '';
  let pvRiskSummaryEn = '';
  if (env === 'industrial_shed') {
    pvRiskSummaryFa = `دمای سلول تا ${cellTempHotC}°C افزایش می‌یابد (+۱۴°C ناشی از حبس حرارتی ورق سقف). نرخ افت راندمان حرارتی ${pvThermalLossPct}٪ و نرخ استهلاک سالانه به ${baseDegradationPct}٪ افزایش یافته و بازده ۲۵ ساله به ${retention25y}٪ می‌رسد.`;
    pvRiskSummaryEn = `Cell operating temp reaches ${cellTempHotC}°C (+14°C roof heat trap). Instant thermal power loss is ${pvThermalLossPct}%, annual degradation accelerates to ${baseDegradationPct}%/yr, with 25-year retention at ${retention25y}%.`;
  } else if (env === 'rooftop_flat_concrete') {
    pvRiskSummaryFa = `دمای سلول تا ${cellTempHotC}°C افزایش می‌یابد (+۶.۵°C بازتاب حرارتی دال بتنی). افت حرارتی ${pvThermalLossPct}٪ و نرخ استهلاک سالانه ${baseDegradationPct}٪ با ماندگاری ۲۵ ساله ${retention25y}٪.`;
    pvRiskSummaryEn = `Cell operating temp reaches ${cellTempHotC}°C (+6.5°C concrete albedo re-radiation). Thermal loss is ${pvThermalLossPct}%, degradation is ${baseDegradationPct}%/yr, and 25-year retention is ${retention25y}%.`;
  } else {
    pvRiskSummaryFa = `تهویه آزاد پشت ماژول در استراکچر زمینی؛ دمای حداکثر سلول ${cellTempHotC}°C، افت حرارتی ${pvThermalLossPct}٪، استهلاک استاندارد ${baseDegradationPct}٪ در سال و طول عمر مفید ${usefulLifespanYears} سال.`;
    pvRiskSummaryEn = `Free rear convection on ground mount; peak cell temp is ${cellTempHotC}°C, thermal loss is ${pvThermalLossPct}%, nominal degradation is ${baseDegradationPct}%/yr, and useful life reaches ${usefulLifespanYears} years.`;
  }

  // -------------------------------------------------------------
  // 2. INVERTER CALCULATIONS (Ground Mount = Outdoors vs Shed/Rooftop = Indoors)
  // -------------------------------------------------------------
  const isInstalledIndoors = env !== 'ground_mount';
  let effInverterAmbTemp = tAmbMax;
  let solarRadiationHeatingDelta = 0.0;
  let heatsinkFoulingPct = 0.0;
  let inverterThermalDerate = 0.0;
  let inverterLifespan = 15; // standard base design life
  let recommendedReplacementYear: number | null = null;
  let invStatusSummaryFa = '';
  let invStatusSummaryEn = '';

  if (isInstalledIndoors) {
    // Rooftop or Industrial Shed: Inverters are installed inside the electrical room / factory
    // Protected from harsh outdoor weather, rooftop radiant heat, and outdoor dust storms
    effInverterAmbTemp = Math.min(30.0, Math.max(22.0, tAmbMax - 12.0)); // Indoor conditioned or sheltered ambient ~25-30°C
    solarRadiationHeatingDelta = 0.0; // Shaded indoors
    heatsinkFoulingPct = 0.0; // Clean indoor filtered air
    inverterThermalDerate = 0.0; // No thermal derating (T_amb <= 40°C)
    inverterLifespan = 18; // Full 15-20 year design life preserved indoors
    recommendedReplacementYear = null; // No premature replacement required

    invStatusSummaryFa =
      'اینورترها در فضای داخلی و سرپوشیده سوله/ساختمان (اتاق برق محافظت‌شده) مستقر هستند؛ بدون افت حرارتی (۰٪) و بدون آسیب گرد و غبار. طول عمر کامل ۱۸ ساله حفظ می‌شود و نیازی به تعویض زودهنگام در دوره طرح نیست.';
    invStatusSummaryEn =
      'Inverters are installed indoors in sheltered switchroom/shed interior; zero thermal derating (0%) and no dust fouling. Full 18-year design life is preserved without premature replacement.';
  } else {
    // Ground Mount: Outdoor Inverters (String inverters on posts or central station in open desert)
    // Directly exposed to summer peak ambient, direct solar enclosure heating, and sand/dust
    solarRadiationHeatingDelta = 5.0; // Direct sun on enclosure adds ~5°C
    heatsinkFoulingPct = 20.0; // Dust accumulation on heatsinks/fans reduces heat dissipation by 20%
    const effectiveHeatsinkAmb = tAmbMax + solarRadiationHeatingDelta + (heatsinkFoulingPct > 0 ? 3.0 : 0.0);

    // Thermal derating per IEC 62109-1 above 45°C
    inverterThermalDerate = Math.max(0, (effectiveHeatsinkAmb - 45.0) * 1.5);

    // Inverter internal capacitor & IGBT temperature (Arrhenius lifetime equation):
    // L = L0 * 2^((T0 - T) / 10)
    // Base L0 = 15 years at internal capacitor temp 55°C
    const internalCapTemp = tAmbMax + 20.0 + (heatsinkFoulingPct > 0 ? 6.0 : 0.0);
    const lifeRatio = Math.pow(2.0, (55.0 - internalCapTemp) / 10.0);
    inverterLifespan = Math.max(8, Math.min(15, Math.round(15.0 * lifeRatio)));

    if (inverterLifespan <= 11) {
      recommendedReplacementYear = Math.max(9, inverterLifespan);
    } else {
      recommendedReplacementYear = 12;
    }

    invStatusSummaryFa = `اینورترها در فضای باز محوطه نیروگاه مستقر هستند؛ در معرض دمای ${tAmbMax}°C، تابش مستقیم خورشید بر بدنه (+۵°C) و گرد و غبار. افت حرارتی لحظه‌ای ${inverterThermalDerate.toFixed(1)}٪ و کاهش طول عمر به ${inverterLifespan} سال به دلیل استهلاک خازن‌های الکترولیتی؛ تعویض/اورهال در سال ${recommendedReplacementYear} الزامی است.`;
    invStatusSummaryEn = `Inverters are outdoors in open field; exposed to ${tAmbMax}°C, direct solar enclosure heat (+5°C), and sand fouling. Thermal derate is ${inverterThermalDerate.toFixed(1)}% and lifespan drops to ${inverterLifespan} years due to capacitor thermal aging; overhaul required in Year ${recommendedReplacementYear}.`;
  }

  // Elevation derating (IEC 62109-1: 1% per 100m above 2000m)
  const altitudeDeratePct = Math.max(0, ((elevation - 2000) / 100.0) * 1.0);
  const totalInverterDeratePct = Number((100 - (100 - inverterThermalDerate) * (1 - altitudeDeratePct / 100)).toFixed(1));

  // Combined lifetime energy penalty (PV thermal + PV soiling + Inverter derate)
  const combinedLifetimeEnergyPenaltyPct = Number(
    (pvThermalLossPct * 0.45 + pvSoilingLossAnnualPct + totalInverterDeratePct * 0.35).toFixed(1)
  );

  // Practical Mitigation Recommendations
  const mitigationRecommendationsFa: string[] = [];
  const mitigationRecommendationsEn: string[] = [];

  if (env === 'industrial_shed') {
    mitigationRecommendationsFa.push(
      'تعبیه حداقل ۱۰ سانتی‌متر فاصله هوایی (Air Gap) بین زیر ماژول‌ها و ورق سوله جهت ایجاد جریان طبیعی همرفت هوا و کاهش دمای سلول تا ۶ الی ۸ درجه سانتی‌گر.',
      'افزایش دفعات شست‌وشوی پنل‌ها به ۲ بار در ماه به دلیل شیب ملایم سوله و تجمع دوده و ذرات کارگاهی.',
      'بهره‌مندی از نصب اینورتر در داخل سوله یا اتاق تأسیسات برای حفظ خنک‌کاری و افزایش طول عمر تا ۱۸ سال.'
    );
    mitigationRecommendationsEn.push(
      'Maintain at least 10cm ventilated air gap beneath modules to facilitate convective cooling and reduce cell temp by 6-8°C.',
      'Increase cleaning frequency to twice monthly due to low roof pitch and industrial particulate deposition.',
      'Install inverters indoors in electrical utility room to guarantee full 18-year lifespan.'
    );
  } else if (env === 'rooftop_flat_concrete') {
    mitigationRecommendationsFa.push(
      'استفاده از رنگ یا عایق پلیمری سفید بازتابنده (High Albedo / Cool Roof) روی دال بتنی جهت کاهش تابش گرمایی به پشت پنل‌ها.',
      'تنظیم زاویه شیب حداقل ۱۲ الی ۱۵ درجه روی پایه‌ها جهت تسهیل شست‌وشوی طبیعی پنل‌ها با آب باران.',
      'استقرار اینورترها در اتاق تأسیسات پشت‌بام (خرپشته) یا زیر سایبان دارای تهویه مناسب.'
    );
    mitigationRecommendationsEn.push(
      'Apply high-albedo white reflective coating on concrete roof slab to reduce thermal re-radiation into module backsheets.',
      'Set tilt to at least 12-15° to facilitate natural gravity rainwater self-cleaning.',
      'Locate inverters inside rooftop penthouse room or beneath well-ventilated weather canopies.'
    );
  } else {
    mitigationRecommendationsFa.push(
      'نصب سایبان خورشیدی محافظ (Sun Shade Canopy) روی محفظه اینورترهای رشته‌ای در مزرعه خورشیدی جهت حذف ۵ درجه اضافه حرارت ناشی از تابش مستقیم خورشید.',
      'سرویس فصلی و بادگیری فیلترهای هوای ورودی فن‌ها و هیت‌سینک اینورتر جهت حفظ راندمان انتقال حرارت در مناطق کویری.',
      'پیش‌بینی بودجه اورهال/تعویض خازن‌های لینک DC اینورتر در سال دهم الی دوازدهم در مدل مالی پروژه.'
    );
    mitigationRecommendationsEn.push(
      'Install solar protective sunshades over outdoor string inverters to eliminate +5°C direct radiative heating.',
      'Quarterly dust blow-down of inverter heatsink fins and fan intake filters to preserve thermal dissipation in desert sites.',
      'Budget for inverter overhaul/DC capacitor bank replacement in Years 10-12 within the project financial pro-forma.'
    );
  }

  return {
    environment: env,
    pvImpact: {
      mountingThermalOffsetDeltaTC: mountingDeltaT,
      effectiveOperatingCellTempHotC: cellTempHotC,
      thermalPowerLossPct: pvThermalLossPct,
      annualDegradationPct: baseDegradationPct,
      twentyFiveYearCapacityRetentionPct: retention25y,
      expectedUsefulLifespanYears: usefulLifespanYears,
      soilingLossAnnualPct: pvSoilingLossAnnualPct,
      soilingWashOffEfficiencyPct: washOffEfficiency,
      environmentalRiskSummaryFa: pvRiskSummaryFa,
      environmentalRiskSummaryEn: pvRiskSummaryEn,
    },
    inverterImpact: {
      isInstalledIndoors,
      effectiveAmbientTempC: effInverterAmbTemp,
      directSolarRadiationHeatingDeltaTC: solarRadiationHeatingDelta,
      dustHeatsinkFoulingFactorPct: heatsinkFoulingPct,
      thermalDeratePct: Number(inverterThermalDerate.toFixed(1)),
      elevationDeratePct: Number(altitudeDeratePct.toFixed(1)),
      totalInverterDeratePct,
      internalComponentTempEstC: isInstalledIndoors ? 48.0 : Math.round(tAmbMax + 26.0),
      expectedInverterLifespanYears: inverterLifespan,
      recommendedReplacementYear,
      inverterStatusSummaryFa: invStatusSummaryFa,
      inverterStatusSummaryEn: invStatusSummaryEn,
    },
    combinedLifetimeEnergyPenaltyPct,
    mitigationRecommendationsFa,
    mitigationRecommendationsEn,
  };
}
