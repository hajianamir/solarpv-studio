// Climatic Database for Iranian & International Design Sites
export interface ClimateCity {
  id: string;
  nameFa: string;
  nameEn: string;
  provinceFa: string;
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
}

export const IRANIAN_CLIMATE_CITIES: ClimateCity[] = [
  {
    id: "tehran",
    nameFa: "تهران",
    nameEn: "Tehran",
    provinceFa: "تهران",
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
    descriptionFa: "اقلیم نیمه‌خشک کوهپایه‌ای با تابش مناسب در ارتفاعات البرز جنوبی"
  },
  {
    id: "isfahan",
    nameFa: "اصفهان",
    nameEn: "Isfahan",
    provinceFa: "اصفهان",
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
    descriptionFa: "فلات مرکزی با آسمان صاف و پتانسیل فوق‌العاده نیروگاهی"
  },
  {
    id: "shiraz",
    nameFa: "شیراز",
    nameEn: "Shiraz",
    provinceFa: "فارس",
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
    descriptionFa: "تابش عالی با دمای معتدل کوهستانی و راندمان بالای تولید"
  },
  {
    id: "yazd",
    nameFa: "یزد",
    nameEn: "Yazd",
    provinceFa: "یزد",
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
    descriptionFa: "قطب خورشیدی کشور، بالاترین روزهای آفتابی در سال با چالش حرارتی تابستان"
  },
  {
    id: "kerman",
    nameFa: "کرمان",
    nameEn: "Kerman",
    provinceFa: "کرمان",
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
    descriptionFa: "ارتفاع بالا و جو رقیق با بهترین راندمان پنل‌های خورشیدی در کشور"
  },
  {
    id: "mashhad",
    nameFa: "مشهد",
    nameEn: "Mashhad",
    provinceFa: "خراسان رضوی",
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
    descriptionFa: "زمستان‌های سرد (توجه به Voc حداکثر) و تابستان‌های گرم و خشک"
  },
  {
    id: "tabriz",
    nameFa: "تبریز",
    nameEn: "Tabriz",
    provinceFa: "آذربایجان شرقی",
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
    descriptionFa: "سرمای شدید زمستانه با الزام ضریب اصلاح دمایی ولتاژ Voc"
  },
  {
    id: "bandar_abbas",
    nameFa: "بندرعباس",
    nameEn: "Bandar Abbas",
    provinceFa: "هرمزگان",
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
    descriptionFa: "اقلیم گرم و فوق‌العاده مرطوب با افت حرارتی توان Pmp و ریسک نمکی"
  },
  {
    id: "ahvaz",
    nameFa: "اهواز",
    nameEn: "Ahvaz",
    provinceFa: "خوزستان",
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
    descriptionFa: "بیشترین دمای تابستانه در کشور، نیاز به پنل‌های TOPCon با ضریب دمایی پایین"
  },
  {
    id: "rasht",
    nameFa: "رشت",
    nameEn: "Rasht",
    provinceFa: "گیلان",
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
    descriptionFa: "اقلیم ابری کاسپین، نیاز به محاسبه روزهای خودمختاری بیشتر برای باتری"
  },
  {
    id: "zahedan",
    nameFa: "زاهدان",
    nameEn: "Zahedan",
    provinceFa: "سیستان و بلوچستان",
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
    descriptionFa: "تابش خورشیدی استثنایی جنوب شرق، وزش بادهای ۱۲۰ روزه و نیاز به شستشو"
  }
];
