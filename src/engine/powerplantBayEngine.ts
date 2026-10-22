// Powerplant MV Bay & Inverter Technology Architecture Engine
// Designs utility-scale solar farms into modular MV Bays (Power Blocks)
// connected to a Medium-Voltage Main Collector Busbar (20 kV / 33 kV)

export type InverterTechnology = 'string_inverter' | 'mv_turnkey';

export interface MvBayDefinition {
  bayIndex: number;
  bayNameFa: string;
  bayNameEn: string;
  technology: InverterTechnology;
  allocatedDcCapacityMwp: number;
  allocatedAcCapacityMw: number;
  inverterCount: number;
  inverterModelName: string;
  inverterUnitRatingKw: number;
  transformerRatingMva: number;
  transformerVoltageRatio: string; // e.g. "0.8 kV / 20 kV" or "0.6 kV / 20 kV"
  transformerImpedancePct: number; // typically 6.0%
  mvOutputVoltageKv: number; // 20 kV or 33 kV
  mvRatedCurrentAmps: number;
  mvBreakerRating: string; // e.g. "VCB 630A / 24kV, 25kA"
  protectiveRelays: string[]; // ANSI 50/51, 50N/51N, 27/59, 81O/81U, 49
  collectorCableSpec: string; // e.g. "3x(1x185 mm²) AL/XLPE/SWA/PVC 20kV"
}

export interface PowerplantBayArchitectureResult {
  technology: InverterTechnology;
  totalPlantCapacityMw: number;
  totalPvCapacityMwp: number;
  mvCollectorVoltageKv: number;
  optimalBaysCount: number;
  actualBaysCount: number;
  bayUnitCapacityMw: number;
  bays: MvBayDefinition[];
  mainCollectorBusbar: {
    voltageKv: number;
    totalActivePowerMw: number;
    totalNominalCurrentAmps: number;
    recommendedBusbarRatingAmps: number; // e.g. 1250A or 2000A
    incomingBayFeedersCount: number;
    auxiliaryTransformerBayCount: number;
    meteringBayCount: number;
    outgoingLineBayCount: number;
    totalSubstationCubicles: number;
  };
  keyAdvantagesFa: string[];
  keyAdvantagesEn: string[];
}

