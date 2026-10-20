import React from 'react';
import { Shield, Zap, CheckCircle2, AlertTriangle, Layers, FileSpreadsheet, Anchor } from 'lucide-react';
import { ProtectionAnalysisResult, CableRunCalculation } from '../engine/protectionBomEngine';

interface ProtectionBomTabProps {
  protectionResult: ProtectionAnalysisResult;
}

export const ProtectionBomTab: React.FC<ProtectionBomTabProps> = ({ protectionResult }) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          مهندسی سیم‌کشی، افت ولتاژ و لیست ادوات حفاظتی (Cable Sizing & Protection BOM)
        </h1>
        <p className="text-slate-400 text-xs">
          محاسبه دقیق سطح مقطع کابل‌ها طبق فرمول هدایت مس و استاندارد IEC 60364-5-52 به همراه لیست کامل تجهیزات تابلویی و ارسترها
        </p>
      </div>

      {/* 1. Cable Runs & Voltage Drop Table */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          ۱. محاسبات سایزینگ کابل و درصد افت ولتاژ (Voltage Drop Analysis)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-2.5">بخش مدار الکتریکی</th>
                <th className="p-2.5">طول رفت (m)</th>
                <th className="p-2.5">جریان طراحی (A)</th>
                <th className="p-2.5">ولتاژ نامی (V)</th>
                <th className="p-2.5">سطح مقطع محاسبه‌شده</th>
                <th className="p-2.5">سطح مقطع استاندارد انتخابی</th>
                <th className="p-2.5">افت ولتاژ واقعی</th>
                <th className="p-2.5 text-center">وضعیت انطباق IEC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {protectionResult.cableRuns.map((run, idx) => (
                <tr key={idx} className="hover:bg-slate-850/60">
                  <td className="p-2.5 font-semibold text-white">
                    {run.sectionNameFa}
                  </td>
                  <td className="p-2.5 font-mono">{run.oneWayLengthM} m</td>
                  <td className="p-2.5 font-mono text-emerald-400 font-bold">
                    {run.designCurrentAmps.toFixed(1)} A
                  </td>
                  <td className="p-2.5 font-mono text-sky-400">
                    {run.nominalVoltageVolts.toFixed(0)} V
                  </td>
                  <td className="p-2.5 font-mono text-slate-300">
                    {run.calculatedCrossSectionMm2.toFixed(2)} mm²
                  </td>
                  <td className="p-2.5 font-mono font-bold text-amber-300 text-sm">
                    {run.selectedStandardCrossSectionMm2} mm² مس
                  </td>
                  <td className="p-2.5 font-mono font-bold">
                    <span className={run.isCompliant ? 'text-emerald-400' : 'text-red-400'}>
                      {run.actualVoltageDropPct.toFixed(2)}% ({run.actualVoltageDropVolts.toFixed(2)}V)
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                        run.isCompliant
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {run.isCompliant ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> مجاز (≤{run.allowableDropPct}%)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> بیش از حد مجاز
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-700/60">
          فرمول محاسباتی استاندارد IEC: <span className="font-mono text-sky-300">S = (2 · L · I) / (γ · ΔV)</span> با ضریب هدایت مس <span className="font-mono text-amber-300">γ = 56</span>. حداکثر افت ولتاژ مجاز بخش DC استرینگ ۱.۵٪ و کابل باسبار باتری ۱.۰٪ در نظر گرفته شده است.
        </div>
      </div>

      {/* 2. Protection Bill of Materials (BOM) */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          ۲. لیست تفصیلی قطعات و ادوات حفاظتی تابلویی (Protection BOM)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-2.5">ردیف</th>
                <th className="p-2.5">شرح تجهیز حفاظتی</th>
                <th className="p-2.5">مشخصات فنی و استاندارد مرجع</th>
                <th className="p-2.5">رنج نامی</th>
                <th className="p-2.5">تعداد</th>
                <th className="p-2.5">محل نصب در سیستم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {protectionResult.protectionBom.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-850/60">
                  <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-2.5 font-semibold text-white">
                    {item.deviceFa}
                    <div className="text-[10px] text-slate-400 font-normal">{item.deviceEn}</div>
                  </td>
                  <td className="p-2.5 text-sky-300">{item.specificationFa}</td>
                  <td className="p-2.5 font-mono font-bold text-amber-300">{item.rating}</td>
                  <td className="p-2.5 font-mono font-bold text-white text-center">{item.quantity} عدد</td>
                  <td className="p-2.5 text-slate-300 text-[11px]">{item.locationFa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Earthing & Grounding System */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-2 flex items-center gap-2">
          <Anchor className="w-4 h-4 text-teal-400" />
          ۳. سیستم ارتینگ و هم‌پتانسیل‌سازی حفاظتی (Earthing & Equipotential Bonding)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-700/60">
          <div>
            <span className="text-slate-400 block">طول الکترود میله ارت مسی:</span>
            <span className="text-white font-mono font-bold text-sm">
              {protectionResult.earthingElectrodeLengthM} متر (میله ارت استاندارد ۲۲mm)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">سطح مقطع سیم مسی ارت اصلی (PE):</span>
            <span className="text-teal-400 font-mono font-bold text-sm">
              {protectionResult.earthingConductorMm2} mm² سیم ارت روکش‌دار سبز/زرد
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">حداکثر مقاومت مجاز زمین:</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">
              کمتر از ۵ اهم (R_earth &lt; 5 Ω) طبق IEC 60364-5-54
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
