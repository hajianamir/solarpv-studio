// Scenario Comparison Engine: 3 Smart Engineering Alternatives

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
  cableVoltageDropPct: number;
  reliabilityIndexPct: number;
  lcoeUsdPerKwh: number;
  advantagesFa: string[];
  advantagesEn: string[];
  disadvantagesFa: string[];
  disadvantagesEn: string[];
}

export function generateScenarios(
  basePvCapacityKwp: number,
  baseDailyKwh: number,
  baseAutonomyDays: number,
  usdRate: number = 90_000
): ScenarioDetails[] {
  // Scenario 1: Standard Optimized LiFePO4
  const s1PvKwp = Math.round(basePvCapacityKwp * 10) / 10;
  const s1BatKwh = Math.round((baseDailyKwh * baseAutonomyDays / 0.85) * 10) / 10;
  const s1InvKw = Math.max(5.0, Math.ceil(s1PvKwp / 5.0) * 5.0);
  const s1CapexUsd = Math.round(s1PvKwp * 300 + s1BatKwh * 210 + s1InvKw * 130 + 1500);
  const s1Tco25y = Math.round(s1CapexUsd + s1BatKwh * 150); // One bat replacement at yr 13
  const s1Weight = Math.round(s1PvKwp * 35 + s1BatKwh * 10 + s1InvKw * 6 + 100);

  // Scenario 2: Budget Gel Deep-Cycle
  const s2PvKwp = Math.round(basePvCapacityKwp * 0.95 * 10) / 10;
  // Needs 2x capacity because DoD is 50% vs 85%
  const s2BatKwh = Math.round((baseDailyKwh * baseAutonomyDays / 0.50) * 10) / 10;
  const s2InvKw = s1InvKw;
  const s2CapexUsd = Math.round(s2PvKwp * 270 + s2BatKwh * 115 + s2InvKw * 100 + 1200);
  // Gel requires replacement every 3.5-4 years (approx 6 replacements over 25 years!)
  const s2Tco25y = Math.round(s2CapexUsd + s2BatKwh * 115 * 5);
  const s2Weight = Math.round(s2PvKwp * 35 + s2BatKwh * 32 + s2InvKw * 6 + 100); // Lead is very heavy!

  // Scenario 3: High-Reliability Industrial Redundant
  // +25% PV capacity, N+1 parallel inverters, ruggedized LiFePO4
  const s3PvKwp = Math.round(basePvCapacityKwp * 1.25 * 10) / 10;
  const s3BatKwh = Math.round((baseDailyKwh * (baseAutonomyDays + 0.5) / 0.80) * 10) / 10;
  const s3InvKw = s1InvKw * 2; // Redundant parallel
  const s3CapexUsd = Math.round(s3PvKwp * 340 + s3BatKwh * 230 + s3InvKw * 140 + 3500);
  const s3Tco25y = Math.round(s3CapexUsd + s3BatKwh * 160 + 2000);
  const s3Weight = Math.round(s3PvKwp * 40 + s3BatKwh * 11 + s3InvKw * 8 + 250);

  return [
    {
      id: 'optimized_lifepo4',
      titleFa: 'سیستم بهینه پیشنهادی (Standard Optimized LiFePO4)',
      titleEn: 'Standard Optimized LiFePO4',
      descriptionFa: 'بهترین تعادل میان هزینه اولیه، بازدهی انرژی و طول عمر باتری لیتیومی با حداقل فضای اشغالی',
      descriptionEn: 'Optimal balance between CAPEX, round-trip efficiency, and 12-year battery life with compact footprint.',
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
      cableVoltageDropPct: 1.2,
      reliabilityIndexPct: 98.5,
      lcoeUsdPerKwh: 0.085,
      advantagesFa: [
        'طول عمر بالای باتری (بیش از ۱۰ الی ۱۲ سال)',
        'وزن سبک و اشغال فضای کم در موتورخانه/تابلو',
        'حداقل هزینه مالکیت ۲۵ ساله (TCO)',
        'پشتیبانی از پروتکل‌های مانیتورینگ هوشمند CAN/BMS'
      ],
      advantagesEn: [
        'Extended battery operational life (>12 years, 6000 cycles)',
        'Lightweight and compact footprint in electrical room',
        'Lowest 25-year Total Cost of Ownership (TCO)',
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
      descriptionFa: 'حداقل سرمایه‌گذاری اولیه در روز اول، مناسب پروژه‌های با بودجه اولیه محدود',
      descriptionEn: 'Lowest initial Day-1 investment, ideal for projects with tight initial budget constraints.',
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
      cableVoltageDropPct: 1.6,
      reliabilityIndexPct: 89.0,
      lcoeUsdPerKwh: 0.125,
      advantagesFa: [
        'ارزان‌ترین سرمایه‌گذاری اولیه در فاز ساخت',
        'دسترسی و فراوانی بالا در بازار سنتی ایران',
        'عدم نیاز به تنظیمات پیچیده پروتکل BMS'
      ],
      advantagesEn: [
        'Lowest initial procurement cost for budget-constrained projects',
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
      titleFa: 'سیستم فوق‌پایدار صنعتی (High-Reliability Industrial Redundant)',
      titleEn: 'High-Reliability Industrial Redundant',
      descriptionFa: 'پایداری ۱۰۰٪ با افزونگی N+1 اینورترها، باتری رک‌مانت پیشرفته و ادوات حفاظتی دابل',
      descriptionEn: 'Mission-critical 99.9% uptime with N+1 parallel redundant inverters, server rack LiFePO4, and dual SPD protection.',
      panelTypeFa: 'پنل‌های بایفیشیال دوطرفه شیشه-شیشه (Trina / Jinko)',
      inverterTypeFa: 'کلاستر اینورترهای سنکرون پارالل N+1 با سیستم بای‌پس اتوماتیک STS',
      batteryChemistryFa: 'رک باتری سروری LiFePO4 مجهز به اکتیو بالانسر و ایزولاسیون حرارتی',
      pvCapacityKwp: s3PvKwp,
      batteryGrossKwh: s3BatKwh,
      inverterCapacityKw: s3InvKw,
      initialCapexUsd: s3CapexUsd,
      initialCapexToman: s3CapexUsd * usdRate,
      tco25yUsd: s3Tco25y,
      bessLifespanYears: 15,
      totalSystemWeightKg: s3Weight,
      cableVoltageDropPct: 0.8,
      reliabilityIndexPct: 99.9,
      lcoeUsdPerKwh: 0.098,
      advantagesFa: [
        'پایداری دائمی بدون یک ثانیه خاموشی برای مراکز داده و بیمارستان',
        'افزونگی کامل N+1 (در صورت سوختن یک اینورتر بقیه کل بار را اداره می‌کنند)',
        'تلفات کابل‌کشی زیر ۱٪ و بالاترین ضریب ایمنی ضدحریق',
        'حفاظت کامل صاعقه با ارسترهای کلاس I+II'
      ],
      advantagesEn: [
        'Continuous 99.9% power availability for telecom, hospitals, and datacenters',
        'Full N+1 hot-standby redundancy across inverter clusters',
        'Ultra-low cable voltage drop (<0.8%) and premium fire safety compliance',
        'Comprehensive Class I+II surge arresters and lightning protection'
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
