/**
 * Salt Corrosion, Coastal Salinity & Site Drainage Engine
 * SolarPV Studio v3.0 - ISO 9223:2012 / ASTM G57 / INBC Part 6
 *
 * Implements:
 * 1. Geodesic distance calculation to nearest open sea / ocean coastline.
 * 2. ISO 9223 atmospheric corrosivity categorization (C1–C5) for solar PV equipment.
 * 3. Equipment derating models (yield/OPEX effects on modules, inverters, structural steel).
 * 4. Structural protective coating recommendations (HDG thickness per ISO 1461, fasteners grade, enclosure IP rating).
 * 5. Geotechnical site drainage and groundwater table (GWL) hydrology assessment.
 */

import { ExternalDataGateway } from '../dataGateway/externalDataGateway';
import type { SiteDrainageCondition, SoilClassification } from '../types/climateTypes';
import { COASTLINE_ANCHOR_NODES, estimateGeodesicDistanceToCoastKm } from './coastlineModel';

export { COASTLINE_ANCHOR_NODES, estimateGeodesicDistanceToCoastKm };

export type Iso9223Category = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

export interface ProtectiveCoatingRecommendation {
  hdgThicknessMicrons: number; // e.g. 55, 65, 80, 100, 120 µm
  hdgStandard: string;        // ISO 1461
  coatingSystemEn: string;
  coatingSystemFa: string;
  fastenersGradeEn: string;
  fastenersGradeFa: string;
  enclosureRating: string;    // IP54, IP65, IP66 / NEMA 4X
  inspectionIntervalMonths: number;
}

export interface SiteDrainageAssessment {
  drainageCondition: SiteDrainageCondition;
  drainageConditionLabelEn: string;
  drainageConditionLabelFa: string;
  groundwaterDepthM: number;
  waterTableRisk: 'low' | 'moderate' | 'high';
  waterTableRiskLabelEn: string;
  waterTableRiskLabelFa: string;
  submergedSoilRisk: boolean;
  engineeringRecommendationsEn: string[];
  engineeringRecommendationsFa: string[];
}

export interface SaltCorrosionInput {
  latitude: number;
  longitude: number;
  /** Distance to nearest open sea / ocean shoreline in km. When omitted and resolveDistance is true, computed geodesically. */
  distanceToSeaKm?: number;
  /** When true and distance omitted, resolve via geodesic coastline model or reverse geocode. */
  resolveDistance?: boolean;
  /** Site surface drainage condition */
  drainageCondition?: SiteDrainageCondition;
  /** Depth to groundwater table in meters (GWL) */
  groundwaterDepthM?: number;
  /** Soil classification for drainage interaction */
  soilClassification?: SoilClassification;
  /** Annual rainfall for stormwater runoff check */
  annualRainfallMm?: number;
}

export interface SaltCorrosionOutput {
  siteName: string;
  latitude: number;
  longitude: number;
  distanceToSeaKm: number;
  iso9223Category: Iso9223Category;
  categoryLabel: string;
  categoryLabelFa: string;
  corrosionRisk: string;
  corrosionRiskFa: string;
  // Equipment derating
  moduleDeratePct: number;
  inverterDeratePct: number;
  structureDeratePct: number;
  maintenanceOpexAdderPct: number;
  durabilityNote: string;
  durabilityNoteFa: string;
  traceId: string;
  source: 'osm_nominatim' | 'user_entry' | 'geodesic_model';
  coatingRecommendation: ProtectiveCoatingRecommendation;
  drainageAssessment: SiteDrainageAssessment;
}

/**
 * ISO 9223 shoreline proximity bands (engineering proxy for atmospheric corrosivity
 * categories; C5-M = very high marine, within ~1 km of shoreline).
 */
export const ISO9223_BANDS: Array<{ maxKm: number; category: Iso9223Category }> = [
  { maxKm: 1.0, category: 'C5' },
  { maxKm: 3.0, category: 'C4' },
  { maxKm: 10.0, category: 'C3' },
  { maxKm: 50.0, category: 'C2' },
  { maxKm: Infinity, category: 'C1' },
];

export const CATEGORY_META: Record<
  Iso9223Category,
  {
    label: string;
    labelFa: string;
    risk: string;
    riskFa: string;
    module: number;
    inverter: number;
    structure: number;
    maintenance: number;
    note: string;
    noteFa: string;
    coating: ProtectiveCoatingRecommendation;
  }
