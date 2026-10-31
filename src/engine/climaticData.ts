// Climatic & Geotechnical Database for Iranian & International Design Sites
// Conforming to INBC Part 6 (مبحث ۶ مقررات ملی ساختمان), BHRC, ASCE 7-22, and SATBA Geotechnical Standards

export type SoilClassification =
  | 'dense_sand_gravel'
  | 'medium_clay'
  | 'loose_sand'
  | 'rocky_limestone';

export interface ClimateCity {
  id: string;
  nameFa: string;
  nameEn: string;
  provinceFa: string;
  provinceEn: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  peakSunHours: number; // PSH (kWh/m²/day)
  tempMinC: number;     // Extreme design minimum ambient temp
  tempMaxC: number;     // Extreme design maximum ambient temp
  albedo: number;       // Ground reflection coefficient
  soilingLossPct: number; // Expected dust/soiling loss percentage
  optimalTiltAnnualDeg: number;
  optimalTiltWinterDeg: number;
  optimalTiltSummerDeg: number;
  descriptionFa: string;
  descriptionEn: string;

  // Geotechnical & Structural Load Parameters (Editable by User)
  basicWindSpeedKmh: number;         // Basic 3-sec gust wind speed (km/h) - INBC 6 / ASCE 7
  groundSnowLoadKgM2: number;        // Ground snow load S_k (kg/m²) - INBC 6
  annualRainfallMm: number;          // Annual precipitation (mm/year)
  soilType: SoilClassification;      // Soil geotechnical category
  soilBearingCapacityKpa: number;    // Allowable soil bearing capacity q_a (kPa / kN/m²)
  soilInternalFrictionAngleDeg: number; // Angle of internal friction phi (deg)
  soilCohesionKpa: number;           // Cohesion c (kPa)
  soilDensityKnM3: number;           // Soil unit weight gamma (kN/m³)
  frostDepthCm: number;              // Seasonal frost penetration depth (cm)
  seismicZoneCoefficientA: number;   // Design base acceleration A (Standard 2800)
  dataSourceFa: string;              // Official source provenance
  dataSourceEn: string;              // Official source provenance in English
  dataRetrievalDate: string;         // Date retrieved
}

export interface SiteGeotechnicalOverrides {
  basicWindSpeedKmh?: number;
  groundSnowLoadKgM2?: number;
  annualRainfallMm?: number;
  soilType?: SoilClassification;
  soilBearingCapacityKpa?: number;
  soilInternalFrictionAngleDeg?: number;
  soilCohesionKpa?: number;
  soilDensityKnM3?: number;
  frostDepthCm?: number;
  seismicZoneCoefficientA?: number;
  customNotes?: string;
}

