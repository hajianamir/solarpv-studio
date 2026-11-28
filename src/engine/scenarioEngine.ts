// Scenario Comparison Engine: 3 Smart Engineering Alternatives
import { assessSimpleLcoe, type SimpleLcoeInput, type SimpleLcoeAssessment } from './core/simpleLcoe';

export interface ScenarioDetails {
  id: 'optimized_lifepo4' | 'budget_gel' | 'industrial_redundant';
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  descriptionEn: string;
  panelTypeFa: string;
  inverterTypeFa: string;
  batteryChemistryFa: string;
  pvCapacityKwp: number;
  batteryGrossKwh: number;
  inverterCapacityKw: number;
  initialCapexUsd: number;
  initialCapexToman: number;
  tco25yUsd: number;
  bessLifespanYears: number;
  totalSystemWeightKg: number;
  cableVoltageDropPct: null;
  electricalSafetyAssessment: 'not_assessed';
  reliabilityIndexPct: null;
  reliabilityAssessment: 'not_assessed';
  firstYearGenerationProxyKwh: number;
  energyModelPolicy: 'scenario_generation_supplied_psh_v1';
  lcoeUsdPerKwh: number | null;
  lcoeAssessment: SimpleLcoeAssessment;
  advantagesFa: string[];
  advantagesEn: string[];
  disadvantagesFa: string[];
  disadvantagesEn: string[];
}

