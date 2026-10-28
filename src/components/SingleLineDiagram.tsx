import React, { useState } from 'react';
import { Layers, Download, ZoomIn, ZoomOut, Info, Shield, Zap, Sun, Battery as BatteryIcon } from 'lucide-react';

interface SldProps {
  pvCapacityKwp: number;
  panelCount: number;
  modulesPerString: number;
  parallelStrings: number;
  stringVocVolts: number;
  stringVmpVolts: number;
  stringIscAmps: number;
  inverterKw: number;
  inverterCount: number;
  isThreePhase: boolean;
  batteryKwh: number;
  batteryVoltageVdc: number;
  batteryAh: number;
  batteryFuseAmps: number;
  acCurrentAmps: number;
  dcCableMm2: number;
  batCableMm2: number;
  acCableMm2: number;
  lang?: 'fa' | 'en';
}

export const SingleLineDiagram: React.FC<SldProps> = ({
  pvCapacityKwp,
  panelCount,
  modulesPerString,
  parallelStrings,
  stringVocVolts,
  stringVmpVolts,
  stringIscAmps,
  inverterKw,
  inverterCount,
  isThreePhase,
  batteryKwh,
  batteryVoltageVdc,
  batteryAh,
  batteryFuseAmps,
  acCurrentAmps,
  dcCableMm2,
  batCableMm2,
  acCableMm2,
  lang = 'fa',
}) => {
  const isEn = lang === 'en';
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const elementDetails: Record<string, { title: string; specs: string[]; standard: string }> = {
    pv_array: {
      title: isEn ? "Photovoltaic Solar Array" : "آرایه فتوولتائیک (Photovoltaic Array)",
      specs: [
        isEn ? `Total Array DC Peak: ${pvCapacityKwp.toFixed(2)} kWp` : `توان کل آرایه: ${pvCapacityKwp.toFixed(2)} کیلووات پیک`,
        isEn ? `Total Module Count: ${panelCount} Units` : `تعداد کل پنل‌ها: ${panelCount} عدد`,
        isEn ? `Configuration: ${parallelStrings} Strings × ${modulesPerString} Modules/Str` : `پیکربندی: ${parallelStrings} رشته موازی × ${modulesPerString} پنل سری`,
        isEn ? `Extreme Cold Open-Circuit Voltage (Voc,max): ${stringVocVolts.toFixed(1)} V` : `ولتاژ مدار باز در سرما (Voc,max): ${stringVocVolts.toFixed(1)} ولت`,
        isEn ? `Maximum Power Voltage (Vmp): ${stringVmpVolts.toFixed(1)} V` : `ولتاژ نقطه کار بیشینه (Vmp): ${stringVmpVolts.toFixed(1)} ولت`,
      ],
      standard: "IEC 62548 Cl. 7 & NEC 690",
    },
    combiner_box: {
      title: isEn ? "DC Array Combiner Box" : "جعبه تجمیع استرینگ‌ها (DC Combiner Box)",
      specs: [
        isEn ? `Solar Fuses: ${parallelStrings * 2}× gPV Fuses rated ${Math.max(15, Math.ceil(stringIscAmps * 1.5))}A / 1000V` : `فیوزهای خورشیدی: ${parallelStrings * 2} عدد فیوز gPV با جریان ${Math.max(15, Math.ceil(stringIscAmps * 1.5))}A / 1000V`,
        isEn ? `2-Pole DC Isolator Switch: ${Math.max(25, Math.ceil(stringIscAmps * parallelStrings * 1.25))}A 1000VDC` : `کلید ایزولاتور DC دوپل: ${Math.max(25, Math.ceil(stringIscAmps * parallelStrings * 1.25))}A 1000VDC`,
        isEn ? `DC Output Main Run: ${dcCableMm2} mm² Copper XLPE` : `کابل خروجی DC: سطح مقطع ${dcCableMm2} میلی‌متر مربع مس`,
      ],
      standard: "IEC 60269-6 & IEC 60947-3",
    },
    dc_spd: {
      title: isEn ? "DC Surge Protection Device (Type II SPD)" : "سرج ارستر صاعقه‌گیر DC (Type II SPD)",
      specs: [
        isEn ? "Protection Class: Class II / Type 2 (IEC 61643-32)" : "کلاس حفاظتی: Class II / Type 2",
        isEn ? "Continuous Operating Voltage (Ucpv): 1000V / 1500V DC" : "حداکثر ولتاژ پیوسته (Ucpv): 1000V DC",
        isEn ? "Nominal Discharge Current (In): 20 kA (8/20 µs)" : "جریان تخلیه نامی (In): 20 kA (8/20 µs)",
        isEn ? "Max Discharge Current (Imax): 40 kA" : "حداکثر جریان ضربه (Imax): 40 kA",
        isEn ? "Connected to Main Grounding Busbar via 16mm² Cu" : "اتصال به باسبار ارت با هادی ۱۶mm²",
      ],
      standard: "IEC 61643-32",
    },
    inverter: {
      title: isEn ? "Solar Inverter / Power Conversion System (PCS)" : "اینورتر شارژر هیبرید خورشیدی (Solar Hybrid Inverter)",
      specs: [
        isEn ? `Nominal Rating: ${inverterKw * inverterCount} kW AC (${inverterCount > 1 ? `${inverterCount}× ${inverterKw}kW Units Paralleled` : `${inverterKw}kW`})` : `توان نامی: ${inverterKw * inverterCount} کیلووات (${inverterCount > 1 ? `${inverterCount} دستگاه ${inverterKw}kW موازی` : `${inverterKw}kW`})`,
        isEn ? `Grid Phasing: ${isThreePhase ? "3-Phase 400V / 50 Hz" : "Single-Phase 230V / 50 Hz"}` : `سیستم فاز: ${isThreePhase ? "سه فاز ۴۰۰ ولت / ۵۰ هرتز" : "تکفاز ۲۳۰ ولت / ۵۰ هرتز"}`,
        isEn ? `Max Conversion Efficiency: 98.6%` : `حداکثر بازدهی تبدیل: ۹۷.۶٪`,
        isEn ? `Battery Communication: Galvanically Isolated CAN Bus / RS485` : `پروتکل ارتباطی باتری: CAN Bus / RS485 با ایزولاسیون کامل`,
      ],
      standard: "IEC 62109-1 / IEC 62109-2 & IEEE 1547",
    },
    battery_bank: {
      title: isEn ? "Battery Energy Storage System (BESS)" : "بانک باتری ذخیره‌ساز انرژی (BESS)",
      specs: [
        isEn ? `Gross Storage Capacity: ${batteryKwh.toFixed(1)} kWh` : `ظرفیت ناخالص کل: ${batteryKwh.toFixed(1)} کیلووات ساعت`,
        isEn ? `Battery Rating: ${batteryAh} Ah @ ${batteryVoltageVdc}V DC` : `ظرفیت آمپرساعت: ${batteryAh} Ah در ولتاژ ${batteryVoltageVdc}V DC`,
        isEn ? `Main Fast-Acting DC Fuse: ${batteryFuseAmps}A Mega DC Fuse` : `فیوز اصلی پرسرعت: فیوز مگا ${batteryFuseAmps}A DC با پایه نسوز`,
        isEn ? `DC Battery Heavy Cables: ${batCableMm2} mm² Flexible Copper` : `کابل ارتباطی DC سنگین: سطح مقطع ${batCableMm2} میلی‌متر مربع مس دابل`,
      ],
      standard: "IEC 62619 & UL 1973",
    },
    ac_protection: {
      title: isEn ? "AC Distribution Board & Protection Switchgear" : "تابلوی توزیع و حفاظت خروجی AC (AC Distribution Panel)",
      specs: [
        isEn ? `Output Miniature Circuit Breaker (MCB): ${Math.ceil(acCurrentAmps * 1.3)}A Curve C` : `کلید مینیاتوری خروجی (MCB): جریان نامی ${Math.ceil(acCurrentAmps * 1.3)}A تیپ C`,
        isEn ? `Residual Current Device (RCD): Type B 30mA (DC leakage protected)` : `کلید محافظ جان خطای نشتی (RCD): نوع Type B با حساسیت 30mA`,
        isEn ? `AC Surge Arrester (SPD): Type II 275V/400V (40kA)` : `سرج ارستر AC کلاس II: ولتاژ ۲۷۵V/۴۴۰V با جریان ۴۰kA`,
        isEn ? `AC Feeder Cable: ${acCableMm2} mm² XLPE Copper` : `کابل توزیع AC: سطح مقطع ${acCableMm2} میلی‌متر مربع مس`,
      ],
      standard: "IEC 60364-5-53 & IEC 62477-1",
    },
    grounding: {
      title: isEn ? "Protective Earthing & Equipotential Bonding (PE)" : "سیستم زمین حفاظتی و هم‌پتانسیل‌سازی (PE / Earthing)",
      specs: [
        isEn ? "3-Meter Pure Copper Clad Grounding Rods in Soil" : "میله ارت مسی به طول ۳ متر مدفون در چاه ارت",
        isEn ? "Overall Earth Resistance: Less than 5.0 Ohms (IEEE 80)" : "مقاومت کل زمین: کمتر از ۵ اهم",
        isEn ? "Full Equipotential Bonding of Racking, Frames & Inverter Enclosure" : "هم‌پتانسیل‌سازی کامل استراکچر فلزی، قاب پنل‌ها و بدنه اینورتر",
      ],
      standard: "IEC 60364-5-54 & IEEE 142",
    },
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              {isEn
                ? 'Engineering Single-Line Diagram (SLD / IEC 61082)'
                : 'نقشه تک‌خطی مهندسی خورشیدی (Single Line Diagram - SLD)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isEn
                ? 'Standard IEC 61082 schematic diagram showing DC string routing, combiner boxes, SPDs, inverters, BESS, and AC switchgear.'
                : 'شاماتیک دقیق مدار قدرت از استرینگ‌های PV تا باس DC، اینورتر، بانک باتری، تابلوی AC و نقطه اتصال به شبکه'}
            </p>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.1))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
              title={isEn ? 'Zoom Out' : 'کوچک‌نمایی'}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(1.6, prev + 0.1))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
              title={isEn ? 'Zoom In' : 'بزرگ‌نمایی'}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Diagram Canvas with Horizontal Touch Scroll */}
      <div className="studio-card">
        <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-center">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
          >
            <svg
              width="980"
              height="430"
              viewBox="0 0 980 430"
              className="select-none font-sans min-w-[850px]"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
                </marker>
              </defs>

              {/* SECTION 1: PHOTOVOLTAIC ARRAYS */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => setSelectedElement('pv_array')}
              >
                <rect x="20" y="60" width="130" height="180" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text x="85" y="85" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
                  {isEn ? 'PV Array' : 'آرایه PV'}
                </text>
                <text x="85" y="102" textAnchor="middle" fill="#94a3b8" fontSize="9 font-mono">
                  {pvCapacityKwp.toFixed(1)} kWp
                </text>

                {/* Draw 3 stylized solar module cells */}
                {[115, 150, 185].map((y, idx) => (
                  <g key={idx}>
                    <rect x="35" y={y} width="100" height="26" rx="3" fill="#0f172a" stroke="#0284c7" strokeWidth="1" />
                    <line x1="68" y1={y} x2="68" y2={y + 26} stroke="#0284c7" strokeWidth="0.7" />
                    <line x1="102" y1={y} x2="102" y2={y + 26} stroke="#0284c7" strokeWidth="0.7" />
                    <text x="85" y={y + 16} textAnchor="middle" fill="#cbd5e1" fontSize="8 font-mono">
                      {isEn ? `String #${idx + 1}` : `استرینگ #${idx + 1}`}
                    </text>
                  </g>
                ))}

                <text x="85" y="230" textAnchor="middle" fill="#f59e0b" fontSize="8.5 font-mono">
                  {parallelStrings}P × {modulesPerString}S ({panelCount} {isEn ? 'Mods' : 'پنل'})
                </text>
              </g>

              {/* Earth connection from Array to Grounding bus */}
              <line x1="85" y1="240" x2="85" y2="365" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

              {/* DC Lines from PV to Combiner Box */}
              <line x1="150" y1="130" x2="220" y2="130" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow)" />
              <line x1="150" y1="170" x2="220" y2="170" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow)" />
              <text x="185" y="122" textAnchor="middle" fill="#f59e0b" fontSize="8.5 font-mono">DC+ (Vmp)</text>
              <text x="185" y="163" textAnchor="middle" fill="#f59e0b" fontSize="8.5 font-mono">DC- (0V)</text>

              {/* SECTION 2: DC COMBINER BOX */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => setSelectedElement('combiner_box')}
              >
                <rect x="220" y="70" width="130" height="160" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                <text x="285" y="93" textAnchor="middle" fill="#f59e0b" fontSize="11" fontWeight="bold">
                  {isEn ? 'Combiner Box' : 'جعبه تجمیع'}
                </text>
                <text x="285" y="106" textAnchor="middle" fill="#94a3b8" fontSize="8.5">
                  DC Combiner
                </text>

                {/* gPV Fuse symbol */}
                <rect x="240" y="118" width="90" height="22" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <text x="285" y="133" textAnchor="middle" fill="#f1f5f9" fontSize="8 font-mono">
                  gPV Fuses ({Math.max(15, Math.ceil(stringIscAmps * 1.5))}A)
                </text>

                {/* DC Isolator Switch symbol */}
                <rect x="240" y="148" width="90" height="22" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <text x="285" y="163" textAnchor="middle" fill="#f1f5f9" fontSize="8 font-mono">
                  DC Disconnect ({Math.max(25, Math.ceil(stringIscAmps * parallelStrings * 1.25))}A)
                </text>

                {/* DC Type II SPD symbol */}
                <rect
                  x="240"
                  y="178"
                  width="90"
                  height="22"
                  rx="3"
                  fill="#0f172a"
                  stroke="#ef4444"
                  strokeWidth="1"
                  className="hover:stroke-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement('dc_spd');
                  }}
                />
                <text x="285" y="193" textAnchor="middle" fill="#ef4444" fontSize="8 font-mono">
                  Type II SPD (1000V)
                </text>

                <text x="285" y="220" textAnchor="middle" fill="#94a3b8" fontSize="8 font-mono">Voc: {stringVocVolts.toFixed(0)}V</text>
              </g>

              {/* Earth connection from Combiner SPD to PE */}
              <line x1="285" y1="230" x2="285" y2="365" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

              {/* DC Bus Run: Combiner to Inverter */}
              <line x1="350" y1="147" x2="410" y2="147" stroke="#f59e0b" strokeWidth="3.5" markerEnd="url(#arrow)" />
              <text x="380" y="138" textAnchor="middle" fill="#f59e0b" fontSize="8.5 font-mono">DC Run ({dcCableMm2}mm²)</text>

              {/* SECTION 3: INVERTER UNIT */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => setSelectedElement('inverter')}
              >
                <rect x="410" y="70" width="165" height="160" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="492" y="95" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">
                  {isEn ? 'Solar Inverter' : 'اینورتر خورشیدی'}
                </text>
                <text x="492" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">
                  {inverterCount > 1
                    ? isEn
                      ? `${inverterCount}× Paralleled Inverters`
                      : `${inverterCount} دستگاه موازی`
                    : isEn
                    ? 'Single Unit PCS'
                    : 'دستگاه واحد'}
                </text>

                {/* Conversion Symbol: DC/DC MPPT + DC/AC */}
                <rect x="430" y="125" width="55" height="45" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                <text x="457" y="145" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">MPPT</text>
                <text x="457" y="160" textAnchor="middle" fill="#94a3b8" fontSize="8">DC/DC</text>

                <line x1="485" y1="147" x2="505" y2="147" stroke="#38bdf8" strokeWidth="2" />

                <rect x="505" y="125" width="55" height="45" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                <text x="532" y="145" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">DC / AC</text>
                <text x="532" y="160" textAnchor="middle" fill="#94a3b8" fontSize="8">{isThreePhase ? (isEn ? '3-Phase' : 'سه فاز') : (isEn ? '1-Phase' : 'تکفاز')}</text>

                <text x="492" y="200" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold">
                  {inverterKw * inverterCount} kW AC
                </text>
                <text x="492" y="215" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">
                  {isThreePhase ? '400V 3P+N 50Hz' : '230V 1P+N 50Hz'}
                </text>
              </g>

              {/* Earth connection from Inverter chassis to PE */}
              <line x1="492" y1="230" x2="492" y2="365" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

              {/* SECTION 4: BATTERY BANK (Below Inverter) */}
              <line x1="450" y1="230" x2="450" y2="280" stroke="#a855f7" strokeWidth="3" markerEnd="url(#arrow)" />
              <text x="435" y="260" textAnchor="end" fill="#c084fc" fontSize="9" fontWeight="bold">BAT DC</text>

              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => setSelectedElement('battery_bank')}
              >
                <rect x="390" y="280" width="180" height="75" rx="6" fill="#1e293b" stroke="#a855f7" strokeWidth="2" />
                <text x="480" y="302" textAnchor="middle" fill="#c084fc" fontSize="11" fontWeight="bold">
                  {isEn ? 'BESS Battery Bank' : 'بانک باتری ذخیره‌ساز BESS'}
                </text>
                <text x="480" y="318" textAnchor="middle" fill="#f1f5f9" fontSize="11 font-mono">
                  {batteryKwh.toFixed(1)} kWh ({batteryVoltageVdc}V {batteryAh}Ah)
                </text>

                {/* Fuse symbol for Battery */}
                <rect x="420" y="327" width="28" height="12" rx="2" fill="#334155" stroke="#f87171" strokeWidth="1" />
                <text x="434" y="336" textAnchor="middle" fill="#f87171" fontSize="7.5">{batteryFuseAmps}A</text>
                <text x="475" y="337" textAnchor="start" fill="#94a3b8" fontSize="8">Mega DC Fuse</text>
              </g>

              {/* AC Run: Inverter to AC Distribution Board */}
              <line x1="575" y1="147" x2="650" y2="147" stroke="#34d399" strokeWidth="3" markerEnd="url(#arrow-green)" />
              <text x="612" y="138" textAnchor="middle" fill="#34d399" fontSize="9 font-mono">AC Line ({acCableMm2}mm²)</text>

              {/* SECTION 5: AC DISTRIBUTION BOARD */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => setSelectedElement('ac_protection')}
              >
                <rect x="650" y="70" width="140" height="160" rx="8" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
                <text x="720" y="93" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold">
                  {isEn ? 'AC Subpanel' : 'تابلوی توزیع AC'}
                </text>
                <text x="720" y="107" textAnchor="middle" fill="#94a3b8" fontSize="8.5">
                  AC Distribution
                </text>

                {/* AC MCB symbol */}
                <rect x="670" y="118" width="100" height="22" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <text x="720" y="133" textAnchor="middle" fill="#f1f5f9" fontSize="8.5">
                  MCB {Math.ceil(acCurrentAmps * 1.3)}A ({isThreePhase ? '4P' : '2P'})
                </text>

                {/* Type B RCD */}
                <rect x="670" y="148" width="100" height="22" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <text x="720" y="163" textAnchor="middle" fill="#38bdf8" fontSize="8.5">
                  Type B RCD (30mA)
                </text>

                {/* AC SPD */}
                <rect x="670" y="178" width="100" height="22" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                <text x="720" y="193" textAnchor="middle" fill="#f59e0b" fontSize="8.5">
                  AC SPD Type II (40kA)
                </text>

                <text x="720" y="218" textAnchor="middle" fill="#34d399" fontSize="9 font-mono">Iac: {acCurrentAmps.toFixed(1)}A</text>
              </g>

              {/* Earth connection from AC board to PE */}
              <line x1="720" y1="230" x2="720" y2="365" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

              {/* Output Lines: AC Board to Loads & Grid */}
              <line x1="790" y1="125" x2="850" y2="125" stroke="#34d399" strokeWidth="2.5" markerEnd="url(#arrow-green)" />
              <text x="820" y="118" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Essential</text>

              <rect x="850" y="105" width="100" height="40" rx="5" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
              <text x="900" y="125" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">
                {isEn ? 'Critical Loads' : 'بارهای ضروری'}
              </text>
              <text x="900" y="138" textAnchor="middle" fill="#94a3b8" fontSize="8">
                {isEn ? 'Essential AC Loads' : 'مصرف‌کننده‌ها'}
              </text>

              <line x1="790" y1="175" x2="850" y2="175" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" markerEnd="url(#arrow)" />
              <text x="820" y="170" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Bi-Directional</text>

              <rect x="850" y="155" width="100" height="45" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="900" y="174" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
                {isEn ? 'Utility Grid' : 'شبکه سراسری'}
              </text>
              <text x="900" y="190" textAnchor="middle" fill="#94a3b8" fontSize="8">
                {isEn ? 'Bi-Directional Meter' : 'کنتور دوطرفه برق'}
              </text>

              {/* SECTION 6: PE EARTHING BUSBAR */}
              <g
                className="cursor-pointer transition-opacity hover:opacity-85"
                onClick={() => setSelectedElement('grounding')}
              >
                <line x1="100" y1="365" x2="850" y2="365" stroke="#10b981" strokeWidth="4" />
                <text x="120" y="385" textAnchor="start" fill="#10b981" fontSize="11" fontWeight="bold">
                  {isEn ? 'PE Grounding Busbar (16mm² Cu Conductor)' : 'باسبار شین ارت حفاظتی - هادی ۱۶mm²'}
                </text>

                {/* Earth symbol */}
                <line x1="800" y1="365" x2="800" y2="390" stroke="#10b981" strokeWidth="3" />
                <line x1="785" y1="390" x2="815" y2="390" stroke="#10b981" strokeWidth="3" />
                <line x1="790" y1="396" x2="810" y2="396" stroke="#10b981" strokeWidth="2.5" />
                <line x1="795" y1="402" x2="805" y2="402" stroke="#10b981" strokeWidth="2" />
                <text x="825" y="398" textAnchor="start" fill="#10b981" fontSize="9 font-mono">&lt; 5 Ω</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Selected Component Information Panel */}
      {selectedElement && elementDetails[selectedElement] && (
        <div className="p-4 bg-slate-900/90 border border-sky-500/40 rounded-lg animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-3">
            <h4 className="font-bold text-sky-400 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              {elementDetails[selectedElement].title}
            </h4>
            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
              {isEn ? 'Standard:' : 'استاندارد:'} {elementDetails[selectedElement].standard}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            {elementDetails[selectedElement].specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0"></span>
                <span>{spec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default SingleLineDiagram;