export const IRANIAN_CLIMATE_CITIES: ClimateCity[] = [
  {
    id: "tehran",
    nameFa: "تهران",
    nameEn: "Tehran",
    provinceFa: "تهران",
    provinceEn: "Tehran",
    latitude: 35.6892,
    longitude: 51.3890,
    elevationM: 1190,
    peakSunHours: 5.35,
    tempMinC: -10.0,
    tempMaxC: 42.0,
    albedo: 0.20,
    soilingLossPct: 4.5,
    optimalTiltAnnualDeg: 32,
    optimalTiltWinterDeg: 47,
    optimalTiltSummerDeg: 17,
    descriptionFa: "اقلیم نیمه‌خشک کوهپایه‌ای با تابش مناسب در ارتفاعات البرز جنوبی",
    descriptionEn: "Semi-arid foothill climate with high irradiance on the southern Alborz slopes.",
    basicWindSpeedKmh: 130,
    groundSnowLoadKgM2: 100,
    annualRainfallMm: 230,
    soilType: 'dense_sand_gravel',
    soilBearingCapacityKpa: 250,
    soilInternalFrictionAngleDeg: 34,
    soilCohesionKpa: 15,
    soilDensityKnM3: 18.5,
    frostDepthCm: 40,
    seismicZoneCoefficientA: 0.35,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان و مرکز تحقیقات راه، مسکن و شهرسازی (BHRC) / سازمان هواشناسی",
    dataSourceEn: "INBC Part 6 & Road, Housing and Urban Dev. Research Center (BHRC) / IRIMO",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "isfahan",
    nameFa: "اصفهان",
    nameEn: "Isfahan",
    provinceFa: "اصفهان",
    provinceEn: "Isfahan",
    latitude: 32.6546,
    longitude: 51.6680,
    elevationM: 1574,
    peakSunHours: 5.75,
    tempMinC: -8.0,
    tempMaxC: 43.0,
    albedo: 0.22,
    soilingLossPct: 4.0,
    optimalTiltAnnualDeg: 30,
    optimalTiltWinterDeg: 45,
    optimalTiltSummerDeg: 15,
    descriptionFa: "فلات مرکزی با آسمان صاف و پتانسیل فوق‌العاده نیروگاهی",
    descriptionEn: "Central plateau with clear skies and outstanding utility-scale PV potential.",
    basicWindSpeedKmh: 110,
    groundSnowLoadKgM2: 50,
    annualRainfallMm: 125,
    soilType: 'dense_sand_gravel',
    soilBearingCapacityKpa: 220,
    soilInternalFrictionAngleDeg: 33,
    soilCohesionKpa: 12,
    soilDensityKnM3: 18.0,
    frostDepthCm: 30,
    seismicZoneCoefficientA: 0.25,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / پایگاه ژئوتکنیک ساتبا",
    dataSourceEn: "INBC Part 6 / SATBA Geotechnical Database",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "shiraz",
    nameFa: "شیراز",
    nameEn: "Shiraz",
    provinceFa: "فارس",
    provinceEn: "Fars",
    latitude: 29.5926,
    longitude: 52.5836,
    elevationM: 1540,
    peakSunHours: 5.85,
    tempMinC: -5.0,
    tempMaxC: 42.0,
    albedo: 0.22,
    soilingLossPct: 3.5,
    optimalTiltAnnualDeg: 28,
    optimalTiltWinterDeg: 43,
    optimalTiltSummerDeg: 13,
    descriptionFa: "تابش عالی با دمای معتدل کوهستانی و راندمان بالای تولید",
    descriptionEn: "Excellent solar irradiance with temperate mountain climate and high cell yield.",
    basicWindSpeedKmh: 115,
    groundSnowLoadKgM2: 40,
    annualRainfallMm: 310,
    soilType: 'medium_clay',
    soilBearingCapacityKpa: 190,
    soilInternalFrictionAngleDeg: 28,
    soilCohesionKpa: 30,
    soilDensityKnM3: 17.5,
    frostDepthCm: 25,
    seismicZoneCoefficientA: 0.30,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / مرکز تحقیقات مسکن",
    dataSourceEn: "INBC Part 6 / BHRC Geotechnical Atlas",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "yazd",
    nameFa: "یزد",
    nameEn: "Yazd",
    provinceFa: "یزد",
    provinceEn: "Yazd",
    latitude: 31.8974,
    longitude: 54.3569,
    elevationM: 1230,
    peakSunHours: 6.20,
    tempMinC: -7.0,
    tempMaxC: 46.0,
    albedo: 0.25,
    soilingLossPct: 6.0,
    optimalTiltAnnualDeg: 29,
    optimalTiltWinterDeg: 44,
    optimalTiltSummerDeg: 14,
    descriptionFa: "قطب خورشیدی کشور، بالاترین روزهای آفتابی در سال با چالش حرارتی تابستان",
    descriptionEn: "National solar capital with 320+ sunny days/year and high summer thermal derate.",
    basicWindSpeedKmh: 125,
    groundSnowLoadKgM2: 25,
    annualRainfallMm: 55,
    soilType: 'loose_sand',
    soilBearingCapacityKpa: 160,
    soilInternalFrictionAngleDeg: 30,
    soilCohesionKpa: 5,
    soilDensityKnM3: 16.8,
    frostDepthCm: 15,
    seismicZoneCoefficientA: 0.25,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / اطلس تابش و ژئوتکنیک یزد",
    dataSourceEn: "INBC Part 6 / Yazd Solar & Geotech Atlas",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "kerman",
    nameFa: "کرمان",
    nameEn: "Kerman",
    provinceFa: "کرمان",
    provinceEn: "Kerman",
    latitude: 30.2839,
    longitude: 57.0834,
    elevationM: 1755,
    peakSunHours: 6.10,
    tempMinC: -12.0,
    tempMaxC: 40.0,
    albedo: 0.23,
    soilingLossPct: 5.0,
    optimalTiltAnnualDeg: 28,
    optimalTiltWinterDeg: 43,
    optimalTiltSummerDeg: 13,
    descriptionFa: "ارتفاع بالا و جو رقیق با بهترین راندمان پنل‌های خورشیدی در کشور",
    descriptionEn: "High altitude (1755m) and thin atmosphere offering supreme panel conversion efficiency.",
    basicWindSpeedKmh: 120,
    groundSnowLoadKgM2: 50,
    annualRainfallMm: 140,
    soilType: 'dense_sand_gravel',
    soilBearingCapacityKpa: 260,
    soilInternalFrictionAngleDeg: 35,
    soilCohesionKpa: 10,
    soilDensityKnM3: 19.0,
    frostDepthCm: 35,
    seismicZoneCoefficientA: 0.35,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / مرکز تحقیقات راه و مسکن",
    dataSourceEn: "INBC Part 6 / BHRC & Iranian Weather Organization",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "mashhad",
    nameFa: "مشهد",
    nameEn: "Mashhad",
    provinceFa: "خراسان رضوی",
    provinceEn: "Khorasan Razavi",
    latitude: 36.2605,
    longitude: 59.6168,
    elevationM: 995,
    peakSunHours: 5.25,
    tempMinC: -15.0,
    tempMaxC: 41.0,
    albedo: 0.20,
    soilingLossPct: 4.5,
    optimalTiltAnnualDeg: 33,
    optimalTiltWinterDeg: 48,
    optimalTiltSummerDeg: 18,
    descriptionFa: "زمستان‌های سرد (توجه به Voc حداکثر) و تابستان‌های گرم و خشک",
    descriptionEn: "Cold winters requiring strict cold Voc verification and dry warm summers.",
    basicWindSpeedKmh: 120,
    groundSnowLoadKgM2: 100,
    annualRainfallMm: 250,
    soilType: 'medium_clay',
    soilBearingCapacityKpa: 200,
    soilInternalFrictionAngleDeg: 29,
    soilCohesionKpa: 25,
    soilDensityKnM3: 18.0,
    frostDepthCm: 50,
    seismicZoneCoefficientA: 0.35,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / استاندارد ۲۸۰۰",
    dataSourceEn: "INBC Part 6 / Iranian Standard 2800 (Seismic Code)",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "tabriz",
    nameFa: "تبریز",
    nameEn: "Tabriz",
    provinceFa: "آذربایجان شرقی",
    provinceEn: "East Azerbaijan",
    latitude: 38.0800,
    longitude: 46.2919,
    elevationM: 1360,
    peakSunHours: 5.10,
    tempMinC: -18.0,
    tempMaxC: 38.0,
    albedo: 0.22,
    soilingLossPct: 3.5,
    optimalTiltAnnualDeg: 35,
    optimalTiltWinterDeg: 50,
    optimalTiltSummerDeg: 20,
    descriptionFa: "سرمای شدید زمستانه با الزام ضریب اصلاح دمایی ولتاژ Voc و بار برف سنگین",
    descriptionEn: "Extreme sub-zero winter temperatures demanding high snow design load & Voc expansion.",
    basicWindSpeedKmh: 140,
    groundSnowLoadKgM2: 150,
    annualRainfallMm: 310,
    soilType: 'rocky_limestone',
    soilBearingCapacityKpa: 350,
    soilInternalFrictionAngleDeg: 38,
    soilCohesionKpa: 50,
    soilDensityKnM3: 22.0,
    frostDepthCm: 75,
    seismicZoneCoefficientA: 0.35,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / آیین‌نامه بار برف سازمان مدیریت",
    dataSourceEn: "INBC Part 6 & PBO Snow Load Specification",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "bandar_abbas",
    nameFa: "بندرعباس",
    nameEn: "Bandar Abbas",
    provinceFa: "هرمزگان",
    provinceEn: "Hormozgan",
    latitude: 27.1832,
    longitude: 56.2666,
    elevationM: 9,
    peakSunHours: 5.50,
    tempMinC: 5.0,
    tempMaxC: 48.0,
    albedo: 0.20,
    soilingLossPct: 6.5,
    optimalTiltAnnualDeg: 25,
    optimalTiltWinterDeg: 40,
    optimalTiltSummerDeg: 10,
    descriptionFa: "اقلیم گرم و فوق‌العاده مرطوب با افت حرارتی توان Pmp و ریسک نمکی",
    descriptionEn: "Hot marine environment with high humidity, saline corrosion risk and thermal loss.",
    basicWindSpeedKmh: 140,
    groundSnowLoadKgM2: 0,
    annualRainfallMm: 170,
    soilType: 'loose_sand',
    soilBearingCapacityKpa: 140,
    soilInternalFrictionAngleDeg: 29,
    soilCohesionKpa: 0,
    soilDensityKnM3: 16.5,
    frostDepthCm: 0,
    seismicZoneCoefficientA: 0.30,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / سازمان بنادر و دریانوردی",
    dataSourceEn: "INBC Part 6 & Ports and Maritime Organization Guidelines",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "ahvaz",
    nameFa: "اهواز",
    nameEn: "Ahvaz",
    provinceFa: "خوزستان",
    provinceEn: "Khuzestan",
    latitude: 31.3183,
    longitude: 48.6706,
    elevationM: 18,
    peakSunHours: 5.60,
    tempMinC: 2.0,
    tempMaxC: 52.0,
    albedo: 0.22,
    soilingLossPct: 8.0,
    optimalTiltAnnualDeg: 28,
    optimalTiltWinterDeg: 43,
    optimalTiltSummerDeg: 13,
    descriptionFa: "بیشترین دمای تابستانه در کشور، نیاز به پنل‌های TOPCon با ضریب دمایی پایین",
    descriptionEn: "Highest recorded summer temperatures, necessitating low thermal coefficient modules.",
    basicWindSpeedKmh: 130,
    groundSnowLoadKgM2: 0,
    annualRainfallMm: 215,
    soilType: 'medium_clay',
    soilBearingCapacityKpa: 160,
    soilInternalFrictionAngleDeg: 26,
    soilCohesionKpa: 35,
    soilDensityKnM3: 17.2,
    frostDepthCm: 0,
    seismicZoneCoefficientA: 0.25,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / سازمان هواشناسی خوزستان",
    dataSourceEn: "INBC Part 6 & Khuzestan Meteorological Dept.",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "rasht",
    nameFa: "رشت",
    nameEn: "Rasht",
    provinceFa: "گیلان",
    provinceEn: "Gilan",
    latitude: 37.2808,
    longitude: 49.5832,
    elevationM: -7,
    peakSunHours: 4.10,
    tempMinC: -3.0,
    tempMaxC: 37.0,
    albedo: 0.18,
    soilingLossPct: 2.5,
    optimalTiltAnnualDeg: 34,
    optimalTiltWinterDeg: 49,
    optimalTiltSummerDeg: 19,
    descriptionFa: "اقلیم ابری کاسپین، بارندگی و رطوبت بالا با نیاز به روزهای خودمختاری بیشتر",
    descriptionEn: "Caspian cloudy regime with intense precipitation and higher battery autonomy requirement.",
    basicWindSpeedKmh: 110,
    groundSnowLoadKgM2: 120,
    annualRainfallMm: 1350,
    soilType: 'medium_clay',
    soilBearingCapacityKpa: 150,
    soilInternalFrictionAngleDeg: 24,
    soilCohesionKpa: 40,
    soilDensityKnM3: 17.0,
    frostDepthCm: 20,
    seismicZoneCoefficientA: 0.35,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / اداره کل هواشناسی گیلان",
    dataSourceEn: "INBC Part 6 & Gilan Meteorological Organization",
    dataRetrievalDate: "2024-06-15"
  },
  {
    id: "zahedan",
    nameFa: "زاهدان",
    nameEn: "Zahedan",
    provinceFa: "سیستان و بلوچستان",
    provinceEn: "Sistan and Baluchestan",
    latitude: 29.4963,
    longitude: 60.8629,
    elevationM: 1370,
    peakSunHours: 6.00,
    tempMinC: -8.0,
    tempMaxC: 44.0,
    albedo: 0.24,
    soilingLossPct: 7.0,
    optimalTiltAnnualDeg: 27,
    optimalTiltWinterDeg: 42,
    optimalTiltSummerDeg: 12,
    descriptionFa: "تابش خورشیدی استثنایی جنوب شرق، وزش بادهای ۱۲۰ روزه و نیاز به سازه مستحکم",
    descriptionEn: "Exceptional southeastern solar resource with 120-day persistent wind loads.",
    basicWindSpeedKmh: 135,
    groundSnowLoadKgM2: 25,
    annualRainfallMm: 80,
    soilType: 'dense_sand_gravel',
    soilBearingCapacityKpa: 240,
    soilInternalFrictionAngleDeg: 34,
    soilCohesionKpa: 10,
    soilDensityKnM3: 18.2,
    frostDepthCm: 20,
    seismicZoneCoefficientA: 0.30,
    dataSourceFa: "مبحث ۶ مقررات ملی ساختمان / پایگاه انرژی‌های تجدیدپذیر ساتبا",
    dataSourceEn: "INBC Part 6 & SATBA Renewable Energy Database",
    dataRetrievalDate: "2024-06-15"
  }
];