> = {
  C1: {
    label: 'C1 – Very low',
    labelFa: 'C1 – بسیار کم (بیابانی / خشک دور از دریا)',
    risk: 'Negligible salinity and atmospheric corrosivity impact',
    riskFa: 'تأثیر شوری و خوردگی محیطی ناچیز؛ آب‌وهوای خشک درون‌سرزمینی',
    module: 0.0,
    inverter: 0.0,
    structure: 0.0,
    maintenance: 0.0,
    note: 'Standard corrosion protection sufficient for inland arid/desert sites.',
    noteFa: 'حفاظت استاندارد ضدخوردگی گالوانیزه برای سایت‌های خشک داخل کشور کافی است.',
    coating: {
      hdgThicknessMicrons: 55,
      hdgStandard: 'ISO 1461 (Grade 55)',
      coatingSystemEn: 'Standard Hot-Dip Galvanizing (HDG ≥ 55 µm)',
      coatingSystemFa: 'گالوانیزه گرم استاندارد (حداقل ۵۵ میکرون)',
      fastenersGradeEn: 'Zinc-plated Grade 8.8 or Geomet/Zinc-flake',
      fastenersGradeFa: 'فولاد گالوانیزه گرید ۸.۸ یا روی-فلیک',
      enclosureRating: 'IP54 / NEMA 3R',
      inspectionIntervalMonths: 24,
    },
  },
  C2: {
    label: 'C2 – Low',
    labelFa: 'C2 – کم (روستایی / کم‌رطوبت داخل کشور)',
    risk: 'Low salinity impact; typical inland rural climate',
    riskFa: 'تأثیر شوری کم؛ شرایط جوی معمول با آلودگی و رطوبت پایین',
    module: 0.3,
    inverter: 0.2,
    structure: 0.0,
    maintenance: 2.0,
    note: 'Rural / inland climate; standard galvanized steel protection.',
    noteFa: 'آب‌وهوای نیمه‌خشک/روستایی؛ پوشش گالوانیزه گرم استاندارد ۶۵ میکرون.',
    coating: {
      hdgThicknessMicrons: 65,
      hdgStandard: 'ISO 1461 (Grade 65)',
      coatingSystemEn: 'Standard Hot-Dip Galvanizing (HDG ≥ 65 µm)',
      coatingSystemFa: 'گالوانیزه گرم استاندارد صنعتی (حداقل ۶۵ میکرون)',
      fastenersGradeEn: 'Hot-dip galvanized steel or Stainless A2 (AISI 304)',
      fastenersGradeFa: 'فولاد گالوانیزه گرم یا استنلس استیل A2 (۳۰۴)',
      enclosureRating: 'IP55 / NEMA 4',
      inspectionIntervalMonths: 24,
    },
  },
  C3: {
    label: 'C3 – Moderate',
    labelFa: 'C3 – متوسط (شهری و صنعتی / نفوذ رطوبت ملایم ساحلی)',
    risk: 'Moderate salinity impact; annual inspection advised',
    riskFa: 'تأثیر شوری متوسط؛ بازرسی سالانه اتصالات و یکپارچگی پوشش گالوانیزه',
    module: 0.7,
    inverter: 0.5,
    structure: 0.3,
    maintenance: 5.0,
    note: 'Moderate coastal influence; inspect galvanization and electrical connections annually.',
    noteFa: 'تأثیر متوسط ساحلی و صنعتی؛ بررسی سالانه پوشش گالوانیزه و اتصالات الکتریکی.',
    coating: {
      hdgThicknessMicrons: 80,
      hdgStandard: 'ISO 1461 (Grade 80) / Magnelis ZM310',
      coatingSystemEn: 'Enhanced Heavy Galvanizing (HDG ≥ 80 µm) or Zn-Al-Mg alloy',
      coatingSystemFa: 'گالوانیزه سنگین ارتقایافته (حداقل ۸۰ میکرون) یا آلیاژ مگنلیس Zn-Al-Mg',
      fastenersGradeEn: 'Stainless Steel A2-70 (AISI 304)',
      fastenersGradeFa: 'پیچ و مهره استنلس استیل A2-70 (گرید ۳۰۴)',
      enclosureRating: 'IP65 / NEMA 4X',
      inspectionIntervalMonths: 12,
    },
  },
  C4: {
    label: 'C4 – High',
    labelFa: 'C4 – بالا (سواحل دریایی / خورندگی اتمسفری بالا)',
    risk: 'High salinity impact; heavy coastal protection required',
    riskFa: 'تأثیر شوری بالا؛ الزام پوشش سنگین ضدخوردگی و بست‌های استنلس استیل دریایی',
    module: 1.2,
    inverter: 0.8,
    structure: 0.8,
    maintenance: 10.0,
    note: 'High coastal salinity; heavy galvanized coating, stainless fasteners, C4-class enclosures.',
    noteFa: 'شوری ساحلی بالا؛ پوشش گالوانیزه با حداقل ضخامت ۸۵–۱۰۰ میکرون، پیچ و مهره استنلس استیل A4 و تابلوهای IP65.',
    coating: {
      hdgThicknessMicrons: 100,
      hdgStandard: 'ISO 1461 (Grade 100) / EN 10346 ZM430',
      coatingSystemEn: 'Heavy Industrial HDG (≥ 100 µm) or Barrier Epoxy Topcoat',
      coatingSystemFa: 'گالوانیزه سنگین صنعتی (حداقل ۱۰۰ میکرون) به همراه پوشش محافظ اپوکسی',
      fastenersGradeEn: 'Marine Stainless Steel A4-70 (AISI 316)',
      fastenersGradeFa: 'پیچ و مهره استنلس استیل دریایی A4-70 (گرید ۳۱۶)',
      enclosureRating: 'IP65 / NEMA 4X with breather vents',
      inspectionIntervalMonths: 12,
    },
  },
  C5: {
    label: 'C5 – Very high (marine)',
    labelFa: 'C5 – بسیار بالا دریایی (سواحل خلیج فارس / عمان / زون پاشش نمک)',
    risk: 'Very high marine salinity; C5-M offshore-grade duplex protection mandatory',
    riskFa: 'تأثیر شوری بسیار شدید؛ الزام سیستم دوبلکس دریایی C5-M و قطعات گرید ۳۱۶',
    module: 2.0,
    inverter: 1.5,
    structure: 1.5,
    maintenance: 15.0,
    note: 'Marine splash zone; C5-M duplex coating system (HDG + marine epoxy), stainless fasteners, sealed enclosures, 6-month inspection cycle.',
    noteFa: 'ناحیه دریایی شدید (زون پاشش امواج)؛ سیستم پوشش دوبلکس گالوانیزه + اپوکسی دریایی (حداقل ۱۲۰ میکرون)، اتصالات تمام استیل A4-316، تابلوهای مهروموم IP66 و پایش شش‌ماهه.',
    coating: {
      hdgThicknessMicrons: 120,
      hdgStandard: 'ISO 12944-5 C5-M / ISO 1461 (≥ 120 µm Duplex)',
      coatingSystemEn: 'Offshore Marine Duplex System: HDG ≥ 100 µm + 80 µm Polyurethane/Epoxy',
      coatingSystemFa: 'سیستم دوبلکس فراساحلی دریایی: گالوانیزه گرم ≥ ۱۰۰ میکرون + ۸۰ میکرون رنگ اپوکسی/پلی‌یورتان',
      fastenersGradeEn: 'High-Moly Stainless Steel A4-80 (AISI 316L) or Duplex 2205',
      fastenersGradeFa: 'استنلس استیل مولیبدن‌بالا A4-80 (AISI 316L) یا فولاد دوپلکس ۲۲۰۵',
      enclosureRating: 'IP66 / NEMA 4X Marine Grade',
      inspectionIntervalMonths: 6,
    },
  },
};

