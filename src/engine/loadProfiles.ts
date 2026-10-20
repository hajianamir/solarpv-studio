// Load Profiling & Dynamic Inrush Surge Analysis Engine
// Comprehensive Residential, Commercial, and Heavy Industrial Loads Database

export type LoadCategory =
  | 'lighting'
  | 'refrigeration'
  | 'pumping'
  | 'hvac'
  | 'washing'
  | 'it_server'
  | 'industrial_motor'
  | 'industrial_heating_welding'
  | 'mining_datacenter'
  | 'entertainment'
  | 'other';

export interface ElectricalLoadItem {
  id: string;
  name: string;
  category: LoadCategory;
  ratedWatts: number;
  surgeMultiplier: number; // e.g. 1.0 for LED, 3.0-6.5 for motors
  quantity: number;
  dayHours: number;   // 0 to 12 hours
  nightHours: number; // 0 to 12 hours
  isDc: boolean;      // AC vs DC load
}

export interface LoadAnalysisResult {
  daytimeEnergyWh: number;
  nighttimeEnergyWh: number;
  totalDailyEnergyWh: number;
  totalDailyEnergyKwh: number;
  continuousActivePowerWatts: number;
  maxSurgePeakPowerWatts: number;
  recommendedInverterContinuousWatts: number;
  recommendedInverterPeakSurgeWatts: number;
}

export interface LoadPreset {
  id: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  items: ElectricalLoadItem[];
}

export const LOAD_CATEGORY_LABELS: Record<LoadCategory, { fa: string; en: string }> = {
  lighting: { fa: 'روشنایی LED و معابر', en: 'Lighting (LED & Floodlights)' },
  refrigeration: { fa: 'یخچال، فریزر و سردخانه', en: 'Refrigeration & Cold Storage' },
  pumping: { fa: 'پمپ آب، شناور و کف‌کش', en: 'Water Pumping & Wells' },
  hvac: { fa: 'تهویه مطبوع، اسپلیت و چیلر', en: 'HVAC, Split & Chillers' },
  washing: { fa: 'ماشین لباسشویی و ظرفشویی', en: 'Washing & Dishwashers' },
  it_server: { fa: 'سرور، دوربین و دیتاسنتر', en: 'Server & IT Systems' },
  industrial_motor: { fa: 'الکتروموتورها و ماشین‌آلات دوار', en: 'Industrial Motors & Rotary' },
  industrial_heating_welding: { fa: 'جوشکاری، کوره‌های القایی و گرمایش', en: 'Welding & Thermal Heating' },
  mining_datacenter: { fa: 'ماینرهای اسیک و فارم ارز دیجیتال', en: 'Crypto Mining & ASIC Rigs' },
  entertainment: { fa: 'تلویزیون و سیستم‌های صوتی تصویری', en: 'Entertainment & Audio/Video' },
  other: { fa: 'سایر بارهای متفرقه صنعتی/خانگی', en: 'Other Industrial/Residential' },
};

// 40+ Predefined Equipment Library for fast selection
export interface StandardApplianceDefinition {
  nameFa: string;
  nameEn: string;
  category: LoadCategory;
  ratedWatts: number;
  surgeMultiplier: number;
  typicalDayHours: number;
  typicalNightHours: number;
  isDc?: boolean;
}