import { INTERNATIONAL_CLIMATE_HUBS } from './climate/internationalHubs';

export const INTERNATIONAL_CLIMATE_CITIES: ClimateCity[] = INTERNATIONAL_CLIMATE_HUBS;

export const ALL_CLIMATE_CITIES: ClimateCity[] = [
  ...IRANIAN_CLIMATE_CITIES,
  ...INTERNATIONAL_CLIMATE_CITIES
];

export function getEffectiveClimateCity(
  baseCity: ClimateCity,
  overrides?: SiteGeotechnicalOverrides
): ClimateCity {
  if (!overrides) return baseCity;
  return {
    ...baseCity,
    basicWindSpeedKmh: overrides.basicWindSpeedKmh ?? baseCity.basicWindSpeedKmh,
    groundSnowLoadKgM2: overrides.groundSnowLoadKgM2 ?? baseCity.groundSnowLoadKgM2,
    annualRainfallMm: overrides.annualRainfallMm ?? baseCity.annualRainfallMm,
    soilType: overrides.soilType ?? baseCity.soilType,
    soilBearingCapacityKpa: overrides.soilBearingCapacityKpa ?? baseCity.soilBearingCapacityKpa,
    soilInternalFrictionAngleDeg: overrides.soilInternalFrictionAngleDeg ?? baseCity.soilInternalFrictionAngleDeg,
    soilCohesionKpa: overrides.soilCohesionKpa ?? baseCity.soilCohesionKpa,
    soilDensityKnM3: overrides.soilDensityKnM3 ?? baseCity.soilDensityKnM3,
    frostDepthCm: overrides.frostDepthCm ?? baseCity.frostDepthCm,
    seismicZoneCoefficientA: overrides.seismicZoneCoefficientA ?? baseCity.seismicZoneCoefficientA,
  };
}