export function generateScenarios(
  basePvCapacityKwp: number,
  baseDailyKwh: number,
  baseAutonomyDays: number,
  usdRate: number = 90_000,
  discountRatePct: number = 18.0,
  peakSunHours: number = 5.17
): ScenarioDetails[] {
  const isUnsizablePsh = typeof peakSunHours === 'number' && Number.isFinite(peakSunHours) && peakSunHours <= 0;
  const effectiveBaseKwp = isUnsizablePsh ? 0 : basePvCapacityKwp;

  // Scenario 1: LiFePO4 screening preset
  const s1PvKwp = Math.round(effectiveBaseKwp * 10) / 10;
  const s1BatKwh = Math.round((baseDailyKwh * baseAutonomyDays / 0.85) * 10) / 10;
  const s1InvKw = Math.max(5.0, Math.ceil(s1PvKwp / 5.0) * 5.0);
  const s1CapexUsd = Math.round(s1PvKwp * 300 + s1BatKwh * 210 + s1InvKw * 130 + (isUnsizablePsh ? 0 : 1500));
  const s1Tco25y = Math.round(s1CapexUsd + s1BatKwh * 150); // One bat replacement at yr 13
  const s1Weight = Math.round(s1PvKwp * 35 + s1BatKwh * 10 + s1InvKw * 6 + (isUnsizablePsh ? 0 : 100));

  // Scenario 2: Budget Gel Deep-Cycle
  const s2PvKwp = Math.round(effectiveBaseKwp * 0.95 * 10) / 10;
  // Needs 2x capacity because DoD is 50% vs 85%
  const s2BatKwh = Math.round((baseDailyKwh * baseAutonomyDays / 0.50) * 10) / 10;
  const s2InvKw = s1InvKw;
  const s2CapexUsd = Math.round(s2PvKwp * 270 + s2BatKwh * 115 + s2InvKw * 100 + (isUnsizablePsh ? 0 : 1200));
  // Gel requires replacement every 3.5-4 years (approx 6 replacements over 25 years!)
  const s2Tco25y = Math.round(s2CapexUsd + s2BatKwh * 115 * 5);
  const s2Weight = Math.round(s2PvKwp * 35 + s2BatKwh * 32 + s2InvKw * 6 + (isUnsizablePsh ? 0 : 100)); // Lead is very heavy!

  // Scenario 3: Higher-capacity industrial screening preset
  // +25% PV capacity, N+1 parallel inverters, ruggedized LiFePO4
  const s3PvKwp = Math.round(effectiveBaseKwp * 1.25 * 10) / 10;
  const s3BatKwh = Math.round((baseDailyKwh * (baseAutonomyDays + 0.5) / 0.80) * 10) / 10;
  const s3InvKw = s1InvKw * 2; // Redundant parallel
  const s3CapexUsd = Math.round(s3PvKwp * 340 + s3BatKwh * 230 + s3InvKw * 140 + (isUnsizablePsh ? 0 : 3500));
  const s3Tco25y = Math.round(s3CapexUsd + s3BatKwh * 160 + (isUnsizablePsh ? 0 : 2000));
  const s3Weight = Math.round(s3PvKwp * 40 + s3BatKwh * 11 + s3InvKw * 8 + (isUnsizablePsh ? 0 : 250));

  // Dynamic LCOE Calculation (LC-07 / F-C / Z-02): Calculate discounted 25-year screening LCOE (nominal illustrative scenario) based on scenario parameters
  const safeDiscountRatePct = typeof discountRatePct === 'number' && Number.isFinite(discountRatePct) ? discountRatePct : 18.0;
  const discountRate = Math.max(0.01, safeDiscountRatePct / 100.0);
  const safePsh = typeof peakSunHours === 'number' && Number.isFinite(peakSunHours) ? peakSunHours : 5.17;
  const effectivePsh = safePsh; // Preserve supplied positive resource; no 1-PSH energy substitution.
  const lifetimeYears = 25;
  const degradationPct = 0.5;

  // Scenario 1: LiFePO4 (1 battery replacement at yr 12)
  const s1AnnualGen = isUnsizablePsh ? 0 : s1PvKwp * effectivePsh * 365 * 0.78;
  const s1AnnualOpex = s1CapexUsd * 0.012;
  const s1BatRepPv = (s1BatKwh * 130) / Math.pow(1 + discountRate, 12);
  const s1LcoeAssessment = assessScenarioLcoe({initialCapexUsd:s1CapexUsd,replacementPresentValueUsd:s1BatRepPv,opexAnnual:s1AnnualOpex,energyAnnual:s1AnnualGen,discountRate,lifetimeYears,degradationPct});
  const s1Lcoe = s1LcoeAssessment.lcoeValue;

  // Scenario 2: Gel (battery replacement every 4 years)
  const s2AnnualGen = isUnsizablePsh ? 0 : s2PvKwp * effectivePsh * 365 * 0.78;
  const s2AnnualOpex = s2CapexUsd * 0.015;
  let s2BatRepPv = 0;
  for (let yr = 4; yr < 25; yr += 4) {
    s2BatRepPv += (s2BatKwh * 115) / Math.pow(1 + discountRate, yr);
  }
  const s2LcoeAssessment = assessScenarioLcoe({initialCapexUsd:s2CapexUsd,replacementPresentValueUsd:s2BatRepPv,opexAnnual:s2AnnualOpex,energyAnnual:s2AnnualGen,discountRate,lifetimeYears,degradationPct});
  const s2Lcoe = s2LcoeAssessment.lcoeValue;

  // Scenario 3: Industrial Redundant (battery replacement at yr 15)
  const s3AnnualGen = isUnsizablePsh ? 0 : s3PvKwp * effectivePsh * 365 * 0.80;
  const s3AnnualOpex = s3CapexUsd * 0.010;
  const s3BatRepPv = (s3BatKwh * 160) / Math.pow(1 + discountRate, 15);
  const s3LcoeAssessment = assessScenarioLcoe({initialCapexUsd:s3CapexUsd,replacementPresentValueUsd:s3BatRepPv,opexAnnual:s3AnnualOpex,energyAnnual:s3AnnualGen,discountRate,lifetimeYears,degradationPct});
  const s3Lcoe = s3LcoeAssessment.lcoeValue;

  return [
    {
      id: 'optimized_lifepo4',
      titleFa: 'پیش‌فرض فرضی لیتیوم آهن فسفات',
      titleEn: 'LiFePO4 screening preset',
      descriptionFa: 'سناریوی فرضی هزینه و ظرفیت باتری لیتیومی؛ انطباق تجهیزات و قابلیت تأمین ارزیابی نشده است',
      descriptionEn: 'Illustrative lithium cost/capacity assumptions; equipment applicability and service availability are not assessed.',
      panelTypeFa: 'پنل‌های N-Type TOPCon راندمان بالا (Jinko / LONGi)',
      inverterTypeFa: 'اینورتر شارژر هیبرید هوشمند با راندمان ۹۷٪ (Deye / Growatt)',
      batteryChemistryFa: 'لیتیوم آهن فسفات (LiFePO4) با عمق دشارژ ۸۵٪ و ۵۵۰۰ سیکل',
      pvCapacityKwp: s1PvKwp,
      batteryGrossKwh: s1BatKwh,
      inverterCapacityKw: s1InvKw,
      initialCapexUsd: s1CapexUsd,
      initialCapexToman: s1CapexUsd * usdRate,
      tco25yUsd: s1Tco25y,
      bessLifespanYears: 12,
      totalSystemWeightKg: s1Weight,
      cableVoltageDropPct: null,
      electricalSafetyAssessment: 'not_assessed',
      reliabilityIndexPct: null,
      reliabilityAssessment: 'not_assessed',
      firstYearGenerationProxyKwh: s1AnnualGen,
      energyModelPolicy: 'scenario_generation_supplied_psh_v1',
      lcoeUsdPerKwh: s1Lcoe,
      lcoeAssessment: s1LcoeAssessment,
      advantagesFa: [
        'طول عمر بالای باتری (بیش از ۱۰ الی ۱۲ سال)',
        'وزن سبک و اشغال فضای کم در موتورخانه/تابلو',
        'TCO فرضی را با ارقام همین سناریوها مقایسه کنید؛ کمینه بودن تضمین نشده است',
        'پشتیبانی از پروتکل‌های مانیتورینگ هوشمند CAN/BMS'
      ],
      advantagesEn: [
        'Extended battery operational life (>12 years, 6000 cycles)',
        'Lightweight and compact footprint in electrical room',
        'Compare the illustrative TCO figures; no lowest-cost ranking is guaranteed',
        'Smart BMS closed-loop communication over CAN/RS485'
      ],
      disadvantagesFa: [
        'هزینه اولیه خرید باتری بالاتر از ژل و سرب‌اسید'
      ],
      disadvantagesEn: [
        'Higher upfront initial CAPEX compared to lead-acid'
      ]
    },
    {
      id: 'budget_gel',
      titleFa: 'سیستم اقتصادی کم‌هزینه (Budget Gel Deep-Cycle)',
      titleEn: 'Budget Gel Deep-Cycle',
      descriptionFa: 'سناریوی فرضی سرب‌اسید؛ هزینه‌ها برآورد بازار یا انتخاب تجهیزات نیستند',
      descriptionEn: 'Illustrative lead-acid assumptions; costs are not market quotes or an equipment selection.',
      panelTypeFa: 'پنل‌های مونوکریستال PERC استاندارد',
      inverterTypeFa: 'اینورتر آف‌گرید تکفاز استاندارد',
      batteryChemistryFa: 'باتری‌های ژل عمیق دشارژ (Gel Deep Cycle) با عمق ۵۰٪',
      pvCapacityKwp: s2PvKwp,
      batteryGrossKwh: s2BatKwh,
      inverterCapacityKw: s2InvKw,
      initialCapexUsd: s2CapexUsd,
      initialCapexToman: s2CapexUsd * usdRate,
      tco25yUsd: s2Tco25y,
      bessLifespanYears: 3.5,
      totalSystemWeightKg: s2Weight,
      cableVoltageDropPct: null,
      electricalSafetyAssessment: 'not_assessed',
      reliabilityIndexPct: null,
      reliabilityAssessment: 'not_assessed',
      firstYearGenerationProxyKwh: s2AnnualGen,
      energyModelPolicy: 'scenario_generation_supplied_psh_v1',
      lcoeUsdPerKwh: s2Lcoe,
      lcoeAssessment: s2LcoeAssessment,
      advantagesFa: [
        'مفروضات هزینه اولیه باید با پیشنهادهای واقعی تطبیق داده شوند',
        'دسترسی و فراوانی بالا در بازار سنتی ایران',
        'عدم نیاز به تنظیمات پیچیده پروتکل BMS'
      ],
      advantagesEn: [
        'Initial cost assumptions require matching supplier quotations',
        'Abundant local spare parts availability in conventional markets',
        'No digital BMS communication configuration required'
      ],
      disadvantagesFa: [
        'نیاز به تعویض مجدد باتری‌ها هر ۳ الی ۴ سال یک‌بار',
        'وزن فوق‌العاده سنگین (۳ برابر لیتیوم)',
        'حساسیت بسیار شدید به گرمای بالای ۳۰ درجه'
      ],
      disadvantagesEn: [
        'Frequent battery replacement required every 3 to 4 years',
        'Substantially heavier weight (3x heavier than LiFePO4)',
        'High temperature degradation sensitivity above 30°C'
      ]
    },
    {
      id: 'industrial_redundant',
      titleFa: 'پیش‌فرض صنعتی با ظرفیت افزوده (ارزیابی‌نشده)',
      titleEn: 'Higher-capacity industrial screening preset',
      descriptionFa: 'ظرفیت افزوده و بودجه فرضی؛ دسترس‌پذیری، افزونگی و حفاظت ارزیابی نشده‌اند',
      descriptionEn: 'Added capacity and illustrative budget only; availability, redundancy and protection are not assessed.',
      panelTypeFa: 'پنل‌های بایفیشیال دوطرفه شیشه-شیشه (Trina / Jinko)',
      inverterTypeFa: 'بودجه فرضی ظرفیت اینورتر؛ سازگاری موازی و بای‌پس ارزیابی نشده است',
      batteryChemistryFa: 'رک باتری سروری LiFePO4 مجهز به اکتیو بالانسر و ایزولاسیون حرارتی',
      pvCapacityKwp: s3PvKwp,
      batteryGrossKwh: s3BatKwh,
      inverterCapacityKw: s3InvKw,
      initialCapexUsd: s3CapexUsd,
      initialCapexToman: s3CapexUsd * usdRate,
      tco25yUsd: s3Tco25y,
      bessLifespanYears: 15,
      totalSystemWeightKg: s3Weight,
      cableVoltageDropPct: null,
      electricalSafetyAssessment: 'not_assessed',
      reliabilityIndexPct: null,
      reliabilityAssessment: 'not_assessed',
      firstYearGenerationProxyKwh: s3AnnualGen,
      energyModelPolicy: 'scenario_generation_supplied_psh_v1',
      lcoeUsdPerKwh: s3Lcoe,
      lcoeAssessment: s3LcoeAssessment,
      advantagesFa: [
        'تأمین بار نیازمند برنامه زمانی بار، شبکه، دیزل و ذخیره‌ساز است',
        'ظرفیت اینورتر بیشتر، اثبات افزونگی یا عملکرد حین خرابی نیست',
        'افت ولتاژ کابل و ایمنی آتش بدون مدار و تجهیزات مشخص ارزیابی نشده‌اند',
        'هماهنگی حفاظت اضافه‌ولتاژ و صاعقه ارزیابی نشده است'
      ],
      advantagesEn: [
        'Load service requires load, grid, generator and storage chronology',
        'Additional inverter capacity does not establish failover or redundancy',
        'Cable voltage drop and fire safety require assessed circuit and equipment data',
        'Surge and lightning protection coordination remains unassessed'
      ],
      disadvantagesFa: [
        'هزینه اولیه بالاتر تجهیزات حفاظتی و افزونگی'
      ],
      disadvantagesEn: [
        'Higher initial capital cost due to redundant hardware'
      ]
    }
  ];
}

/** Scenario-only composition of an already discounted replacement reserve.
 * Costs are USD, passed through at full precision; this is not a debt ledger.
 */
export function assessScenarioLcoe(input:Omit<SimpleLcoeInput,'capex'|'currency'|'rateBasis'|'energyBasis'> & {initialCapexUsd:number;replacementPresentValueUsd:number}):SimpleLcoeAssessment {
  const {initialCapexUsd,replacementPresentValueUsd,...rest}=input;
  return assessSimpleLcoe({...rest,capex:initialCapexUsd+replacementPresentValueUsd,energyBasis:'generation_proxy',currency:'USD',rateBasis:'nominal'});
}