export const STANDARD_APPLIANCE_LIBRARY: StandardApplianceDefinition[] = [
  // --- Residential ---
  { nameFa: 'لامپ ال‌ای‌دی ۱۰ وات', nameEn: 'LED Bulb 10W', category: 'lighting', ratedWatts: 10, surgeMultiplier: 1.0, typicalDayHours: 1, typicalNightHours: 6 },
  { nameFa: 'پروژکتور ال‌ای‌دی ۵۰ وات محوطه', nameEn: 'Outdoor LED Floodlight 50W', category: 'lighting', ratedWatts: 50, surgeMultiplier: 1.0, typicalDayHours: 0, typicalNightHours: 9 },
  { nameFa: 'یخچال فریزر استاندارد اینورتر', nameEn: 'Inverter Refrigerator 140W', category: 'refrigeration', ratedWatts: 140, surgeMultiplier: 2.2, typicalDayHours: 6, typicalNightHours: 6 },
  { nameFa: 'یخچال ساید بای ساید سنتی (موتور پیستونی)', nameEn: 'Side-by-Side Piston Fridge 220W', category: 'refrigeration', ratedWatts: 220, surgeMultiplier: 4.5, typicalDayHours: 7, typicalNightHours: 7 },
  { nameFa: 'کولر آبی ۵۵۰۰ خانگی', nameEn: 'Evaporative Cooler 5500 (1/2 HP)', category: 'hvac', ratedWatts: 550, surgeMultiplier: 3.5, typicalDayHours: 8, typicalNightHours: 6 },
  { nameFa: 'اسپلیت اینورتر ۱۲۰۰۰ (کم‌مصرف)', nameEn: '12000 BTU Inverter Split AC', category: 'hvac', ratedWatts: 1100, surgeMultiplier: 2.0, typicalDayHours: 6, typicalNightHours: 4 },
  { nameFa: 'اسپلیت اینورتر ۲۴۰۰۰', nameEn: '24000 BTU Inverter Split AC', category: 'hvac', ratedWatts: 2200, surgeMultiplier: 2.2, typicalDayHours: 7, typicalNightHours: 5 },
  { nameFa: 'اسپلیت معمولی ۳۰۰۰۰ (غیر اینورتر)', nameEn: '30000 BTU Standard Split (Non-Inverter)', category: 'hvac', ratedWatts: 3100, surgeMultiplier: 4.5, typicalDayHours: 6, typicalNightHours: 4 },
  { nameFa: 'پمپ آب خانگی ۱ اسب تحت فشار', nameEn: 'Domestic Booster Pump 1 HP', category: 'pumping', ratedWatts: 750, surgeMultiplier: 4.0, typicalDayHours: 2, typicalNightHours: 1 },
  { nameFa: 'پمپ تصفیه استخر ۱.۵ اسب', nameEn: 'Pool Filtration Pump 1.5 HP', category: 'pumping', ratedWatts: 1100, surgeMultiplier: 3.5, typicalDayHours: 4, typicalNightHours: 2 },
  { nameFa: 'ماشین لباسشویی با المنت حرارتی', nameEn: 'Washing Machine with Heater', category: 'washing', ratedWatts: 1800, surgeMultiplier: 1.8, typicalDayHours: 1.5, typicalNightHours: 0 },
  { nameFa: 'ماشین ظرفشویی ۱۴ نفره', nameEn: 'Dishwasher 14-Place', category: 'washing', ratedWatts: 1500, surgeMultiplier: 1.5, typicalDayHours: 1.5, typicalNightHours: 0 },
  { nameFa: 'تلویزیون ۵۵ اینچ و سینمای خانگی', nameEn: 'Smart TV 55" & Audio', category: 'entertainment', ratedWatts: 140, surgeMultiplier: 1.1, typicalDayHours: 3, typicalNightHours: 5 },
  { nameFa: 'شارژر خودرو برقی تک‌فاز ۷ کیلووات (EVSE)', nameEn: 'EV Charger Level 2 (7 kW)', category: 'other', ratedWatts: 7000, surgeMultiplier: 1.0, typicalDayHours: 4, typicalNightHours: 2 },
  { nameFa: 'پکیج مداربسته و دزدگیر ویلا (۱۲ ولت DC)', nameEn: 'CCTV & Security NVR (12V DC)', category: 'it_server', ratedWatts: 50, surgeMultiplier: 1.0, typicalDayHours: 12, typicalNightHours: 12, isDc: true },

  // --- Industrial & Commercial ---
  { nameFa: 'الکتروموتور سه فاز ۵.۵ کیلووات (راه‌اندازی مستقیم DOL)', nameEn: '3-Phase Motor 5.5 kW (DOL 6.0x Surge)', category: 'industrial_motor', ratedWatts: 5500, surgeMultiplier: 6.0, typicalDayHours: 7, typicalNightHours: 1 },
  { nameFa: 'الکتروموتور سه فاز ۱۱ کیلووات (ستاره-مثلث)', nameEn: '3-Phase Motor 11 kW (Star-Delta 3.0x)', category: 'industrial_motor', ratedWatts: 11000, surgeMultiplier: 3.2, typicalDayHours: 7, typicalNightHours: 0 },
  { nameFa: 'الکتروموتور سه فاز ۲۲ کیلووات (اینورتر درایو VFD)', nameEn: '3-Phase Motor 22 kW (VFD 1.3x)', category: 'industrial_motor', ratedWatts: 22000, surgeMultiplier: 1.3, typicalDayHours: 8, typicalNightHours: 0 },
  { nameFa: 'الکتروموتور سه فاز ۴۵ کیلووات صنعتی', nameEn: '3-Phase Heavy Motor 45 kW (Soft Start)', category: 'industrial_motor', ratedWatts: 45000, surgeMultiplier: 2.2, typicalDayHours: 8, typicalNightHours: 4 },
  { nameFa: 'کمپرسور باد اسکرو صنعتی ۲۲ کیلووات', nameEn: 'Rotary Screw Compressor 22 kW', category: 'industrial_motor', ratedWatts: 22000, surgeMultiplier: 2.5, typicalDayHours: 8, typicalNightHours: 0 },
  { nameFa: 'کمپرسور باد پیستونی ۳۵۰ لیتری (۳ اسب)', nameEn: 'Piston Air Compressor 3 HP', category: 'industrial_motor', ratedWatts: 2200, surgeMultiplier: 4.5, typicalDayHours: 4, typicalNightHours: 0 },
  { nameFa: 'دستگاه تراشکاری CNC سه محوره', nameEn: 'CNC Lathe / Milling 3-Axis 15 kW', category: 'industrial_motor', ratedWatts: 15000, surgeMultiplier: 1.5, typicalDayHours: 8, typicalNightHours: 0 },
  { nameFa: 'دستگاه تزریق پلاستیک ۳۰ کیلووات', nameEn: 'Plastic Injection Molding 30 kW', category: 'industrial_motor', ratedWatts: 30000, surgeMultiplier: 2.5, typicalDayHours: 10, typicalNightHours: 6 },
  { nameFa: 'دستگاه جوشکاری اینورتری صنعتی ۲۵۰ آمپر', nameEn: 'Industrial Inverter Welder 250A', category: 'industrial_heating_welding', ratedWatts: 6000, surgeMultiplier: 1.4, typicalDayHours: 4, typicalNightHours: 0 },
  { nameFa: 'ترانس جوش نقطه‌ای صنعتی (مقاومتی)', nameEn: 'Resistance Spot Welder 18 kW', category: 'industrial_heating_welding', ratedWatts: 18000, surgeMultiplier: 3.8, typicalDayHours: 2, typicalNightHours: 0 },
  { nameFa: 'کوره عملیات حرارتی المنتی ۲۵ کیلووات', nameEn: 'Electric Resistance Furnace 25 kW', category: 'industrial_heating_welding', ratedWatts: 25000, surgeMultiplier: 1.0, typicalDayHours: 6, typicalNightHours: 2 },
  { nameFa: 'کمپرسور سردخانه آمونیاک/فریون ۳۵ کیلووات', nameEn: 'Cold Storage Refrigeration Rack 35 kW', category: 'refrigeration', ratedWatts: 35000, surgeMultiplier: 3.5, typicalDayHours: 8, typicalNightHours: 8 },
  { nameFa: 'پمپ شناور چاه عمیق کشاورزی (۳۰ اسب بخار)', nameEn: 'Deep-Well Agricultural Pump 30 HP (22 kW)', category: 'pumping', ratedWatts: 22000, surgeMultiplier: 4.2, typicalDayHours: 8, typicalNightHours: 2 },
  { nameFa: 'پمپ شناور چاه عمیق با درایو خورشیدی (۵۰ اسب)', nameEn: 'Solar VFD Deep-Well Pump 50 HP (37 kW)', category: 'pumping', ratedWatts: 37000, surgeMultiplier: 1.2, typicalDayHours: 7, typicalNightHours: 0 },
  { nameFa: 'جرثقیل سقفی کارگاهی ۵ تن', nameEn: 'Overhead Bridge Crane 5-Ton (7.5 kW)', category: 'industrial_motor', ratedWatts: 7500, surgeMultiplier: 3.0, typicalDayHours: 2, typicalNightHours: 0 },
  { nameFa: 'فن اگزاست صنعتی سوله و آلودگی‌زدا', nameEn: 'Industrial Exhaust Blower 4 kW', category: 'industrial_motor', ratedWatts: 4000, surgeMultiplier: 2.5, typicalDayHours: 9, typicalNightHours: 2 },
  { nameFa: 'ماینر بیت‌کوین Whatsminer M30S / Antminer S19 (۳.۴ کیلووات)', nameEn: 'Bitcoin ASIC Miner (3.4 kW 24/7)', category: 'mining_datacenter', ratedWatts: 3400, surgeMultiplier: 1.0, typicalDayHours: 12, typicalNightHours: 12 },
  { nameFa: 'رک سرور دیتاسنتر و یوپی‌اس ۵ کیلووات دائم', nameEn: 'Server Rack & Online UPS 5 kW (24/7)', category: 'it_server', ratedWatts: 5000, surgeMultiplier: 1.0, typicalDayHours: 12, typicalNightHours: 12 },
  { nameFa: 'برج روشنایی کارگاهی ۴×۱۰۰۰ وات متال هالید', nameEn: 'Workshop Light Tower 4x1000W Metal Halide', category: 'lighting', ratedWatts: 4400, surgeMultiplier: 1.8, typicalDayHours: 0, typicalNightHours: 10 },
];