function resolveTraceId(): string {
  return `TRC-COR-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Pure ISO 9223 classification from shoreline distance.
 */
export function classifyCorrosionCategory(distanceToSeaKm: number): Iso9223Category {
  for (const band of ISO9223_BANDS) {
    if (distanceToSeaKm <= band.maxKm) return band.category;
  }
  return 'C1';
}

/**
 * Assesses site surface drainage conditions and groundwater table (GWL) impacts.
 */
export function assessDrainageAndGroundwater(params: {
  drainageCondition?: SiteDrainageCondition;
  groundwaterDepthM?: number;
  annualRainfallMm?: number;
  soilClassification?: SoilClassification;
  distanceToSeaKm?: number;
}): SiteDrainageAssessment {
  const {
    drainageCondition: userDrainage,
    groundwaterDepthM: userGwl,
    annualRainfallMm = 200,
    soilClassification = 'dense_sand_gravel',
    distanceToSeaKm = 50,
  } = params;

  // Derive estimated drainage condition if not manually chosen
  let drainage: SiteDrainageCondition = userDrainage ?? 'well_drained';
  if (!userDrainage) {
    if (annualRainfallMm > 600 || soilClassification === 'medium_clay') {
      drainage = 'poor_flood_prone';
    } else if (annualRainfallMm > 350) {
      drainage = 'moderate';
    } else {
      drainage = 'well_drained';
    }
  }

  // Derive estimated groundwater depth if not manually specified
  let gwl = userGwl;
  if (gwl === undefined) {
    if (distanceToSeaKm <= 2.0) {
      gwl = 1.5; // High water table in coastal lowlands
    } else if (distanceToSeaKm <= 10.0) {
      gwl = 3.0;
    } else if (annualRainfallMm > 800) {
      gwl = 2.5;
    } else {
      gwl = 6.0; // Deep arid water table
    }
  }

  // Risk classification
  let waterTableRisk: 'low' | 'moderate' | 'high' = 'low';
  let waterTableRiskLabelEn = 'Deep Groundwater Table (Low Risk)';
  let waterTableRiskLabelFa = 'تراز آب زیرزمینی عمیق (ریسک پایین - پایدار)';
  const submergedSoilRisk = gwl <= 2.0;

  if (gwl <= 2.0) {
    waterTableRisk = 'high';
    waterTableRiskLabelEn = 'Shallow High Water Table (< 2.0m) - Critical Risk';
    waterTableRiskLabelFa = 'تراز آب زیرزمینی بالا و کم‌عمق (< ۲ متر) - ریسک بحرانی شناوری و خوردگی';
  } else if (gwl <= 4.0) {
    waterTableRisk = 'moderate';
    waterTableRiskLabelEn = 'Moderate Water Table (2.0 - 4.0m)';
    waterTableRiskLabelFa = 'تراز آب زیرزمینی متوسط (۲ الی ۴ متر) - پایش فصلی رطوبت';
  }

  // Engineering recommendations
  const recommendationsEn: string[] = [];
  const recommendationsFa: string[] = [];

  if (drainage === 'poor_flood_prone') {
    recommendationsEn.push(
      'Construct engineered perimeter swales and pre-cast concrete drainage ditches to convey 50-year storm runoff away from PV arrays.'
    );
    recommendationsEn.push(
      'Elevate module lower edge clearance (ground clearance) to >= 0.80 m to avoid splash-back and flood submersion.'
    );
    recommendationsFa.push(
      'احداث کانال‌های زهکشی سطحی (Drainage Swales / Ditches) بتنی پیش‌ساخته جهت هدایت رواناب سیلاب دوره بازگشت ۵۰ ساله الزامی است.'
    );
    recommendationsFa.push(
      'افزایش ارتفاع پاکینس پنل‌ها (Ground Clearance) حداقل تا ۰.۸ الی ۱.۰ متر به منظور جلوگیری از مانداب و پاشش گل‌ولای به ماژول‌ها.'
    );
  } else if (drainage === 'moderate') {
    recommendationsEn.push(
      'Implement gentle surface grading (1-2% grade) toward natural retention basins to prevent localized ponding.'
    );
    recommendationsFa.push(
      'اجرای شیب‌بندی ملایم سطحی (۱ الی ۲ درصد) به سمت حوضچه‌های آرامش طبیعی جهت ممانعت از تجمع موضعی آب باران.'
    );
  } else {
    recommendationsEn.push(
      'Site exhibits natural gravity drainage and high permeability; no heavy civil ditching required.'
    );
    recommendationsFa.push(
      'ساختگاه دارای زهکشی ثقلی طبیعی مناسب و نفوذپذیری مطلوب خاک است؛ بدون نیاز به احداث کانال‌های سنگین بتنی.'
    );
  }

  if (submergedSoilRisk) {
    recommendationsEn.push(
      'Submerged pile embedment: apply effective unit weight gamma_sub = gamma_sat - 9.81 kN/m3; increase pile depth by 15-20% to satisfy Broms lateral FoS.'
    );
    recommendationsEn.push(
      'Subterranean steel protection: apply coal-tar epoxy or bitumen coating on buried pile length to prevent underground electrolytic corrosion.'
    );
    recommendationsFa.push(
      'غوطه‌وری شمع در آب: اعمال وزن مخصوص مستغرق خاک (کاهش تنش مؤثر)؛ لزوم افزایش ۱۵ الی ۲۰ درصدی عمق کوبش شمع جهت تأمین ضریب اطمینان برومز.'
    );
    recommendationsFa.push(
      'حفاظت شمع در خاک: اجرای پوشش قیراندود اصلاح‌شده یا اپوکسی کول‌تار روی بخش مدفون شمع فولادی جهت ممانعت از خوردگی الکترولیتی زیرسطحی.'
    );
  }

  const drainageLabels = {
    well_drained: { en: 'Well-Drained (Natural Runoff)', fa: 'زهکشی عالی و رواناب طبیعی (بدون آب‌ماندگی)' },
    moderate: { en: 'Moderate Runoff & Infiltration', fa: 'زهکشی متوسط (رواناب فصلی ملایم)' },
    poor_flood_prone: { en: 'Poorly Drained / Flood Prone', fa: 'زهکشی ضعیف / مستعد آب‌گرفتگی سطحی' },
  };

  return {
    drainageCondition: drainage,
    drainageConditionLabelEn: drainageLabels[drainage].en,
    drainageConditionLabelFa: drainageLabels[drainage].fa,
    groundwaterDepthM: gwl,
    waterTableRisk,
    waterTableRiskLabelEn,
    waterTableRiskLabelFa,
    submergedSoilRisk,
    engineeringRecommendationsEn: recommendationsEn,
    engineeringRecommendationsFa: recommendationsFa,
  };
}

/**
 * Full salinity, corrosion, and drainage assessment for a site.
 */
export async function assessSaltCorrosion(input: SaltCorrosionInput): Promise<SaltCorrosionOutput> {
  const {
    latitude,
    longitude,
    distanceToSeaKm: providedDistance,
    resolveDistance = false,
    drainageCondition,
    groundwaterDepthM,
    soilClassification,
    annualRainfallMm,
  } = input;

  let distanceKm = providedDistance;
  let source: 'osm_nominatim' | 'user_entry' | 'geodesic_model' = 'user_entry';

  if (distanceKm === undefined && resolveDistance) {
    // 1. Calculate geodesic distance to nearest sea / coastline
    const geoDist = estimateGeodesicDistanceToCoastKm(latitude, longitude);

    // 2. Query Nominatim for coastal address corroboration
    try {
      const address = await ExternalDataGateway.getInstance().climateProvider.reverseGeocodeNominatim(latitude, longitude);
      const coastalKeyword = /sea|gulf|ocean|coast|shore|beach|island|khaleej|fars|bushehr|persian|caspian/.test(address.toLowerCase());
      if (coastalKeyword && geoDist > 10.0) {
        // Corroborated coastal place name overrides broader grid
        distanceKm = 0.5;
        source = 'osm_nominatim';
      } else {
        distanceKm = geoDist;
        source = 'geodesic_model';
      }
    } catch {
      distanceKm = geoDist;
      source = 'geodesic_model';
    }
  }

  if (distanceKm === undefined) {
    throw new Error(
      `SaltCorrosionEngine: distanceToSeaKm is required for site (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) — resolve via OSM/geodesic shoreline model or supply explicitly.`
    );
  }

  const category = classifyCorrosionCategory(distanceKm);
  const meta = CATEGORY_META[category];

  const drainageAssessment = assessDrainageAndGroundwater({
    drainageCondition,
    groundwaterDepthM,
    annualRainfallMm,
    soilClassification,
    distanceToSeaKm: distanceKm,
  });

  return {
    siteName: `Site (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
    latitude,
    longitude,
    distanceToSeaKm: distanceKm,
    iso9223Category: category,
    categoryLabel: meta.label,
    categoryLabelFa: meta.labelFa,
    corrosionRisk: meta.risk,
    corrosionRiskFa: meta.riskFa,
    moduleDeratePct: meta.module,
    inverterDeratePct: meta.inverter,
    structureDeratePct: meta.structure,
    maintenanceOpexAdderPct: meta.maintenance,
    durabilityNote: meta.note,
    durabilityNoteFa: meta.noteFa,
    traceId: resolveTraceId(),
    source,
    coatingRecommendation: meta.coating,
    drainageAssessment,
  };
}