export function designPowerplantBays(
  plantCapacityMw: number,
  pvDcCapacityMwp: number,
  technology: InverterTechnology = 'string_inverter',
  customBaysCount?: number,
  mvCollectorVoltageKv: number = 20, // 20 kV standard in Iran Tavanir/SATBA grid
  inverterUnitKw?: number
): PowerplantBayArchitectureResult {
  const safeCapacityMw = Math.max(0.5, plantCapacityMw || 5.0);
  const safeDcMwp = Math.max(safeCapacityMw * 1.05, pvDcCapacityMwp || safeCapacityMw * 1.25);
  const mvKv = mvCollectorVoltageKv || 20;

  // 1. Inverter unit specs based on technology
  let defaultUnitKw = 330; // Huawei / Sungrow 330kW string inverter
  let unitModelName = 'Huawei SUN2000-330KTL-H1 / Sungrow SG350HX (330 kW)';
  let lowVoltageAc = 0.8; // 800V AC

  if (technology === 'mv_turnkey') {
    defaultUnitKw = safeCapacityMw >= 6.0 ? 3125 : 2500; // 3.125 MW or 2.5 MW central station
    unitModelName = safeCapacityMw >= 6.0
      ? 'Sungrow SG3125HV-MV Turnkey Skid Station (3.125 MW / 20kV)'
      : 'TMEIC / Fimer Solar Ware MV Compact Station (2.5 MW / 20kV)';
    lowVoltageAc = 0.6; // 600V or 630V AC
  }

  const effectiveUnitKw = inverterUnitKw || defaultUnitKw;

  // 2. Optimal Bay Sizing
  // Standard power block in utility engineering is ~2.5 MW to ~3.5 MW per MV Bay
  let optimalBays = 1;
  if (technology === 'mv_turnkey') {
    optimalBays = Math.max(1, Math.round(safeCapacityMw / (effectiveUnitKw / 1000.0)));
  } else {
    // String Inverters: optimal 2.5 MW - 3.3 MW per transformer block
    optimalBays = Math.max(1, Math.round(safeCapacityMw / 3.0));
  }

  const actualBaysCount = Math.max(1, customBaysCount || optimalBays);
  const bayCapacityMw = safeCapacityMw / actualBaysCount;
  const bayDcMwp = safeDcMwp / actualBaysCount;

  // 3. Build each Bay
  const bays: MvBayDefinition[] = [];
  for (let i = 1; i <= actualBaysCount; i++) {
    const bayInverterCount = technology === 'mv_turnkey'
      ? 1
      : Math.max(1, Math.ceil((bayCapacityMw * 1000.0) / effectiveUnitKw));

    const transformerRatingMva = Number((bayCapacityMw * 1.15).toFixed(2)); // 15% margin
    const mvCurrentAmps = Number(
      ((bayCapacityMw * 1000.0) / (Math.sqrt(3) * mvKv)).toFixed(1)
    );

    bays.push({
      bayIndex: i,
      bayNameFa: `بی MV بلوک قدرت شماره ${i} (Power Block Bay #${i})`,
      bayNameEn: `MV Power Block Bay #${i}`,
      technology,
      allocatedDcCapacityMwp: Number(bayDcMwp.toFixed(3)),
      allocatedAcCapacityMw: Number(bayCapacityMw.toFixed(3)),
      inverterCount: bayInverterCount,
      inverterModelName: unitModelName,
      inverterUnitRatingKw: effectiveUnitKw,
      transformerRatingMva,
      transformerVoltageRatio: `${lowVoltageAc} kV / ${mvKv} kV`,
      transformerImpedancePct: 6.0,
      mvOutputVoltageKv: mvKv,
      mvRatedCurrentAmps: mvCurrentAmps,
      mvBreakerRating: `دژنکتور گازی/خلأ (VCB) رده ۶۳۰ آمپر / ${mvKv === 20 ? '24' : '36'} کیلوولت، قدرت قطع 25kA`,
      protectiveRelays: [
        'ANSI 50/51: اضافه‌جریان لحظه‌ای و تأخیری (Overcurrent)',
        'ANSI 50N/51N: خطای اتصال زمین (Earth Fault)',
        'ANSI 27/59: کاهش و افزایش ولتاژ (Under/Over Voltage)',
        'ANSI 81O/81U: پایش انحراف فرکانس شبکه (Under/Over Frequency)',
        'ANSI 49: رله تصویر حرارتی ترانسفورماتور (Thermal Overload)',
        ...(transformerRatingMva >= 4.0 ? ['ANSI 87T: رله دیفرانسیل ترانسفورماتور (Differential)'] : []),
      ],
      collectorCableSpec: `کابل آلومینیوم زره‌دار ۳ رشته‌ای 3x(1x${mvCurrentAmps > 90 ? '185' : '120'}) mm² AL/XLPE/CTS/PVC ${mvKv}kV`,
    });
  }

  // 4. Main Collector Busbar Calculation
  const totalNominalCurrentAmps = Number(
    ((safeCapacityMw * 1000.0) / (Math.sqrt(3) * mvKv)).toFixed(1)
  );

  let busbarRating = 630;
  if (totalNominalCurrentAmps > 1000) busbarRating = 2000;
  else if (totalNominalCurrentAmps > 500) busbarRating = 1250;
  else busbarRating = 630;

  // Substation cubicles count:
  // Incoming Bays + 1 Aux Service Station Transformer + 1 Metering (PT) + 1 Outgoing Line to Grid
  const incomingBayFeedersCount = actualBaysCount;
  const auxiliaryTransformerBayCount = 1;
  const meteringBayCount = 1;
  const outgoingLineBayCount = safeCapacityMw > 20 ? 2 : 1;
  const totalSubstationCubicles =
    incomingBayFeedersCount + auxiliaryTransformerBayCount + meteringBayCount + outgoingLineBayCount;

  const keyAdvantagesFa =
    technology === 'string_inverter'
      ? [
          'راندمان بالا در شرایط سایه‌اندازی به دلیل چندگانه بودن MPPTها (۱۲ کانال در هر اینورتر)',
          'نگهداری آسان بدون توقف کل نیروگاه در صورت خرابی یک اینورتر رشته‌ای (MTTR کمتر از ۲ ساعت)',
          'کاهش شدید تلفات DC و کابل‌کشی با ولتاژ ۱۵۰۰ ولت DC و ۸۰۰ ولت AC',
          'پیکربندی منعطف در اراضی شیب‌دار و غیرهمگن',
        ]
      : [
          'هزینه اولیه تجهیزات (CAPEX) اقتصادی‌تر در پروژه‌های مقیاس مگاواتی بالا',
          'کاهش هزینه‌های ساختمانی و نصب به دلیل پکیج آماده کانتینری Turnkey Skid شامل ترانسفورماتور و تابلو MV',
          'مدیریت و مانیتورینگ متمرکز چند بلوک قدرت واحد در مقایسه با صدها اینورتر رشته‌ای',
          'انطباق فوق‌العاده با کدهای شبکه (Grid Code Compliance) و کنترل راکتیو توان در نقطه PCC',
        ];

  const keyAdvantagesEn =
    technology === 'string_inverter'
      ? [
          'High MPPT granularity (up to 12 MPPTs per unit) minimizes mismatch and soiling losses',
          'High availability and low MTTR: one unit failure does not take down the entire power block',
          'High AC voltage (800V AC) drastically lowers field cabling losses and cable cross-section',
          'Superior flexibility on undulating terrain and non-uniform layouts',
        ]
      : [
          'Lower equipment CAPEX per Watt in large multi-megawatt utility scale plants',
          'Plug-and-play outdoor turnkey skid with integrated central inverter, transformer & MV switchgear',
          'Centralized monitoring and maintenance of fewer, standardized power blocks',
          'Exceptional grid code compliance (FRT, reactive power control, frequency response)',
        ];

  return {
    technology,
    totalPlantCapacityMw: safeCapacityMw,
    totalPvCapacityMwp: safeDcMwp,
    mvCollectorVoltageKv: mvKv,
    optimalBaysCount: optimalBays,
    actualBaysCount,
    bayUnitCapacityMw: Number(bayCapacityMw.toFixed(3)),
    bays,
    mainCollectorBusbar: {
      voltageKv: mvKv,
      totalActivePowerMw: safeCapacityMw,
      totalNominalCurrentAmps,
      recommendedBusbarRatingAmps: busbarRating,
      incomingBayFeedersCount,
      auxiliaryTransformerBayCount,
      meteringBayCount,
      outgoingLineBayCount,
      totalSubstationCubicles,
    },
    keyAdvantagesFa,
    keyAdvantagesEn,
  };
}