export const LOAD_PRESETS: LoadPreset[] = [
  {
    id: 'preset_low',
    nameFa: 'پکیج مصرف کم (خانه باغ / کلبه عشایری)',
    nameEn: 'Low Consumption (Garden / Cabin)',
    descriptionFa: 'روشنایی کم‌مصرف، شارژ گوشی و تلویزیون کوچک برای مصارف پایه',
    descriptionEn: 'Basic LED lighting, smartphone chargers, and a small DC/AC fridge.',
    items: [
      { id: '1', name: 'لامپ‌های ال‌ای‌دی ۱۰ وات', category: 'lighting', ratedWatts: 10, surgeMultiplier: 1.0, quantity: 6, dayHours: 1, nightHours: 5, isDc: false },
      { id: '2', name: 'یخچال کوچک ۵ فوت کم‌مصرف', category: 'refrigeration', ratedWatts: 80, surgeMultiplier: 3.5, quantity: 1, dayHours: 6, nightHours: 6, isDc: false },
      { id: '3', name: 'تلویزیون ۳۲ اینچ LED', category: 'entertainment', ratedWatts: 60, surgeMultiplier: 1.2, quantity: 1, dayHours: 2, nightHours: 4, isDc: false },
      { id: '4', name: 'شارژر موبایل و مودم', category: 'it_server', ratedWatts: 25, surgeMultiplier: 1.0, quantity: 2, dayHours: 4, nightHours: 4, isDc: false },
    ]
  },
  {
    id: 'preset_medium',
    nameFa: 'پکیج مسکونی متوسط (آپارتمان / خانه ۲ خوابه)',
    nameEn: 'Medium Residential (2-Bedroom House)',
    descriptionFa: 'مصرف معمول خانواده شامل یخچال ساید، تلویزیون، روشنایی و پمپ آب ساختمانی',
    descriptionEn: 'Standard residential load with inverter fridge, TV, lighting, booster pump.',
    items: [
      { id: '1', name: 'روشنایی عمومی LED', category: 'lighting', ratedWatts: 15, surgeMultiplier: 1.0, quantity: 12, dayHours: 2, nightHours: 6, isDc: false },
      { id: '2', name: 'یخچال و فریزر ساید بای ساید اینورتر', category: 'refrigeration', ratedWatts: 160, surgeMultiplier: 3.0, quantity: 1, dayHours: 6, nightHours: 6, isDc: false },
      { id: '3', name: 'تلویزیون ۵۵ اینچ و گیرنده', category: 'entertainment', ratedWatts: 120, surgeMultiplier: 1.1, quantity: 1, dayHours: 3, nightHours: 5, isDc: false },
      { id: '4', name: 'پمپ آب تحت فشار خانگی (۰.۵ اسب)', category: 'pumping', ratedWatts: 375, surgeMultiplier: 3.5, quantity: 1, dayHours: 1.5, nightHours: 1.0, isDc: false },
      { id: '5', name: 'ماشین لباسشویی (شستشوی هفتگی)', category: 'washing', ratedWatts: 1200, surgeMultiplier: 2.0, quantity: 1, dayHours: 1.0, nightHours: 0.0, isDc: false },
      { id: '6', name: 'لپ‌تاپ و تجهیزات شبکه Wi-Fi', category: 'it_server', ratedWatts: 90, surgeMultiplier: 1.0, quantity: 2, dayHours: 6, nightHours: 4, isDc: false },
    ]
  },
  {
    id: 'preset_high',
    nameFa: 'پکیج مسکونی پرمصرف (با اسپلیت ۲۴۰۰۰ اینورتر)',
    nameEn: 'High Residential (With 24k Inverter Split)',
    descriptionFa: 'شامل اسپلیت ۲۴۰۰۰، یخچال ساید، پمپ آب، ماشین ظرفشویی و کلیه لوازم رفاهی',
    descriptionEn: 'High residential consumption with 24000 BTU split AC, booster pump, laundry.',
    items: [
      { id: '1', name: 'روشنایی کامل LED ساختمان', category: 'lighting', ratedWatts: 15, surgeMultiplier: 1.0, quantity: 20, dayHours: 3, nightHours: 6, isDc: false },
      { id: '2', name: 'یخچال و فریزر ۲ قلو اینورتر', category: 'refrigeration', ratedWatts: 200, surgeMultiplier: 3.2, quantity: 1, dayHours: 7, nightHours: 7, isDc: false },
      { id: '3', name: 'کولر گازی اسپلیت ۲۴۰۰۰ اینورتر', category: 'hvac', ratedWatts: 2200, surgeMultiplier: 2.2, quantity: 1, dayHours: 6, nightHours: 4, isDc: false },
      { id: '4', name: 'پمپ آب ۱ اسب مخزن', category: 'pumping', ratedWatts: 750, surgeMultiplier: 4.0, quantity: 1, dayHours: 2, nightHours: 1, isDc: false },
      { id: '5', name: 'ماشین لباسشویی و ظرفشویی', category: 'washing', ratedWatts: 1500, surgeMultiplier: 1.5, quantity: 1, dayHours: 1.5, nightHours: 0, isDc: false },
      { id: '6', name: 'تلویزیون و سیستم صوتی خانگی', category: 'entertainment', ratedWatts: 180, surgeMultiplier: 1.2, quantity: 1, dayHours: 4, nightHours: 5, isDc: false },
    ]
  },
  {
    id: 'preset_villa',
    nameFa: 'پکیج ویلایی تفریحی (با استخر و پمپ چاه)',
    nameEn: 'Luxury Villa (Pool Filter & Well Pump)',
    descriptionFa: 'ویژه ویلاهای حومه شهرها با پمپ چاه کشاورزی، تصفیه استخر و روشنایی محوطه',
    descriptionEn: 'Luxury country villa with submersible well pump, pool circulation, security cameras.',
    items: [
      { id: '1', name: 'روشنایی ویلا و پروژکتورهای محوطه', category: 'lighting', ratedWatts: 30, surgeMultiplier: 1.0, quantity: 15, dayHours: 1, nightHours: 8, isDc: false },
      { id: '2', name: 'پمپ شناور چاه آب (۲ اسب بخار)', category: 'pumping', ratedWatts: 1500, surgeMultiplier: 4.5, quantity: 1, dayHours: 3, nightHours: 0, isDc: false },
      { id: '3', name: 'پمپ سیرکولاتور تصفیه استخر (۱ اسب)', category: 'pumping', ratedWatts: 750, surgeMultiplier: 3.5, quantity: 1, dayHours: 4, nightHours: 2, isDc: false },
      { id: '4', name: 'اسپلیت ۲۴۰۰۰ اینورتر سالن', category: 'hvac', ratedWatts: 2200, surgeMultiplier: 2.2, quantity: 1, dayHours: 5, nightHours: 4, isDc: false },
      { id: '5', name: 'یخچال بزرگ و باربیکیو برقی', category: 'refrigeration', ratedWatts: 220, surgeMultiplier: 3.5, quantity: 1, dayHours: 6, nightHours: 6, isDc: false },
      { id: '6', name: 'دوربین‌های مداربسته و دزدگیر ویلا', category: 'it_server', ratedWatts: 60, surgeMultiplier: 1.0, quantity: 1, dayHours: 12, nightHours: 12, isDc: true },
    ]
  },
  {
    id: 'preset_workshop',
    nameFa: 'کارگاه ماشین‌کاری و فلزکاری سبک',
    nameEn: 'Industrial Metal & Machine Workshop',
    descriptionFa: 'کارگاه تولیدی با موتورهای جوشکاری، دریل ستونی، کمپرسور باد و روشنایی سوله',
    descriptionEn: 'Manufacturing workshop with welders, drill press, 22kW screw compressor.',
    items: [
      { id: '1', name: 'روشنایی صنعتی سوله LED', category: 'lighting', ratedWatts: 50, surgeMultiplier: 1.0, quantity: 12, dayHours: 8, nightHours: 2, isDc: false },
      { id: '2', name: 'کمپرسور باد صنعتی اسکرو (۱۵ اسب / ۱۱ کیلووات)', category: 'industrial_motor', ratedWatts: 11000, surgeMultiplier: 2.5, quantity: 1, dayHours: 6, nightHours: 0, isDc: false },
      { id: '3', name: 'اینورتر جوشکاری صنعتی ۲۵۰ آمپر', category: 'industrial_heating_welding', ratedWatts: 6000, surgeMultiplier: 1.4, quantity: 2, dayHours: 3, nightHours: 0, isDc: false },
      { id: '4', name: 'دستگاه تراشکاری و سنگ مغناطیسی', category: 'industrial_motor', ratedWatts: 5500, surgeMultiplier: 2.8, quantity: 1, dayHours: 4, nightHours: 0, isDc: false },
      { id: '5', name: 'فن‌های تهویه اگزاست سوله', category: 'hvac', ratedWatts: 750, surgeMultiplier: 2.5, quantity: 3, dayHours: 8, nightHours: 1, isDc: false },
    ]
  },
  {
    id: 'preset_plastic_factory',
    nameFa: 'کارخانه تزریق پلاستیک و قطعه‌سازی',
    nameEn: 'Plastic Injection Molding Plant',
    descriptionFa: 'شامل دستگاه‌های هیدرولیک تزریق، خنک‌کننده چیلر، آسیاب و کمپرسور باد ۲۴ ساعته',
    descriptionEn: 'Plastic manufacturing facility with hydraulic presses, industrial chiller, and resin dryers.',
    items: [
      { id: '1', name: 'دستگاه تزریق پلاستیک ۱۸۰ تن (موتور اصلی)', category: 'industrial_motor', ratedWatts: 22000, surgeMultiplier: 2.5, quantity: 2, dayHours: 10, nightHours: 6, isDc: false },
      { id: '2', name: 'چیلر تراکمی خنک‌کاری قالب‌ها', category: 'hvac', ratedWatts: 15000, surgeMultiplier: 3.0, quantity: 1, dayHours: 10, nightHours: 6, isDc: false },
      { id: '3', name: 'کمپرسور باد اسکرو ۲۲ کیلووات', category: 'industrial_motor', ratedWatts: 22000, surgeMultiplier: 2.2, quantity: 1, dayHours: 10, nightHours: 4, isDc: false },
      { id: '4', name: 'آسیاب پلاستیک بازیافتی ۷.۵ کیلووات', category: 'industrial_motor', ratedWatts: 7500, surgeMultiplier: 3.5, quantity: 1, dayHours: 4, nightHours: 0, isDc: false },
      { id: '5', name: 'روشنایی سالن و فن‌های خروجی', category: 'lighting', ratedWatts: 100, surgeMultiplier: 1.0, quantity: 20, dayHours: 12, nightHours: 8, isDc: false },
    ]
  },
  {
    id: 'preset_cold_storage',
    nameFa: 'واحد سردخانه مواد غذایی صنعتی',
    nameEn: 'Industrial Cold Storage Facility',
    descriptionFa: 'کمپرسورهای برودتی سنگین زیر صفر و بالای صفر، اواپراتورها و کندانسورهای هوایی',
    descriptionEn: 'Commercial cold storage with heavy refrigeration racks and blast freezing units.',
    items: [
      { id: '1', name: 'کمپرسور رک برودتی فریونی ۳۵ کیلووات', category: 'refrigeration', ratedWatts: 35000, surgeMultiplier: 3.5, quantity: 2, dayHours: 8, nightHours: 8, isDc: false },
      { id: '2', name: 'فن‌های کندانسور هوایی بام', category: 'industrial_motor', ratedWatts: 1500, surgeMultiplier: 2.5, quantity: 4, dayHours: 9, nightHours: 7, isDc: false },
      { id: '3', name: 'المنت‌های دیفراست اواپراتور', category: 'industrial_heating_welding', ratedWatts: 8000, surgeMultiplier: 1.0, quantity: 2, dayHours: 1, nightHours: 2, isDc: false },
      { id: '4', name: 'روشنایی سردخانه ضد رطوبت LED', category: 'lighting', ratedWatts: 40, surgeMultiplier: 1.0, quantity: 15, dayHours: 4, nightHours: 4, isDc: false },
      { id: '5', name: 'درب‌های برقی و لیفتراک شارژی', category: 'other', ratedWatts: 4000, surgeMultiplier: 1.5, quantity: 1, dayHours: 5, nightHours: 1, isDc: false },
    ]
  },
  {
    id: 'preset_poultry',
    nameFa: 'مرغداری صنعتی مکانیزه (۲۰,۰۰۰ قطعه)',
    nameEn: 'Automated Industrial Poultry Farm',
    descriptionFa: 'بارهای مداوم فن‌های تهویه اگزاست، مهپاش، دانخوری اتوماتیک و روشنایی سالن',
    descriptionEn: 'Automated poultry house with exhaust tunnel fans, cooling pads, and feeding augers.',
    items: [
      { id: '1', name: 'فن‌های تهویه اگزاست ۱۴۰ (۱.۵ اسب)', category: 'hvac', ratedWatts: 1100, surgeMultiplier: 3.2, quantity: 6, dayHours: 8, nightHours: 6, isDc: false },
      { id: '2', name: 'پمپ مهپاش و سرمایش پد سلولزی', category: 'pumping', ratedWatts: 1500, surgeMultiplier: 4.0, quantity: 1, dayHours: 6, nightHours: 0, isDc: false },
      { id: '3', name: 'موتور گیربکس خطوط دانخوری اتوماتیک', category: 'industrial_motor', ratedWatts: 750, surgeMultiplier: 3.0, quantity: 3, dayHours: 3, nightHours: 1, isDc: false },
      { id: '4', name: 'روشنایی دیمردار سالن‌های پرورش', category: 'lighting', ratedWatts: 18, surgeMultiplier: 1.0, quantity: 40, dayHours: 6, nightHours: 8, isDc: false },
      { id: '5', name: 'سیستم اتوماسیون و مانیتورینگ اقلیمی', category: 'it_server', ratedWatts: 120, surgeMultiplier: 1.0, quantity: 1, dayHours: 12, nightHours: 12, isDc: false },
    ]
  },
  {
    id: 'preset_mining_datacenter',
    nameFa: 'فارم استخراج رمزارز / دیتاسنتر',
    nameEn: 'Crypto Mining Farm & Datacenter',
    descriptionFa: 'بارهای دائم ۲۴ ساعته شامل دستگاه‌های ماینر اسیک و تهویه صنعتی فن حلزونی',
    descriptionEn: 'Continuous 24/7 high-density compute loads with ASIC miners and active ventilation.',
    items: [
      { id: '1', name: 'ماینرهای اسیک ۳.۴ کیلووات (ASIC Miners)', category: 'mining_datacenter', ratedWatts: 3400, surgeMultiplier: 1.0, quantity: 15, dayHours: 12, nightHours: 12, isDc: false },
      { id: '2', name: 'فن‌های حلزونی تخلیه حرارت سوله', category: 'industrial_motor', ratedWatts: 1100, surgeMultiplier: 2.5, quantity: 4, dayHours: 12, nightHours: 12, isDc: false },
      { id: '3', name: 'روتربرد شبکه سیسکو و سوییچ‌های گیگابیت', category: 'it_server', ratedWatts: 350, surgeMultiplier: 1.0, quantity: 1, dayHours: 12, nightHours: 12, isDc: false },
      { id: '4', name: 'سیستم اطفا حریق و دوربین‌های امنیتی', category: 'it_server', ratedWatts: 120, surgeMultiplier: 1.0, quantity: 1, dayHours: 12, nightHours: 12, isDc: true },
    ]
  }
];

