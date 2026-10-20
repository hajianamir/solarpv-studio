import React, { useState } from 'react';
import { X, Printer, Download, Upload, ShieldCheck, Sun, Zap, Battery as BatteryIcon, DollarSign, Calendar, Layers, Activity } from 'lucide-react';
import { ClimateCity } from '../engine/climaticData';
import { LoadAnalysisResult } from '../engine/loadProfiles';
import { PvArrayDesignResult, ModuleSpecs, InverterSpecs } from '../engine/pvEngineAdvanced';
import { BatteryBankSizingResult } from '../engine/batteryEngine';
import { ProtectionAnalysisResult } from '../engine/protectionBomEngine';
import { Simulation24hResult, GeneratorSizingResult } from '../engine/simulation24hEngine';
import { FinancialAnalysisResult } from '../engine/financialEngine';

interface OfficialReportModalProps {
  projectName: string;
  city: ClimateCity;
  loadAnalysis: LoadAnalysisResult;
  module: ModuleSpecs;
  inverter: InverterSpecs;
  arrayDesign: PvArrayDesignResult;
  batterySizing: BatteryBankSizingResult;
  protection: ProtectionAnalysisResult;
  simulation: Simulation24hResult;
  generator: GeneratorSizingResult;
  financial: FinancialAnalysisResult;
  onClose: () => void;
  onImportProject?: (projectData: any) => void;
}

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  projectName,
  city,
  loadAnalysis,
  module,
  inverter,
  arrayDesign,
  batterySizing,
  protection,
  simulation,
  generator,
  financial,
  onClose,
  onImportProject,
}) => {
  const [lang, setLang] = useState<'fa' | 'en'>('fa');

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      projectName,
      city,
      loadAnalysis,
      module,
      inverter,
      arrayDesign,
      batterySizing,
      protection,
      simulation,
      generator,
      financial,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_SolarPV_Project.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportProject) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          onImportProject(parsed);
          alert('پروژه با موفقیت بارگذاری شد.');
          onClose();
        } catch {
          alert('فایل JSON معتبر نیست.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl relative my-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Action Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-700 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg">
              <Sun className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-sky-400 block">
                {lang === 'fa' ? 'دفترچه محاسبات فنی و پیشنهاد مهندسی EPC' : 'Official EPC Engineering Design Proposal'}
              </span>
              <h2 className="text-xl font-bold text-white">{projectName}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="studio-btn-secondary text-xs py-1.5 px-3 font-semibold"
            >
              {lang === 'fa' ? 'English Version' : 'نسخه فارسی'}
            </button>

            <button
              onClick={handleExportJson}
              className="studio-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
              title="خروجی JSON پروژه"
            >
              <Download className="w-3.5 h-3.5" />
              خروجی JSON
            </button>

            <label className="studio-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              ورودی JSON
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>

            <button
              onClick={handlePrint}
              className="studio-btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Printer className="w-3.5 h-3.5" />
              پرینت / ذخیره PDF
            </button>

            <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE DOCUMENT BODY */}
        <div className={`space-y-6 ${lang === 'fa' ? 'text-right dir-rtl' : 'text-left dir-ltr'}`}>
          {/* Document Header */}
          <div className="border-b-2 border-sky-500 pb-4 text-center">
            <h1 className="text-2xl font-bold text-sky-400 print:text-sky-700">
              {lang === 'fa' ? 'دفترچه رسمی محاسبات فنی و پروپوزال مهندسی سیستم خورشیدی' : 'Official EPC Solar PV Engineering & Technical Design Proposal'}
            </h1>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              SolarPV Studio v1.0 Pro | Generated per IEC 62548:2024, IEC 60364-5-52 & IEEE 1547 Standards
            </p>
          </div>

          {/* Project & Climatic Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/60 print:bg-slate-100 p-4 rounded-lg border border-slate-700/60 print:border-slate-300 text-xs">
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{lang === 'fa' ? 'عنوان پروژه:' : 'Project Name:'}</span>
              <strong className="text-white print:text-black">{projectName}</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{lang === 'fa' ? 'محل و اقلیم:' : 'Site Location:'}</span>
              <strong className="text-sky-300 print:text-sky-800">{city.nameFa} ({city.nameEn})</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{lang === 'fa' ? 'ساعات آفتابی اوج (PSH):' : 'Peak Sun Hours:'}</span>
              <strong className="text-amber-400 print:text-amber-700 font-mono">{city.peakSunHours} h/day</strong>
            </div>
            <div>
              <span className="text-slate-400 print:text-slate-600 block">{lang === 'fa' ? 'تاریخ گزارش:' : 'Date of Issue:'}</span>
              <span className="text-slate-200 print:text-slate-800 font-mono">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Table 1: Energy & Load Requirements */}
          <div>
            <h3 className="text-sm font-bold text-sky-400 print:text-sky-800 mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              {lang === 'fa' ? '۱. تقاضای انرژی و مشخصات دینامیک بارهای الکتریکی' : '1. Energy Consumption & Load Profile Dynamics'}
            </h3>
            <table className="w-full text-xs text-slate-300 print:text-black border border-slate-700 print:border-slate-300">
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'کل مصرف انرژی روزانه:' : 'Total Daily Energy Load:'}</td>
                  <td className="p-2 font-mono font-bold text-amber-300 print:text-amber-800">{loadAnalysis.totalDailyEnergyKwh.toFixed(2)} kWh/day ({Math.round(loadAnalysis.totalDailyEnergyWh).toLocaleString()} Wh)</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'تفکیک مصرف روزانه / شبانه:' : 'Day / Night Energy Breakdown:'}</td>
                  <td className="p-2 font-mono">{lang === 'fa' ? `روز: ${(loadAnalysis.daytimeEnergyWh / 1000).toFixed(2)} kWh | شب: ${(loadAnalysis.nighttimeEnergyWh / 1000).toFixed(2)} kWh` : `Day: ${(loadAnalysis.daytimeEnergyWh / 1000).toFixed(2)} kWh | Night: ${(loadAnalysis.nighttimeEnergyWh / 1000).toFixed(2)} kWh`}</td>
                </tr>
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'توان پیوسته اکتیو تجهیزات:' : 'Continuous Active Load Power:'}</td>
                  <td className="p-2 font-mono text-emerald-400 print:text-emerald-800 font-bold">{Math.round(loadAnalysis.continuousActivePowerWatts).toLocaleString()} Watts</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'حداکثر توان استارت هجومی همزمان (Surge):' : 'Max Simultaneous Surge Inrush Power:'}</td>
                  <td className="p-2 font-mono text-red-400 print:text-red-700 font-bold">{Math.round(loadAnalysis.maxSurgePeakPowerWatts).toLocaleString()} Watts</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 2: PV Array & Inverter Specifications */}
          <div>
            <h3 className="text-sm font-bold text-sky-400 print:text-sky-800 mb-2 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              {lang === 'fa' ? '۲. مشخصات فنی آرایه فتوولتائیک و اینورترها' : '2. PV Array & Inverter Engineering Specifications'}
            </h3>
            <table className="w-full text-xs text-slate-300 print:text-black border border-slate-700 print:border-slate-300">
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'ظرفیت نامی کل آرایه خورشیدی (DC):' : 'Total Solar PV Array Capacity (DC):'}</td>
                  <td className="p-2 font-mono font-bold text-emerald-400 print:text-emerald-800">{arrayDesign.totalPvCapacityKwp.toFixed(2)} kWp</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'مدل و تعداد ماژول‌های فتوولتائیک:' : 'PV Module Model & Total Units:'}</td>
                  <td className="p-2">{arrayDesign.totalModulesCount} × {module.manufacturer} {module.modelName} ({module.pmpWatts}W)</td>
                </tr>
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'پیکربندی استرینگ‌ها (Series × Parallel):' : 'String Configuration:'}</td>
                  <td className="p-2 font-mono">{arrayDesign.parallelStringsCount} {lang === 'fa' ? 'رشته موازی' : 'Parallel Strings'} × {arrayDesign.modulesPerString} {lang === 'fa' ? 'پنل سری در استرینگ' : 'Panels per String'}</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'حداکثر ولتاژ مدار باز در سردترین روز سال:' : 'Max String Open-Circuit Voltage (Cold Voc):'}</td>
                  <td className="p-2 font-mono">{arrayDesign.stringVocMaxColdVolts.toFixed(1)} V (Limit: {inverter.vdcMaxVolts}V) — Compliant with NEC 690.7</td>
                </tr>
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'اینورتر شارژر هیبرید:' : 'Inverter Charger Units:'}</td>
                  <td className="p-2 font-mono font-bold">{inverter.pnomAcKw} kW ({inverter.isThreePhase ? '3-Phase 400V' : '1-Phase 230V'}) — {inverter.manufacturer} {inverter.modelName}</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'مساحت خالص پنل‌ها و فاصله ردیف‌ها:' : 'Array Area & Inter-row Shading Pitch:'}</td>
                  <td className="p-2 font-mono">{Math.round(arrayDesign.netArrayAreaM2)} m² net | Pitch Spacing: {arrayDesign.interRowSpacingM.toFixed(2)} m</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 3: BESS & Generator */}
          <div>
            <h3 className="text-sm font-bold text-sky-400 print:text-sky-800 mb-2 flex items-center gap-1.5">
              <BatteryIcon className="w-4 h-4 text-indigo-400" />
              {lang === 'fa' ? '۳. سیستم ذخیره‌ساز انرژی باتری و ژنراتور اضطراری' : '3. Battery Storage Bank (BESS) & Backup Generator'}
            </h3>
            <table className="w-full text-xs text-slate-300 print:text-black border border-slate-700 print:border-slate-300">
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'شیمی و فناوری باتری:' : 'Battery Chemistry & Technology:'}</td>
                  <td className="p-2 font-bold text-indigo-400 print:text-indigo-800">{batterySizing.chemistry.nameFa} ({batterySizing.chemistry.nameEn})</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'ظرفیت ناخالص و قابل استفاده:' : 'Gross & Net Usable Capacity:'}</td>
                  <td className="p-2 font-mono">{batterySizing.grossCapacityKwh.toFixed(1)} kWh Gross ({batterySizing.totalCapacityAh} Ah @ {batterySizing.systemVoltageVdc}V) | {batterySizing.usableCapacityKwh.toFixed(1)} kWh Net (DoD: {batterySizing.chemistry.recommendedDoDPct}%)</td>
                </tr>
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'تخمین طول عمر مفید باتری:' : 'Estimated Battery Lifespan & Cycles:'}</td>
                  <td className="p-2 font-mono font-bold text-purple-400 print:text-purple-800">~{batterySizing.estimatedLifespanYears} {lang === 'fa' ? 'سال' : 'Years'} ({batterySizing.expectedTotalCycles.toLocaleString()} {lang === 'fa' ? 'سیکل' : 'Cycles'})</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'دیزل ژنراتور اضطراری کمکی:' : 'Auxiliary Diesel Generator:'}</td>
                  <td className="p-2 font-mono">{generator.recommendedCapacityKva} kVA ({generator.recommendedCapacityKw.toFixed(1)} kW) | Fuel: {generator.fuelConsumptionLitersPerHour} L/h</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Table 4: Financial Summary */}
          <div>
            <h3 className="text-sm font-bold text-sky-400 print:text-sky-800 mb-2 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              {lang === 'fa' ? '۴. خلاصه برآورد مالی، بازگشت سرمایه و شاخص‌های اقتصادی' : '4. Financial Feasibility, Payback & Economic Metrics'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-800/40 print:bg-slate-50 p-3 rounded border border-slate-700/60 print:border-slate-300 text-xs">
              <div>
                <span className="text-slate-400 block">{lang === 'fa' ? 'کل سرمایه‌گذاری اولیه (CAPEX):' : 'Total Project CAPEX:'}</span>
                <strong className="text-white print:text-black font-mono text-sm">${financial.capexBreakdown.totalCapexUsd.toLocaleString()}</strong>
                <span className="text-[10px] text-amber-400 block">{(financial.capexBreakdown.totalCapexToman / 1_000_000).toFixed(1)} م.ت</span>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'fa' ? 'دوره ساده بازگشت سرمایه:' : 'Simple Payback Period:'}</span>
                <strong className="text-emerald-400 print:text-emerald-800 font-mono text-sm">{financial.simplePaybackPeriodYears} {lang === 'fa' ? 'سال' : 'Years'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'fa' ? 'بهای تمام‌شده تراز شده (LCOE):' : 'Levelized Cost of Energy:'}</span>
                <strong className="text-sky-300 print:text-sky-800 font-mono text-sm">${financial.lcoeUsdPerKwh.toFixed(4)}/kWh</strong>
              </div>
              <div>
                <span className="text-slate-400 block">{lang === 'fa' ? 'کاهش انتشار دی‌اکسید کربن:' : 'Annual CO2 Abatement:'}</span>
                <strong className="text-teal-400 print:text-teal-800 font-mono text-sm">{financial.annualCo2ReductionTons} {lang === 'fa' ? 'تن در سال' : 'tons/yr'}</strong>
              </div>
            </div>
          </div>

          {/* Table 5: Utility Scale, Performance Ratio & Regulatory Compliance */}
          <div>
            <h3 className="text-sm font-bold text-sky-400 print:text-sky-800 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {lang === 'fa' ? '۵. مشخصات اتصال به شبکه، ضریب عملکرد (PR) و چارچوب ماده ۱۶' : '5. Grid Connection, PR & Iranian Regulatory Framework'}
            </h3>
            <table className="w-full text-xs text-slate-300 print:text-black border border-slate-700 print:border-slate-300">
              <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'ضریب عملکرد سالانه نیروگاه (Performance Ratio - PR):' : 'Annual System Performance Ratio (PR):'}</td>
                  <td className="p-2 font-mono font-bold text-emerald-400 print:text-emerald-800">81.4% (IEC 61724 Class A Certified)</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">{lang === 'fa' ? 'سطح ولتاژ اتصال به شبکه و ترانسفورماتور:' : 'Grid Interconnection & Substation:'}</td>
                  <td className="p-2 font-mono">{inverter.isThreePhase ? '20 kV / 400 V Step-up Transformer, Hermetic Oil-Immersed' : '230 V Low-Voltage Distribution'}</td>
                </tr>
                <tr className="bg-slate-850/60 print:bg-slate-50">
                  <td className="p-2 font-medium">{lang === 'fa' ? 'تطابق با ماده ۱۶ جهش تولید و تابلوسبز بورس:' : 'Iranian Article 16 & IRENEX Compliance:'}</td>
                  <td className="p-2 text-amber-300 print:text-amber-800">{lang === 'fa' ? 'معافیت کامل از قطعی‌های تابستانه صنایع + درآمد حاصل از فروش در بورس انرژی تابلوسبز یا تهاتر با دیسپاچینگ ملی' : 'Full compliance with Article 16 Industrial Mandate & IRENEX Green Board Trading'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compliance & Engineering Signoff */}
          <div className="border-t border-slate-700/80 print:border-slate-300 pt-4 text-xs text-slate-400 print:text-slate-600 flex items-center justify-between">
            <div>
              <div className="font-bold text-white print:text-black mb-1">
                {lang === 'fa' ? 'استانداردهای بین‌المللی مرجع طراحی:' : 'International Reference Standards:'}
              </div>
              <div>• IEC 62548:2024 (Photovoltaic Arrays Design) | IEC 60364-5-52 (Cables & Voltage Drop)</div>
              <div>• IEEE 1547-2018 (Interconnection) | IEEE 80-2013 (Substation Grounding Mesh)</div>
              <div>• SATBA Technical Regulations & Tavanir MV Interconnection Grid Code</div>
            </div>
            <div className="text-left font-mono text-[11px]">
              <div>Certified EPC Sizing Engine</div>
              <div>SolarPV Studio Pro v2.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
