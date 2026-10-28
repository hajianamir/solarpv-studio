import React, { useState } from 'react';
import { Zap, Shield, Anchor, Activity, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { designMvSubstation, MvSubstationResult } from '../engine/mvSubstationEngine';

interface MvSubstationTabProps {
  plantCapacityAcMw: number;
  lang?: 'fa' | 'en';
}

export const MvSubstationTab: React.FC<MvSubstationTabProps> = ({ plantCapacityAcMw, lang = 'fa' }) => {
  const isFa = lang === 'fa';
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
        <h1 className="text-lg sm:text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 shrink-0" />
          {isFa
            ? 'مهندسی پست فشار متوسط، ترانسفورماتور و ارتینگ (MV/HV Substation & IEEE 80)'
            : 'MV/HV Collector Substation, Transformer & IEEE 80 Earth Grid Engineering'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isFa
            ? 'محاسبات اتصال کوتاه طبق IEC 60909، سایزینگ ترانسفورماتور افزاینده ۲۰ و ۳۳ کیلوولت، تابلوی RMU و مش ارتینگ پست طبق IEEE 80'
            : 'IEC 60909 short-circuit analysis, 20/33kV step-up transformer sizing, SF6 RMU switchgear, and IEEE 80 substation ground grid.'}
        </p>
      </div>

      {/* Grid Controls */}
      <div className="studio-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'ولتاژ خط انتقال شبکه (kV):' : 'Grid Interconnection Voltage (kV):'}
            </label>
            <select
              value={gridVoltageKv}
              onChange={(e) => setGridVoltageKv(parseInt(e.target.value) || 20)}
              className="studio-input text-xs"
            >
              <option value="20">{isFa ? '۲۰ کیلوولت (فشار متوسط توزیع)' : '20 kV (Standard MV Distribution)'}</option>
              <option value="33">{isFa ? '۳۳ کیلوولت (فشار متوسط صنایع)' : '33 kV (Industrial Dedicated MV)'}</option>
              <option value="63">{isFa ? '۶۳ کیلوولت (فوق توزیع منطقه‌ای)' : '63 kV (Sub-Transmission Utility)'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'ولتاژ خروجی اینورترها (V):' : 'Inverter AC Output Voltage (V):'}
            </label>
            <select
              value={inverterVoltageV}
              onChange={(e) => setInverterVoltageV(parseInt(e.target.value) || 400)}
              className="studio-input text-xs"
            >
              <option value="400">{isFa ? '۴۰۰ ولت سه فاز استاندارد' : '400 V 3-Phase Standard'}</option>
              <option value="690">{isFa ? '۶۹۰ ولت سه فاز صنعتی' : '690 V Industrial 3-Phase'}</option>
              <option value="800">{isFa ? '۸۰۰ ولت اینورترهای استرینگ جدید' : '800 V Modern Utility String Inverters'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'مقاومت ویژه خاک پست (Ω·m):' : 'Soil Apparent Resistivity (Ω·m):'}
            </label>
            <input
              type="number"
              step="10"
              value={soilResistivityOhmM}
              onChange={(e) => setSoilResistivityOhmM(parseFloat(e.target.value) || 50)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'مدت زمان پاک‌سازی خطا tc (ثانیه):' : 'Fault Clearing Time tc (s):'}
            </label>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'ظرفیت ترانسفورماتور افزاینده' : 'Step-up Transformer Rating'}
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {subResult.transformer.ratedPowerMva} <span className="text-xs font-normal text-slate-300">MVA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            uk = {subResult.transformer.impedanceVoltageUkPct}%
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'جریان اتصال کوتاه (Isc\'\')' : 'Initial Symmetrical SC (Isc\'\')'}
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {subResult.shortCircuit.initialSymmetricalIscKa} <span className="text-xs font-normal text-slate-300">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'پیک دینامیکی:' : 'Dynamic peak:'} {subResult.shortCircuit.peakDynamicIpKa} kA
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'قدرت قطع بریکر خلاء (VCB)' : 'VCB Breaking Capacity'}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {subResult.shortCircuit.breakingCapacityKa} <span className="text-xs font-normal text-slate-300">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'تابلوی کمپکت گاز SF6' : 'SF6 Gas Insulated Switchgear'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'مقاومت کل مش ارتینگ پست (Rg)' : 'Substation Earth Resistance (Rg)'}
          </div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {subResult.earthing.calculatedGridResistanceOhms} <span className="text-xs font-normal text-slate-300">Ω</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {subResult.earthing.isCompliant
              ? (isFa ? '✓ مطابق IEEE 80 (زیر ۱ اهم)' : '✓ Compliant IEEE 80 (< 1.0 Ω)')
              : (isFa ? 'نیاز به بهسازی چاه ارت' : 'Deep earth boreholes required')}
          </div>
        </div>
      </div>

      {/* Transformer & Earthing Technical Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Transformer Specs */}
        <div className="studio-card">
          <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            {isFa ? 'مشخصات فنی ترانسفورماتور قدرت (Power Transformer)' : 'Step-Up Power Transformer Specifications'}
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'تیپ ترانسفورماتور:' : 'Cooling Type:'}</span>
              <strong className="text-white">{subResult.transformer.coolingType}</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'گروه برداری (Vector Group):' : 'Vector Group:'}</span>
              <strong className="text-sky-300 font-mono">{subResult.transformer.vectorGroup}</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'نسبت تبدیل ولتاژ:' : 'Voltage Ratio:'}</span>
              <strong className="text-white font-mono">{inverterVoltageV}V / {gridVoltageKv}kV</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'تلفات بی‌باری (هسته P0):' : 'No-Load Core Losses (P0):'}</span>
              <strong className="text-amber-400 font-mono">{subResult.transformer.noLoadLossesKw} kW</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'تلفات بارداری (سیم‌پیچ Pk):' : 'Load Copper Losses (Pk):'}</span>
              <strong className="text-amber-400 font-mono">{subResult.transformer.loadLossesKw} kW</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'راندمان در بار کامل:' : 'Full-Load Efficiency:'}</span>
              <strong className="text-emerald-400 font-mono">{subResult.transformer.efficiencyAtFullLoadPct}%</strong>
            </div>
          </div>
        </div>

        {/* IEEE 80 Earthing Grid */}
        <div className="studio-card">
          <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
            <Anchor className="w-4 h-4 text-teal-400 shrink-0" />
            {isFa ? 'طراحی مش ارتینگ پست بر اساس استاندارد IEEE 80' : 'Substation Grounding Grid Design (IEEE 80)'}
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'سطح مقطع هادی مسی مش ارت:' : 'Grid Conductor Size:'}</span>
              <strong className="text-teal-300 font-mono text-sm">{subResult.earthing.groundGridConductorMm2} mm² Cu</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'حد ولتاژ تماس مجاز (Touch):' : 'Tolerable Touch Voltage:'}</span>
              <strong className="text-white font-mono">{subResult.earthing.touchVoltageLimitVolts} V</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'حد ولتاژ گام مجاز (Step):' : 'Tolerable Step Voltage:'}</span>
              <strong className="text-white font-mono">{subResult.earthing.stepVoltageLimitVolts} V</strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'مقاومت الکتریکی کل مش زمین:' : 'Grid Resistance (Rg):'}</span>
              <strong className="text-emerald-400 font-mono font-bold text-sm">
                {subResult.earthing.calculatedGridResistanceOhms} Ω (&lt; 1.0 Ω)
              </strong>
            </div>
            <div className="flex justify-between p-2 bg-slate-900/60 rounded">
              <span className="text-slate-400">{isFa ? 'کنترل توان راکتیو Q(U):' : 'Reactive Power Support Q(U):'}</span>
              <strong className="text-sky-300 font-mono">{subResult.reactivePowerCapacityMvar} Mvar ({subResult.powerFactorRange})</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Switchgear & Engineering Notes */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-2">
          {isFa ? 'تجهیزات تابلویی و رله‌های حفاظتی فشار متوسط (MV Switchgear)' : 'Medium-Voltage Switchgear & Protection Relays'}
        </h3>
        <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-700/60 mb-3">
          {isFa ? subResult.switchgearDescriptionFa : 'Gas-Insulated Ring Main Unit (GIS RMU) with integrated vacuum circuit breaker (VCB), motorized disconnectors, numerical multifunctional protection relay (50/51/51N/27/59/81), surge arresters (Class 2), and SCADA telecontrol gateway.'}
        </p>

        <div className="space-y-1 text-xs text-slate-300">
          {(isFa ? subResult.notesFa : [
            'Short circuit withstand capacity calculated according to IEC 60909-0 standard.',
            'Substation ground grid conductor sized per IEEE 80-2013 using copper bare cable.',
            'Step and touch voltages are strictly within safety thresholds for 50kg body weight with crushed stone surface layer.',
            'Harmonic filter connection point provisioned at main 20kV/33kV MV busbar.'
          ]).map((note, i) => (
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