export function analyzeLoadProfile(items: ElectricalLoadItem[]): LoadAnalysisResult {
  let daytimeEnergyWh = 0;
  let nighttimeEnergyWh = 0;
  let continuousActivePowerWatts = 0;

  // Track motor loads for realistic surge concurrency
  const motorLoads: { name: string; basePower: number; surgePower: number }[] = [];
  let nonMotorPeak = 0;

  for (const item of items) {
    const totalWatts = item.ratedWatts * item.quantity;
    daytimeEnergyWh += totalWatts * Math.min(12, item.dayHours);
    nighttimeEnergyWh += totalWatts * Math.min(12, item.nightHours);

    // Sum running power
    if (item.dayHours > 0 || item.nightHours > 0) {
      continuousActivePowerWatts += totalWatts;
    }

    if (item.surgeMultiplier > 1.2) {
      motorLoads.push({
        name: item.name,
        basePower: totalWatts,
        surgePower: totalWatts * item.surgeMultiplier,
      });
    } else {
      nonMotorPeak += totalWatts;
    }
  }

  // Calculate realistic simultaneous peak surge:
  // IEC / IEEE standard concurrency: The largest motor starts while other running motors operate at base power
  let maxSurgePeakPowerWatts = continuousActivePowerWatts;
  if (motorLoads.length > 0) {
    // Sort descending by surge delta
    motorLoads.sort((a, b) => (b.surgePower - b.basePower) - (a.surgePower - a.basePower));
    const largestMotor = motorLoads[0];
    const otherMotorsBase = motorLoads.slice(1).reduce((sum, m) => sum + m.basePower, 0);
    maxSurgePeakPowerWatts = largestMotor.surgePower + otherMotorsBase + nonMotorPeak;
  }

  const totalDailyEnergyWh = daytimeEnergyWh + nighttimeEnergyWh;
  const totalDailyEnergyKwh = totalDailyEnergyWh / 1000.0;

  // Inverter selection rule of thumb with 25% safety margin
  const recommendedInverterContinuousWatts = Math.ceil((continuousActivePowerWatts * 1.25) / 100) * 100;
  const recommendedInverterPeakSurgeWatts = Math.ceil((maxSurgePeakPowerWatts * 1.2) / 100) * 100;

  return {
    daytimeEnergyWh,
    nighttimeEnergyWh,
    totalDailyEnergyWh,
    totalDailyEnergyKwh,
    continuousActivePowerWatts,
    maxSurgePeakPowerWatts,
    recommendedInverterContinuousWatts,
    recommendedInverterPeakSurgeWatts,
  };
}
