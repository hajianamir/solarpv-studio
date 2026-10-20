// Adaptive Power Inverter, Auto-Voltage Stepping & Paralleling Engine

export type InverterEngineeringClass =
  | 'residential_micro'
  | 'residential_standard'
  | 'commercial_light'
  | 'industrial_utility';

export interface InverterClassDefinition {
  classType: InverterEngineeringClass;
  titleFa: string;
  titleEn: string;
  powerRangeDesc: string;
  recommendedDcVoltage: number; // 12, 24, or 48V
  recommendedAcPhase: 'single_phase_230v' | 'three_phase_400v';
  maxSingleUnitKw: number;
}

export const INVERTER_CLASSES: Record<InverterEngineeringClass, InverterClassDefinition> = {
  residential_micro: {
    classType: 'residential_micro',
    titleFa: 'مسکونی کوچک (Residential Micro)',
    titleEn: 'Residential Micro (<3 kW)',
    powerRangeDesc: 'کمتر از ۳ کیلووات، ولتاژ ۱۲ یا ۲۴ ولت تکفاز',
    recommendedDcVoltage: 24,
    recommendedAcPhase: 'single_phase_230v',
    maxSingleUnitKw: 3.0,
  },
  residential_standard: {
    classType: 'residential_standard',
    titleFa: 'مسکونی استاندارد (Residential Standard)',
    titleEn: 'Residential Standard (3–10 kW)',
    powerRangeDesc: '۳ الی ۱۰ کیلووات، ولتاژ ۴۸ ولت استاندارد تکفاز/سهفاز',
    recommendedDcVoltage: 48,
    recommendedAcPhase: 'single_phase_230v',
    maxSingleUnitKw: 6.0,
  },
  commercial_light: {
    classType: 'commercial_light',
    titleFa: 'تجاری سبک / کارگاهی (Commercial Light)',
    titleEn: 'Commercial Light (10–30 kW)',
    powerRangeDesc: '۱۰ الی ۳۰ کیلووات، اینورترهای پارالل یا سهفاز سنکرون ۴۰۰ ولت',
    recommendedDcVoltage: 48,
    recommendedAcPhase: 'three_phase_400v',
    maxSingleUnitKw: 12.0,
  },
  industrial_utility: {
    classType: 'industrial_utility',
    titleFa: 'صنعتی و مزارع خورشیدی (Industrial / Utility)',
    titleEn: 'Industrial & Utility (>30 kW)',
    powerRangeDesc: 'بالای ۳۰ کیلووات، شبکه‌های استرینگ سنترال و تجمیع توان سهفاز',
    recommendedDcVoltage: 48, // or high-voltage battery racks
    recommendedAcPhase: 'three_phase_400v',
    maxSingleUnitKw: 30.0,
  },
};

export interface InverterClusteringResult {
  engineeringClass: InverterClassDefinition;
  recommendedDcVoltageVdc: number;
  autoSteppingReasonFa: string;
  acPhaseType: 'single_phase_230v' | 'three_phase_400v';
  parallelUnitsCount: number;
  unitRatingKw: number;
  totalInverterCapacityKw: number;
  inverterDcContinuousCurrentAmps: number;
  inverterDcSurgeCurrentAmps: number;
  healthStatus: 'compatible' | 'power_deficit' | 'upgrade_suggested';
  healthStatusTextFa: string;
  recommendationFa: string;
}

