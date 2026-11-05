import React, { useState } from 'react';
import { Zap, Shield, Anchor, Activity, CheckCircle2, AlertTriangle, Layers, Thermometer, Compass, Radio } from 'lucide-react';
import { designMvSubstation, type MvSubstationResult } from '../engine/mvSubstationEngine';

interface MvSubstationTabProps {
  plantCapacityAcMw: number;
  ambientTempC?: number;
  elevationM?: number;
  lang?: 'fa' | 'en';
}

export const MvSubstationTab: React.FC<MvSubstationTabProps> = ({
  plantCapacityAcMw,
  ambientTempC = 42,
  elevationM = 1200,
  lang = 'fa',
}) => {
  const isFa = lang === 'fa';
  const [gridVoltageKv, setGridVoltageKv] = useState<number>(20);
  const [inverterVoltageV, setInverterVoltageV] = useState<number>(800);
  const [siteAmbientTemp, setSiteAmbientTemp] = useState<number>(ambientTempC);
  const [siteElevation, setSiteElevation] = useState<number>(elevationM);
  const [soilResistivityOhmM, setSoilResistivityOhmM] = useState<number>(80);
  const [clearingTimeSec, setClearingTimeSec] = useState<number>(0.5);
  const [gridMva, setGridMva] = useState<number>(500);

  const subResult: MvSubstationResult = designMvSubstation({
    plantCapacityAcMva: plantCapacityAcMw,
    inverterOutputVoltageV: inverterVoltageV,
    gridConnectionVoltageKv: gridVoltageKv,
    soilResistivityOhmM,
    clearingTimeSec,
    ambientTempC: siteAmbientTemp,
    elevationM: siteElevation,
    upstreamGridShortCircuitMva: gridMva,
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-lg sm:text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-industrial-warning shrink-0" />
          {isFa
            ? 'مهندسی پست فشار متوسط، ترانسفورماتور و ارتینگ (MV/HV Substation & IEEE 80)'
            : 'MV/HV Collector Substation, Transformer & IEEE 80 Earth Grid Engineering'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isFa
            ? 'محاسبات اتصال کوتاه طبق IEC 60909 با احتساب شبکه بالادست، سایزینگ ترانسفورماتور با ضرایب افت دمایی و ارتفاعی (IEC 60076)، تابلوی RMU، کابل MV، برق‌گیر و مش ارتینگ طبق IEEE 80'
            : 'IEC 60909 short-circuit analysis with upstream grid, transformer sizing with temperature/altitude deratings (IEC 60076), RMU switchgear, MV cables, and IEEE 80 earth grid.'}
        </p>
      </div>

      {/* Grid & Environmental Controls */}
      <div className="studio-card">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-industrial-warning" />
          {isFa ? 'پارامترهای شبکه، دما، ارتفاع و خاک محوطه پست' : 'Grid, Environmental, Altitude & Soil Parameters'}
        </h3>
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
              onChange={(e) => setInverterVoltageV(parseInt(e.target.value) || 800)}
              className="studio-input text-xs"
            >
              <option value="800">{isFa ? '۸۰۰ ولت (اینورترهای استرینگ جدید)' : '800 V Modern Utility Inverters'}</option>
              <option value="690">{isFa ? '۶۹۰ ولت (اینورترهای مرکزی/صنعتی)' : '690 V Central Inverters'}</option>
              <option value="400">{isFa ? '۴۰۰ ولت (سه فاز استاندارد LV)' : '400 V Standard 3-Phase LV'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>{isFa ? 'دمای حداکثر محیط (°C):' : 'Max Ambient Temp (°C):'}</span>
              <span className="font-mono text-industrial-warning font-bold">{siteAmbientTemp}°C</span>
            </label>
            <input
              type="number"
              min="25"
              max="55"
              value={siteAmbientTemp}
              onChange={(e) => setSiteAmbientTemp(Number(e.target.value) || 40)}
              className="studio-input font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span>{isFa ? 'ارتفاع از سطح دریا (متر):' : 'Site Elevation (m):'}</span>
              <span className="font-mono text-sky-300 font-bold">{siteElevation}m</span>
            </label>
            <input
              type="number"
              min="0"
              max="3500"
              step="50"
              value={siteElevation}
              onChange={(e) => setSiteElevation(Number(e.target.value) || 1000)}
              className="studio-input font-mono text-xs"
            />
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
              className="studio-input font-mono text-xs"
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
              className="studio-input font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'سطح اتصال کوتاه شبکه بالادست (MVA):' : 'Upstream Grid Fault Level (MVA):'}
            </label>
            <select
              value={gridMva}
              onChange={(e) => setGridMva(parseInt(e.target.value) || 500)}
              className="studio-input text-xs font-mono"
            >
              <option value="350">350 MVA (شبکه‌های ضعیف توزیع)</option>
              <option value="500">500 MVA (استاندارد شبکه توزیع ایران)</option>
              <option value="750">750 MVA (شبکه فوق توزیع منطقه‌ای)</option>
              <option value="1000">1000 MVA (پست‌های ۶۳/۲۰ کیلوولت قوی)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'توان نامی نیروگاه در نقطه تزریق:' : 'Plant Active AC Capacity:'}
            </label>
            <div className="p-2 bg-industrial-surface rounded border border-industrial-border text-industrial-accent font-mono font-bold">
              {plantCapacityAcMw} MW
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'ظرفیت نامی ترانسفورماتور قدرت' : 'Step-up Transformer Rating'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-warning mt-1">
            {subResult.transformer.ratedPowerMva} <span className="text-xs font-normal text-slate-300">MVA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'ظرفیت مؤثر در محل پروژه:' : 'Effective Capacity:'} {subResult.transformer.effectiveCapacityUnderSiteConditionsMva} MVA
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'جریان اتصال کوتاه (Isc\'\')' : 'Initial Symmetrical SC (Isc\'\')'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-error mt-1">
            {subResult.shortCircuit.initialSymmetricalIscKa} <span className="text-xs font-normal text-slate-300">kA</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'پیک دینامیکی:' : 'Dynamic peak:'} {subResult.shortCircuit.peakDynamicIpKa} kA (IEC 60909)
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'قدرت قطع بریکر خلاء (VCB)' : 'VCB Breaking Capacity'}
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${
            subResult.shortCircuit.isBreakerSufficient ? 'text-industrial-success' : 'text-industrial-error'
          }`}>
            {subResult.shortCircuit.breakingCapacityKa} <span className="text-xs font-normal text-slate-300">kA</span>
          </div>
          <div className={`text-[10px] mt-0.5 ${
            subResult.shortCircuit.isBreakerSufficient ? 'text-slate-400' : 'text-red-400 font-bold'
          }`}>
            {subResult.shortCircuit.isBreakerSufficient
              ? `${subResult.shortCircuit.selectedBreakerModel} (${subResult.shortCircuit.selectedBreakerManufacturer})`
              : (isFa ? '✗ قدرت قطع ناکافی (جریان خطا بیش از حد)' : '✗ Insufficient breaking capacity')}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
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
          <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-industrial-warning shrink-0" />
              {isFa ? 'مشخصات فنی ترانسفورماتور و ضرایب کاهش توان (IEC 60076)' : 'Power Transformer & Deratings (IEC 60076)'}
            </span>
            <span className="text-[10px] text-industrial-warning font-mono">
              Dyn11 / uk={subResult.transformer.impedanceVoltageUkPct}%
            </span>
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'نوع خنک‌کاری:' : 'Cooling Type:'}</span>
              <strong className="text-white">{subResult.transformer.coolingType}</strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'نسبت تبدیل ولتاژ:' : 'Voltage Ratio:'}</span>
              <strong className="text-white font-mono">{inverterVoltageV}V / {gridVoltageKv}kV</strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'افت حرارتی محیطی (>40°C):' : 'Ambient Temp Derating (>40°C):'}</span>
              <strong className="text-industrial-warning font-mono">-{subResult.transformer.temperatureDeratingPct}%</strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'افت ارتفاعی (>1000m):' : 'Altitude Derating (>1000m):'}</span>
              <strong className="text-sky-300 font-mono">-{subResult.transformer.altitudeDeratingPct}%</strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'رزرو هارمونیک جریان (K-factor):' : 'Harmonic Heating Allowance:'}</span>
              <strong className="text-purple-300 font-mono">+{subResult.transformer.harmonicDeratingPct}%</strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'تلفات بی‌باری و بارداری (P0+Pk):' : 'Total Losses (P0+Pk):'}</span>
              <strong className="text-industrial-warning font-mono">
                {subResult.transformer.noLoadLossesKw} kW + {subResult.transformer.loadLossesKw} kW
              </strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'راندمان در بار کامل:' : 'Full-Load Efficiency:'}</span>
              <strong className="text-industrial-success font-mono">{subResult.transformer.efficiencyAtFullLoadPct}%</strong>
            </div>
          </div>
        </div>

        {/* IEEE 80 Earthing Grid */}
        <div className="studio-card">
          <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Anchor className="w-4 h-4 text-teal-400 shrink-0" />
              {isFa ? 'طراحی مش ارتینگ و ولتاژهای گام/لمس (IEEE 80)' : 'Substation Grounding Grid Design (IEEE 80)'}
            </span>
            <span className="text-[10px] text-industrial-success font-mono font-bold">
              Rg = {subResult.earthing.calculatedGridResistanceOhms} Ω
            </span>
          </h3>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'سطح مقطع هادی مسی مش ارت:' : 'Grid Conductor Size:'}</span>
              <strong className="text-teal-300 font-mono text-sm">{subResult.earthing.groundGridConductorMm2} mm² Cu</strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'ولتاژ تماس مش (Em) / حد مجاز:' : 'Mesh Touch Voltage (Em) / Tol:'}</span>
              <div className="text-right">
                <strong className={`font-mono ${subResult.earthing.isTouchSafe ? 'text-industrial-success' : 'text-industrial-error'}`}>
                  {subResult.earthing.actualMeshVoltageVolts} V
                </strong>
                <span className="text-[10px] text-slate-400 font-mono ml-1">/ {subResult.earthing.touchVoltageLimitVolts} V</span>
              </div>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'ولتاژ گام محوطه (Es) / حد مجاز:' : 'Step Voltage (Es) / Tol:'}</span>
              <div className="text-right">
                <strong className={`font-mono ${subResult.earthing.isStepSafe ? 'text-industrial-success' : 'text-industrial-error'}`}>
                  {subResult.earthing.actualStepVoltageVolts} V
                </strong>
                <span className="text-[10px] text-slate-400 font-mono ml-1">/ {subResult.earthing.stepVoltageLimitVolts} V</span>
              </div>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'مقاومت الکتریکی کل مش زمین:' : 'Grid Resistance (Rg):'}</span>
              <strong className="text-industrial-success font-mono font-bold text-sm">
                {subResult.earthing.calculatedGridResistanceOhms} Ω (&lt; 1.0 Ω)
              </strong>
            </div>
            <div className="flex justify-between p-2 bg-industrial-surface/60 rounded">
              <span className="text-slate-400">{isFa ? 'کنترل توان راکتیو Q(U):' : 'Reactive Power Support Q(U):'}</span>
              <strong className="text-sky-300 font-mono">{subResult.reactivePowerCapacityMvar} Mvar ({subResult.powerFactorRange})</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Transformer, MV Cables & Surge Arresters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="studio-card">
          <h4 className="text-xs font-bold text-sky-300 mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {isFa ? 'ترانسفورماتور مصارف داخلی (Station Aux)' : 'Station Auxiliary Transformer'}
          </h4>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">{isFa ? 'ظرفیت نامی:' : 'Rating:'}</span>
              <strong className="font-mono text-white">{subResult.auxiliaryTransformer.ratedKva} kVA</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isFa ? 'نسبت ولتاژ:' : 'Ratio:'}</span>
              <strong className="font-mono text-sky-300">{subResult.auxiliaryTransformer.voltageRatio}</strong>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              {isFa ? subResult.auxiliaryTransformer.purposeFa : subResult.auxiliaryTransformer.purposeEn}
            </p>
          </div>
        </div>

        <div className="studio-card">
          <h4 className="text-xs font-bold text-industrial-warning mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {isFa ? 'کابل فشار متوسط کلکتور (MV Cable)' : 'MV Collector Power Cable'}
          </h4>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">{isFa ? 'مقطع هادی:' : 'Conductor:'}</span>
              <strong className="font-mono text-white">{subResult.mvCollectorCable.crossSectionMm2} mm² Al</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isFa ? 'جریان نامی فاز:' : 'Nominal Current:'}</span>
              <strong className="font-mono text-industrial-warning">{subResult.mvCollectorCable.nominalCurrentAmps} A</strong>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed font-mono">
              {isFa ? subResult.mvCollectorCable.cableDesignationFa : subResult.mvCollectorCable.cableDesignationEn}
            </p>
          </div>
        </div>

        <div className="studio-card">
          <h4 className="text-xs font-bold text-purple-300 mb-2 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            {isFa ? 'برقگیر فشار متوسط (Surge Arrester)' : 'MV Surge Arrester (IEC 60099)'}
          </h4>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">{isFa ? 'ولتاژ نامی (Ur):' : 'Rated Ur:'}</span>
              <strong className="font-mono text-purple-300">{subResult.surgeArrester.ratedVoltageUrKv} kV</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{isFa ? 'ولتاژ کار دائم (MCOV):' : 'MCOV (Uc):'}</span>
              <strong className="font-mono text-white">{subResult.surgeArrester.continuousOperatingVoltageMcovKv} kV</strong>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              {subResult.surgeArrester.energyClass}
            </p>
          </div>
        </div>
      </div>

      {/* Switchgear & Engineering Notes */}
      <div className="studio-card">
        <h3 className="font-bold text-industrial-accent text-sm mb-2">
          {isFa ? 'تجهیزات تابلویی و رله‌های حفاظتی فشار متوسط (MV Switchgear)' : 'Medium-Voltage Switchgear & Protection Relays'}
        </h3>
        <p className="text-xs text-slate-300 bg-industrial-surface/60 p-3 rounded-lg border border-industrial-border/60 mb-3">
          {isFa ? subResult.switchgearDescriptionFa : subResult.switchgearDescriptionEn}
        </p>

        <div className="space-y-1 text-xs text-slate-300">
          {(isFa ? subResult.notesFa : [
            'Short circuit withstand capacity calculated according to IEC 60909-0 standard.',
            'Substation ground grid conductor sized per IEEE 80-2013 using copper bare cable.',
            'Step and touch voltages are strictly within safety thresholds for 50kg body weight with crushed stone surface layer.',
            'Harmonic filter connection point provisioned at main 20kV/33kV MV busbar.'
          ]).map((note, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-industrial-success shrink-0 mt-0.5" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MvSubstationTab;
