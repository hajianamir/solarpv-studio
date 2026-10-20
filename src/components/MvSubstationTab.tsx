import React, { useState } from 'react';
import { Zap, Shield, Anchor, Activity, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { designMvSubstation, MvSubstationResult } from '../engine/mvSubstationEngine';

interface MvSubstationTabProps {
  plantCapacityAcMw: number;
}

export const MvSubstationTab: React.FC<MvSubstationTabProps> = ({ plantCapacityAcMw }) => {
  const [gridVoltageKv, setGridVoltageKv] = useState<number>(20);
  const [inverterVoltageV, setInverterVoltageV] = useState<number>(400);
  const [soilResistivityOhmM, setSoilResistivityOhmM] = useState<number>(80);
  const [clearingTimeSec, setClearingTimeSec] = useState<number>(0.5);

  const subResult: MvSubstationResult = designMvSubstation({
    plantCapacityAcMva: plantCapacityAcMw,
    inverterOutputVoltageV: inverterVoltageV,
    gridConnectionVoltageKv: gridVoltageKv,
    soilResistivityOhmM,
    clearingTimeSec,
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          مهندسی پست فشار متوسط، ترانسفورماتور و ارتینگ (MV/HV Substation & IEEE 80)
        </h1>
        <p className="text-slate-400 text-xs">
          محاسبات اتصال کوتاه طبق IEC 60909، سایزینگ ترانسفورماتور افزاینده ۲۰ و ۳۳ کیلوولت، تابلوی RMU و مش ارتینگ پست طبق IEEE 80
        </p>
      </div>

      {/* Grid Controls */}
      <div className="studio-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">ولتاژ خط انتقال شبکه (kV):</label>
            <select
              value={gridVoltageKv}
              onChange={(e) => setGridVoltageKv(parseInt(e.target.value) || 20)}
              className="studio-input text-xs"
            >
              <option value="20">۲۰ کیلوولت (فشار متوسط توزیع شهری/روستایی)</option>
              <option value="33">۳۳ کیلوولت (فشار متوسط اختصاصی صنایع)</option>
              <option value="63">۶۳ کیلوولت (فوق توزیع منطقه‌ای)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">ولتاژ خروجی اینورترها (V):</label>
            <select
              value={inverterVoltageV}
              onChange={(e) => setInverterVoltageV(parseInt(e.target.value) || 400)}
              className="studio-input text-xs"
            >
              <option value="400">۴۰۰ ولت سه فاز استاندارد</option>
              <option value="690">۶۹۰ ولت سه فاز صنعتی</option>
              <option value="800">۸۰۰ ولت اینورترهای استرینگ جدید مزارع خورشیدی</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">مقاومت ویژه خاک پست (Ω·m):</label>
            <input
              type="number"
              step="10"
              value={soilResistivityOhmM}
              onChange={(e) => setSoilResistivityOhmM(parseFloat(e.target.value) || 50)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">مدت زمان پاک‌سازی خطا tc (ثانیه):</label>
            <input
              type="number"
              step="0.1"
              value={clearingTimeSec}
              onChange={(e) => setClearingTimeSec(parseFloat(e.target.value) || 0.5)}
              className="studio-input font-mono"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ظرفیت ترانسفورماتور افزاینده</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {subResult.transformer.ratedPowerMva} <span className="text-xs font-normal text-slate-300">MVA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            امپدانس uk = {subResult.transformer.impedanceVoltageUkPct}%
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">جریان اتصال کوتاه (Isc'')</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {subResult.shortCircuit.initialSymmetricalIscKa} <span className="text-xs font-normal text-slate-300">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            پیک دینامیکی: {subResult.shortCircuit.peakDynamicIpKa} kA
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">قدرت قطع بریکر خلاء (VCB)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {subResult.shortCircuit.breakingCapacityKa} <span className="text-xs font-normal text-slate-300">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">تابلوی کمپکت گاز SF6</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">مقاومت کل مش ارتینگ پست (Rg)</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {subResult.earthing.calculatedGridResistanceOhms} <span className="text-xs font-normal text-slate-300">Ω</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {subResult.earthing.isCompliant ? '✓ مطابق IEEE 80 (زیر ۱ اهم)' : 'نیاز به بهسازی چاه ارت'}
          </div>
        </div>
      </div>

      {/* Transformer & Earthing Technical Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transformer Specs */}
        <div className="studio-card">
          <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            مشخصات فنی ترانسفورماتور قدرت (Power Transformer)
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">تیپ ترانسفورماتور:</span>
              <strong className="text-white">{subResult.transformer.coolingType}</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">گروه برداری (Vector Group):</span>
              <strong className="text-sky-300 font-mono">{subResult.transformer.vectorGroup}</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">نسبت تبدیل ولتاژ:</span>
              <strong className="text-white font-mono">{inverterVoltageV}V / {gridVoltageKv}kV</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">تلفات بی‌باری (هسته P0):</span>
              <strong className="text-amber-400 font-mono">{subResult.transformer.noLoadLossesKw} kW</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">تلفات بارداری (سیم‌پیچ مسی Pk):</span>
              <strong className="text-amber-400 font-mono">{subResult.transformer.loadLossesKw} kW</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">راندمان در بار کامل:</span>
              <strong className="text-emerald-400 font-mono">{subResult.transformer.efficiencyAtFullLoadPct}%</strong>
            </div>
          </div>
        </div>

        {/* IEEE 80 Earthing Grid */}
        <div className="studio-card">
          <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
            <Anchor className="w-4 h-4 text-teal-400" />
            طراحی مش ارتینگ پست بر اساس استاندارد IEEE 80
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">سطح مقطع هادی مسی مش ارت:</span>
              <strong className="text-teal-300 font-mono text-sm">{subResult.earthing.groundGridConductorMm2} mm² مس</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">حد ولتاژ تماس مجاز (Touch Voltage Limit):</span>
              <strong className="text-white font-mono">{subResult.earthing.touchVoltageLimitVolts} ولت</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">حد ولتاژ گام مجاز (Step Voltage Limit):</span>
              <strong className="text-white font-mono">{subResult.earthing.stepVoltageLimitVolts} ولت</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">مقاومت الکتریکی کل مش زمین:</span>
              <strong className="text-emerald-400 font-mono font-bold text-sm">
                {subResult.earthing.calculatedGridResistanceOhms} Ω (&lt; 1.0 Ω)
              </strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">کنترل توان راکتیو Q(U):</span>
              <strong className="text-sky-300 font-mono">{subResult.reactivePowerCapacityMvar} Mvar ({subResult.powerFactorRange})</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Switchgear & Engineering Notes */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-2">تجهیزات تابلویی و رله‌های حفاظتی فشار متوسط (MV Switchgear)</h3>
        <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 mb-3">
          {subResult.switchgearDescriptionFa}
        </p>

        <div className="space-y-1 text-xs text-slate-300">
          {subResult.notesFa.map((note, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