export function evaluateInverterClustering(
  continuousWatts: number,
  peakSurgeWatts: number,
  preferredUnitKw: number = 5.0
): InverterClusteringResult {
  const continuousKw = continuousWatts / 1000.0;
  const peakKw = peakSurgeWatts / 1000.0;

  // 1. Identify engineering class
  let engineeringClass: InverterClassDefinition;
  if (continuousKw <= 3.0) {
    engineeringClass = INVERTER_CLASSES.residential_micro;
  } else if (continuousKw <= 10.0) {
    engineeringClass = INVERTER_CLASSES.residential_standard;
  } else if (continuousKw <= 30.0) {
    engineeringClass = INVERTER_CLASSES.commercial_light;
  } else {
    engineeringClass = INVERTER_CLASSES.industrial_utility;
  }

  // 2. Auto-Voltage Stepping Logic:
  // Rule: Current > 120A at DC bus requires stepping up to the next standard voltage to prevent extreme cable heating
  let recommendedDcVoltageVdc = 12;
  let autoSteppingReasonFa = "توان سبک؛ ولتاژ ۱۲ ولت برای باتری کافی است.";

  const currentAt12V = continuousWatts / 12.0;
  if (currentAt12V > 120 || continuousWatts > 1500) {
    recommendedDcVoltageVdc = 24;
    autoSteppingReasonFa = "جریان DC در ۱۲ ولت بیش از ۱۲۰ آمپر است؛ ارتقا خودکار به ۲۴ ولت جهت کاهش کابل‌کشی.";
  }

  const currentAt24V = continuousWatts / 24.0;
  if (currentAt24V > 120 || continuousWatts > 3000) {
    recommendedDcVoltageVdc = 48;
    autoSteppingReasonFa = "توان بالای ۳ کیلووات؛ ارتقا خودکار به استاندارد ۴۸ ولت صنعتی جهت ممانعت از اتلاف حرارتی DC.";
  }

  // 3. Paralleling calculation
  const unitKw = Math.max(1.0, preferredUnitKw);
  let parallelUnitsCount = Math.max(1, Math.ceil(continuousKw / unitKw));

  // Check surge capability (typical off-grid hybrid inverters deliver 2x surge for 5-10s)
  const totalSurgeCapacityKw = parallelUnitsCount * unitKw * 2.0;
  if (totalSurgeCapacityKw < peakKw) {
    parallelUnitsCount = Math.max(parallelUnitsCount, Math.ceil(peakKw / (unitKw * 2.0)));
  }

  const totalInverterCapacityKw = parallelUnitsCount * unitKw;

  // DC Currents
  const inverterDcContinuousCurrentAmps = continuousWatts / (recommendedDcVoltageVdc * 0.93);
  const inverterDcSurgeCurrentAmps = peakSurgeWatts / (recommendedDcVoltageVdc * 0.93);

  // Health evaluation
  let healthStatus: 'compatible' | 'power_deficit' | 'upgrade_suggested' = 'compatible';
  let healthStatusTextFa = 'سازگار و بهینه';
  let recommendationFa = `تعداد ${parallelUnitsCount} دستگاه اینورتر ${unitKw} کیلووات با کابل پارالل سنکرون همگام‌سازی شوند.`;

  if (totalInverterCapacityKw < continuousKw) {
    healthStatus = 'power_deficit';
    healthStatusTextFa = 'کمبود توان اینورتر نسبت به بار پیوسته';
    recommendationFa = `نیاز به افزودن حداقل ۱ دستگاه اینورتر دیگر به باسبار مشترک.`;
  } else if (parallelUnitsCount > 1 && engineeringClass.classType === 'residential_micro') {
    healthStatus = 'upgrade_suggested';
    healthStatusTextFa = 'پیشنهاد انتخاب اینورتر تکی با ظرفیت بالاتر';
    recommendationFa = `به جای پارالل، می‌توانید از یک دستگاه اینورتر یکپارچه ${Math.ceil(continuousKw)}kW استفاده کنید.`;
  }

  return {
    engineeringClass,
    recommendedDcVoltageVdc,
    autoSteppingReasonFa,
    acPhaseType: engineeringClass.recommendedAcPhase,
    parallelUnitsCount,
    unitRatingKw: unitKw,
    totalInverterCapacityKw,
    inverterDcContinuousCurrentAmps,
    inverterDcSurgeCurrentAmps,
    healthStatus,
    healthStatusTextFa,
    recommendationFa,
  };
}
