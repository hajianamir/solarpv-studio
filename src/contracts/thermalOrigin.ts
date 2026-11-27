/** A signed annual-loss scalar does not authenticate its generating time series. */
export type ThermalInputBasis='scalar_noct_screen'|'supplied_signed_annual_loss_unknown_origin';
export interface ThermalInputQualification {
  schemaVersion:'thermal-input-qualification-v1';
  basis:ThermalInputBasis;
  assessment:'screening_only';
  chronologicalCoverage:'not_established';
  timeSeriesSampleCount:null;
  independentlyValidatedApplicability:false;
  financialAdoptionEligible:false;
}
export function qualifyThermalInput(suppliedOverride:number|undefined):ThermalInputQualification {
  const hasSuppliedOverride=suppliedOverride!==undefined;
  return {schemaVersion:'thermal-input-qualification-v1',basis:hasSuppliedOverride?'supplied_signed_annual_loss_unknown_origin':'scalar_noct_screen',assessment:'screening_only',chronologicalCoverage:'not_established',timeSeriesSampleCount:null,independentlyValidatedApplicability:false,financialAdoptionEligible:false};
}
export const THERMAL_ORIGIN_DISCLOSURE={
 en:'Thermal input origin: a supplied signed annual-loss scalar does not establish synthetic or measured hourly weather, sample count, chronological coverage or site applicability. Scalar NOCT is a screening approximation. This metadata grants no new financial or annual-energy adoption eligibility.',
 fa:'منشأ ورودی حرارتی: عدد تلفات سالانه، داده ساعتی مصنوعی یا اندازه‌گیری‌شده، تعداد نمونه، پوشش زمانی یا انطباق با سایت را ثابت نمی‌کند. NOCT اسکالر تقریب غربالگری است. این فراداده هیچ مجوز تازه‌ای برای انتقال به مالی یا انرژی سالانه نمی‌دهد.',
} as const;

export function describeThermalInput(suppliedOverride:number|undefined):{fa:string;en:string} {
  return suppliedOverride!==undefined?{
    fa:'عدد تلفات حرارتی سالانه با علامت از فراخواننده؛ منشأ، تعداد نمونه و پوشش زمانی از این عدد مشخص نیست.',
    en:'Caller-supplied signed annual thermal-loss scalar; origin, sample count and chronological coverage are not established by this value.',
  }:{
    fa:'تقریب اسکالر NOCT با دمای ورودی؛ شبیه‌سازی ساعتی سالانه یا تأیید انطباق با سایت نیست.',
    en:'Scalar NOCT screening approximation at the supplied ambient temperature; not an hourly annual simulation or site-applicability assessment.',
  };
}
