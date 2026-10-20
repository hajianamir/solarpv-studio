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
}) => {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const elementDetails: Record<string, { title: string; specs: string[]; standard: string }> = {
    pv_array: {
      title: "آرایه فتوولتائیک (Photovoltaic Array)",
      specs: [
        `توان کل آرایه: ${pvCapacityKwp.toFixed(2)} کیلووات پیک`,
        `تعداد کل پنل‌ها: ${panelCount} عدد`,
        `پیکربندی: ${parallelStrings} رشته موازی × ${modulesPerString} پنل سری`,
        `ولتاژ مدار باز در سرما (Voc,max): ${stringVocVolts.toFixed(1)} ولت`,
        `ولتاژ نقطه کار بیشینه (Vmp): ${stringVmpVolts.toFixed(1)} ولت`,
      ],
      standard: "IEC 62548 Cl. 7 & NEC 690",
    },
    combiner_box: {
      title: "جعبه تجمیع استرینگ‌ها (DC Combiner Box)",
      specs: [
        `فیوزهای خورشیدی: ${parallelStrings * 2} عدد فیوز gPV با جریان ${Math.max(15, Math.ceil(stringIscAmps * 1.5))}A / 1000V`,
        `کلید ایزولاتور DC دوپل: ${Math.max(25, Math.ceil(stringIscAmps * parallelStrings * 1.25))}A 1000VDC`,
        `کابل خروجی DC: سطح مقطع ${dcCableMm2} میلی‌متر مربع مس`,
      ],
      standard: "IEC 60269-6 & IEC 60947-3",
    },
    dc_spd: {
      title: "سرج ارستر صاعقه‌گیر DC (Type II SPD)",
      specs: [
        "کلاس حفاظتی: Class II / Type 2",
        "حداکثر ولتاژ پیوسته (Ucpv): 1000V DC",
        "جریان تخلیه نامی (In): 20 kA (8/20 µs)",
        "حداکثر جریان ضربه (Imax): 40 kA",
        "اتصال به باسبار ارت با هادی ۱۶mm²",
      ],
      standard: "IEC 61643-32",
    },
    inverter: {
      title: "اینورتر شارژر هیبرید خورشیدی (Solar Hybrid Inverter)",
      specs: [
        `توان نامی: ${inverterKw * inverterCount} کیلووات (${inverterCount > 1 ? `${inverterCount} دستگاه ${inverterKw}kW موازی` : `${inverterKw}kW`})`,
        `سیستم فاز: ${isThreePhase ? "سه فاز ۴۰۰ ولت / ۵۰ هرتز" : "تکفاز ۲۳۰ ولت / ۵۰ هرتز"}`,
        `حداکثر بازدهی تبدیل: ۹۷.۶٪`,
        `پروتکل ارتباطی باتری: CAN Bus / RS485 با ایزولاسیون کامل`,
      ],
      standard: "IEC 62109-1 / IEC 62109-2 & IEEE 1547",
    },
    battery_bank: {
      title: "بانک باتری ذخیره‌ساز انرژی (BESS)",
      specs: [
        `ظرفیت ناخالص کل: ${batteryKwh.toFixed(1)} کیلووات ساعت`,
        `ظرفیت آمپرساعت: ${batteryAh} Ah در ولتاژ ${batteryVoltageVdc}V DC`,
        `فیوز اصلی پرسرعت: فیوز مگا ${batteryFuseAmps}A DC با پایه نسوز`,
        `کابل ارتباطی DC سنگین: سطح مقطع ${batCableMm2} میلی‌متر مربع مس دابل`,
      ],
      standard: "IEC 62619 & UL 1973",
    },
    ac_protection: {
      title: "تابلوی توزیع و حفاظت خروجی AC (AC Distribution Panel)",
      specs: [
        `کلید مینیاتوری خروجی (MCB): جریان نامی ${Math.ceil(acCurrentAmps * 1.3)}A تیپ C`,
        `کلید محافظ جان خطای نشتی (RCD): نوع Type B با حساسیت 30mA`,
        `سرج ارستر AC کلاس II: ولتاژ ۲۷۵V/۴۴۰V با جریان ۴۰kA`,
        `کابل توزیع AC: سطح مقطع ${acCableMm2} میلی‌متر مربع مس`,
      ],
      standard: "IEC 60364-5-53 & IEC 62477-1",
    },
    grounding: {
      title: "سیستم زمین حفاظتی و هم‌پتانسیل‌سازی (PE / Earthing)",
      specs: [
        "میله ارت مسی به طول ۳ متر مدفون در چاه ارت",
        "مقاومت کل زمین: کمتر از ۵ اهم",
        "هم‌پتانسیل‌سازی کامل استراکچر فلزی، قاب پنل‌ها و بدنه اینورتر",
      ],
      standard: "IEC 60364-5-54 & IEEE 142",
    },
  };

  return (
    <div className="space-y-4">
      {/* Header with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="font-bold text-white text-sm">دیاگرام تک‌خطی شماتیک استاندارد مهندسی (SLD)</h3>
            <p className="text-xs text-slate-400">روی هر جزء الکتریکی کلیک کنید تا مشخصات و استانداردهای IEC مربوطه نمایش داده شود.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="کوچک‌نمایی"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-300 px-1">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            title="بزرگ‌نمایی"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 shadow-inner flex justify-center">
        <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
          <svg width="980" height="420" viewBox="0 0 980 420" className="select-none font-sans">
            <defs>
              {/* Markers for flow arrows */}
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#34d399" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#f87171" />
              </marker>
            </defs>

            {/* Background Grid Lines subtle */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <rect width="980" height="420" fill="url(#grid)" />

            {/* SECTION 1: PV ARRAY */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-85"
              onClick={() => setSelectedElement('pv_array')}
            >
              <rect x="25" y="45" width="140" height="200" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="2" />
              <text x="95" y="70" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">PV String Array</text>
              <text x="95" y="88" textAnchor="middle" fill="#94a3b8" fontSize="10">{parallelStrings} Strings × {modulesPerString} Panels</text>

              {/* Draw 3 stylized solar module symbols */}
              {[105, 140, 175].map((y, idx) => (
                <g key={idx}>
                  <rect x="40" y={y} width="110" height="25" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                  <line x1="76" y1={y} x2="76" y2={y + 25} stroke="#38bdf8" strokeWidth="0.7" />
                  <line x1="113" y1={y} x2="113" y2={y + 25} stroke="#38bdf8" strokeWidth="0.7" />
                  <line x1="40" y1={y + 12} x2="150" y2={y + 12} stroke="#38bdf8" strokeWidth="0.7" />
                </g>
              ))}

              <text x="95" y="222" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">{pvCapacityKwp.toFixed(2)} kWp DC</text>
              <text x="95" y="236" textAnchor="middle" fill="#cbd5e1" fontSize="9">Voc: {stringVocVolts.toFixed(0)}V | Isc: {stringIscAmps.toFixed(1)}A</text>
            </g>

            {/* DC Cables: PV to Combiner Box */}
            <line x1="165" y1="120" x2="215" y2="120" stroke="#f87171" strokeWidth="2.5" markerEnd="url(#arrow-red)" />
            <text x="190" y="112" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">DC (+)</text>

            <line x1="165" y1="165" x2="215" y2="165" stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <text x="190" y="180" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">DC (-)</text>

            {/* SECTION 2: COMBINER BOX */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-85"
              onClick={() => setSelectedElement('combiner_box')}
            >
              <rect x="215" y="80" width="120" height="135" rx="6" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
              <text x="275" y="102" textAnchor="middle" fill="#f1f5f9" fontSize="11" fontWeight="bold">Combiner Box</text>
              <text x="275" y="116" textAnchor="middle" fill="#94a3b8" fontSize="8.5">تابلوی تجمیع DC</text>

              {/* Fuse symbol */}
              <rect x="235" y="128" width="30" height="14" rx="2" fill="#334155" stroke="#f87171" strokeWidth="1" />
              <line x1="225" y1="135" x2="275" y2="135" stroke="#f87171" strokeWidth="1.5" />
              <text x="250" y="124" textAnchor="middle" fill="#f87171" fontSize="8">gPV Fuse</text>

              {/* DC Isolator Switch symbol */}
              <circle cx="295" cy="135" r="4" fill="none" stroke="#f1f5f9" strokeWidth="1.5" />
              <line x1="285" y1="135" x2="292" y2="135" stroke="#f1f5f9" strokeWidth="1.5" />
              <line x1="298" y1="135" x2="310" y2="125" stroke="#f1f5f9" strokeWidth="1.5" />
              <text x="295" y="124" textAnchor="middle" fill="#94a3b8" fontSize="8">DC SW</text>

              <text x="275" y="195" textAnchor="middle" fill="#38bdf8" fontSize="9 font-mono">Cable: {dcCableMm2} mm²</text>
            </g>

            {/* Branch to DC SPD */}
            <line x1="275" y1="215" x2="275" y2="255" stroke="#f59e0b" strokeWidth="1.5" />
            <g
              className="cursor-pointer transition-opacity hover:opacity-85"
              onClick={() => setSelectedElement('dc_spd')}
            >
              <rect x="240" y="255" width="70" height="40" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="275" y="272" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">DC SPD II</text>
              <text x="275" y="286" textAnchor="middle" fill="#cbd5e1" fontSize="7.5">1000V / 40kA</text>
            </g>

            {/* Earth connection from DC SPD to PE bus */}
            <line x1="275" y1="295" x2="275" y2="365" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />

            {/* Main DC run: Combiner to Inverter */}
            <line x1="335" y1="145" x2="410" y2="145" stroke="#38bdf8" strokeWidth="3" markerEnd="url(#arrow)" />
            <text x="372" y="137" textAnchor="middle" fill="#38bdf8" fontSize="9">DC Bus</text>

            {/* SECTION 3: INVERTER */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-85"
              onClick={() => setSelectedElement('inverter')}
            >
              <rect x="410" y="70" width="165" height="160" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
              <text x="492" y="95" textAnchor="middle" fill="#38bdf8" fontSize="13" fontWeight="bold">Hybrid Inverter</text>
              <text x="492" y="110" textAnchor="middle" fill="#94a3b8" fontSize="9">
                {inverterCount > 1 ? `${inverterCount}× Paralleled Inverters` : 'Single Hybrid Unit'}
              </text>

              {/* Stylized Inverter Conversion Symbol: DC/DC MPPT + DC/AC */}
              <rect x="430" y="125" width="55" height="45" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <text x="457" y="145" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">MPPT</text>
              <text x="457" y="160" textAnchor="middle" fill="#94a3b8" fontSize="8">DC/DC</text>

              <line x1="485" y1="147" x2="505" y2="147" stroke="#38bdf8" strokeWidth="2" />

              <rect x="505" y="125" width="55" height="45" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <text x="532" y="145" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">DC / AC</text>
              <text x="532" y="160" textAnchor="middle" fill="#94a3b8" fontSize="8">{isThreePhase ? '3-Phase' : '1-Phase'}</text>

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
              <text x="480" y="302" textAnchor="middle" fill="#c084fc" fontSize="11" fontWeight="bold">BESS Battery Bank</text>
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
              <text x="720" y="93" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold">AC Subpanel</text>
              <text x="720" y="107" textAnchor="middle" fill="#94a3b8" fontSize="8.5">تابلوی توزیع AC</text>

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
            <text x="900" y="125" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">Critical Loads</text>
            <text x="900" y="138" textAnchor="middle" fill="#94a3b8" fontSize="8">مصرف‌کننده‌ها</text>

            <line x1="790" y1="175" x2="850" y2="175" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" markerEnd="url(#arrow)" />
            <text x="820" y="170" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Bi-Directional</text>

            <rect x="850" y="155" width="100" height="45" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="900" y="174" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">Utility Grid</text>
            <text x="900" y="190" textAnchor="middle" fill="#94a3b8" fontSize="8">کنتور دوطرفه برق</text>

            {/* SECTION 6: PE EARTHING BUSBAR */}
            <g
              className="cursor-pointer transition-opacity hover:opacity-85"
              onClick={() => setSelectedElement('grounding')}
            >
              <line x1="100" y1="365" x2="850" y2="365" stroke="#10b981" strokeWidth="4" />
              <text x="120" y="385" textAnchor="start" fill="#10b981" fontSize="11" fontWeight="bold">
                PE Busbar (باسبار شین ارت حفاظتی - هادی ۱۶mm²)
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

      {/* Selected Component Information Panel */}
      {selectedElement && elementDetails[selectedElement] && (
        <div className="p-4 bg-slate-900/90 border border-sky-500/40 rounded-lg animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-3">
            <h4 className="font-bold text-sky-400 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              {elementDetails[selectedElement].title}
            </h4>
            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
              استاندارد: {elementDetails[selectedElement].standard}
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
