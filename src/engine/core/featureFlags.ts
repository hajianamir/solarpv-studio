// ============================================================================
// SolarPV Studio v3.0 - Feature Flag Architecture (Phase 1a)
// Modular control for advanced physics, resilience, sustainability, and civil
// ============================================================================

export interface AdvancedFeatureFlags {
  /** Phase 2a: Multiphysics coupling (BIPV/T, desert gradients, FPV Cox-Munk, 2.5D bifacial) */
  enableMultiphysicsCoupling: boolean;

  /** Phase 2a: Climate resilience (Gumbel extreme gusts, hail, sub-hourly 15-min disaggregation, inverter film capacitor aging) */
  enableClimateResilience15Min: boolean;

  /** Phase 2b: Cradle-to-grave LCA, toxic materials inventory (Cd, Pb, PFAS), EOL residual salvage & decommissioning in LCOE */
  enableLcaLifecycleSustainability: boolean;

  /** Phase 3a: PV-Hydrogen electrolyzer (PEM/Alkaline) & Screening-level grid stability (SSR screening, IEEE 2800 LVRT, Q(V)/P(f)) */
  enableNextGenGridHydrogen: boolean;

  /** Phase 3b: Geotechnical & Civil (ASCE 7-22 combos, Broms lateral + skin friction uplift, 3D cut-and-fill, Bishop slope FoS) */
  enableAdvancedGeotechnicalCivil: boolean;
}

export const DEFAULT_FEATURE_FLAGS: Readonly<AdvancedFeatureFlags> = Object.freeze({
  enableMultiphysicsCoupling: false,
  enableClimateResilience15Min: false,
  enableLcaLifecycleSustainability: false,
  enableNextGenGridHydrogen: false,
  enableAdvancedGeotechnicalCivil: false,
});

/**
 * ARCHITECTURAL POLICY: Continuous Compliance Mode
 * Standards-based cross-validation suites, benchmark engines, and golden dataset
 * verifications execute independently of user-level Feature Flag toggles.
 * This guarantees continuous bankable auditability across all builds and runtime states.
 * User-facing sizing and design workflows only utilize newly activated physics when the
 * corresponding feature flag is explicitly enabled by the engineer.
 */
export interface FeatureFlagMeta {
  key: keyof AdvancedFeatureFlags;
  titleFa: string;
  titleEn: string;
  category: 'physics' | 'resilience' | 'sustainability' | 'grid_hydrogen' | 'civil';
  descriptionFa: string;
  descriptionEn: string;
  phase: 'Phase 2a' | 'Phase 2a' | 'Phase 2b' | 'Phase 3a' | 'Phase 3b';
  standards: string[];
}

export const FEATURE_FLAG_METADATA: Record<keyof AdvancedFeatureFlags, FeatureFlagMeta> = {
  enableMultiphysicsCoupling: {
    key: 'enableMultiphysicsCoupling',
    titleFa: 'کوپل چندفیزیکی (BIPV/T، کویر، FPV و بایفیشیال ۲.۵ بعدی)',
    titleEn: 'Multiphysics Coupling (BIPV/T, FPV, Desert, 2.5D Bifacial)',
    category: 'physics',
    descriptionFa: 'مدل‌سازی انتقال حرارت کانال BIPV، خنک‌کاری FPV با آلبیدوی Cox-Munk، گرادیان حرارتی کویر و دید دوسویه ۲.۵ بعدی.',
    descriptionEn: 'Electro-thermal BIPV/T channel, FPV with Cox-Munk water albedo, desert chimney thermal gradients, and 2.5D hybrid bifacial view-factor.',
    phase: 'Phase 2a',
    standards: ['IEC 61215', 'DNV-RP-0584', 'NREL Marion 2017'],
  },
  enableClimateResilience15Min: {
    key: 'enableClimateResilience15Min',
    titleFa: 'تاب‌آوری اقلیمی و گام‌های زیرساعتی ۱۵ دقیقه‌ای',
    titleEn: 'Climate Resilience & 15-Min Sub-Hourly Dispatch',
    category: 'resilience',
    descriptionFa: 'تحلیل احتمالاتی رخدادهای حدی گامبل، دیسپچ ۱۵ دقیقه‌ای، نرخ نشست گردوغبار و استهلاک فیلم خازن اینورتر.',
    descriptionEn: 'Gumbel extreme wind/hail probabilistic risk, 15-min clear-sky disaggregation, Kimber soiling/rain recovery, and inverter film capacitor life.',
    phase: 'Phase 2a',
    standards: ['IEC 62109', 'ASTM E1036', 'NREL Kimber Soiling'],
  },
  enableLcaLifecycleSustainability: {
    key: 'enableLcaLifecycleSustainability',
    titleFa: 'ارزیابی چرخه عمر (LCA) و اقتصاد پایان عمر (EOL)',
    titleEn: 'Life Cycle Assessment (LCA) & End-of-Life (EOL)',
    category: 'sustainability',
    descriptionFa: 'محاسبه کربن و آب نهان ساخت (ISO 14040/44)، پایش مواد سمی (سرب، کادمیوم، PFAS) و ارزش اسقاط بازیافت در LCOE/NPV.',
    descriptionEn: 'ISO 14040/44 cradle-to-grave embodied carbon/water, hazardous substance tracking (Pb, Cd, PFAS), and decommissioning/salvage credits in LCOE.',
    phase: 'Phase 2b',
    standards: ['ISO 14040', 'ISO 14044', 'IEA-PVPS Task 12'],
  },
  enableNextGenGridHydrogen: {
    key: 'enableNextGenGridHydrogen',
    titleFa: 'سیستم‌های نوین هیدروژن و پایداری شبکه (Screening-Level)',
    titleEn: 'Next-Gen Hydrogen & Grid Stability (Screening-Level)',
    category: 'grid_hydrogen',
    descriptionFa: 'کوپل الکترولایزر آب (PEM و قلیایی)، غربالگری مقدماتی رزونانس زیرسنکرون (SSR)، منحنی LVRT طبق IEEE 2800 و کنترل Q(V)/P(f).',
    descriptionEn: 'PEM/Alkaline electrolyzer sizing, screening-level SSR risk evaluation, IEEE 2800 LVRT compliance envelope, and volt-var/freq droop.',
    phase: 'Phase 3a',
    standards: ['IEEE 2800-2022', 'IEEE 1547', 'ISO 19880'],
  },
  enableAdvancedGeotechnicalCivil: {
    key: 'enableAdvancedGeotechnicalCivil',
    titleFa: 'مهندسی سیویل و ژئوتکنیک پیشرفته (شمع، ترانشه و پایداری شیب)',
    titleEn: 'Advanced Geotechnical & Civil Engineering (Broms, Cut/Fill, Slope)',
    category: 'civil',
    descriptionFa: 'ترکیبات بار ASCE 7-22، ظرفیت جانبی شمع (Broms) + اصطکاک جدار (Uplift)، احجام خاکبرداری/خاکریزی و ضریب اطمینان شیب بیشاپ.',
    descriptionEn: 'ASCE 7-22 multi-hazard combos, Broms lateral pile capacity + alpha/beta skin friction uplift, cut-and-fill volume, and Bishop slope stability FoS.',
    phase: 'Phase 3b',
    standards: ['ASCE 7-22', 'Eurocode 1/7', 'Broms (1964)'],
  },
};

export const FEATURE_FLAGS_STORAGE_KEY = 'solarpv_v3_feature_flags';
