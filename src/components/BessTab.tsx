import React, { useState, useEffect } from 'react';
import {
  Battery as BatteryIcon,
  Shield,
  RefreshCw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Award,
  Clock,
  Layers,
  Boxes,
  Weight,
  Maximize2,
  Sliders,
  Database,
} from 'lucide-react';
import {
  type BatteryChemistry,
  BATTERY_CHEMISTRIES,
  type BatteryBankSizingResult,
} from '../engine/batteryEngine';
import { CatalogRepository, type EnhancedCatalogBattery } from '../engine/catalogRepository';

interface BessTabProps {
  selectedChemistry: BatteryChemistry;
  onChemistryChange: (chem: BatteryChemistry) => void;
  autonomyDays: number;
  onAutonomyDaysChange: (days: number) => void;
  batterySizing: BatteryBankSizingResult;
  systemTopology?: 'on_grid' | 'off_grid' | 'hybrid';
  onTopologyChange?: (topology: 'on_grid' | 'off_grid' | 'hybrid') => void;
  nighttimeKwh?: number;
  outageHours?: number;
  nightHoursDesign?: number;
  lang?: 'fa' | 'en';
}

export const BessTab: React.FC<BessTabProps> = ({
  selectedChemistry,
  onChemistryChange,
  autonomyDays,
  onAutonomyDaysChange,
  batterySizing,
  systemTopology = 'off_grid',
  onTopologyChange,
  nighttimeKwh,
  outageHours,
  nightHoursDesign,
  lang = 'fa',
}) => {
  const repo = CatalogRepository.getInstance();
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    return repo.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
  }, [repo]);

  const availableBatteries = repo.getBatteries();
  const [selectedBatteryModelId, setSelectedBatteryModelId] = useState<string>(
    availableBatteries[0]?.id || ''
  );

  // Customizable unit battery model selection
  const [unitVoltageV, setUnitVoltageV] = useState<number>(
    selectedChemistry === 'lifepo4' && batterySizing.systemVoltageVdc === 48 ? 48 : 12
  );
  const [unitCapacityAh, setUnitCapacityAh] = useState<number>(100);
  const [unitWeightKg, setUnitWeightKg] = useState<number>(32);

  const handleSelectBatteryModel = (modelId: string) => {
    setSelectedBatteryModelId(modelId);
    const model = availableBatteries.find((b) => b.id === modelId);
    if (model) {
      setUnitVoltageV(model.nominalVoltageVolts);
      setUnitCapacityAh(model.nominalCapacityAh);
      setUnitWeightKg(model.weightKg);

      // Map catalog chemistry to BatteryChemistry type
      let chem: BatteryChemistry = 'lifepo4';
      if (model.chemistry === 'Gel Deep Cycle') chem = 'gel';
      else if (model.chemistry === 'AGM VRLA') chem = 'agm_vrla';
      else if (model.chemistry === 'Ternary NCM') chem = 'ternary_ncm';
      else if (model.chemistry === 'OPzS Tubular') chem = 'opzs_tubular';
      onChemistryChange(chem);
    }
  };

  // Recalculate series & parallel with chosen unit
  const calculatedSeries = Math.max(1, Math.round(batterySizing.systemVoltageVdc / unitVoltageV));
  const calculatedParallel = Math.max(1, Math.ceil(batterySizing.totalCapacityAh / unitCapacityAh));
  const calculatedTotalUnits = calculatedSeries * calculatedParallel;
  const totalWeightKg = calculatedTotalUnits * unitWeightKg;
  const totalFootprintM2 = Number((calculatedTotalUnits * 0.18).toFixed(2)); // approx 0.18m² per unit with rack clearance

  const isNightCoverageDeficit = batterySizing.nightCoveragePct !== undefined && batterySizing.nightCoveragePct < 100;
  const isOnGrid = systemTopology === 'on_grid' || systemTopology === 'hybrid';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <BatteryIcon className="w-5 h-5 text-indigo-400" />
          {lang === 'fa'
            ? 'سیستم ذخیره‌ساز انرژی باتری، انتخاب سایز و تعداد واحدها (BESS Sizing & Architecture)'
            : 'Battery Energy Storage System (BESS) Sizing, Unit Quantity & Physical Layout'}
        </h1>
        <p className="text-slate-400 text-xs">
          {lang === 'fa'
            ? 'محاسبه دقیق ظرفیت بانک باتری (Ah & kWh)، تعداد باتری سری و موازی، نرخ دشارژ C-Rate، وزن و فضای فیزیکی مورد نیاز در اتاق باتری'
            : 'Precise battery bank sizing (Ah & kWh), series & parallel unit calculations, C-Rate discharge safety, and physical footprint.'}
        </p>
      </div>

      {/* Earthing & Bonding Advisory Note (B2 requirement) */}
      <div className="p-3 bg-sky-950/40 border border-sky-800/80 rounded-lg text-xs flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <strong className="text-sky-300 block mb-0.5 font-bold">
            {lang === 'fa' ? 'یادداشت مهندسی سیستم زمین و هم‌بندی رک باتری (IEC 60364-5-54 / IEC 62485-2):' : 'BESS Earthing & Protective Bonding Mandate:'}
          </strong>
          <span>
            {lang === 'fa'
              ? 'رک/کابینت باتری به ارت اصلی سیستم هم‌بند می‌شود؛ قطب‌های DC باتری شناورند و ارت جداگانه اجرا نمی‌شود.'
              : 'Battery racks and metal enclosures must be equipotentially bonded to the Main Earthing Terminal (MET); DC battery poles remain floating, and separate isolated earthing is prohibited.'}
          </span>
        </div>
      </div>

      {/* On-Grid / Powerplant Notice */}
      {systemTopology === 'on_grid' && (
        <div className="p-4 bg-industrial-warning/20 border border-industrial-warning/50 rounded-lg text-xs text-industrial-warning flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Zap className="w-5 h-5 text-industrial-warning shrink-0 mt-0.5" />
            <div>
              <strong className="text-white text-sm block mb-0.5">
                {lang === 'fa'
                  ? 'وضعیت اتصال به شبکه: نیروگاه خورشیدی آن‌گرید (On-Grid Utility Mode)'
                  : 'System Configuration: Grid-Tied On-Grid Mode'}
              </strong>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {lang === 'fa'
                  ? 'در نیروگاه‌های متصل به شبکه (On-Grid)، به طور استاندارد نیازی به محاسبه و نصب باتری نیست و برق خورشیدی مستقیماً به شبکه سراسری تزریق می‌شود. در صورتی که تمایل به سیستم هیبرید با پشتیبان اضطراری قطعی برق یا سیستم آربیتراژ انرژی دارید، می‌توانید سیستم را به Hybrid تغییر دهید.'
                  : 'In standard grid-tied utility powerplants, no battery storage is required. If you desire backup power for summer outages or time-of-use arbitrage, switch system topology to Hybrid.'}
              </p>
            </div>
          </div>
          {onTopologyChange && (
            <button
              onClick={() => onTopologyChange('hybrid')}
              className="studio-btn-primary text-xs py-1.5 px-3 whitespace-nowrap shrink-0"
            >
              {lang === 'fa' ? 'تغییر به سیستم هیبرید (با باتری)' : 'Switch to Hybrid System'}
            </button>
          )}
        </div>
      )}

      {/* Battery Model Selector Card from Catalog (CAT-05) */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-industrial-border/60">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              {lang === 'fa' ? 'انتخاب مدل تجاری باتری از کاتالوگ (BESS Model Selector):' : 'Select Battery Model from Equipment Catalog:'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {lang === 'fa'
                ? 'مشخصات واحد باتری، ولتاژ، ظرفیت، و فناوری شیمیایی مستقیماً از دیتاشیت کاتالوگ استخراج و اعمال می‌شود.'
                : 'Unit voltage, capacity, weight, and chemistry are extracted and injected directly from the selected catalog model.'}
            </p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 font-mono border border-indigo-800/60">
            {availableBatteries.length} {lang === 'fa' ? 'مدل موجود' : 'models available'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label htmlFor="bess-catalog-model-select" className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'fa' ? 'مدل باتری (Built-in / Custom):' : 'Battery Unit Model:'}
            </label>
            <select
              id="bess-catalog-model-select"
              value={selectedBatteryModelId}
              onChange={(e) => handleSelectBatteryModel(e.target.value)}
              className="studio-input w-full text-xs font-mono py-2 bg-industrial-surface border-indigo-500/50 text-white"
            >
              {availableBatteries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.origin === 'custom' ? '⭐ [Custom] ' : ''}
                  {b.manufacturer} - {b.modelName} ({b.capacityKwh} kWh, {b.nominalVoltageVolts}V {b.nominalCapacityAh}Ah - {b.chemistry})
                </option>
              ))}
            </select>
          </div>

          {availableBatteries.find((b) => b.id === selectedBatteryModelId) && (() => {
            const activeModel = availableBatteries.find((b) => b.id === selectedBatteryModelId)!;
            return (
              <div className="p-2.5 bg-slate-900/60 border border-indigo-500/30 rounded text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>{lang === 'fa' ? 'سازنده و فناوری:' : 'Brand & Chem:'}</span>
                  <strong className="text-white">{activeModel.manufacturer} ({activeModel.chemistry})</strong>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] font-mono text-slate-300">
                  <div>V: <strong className="text-sky-300">{activeModel.nominalVoltageVolts}V</strong></div>
                  <div>Cap: <strong className="text-industrial-accent">{activeModel.nominalCapacityAh}Ah</strong></div>
                  <div>DoD: <strong className="text-industrial-success">{activeModel.recommendedDoDPct}%</strong></div>
                  <div>Max I: <strong className="text-industrial-warning">{activeModel.maxContinuousDischargeA}A</strong></div>
                  <div>Cycles: <strong className="text-white">{activeModel.cycleLifeAt80DoD}</strong></div>
                  <div>BMS: <strong className="text-indigo-300">{activeModel.hasIntegratedBms ? 'Yes' : 'External'}</strong></div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Chemistry Selector Dropdown List */}
      <div className="studio-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <label htmlFor="bess-selected-chemistry" className="block text-xs font-bold text-industrial-accent mb-1.5 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-indigo-400" />
              {lang === 'fa' ? 'انتخاب فناوری شیمیایی باتری (Dropdown List):' : 'Select Battery Chemistry Technology (Dropdown List):'}
            </label>
            <select
              id="bess-selected-chemistry"
              value={selectedChemistry}
              onChange={(e) => onChemistryChange(e.target.value as BatteryChemistry)}
              className="studio-input w-full text-xs font-bold py-2 bg-industrial-surface border-indigo-500/50 text-white focus:border-indigo-400"
            >
              <option value="lifepo4">
                {lang === 'fa' ? '۱. لیتیوم آهن فسفات (LiFePO4) — راندمان ۹۵٪، طول عمر ۵۵۰۰ سیکل' : '1. Lithium Iron Phosphate (LiFePO4) - 95% Eff, 5500 Cycles'}
              </option>
              <option value="gel_deep_cycle">
                {lang === 'fa' ? '۲. ژل عمیق دشارژ (Gel Deep Cycle) — راندمان ۸۵٪، اقتصادی، ۱۰۰۰ سیکل' : '2. Gel Deep Cycle - 85% Eff, 1000 Cycles'}
              </option>
              <option value="agm_flooded">
                {lang === 'fa' ? '۳. اسید-سرب سیلد خورشیدی (AGM VRLA) — راندمان ۸۰٪، ۷۰۰ سیکل' : '3. Sealed Lead-Acid (AGM VRLA) - 80% Eff, 700 Cycles'}
              </option>
              <option value="ternary_ncm">
                {lang === 'fa' ? '۴. لیتیم ترنری (Ternary NCM) — چگالی انرژی بالا، ۲۲۰۰ سیکل' : '4. Ternary Lithium (NCM) - High Density, 2200 Cycles'}
              </option>
            </select>
          </div>

          {/* Quick Active Chemistry Specs Preview */}
          {BATTERY_CHEMISTRIES[selectedChemistry] && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-600/40 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300">
                  {BATTERY_CHEMISTRIES[selectedChemistry].nameFa}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200">
                  {BATTERY_CHEMISTRIES[selectedChemistry].typicalLifespanYears} سال عمر مفید
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 text-slate-300 font-mono">
                <div>DoD مجاز: <strong className="text-sky-300">{BATTERY_CHEMISTRIES[selectedChemistry].recommendedDoDPct}%</strong></div>
                <div>سیکل کاری: <strong className="text-industrial-success">{BATTERY_CHEMISTRIES[selectedChemistry].standardCycleLifeAt80DoD}</strong></div>
                <div>نرخ دشارژ: <strong className="text-industrial-warning">{BATTERY_CHEMISTRIES[selectedChemistry].maxContinuousCRate}C</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Autonomy Days Control & Unit Sizing */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-industrial-accent" />
          {lang === 'fa' ? 'تنظیم روزهای خودمختاری و مشخصات هر واحد باتری:' : 'Autonomy Days & Single Unit Battery Specifications:'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label htmlFor="bess-autonomy-days-range" className="block text-slate-300 font-semibold mb-1">
              {systemTopology === 'hybrid'
                ? (lang === 'fa' ? 'ضریب استمرار خاموشی (Outage Multiplier):' : 'Outage Multiplier Days:')
                : (lang === 'fa' ? 'روزهای خودمختاری آف‌گرید (Autonomy Days):' : 'Days of Autonomy:')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="bess-autonomy-days-range"
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={autonomyDays}
                onChange={(e) => onAutonomyDaysChange(parseFloat(e.target.value) || 1)}
                className="w-full accent-indigo-400"
              />
              <span className="font-mono text-sm font-bold text-indigo-400 w-16">
                {autonomyDays} روز
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {systemTopology === 'hybrid'
                ? (lang === 'fa' ? `ضریب اعمال‌شده در نیاز خاموشی (${autonomyDays} روز)` : `Multiplier on blackout requirement (${autonomyDays}d)`)
                : (lang === 'fa' ? 'تعداد روزهای بدون تابش تحت بار شب' : 'Consecutive sunless days covered')}
            </span>
          </div>

          <div>
            <label htmlFor="bess-unit-voltage" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ولتاژ نامی هر واحد باتری:' : 'Nominal Voltage per Unit:'}
            </label>
            <select
              id="bess-unit-voltage"
              value={unitVoltageV}
              onChange={(e) => setUnitVoltageV(parseInt(e.target.value) || 12)}
              className="studio-input text-xs font-mono"
            >
              <option value="12">۱۲ ولت (استاندارد سیلد لید/ژل/لیتیوم)</option>
              <option value="24">۲۴ ولت (بلوک‌های صنعتی)</option>
              <option value="48">۴۸ ولت (ماژول‌های رکمونت مخابراتی)</option>
              <option value="51.2">۵۱.۲ ولت (ماژول‌های ۱۶ سلولی LiFePO4)</option>
            </select>
          </div>

          <div>
            <label htmlFor="bess-unit-capacity" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'ظرفیت هر واحد باتری (Ah):' : 'Unit Nominal Capacity (Ah):'}
            </label>
            <select
              id="bess-unit-capacity"
              value={unitCapacityAh}
              onChange={(e) => setUnitCapacityAh(parseInt(e.target.value) || 100)}
              className="studio-input text-xs font-mono"
            >
              <option value="50">۵۰ آمپر ساعت (50 Ah)</option>
              <option value="100">۱۰۰ آمپر ساعت (100 Ah - رایج‌ترین)</option>
              <option value="150">۱۵۰ آمپر ساعت (150 Ah)</option>
              <option value="200">۲۰۰ آمپر ساعت (200 Ah - ژل خورشیدی)</option>
              <option value="280">۲۸۰ آمپر ساعت (280 Ah - سلول بزرگ EVE)</option>
              <option value="300">۳۰۰ آمپر ساعت (300 Ah)</option>
            </select>
          </div>

          <div>
            <label htmlFor="bess-unit-weight" className="block text-slate-300 font-semibold mb-1">
              {lang === 'fa' ? 'وزن تقریبی هر واحد (کیلوگرم):' : 'Weight per Unit (kg):'}
            </label>
            <input
              id="bess-unit-weight"
              type="number"
              min="5"
              max="150"
              value={unitWeightKg}
              onChange={(e) => setUnitWeightKg(parseFloat(e.target.value) || 30)}
              className="studio-input font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Battery Sizing & Unit Quantity Matrix */}
      <div className="studio-card">
        <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-industrial-warning" />
          {lang === 'fa'
            ? 'ماتریس محاسباتی تعداد و ابعاد فیزیکی بانک باتری:'
            : 'Battery Sizing Matrix & Physical Quantity:'}
        </h3>

        {/* Coverage Deficit Warning Banner */}
        {isNightCoverageDeficit && (
          <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-200 mb-4 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-industrial-error shrink-0" />
            <div>
              <strong className="block font-bold">
                {lang === 'fa'
                  ? (isOnGrid ? 'هشدار مهندسی کسری پوشش خاموشی (Outage Coverage Deficit):' : 'هشدار مهندسی کسری پوشش شب (Night Coverage Deficit):')
                  : (isOnGrid ? 'Outage Window Coverage Deficit Warning:' : 'Design Night Coverage Deficit Warning:')}
              </strong>
              <span>
                {lang === 'fa'
                  ? (isOnGrid
                      ? `ظرفیت قابل‌استفاده بانک باتری (${batterySizing.usableCapacityKwh.toFixed(1)} kWh) کمتر از انرژی مورد نیاز دوره خاموشی (${outageHours ?? 6} ساعته: ${batterySizing.coverageTargetKwh?.toFixed(1) ?? '...'} kWh) است (پوشش: ${batterySizing.nightCoveragePct}%). لطفاً ظرفیت باتری یا ساعت پشتیبانی را تنظیم کنید.`
                      : `ظرفیت قابل‌استفاده بانک باتری (${batterySizing.usableCapacityKwh.toFixed(1)} kWh) کمتر از انرژی مورد نیاز طولانی‌ترین شب سال (${nightHoursDesign ?? 14} ساعته: ${nighttimeKwh?.toFixed(1) ?? '...'} kWh) است (پوشش: ${batterySizing.nightCoveragePct}%). لطفاً ظرفیت باتری یا روزهای خودمختاری را افزایش دهید.`)
                  : (isOnGrid
                      ? `Usable battery capacity (${batterySizing.usableCapacityKwh.toFixed(1)} kWh) is below outage window load (${outageHours ?? 6}h: ${batterySizing.coverageTargetKwh?.toFixed(1) ?? '...'} kWh), covering only ${batterySizing.nightCoveragePct}%. Increase battery capacity.`
                      : `Usable battery capacity (${batterySizing.usableCapacityKwh.toFixed(1)} kWh) is below winter solstice night load (${nightHoursDesign ?? 14}h: ${nighttimeKwh?.toFixed(1) ?? '...'} kWh), covering only ${batterySizing.nightCoveragePct}%. Increase battery capacity or autonomy.`)}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-4">
          <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
            <span className="text-slate-400 block mb-0.5">{lang === 'fa' ? 'ظرفیت کل ناخالص' : 'Gross Capacity'}</span>
            <span className="text-lg font-bold font-mono text-indigo-400">
              {batterySizing.grossCapacityKwh.toFixed(1)} kWh
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
              {batterySizing.totalCapacityAh} Ah ({batterySizing.systemVoltageVdc}V)
            </span>
          </div>

          <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
            <span className="text-slate-400 block mb-0.5">{lang === 'fa' ? 'ظرفیت قابل استفاده' : 'Net Usable'}</span>
            <span className="text-lg font-bold font-mono text-industrial-success">
              {batterySizing.usableCapacityKwh.toFixed(1)} kWh
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              DoD: {batterySizing.chemistry.recommendedDoDPct}%
            </span>
          </div>

          <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
            <span className="text-slate-400 block mb-0.5">
              {lang === 'fa'
                ? (batterySizing.coverageLabelFa || (isOnGrid ? 'پوشش خاموشی' : 'پوشش شبِ طراحی'))
                : (batterySizing.coverageLabelEn || (isOnGrid ? 'Outage Coverage' : 'Night Coverage'))}
            </span>
            <span className={`text-lg font-bold font-mono ${
              (batterySizing.nightCoveragePct ?? 100) >= 100 ? 'text-industrial-success' : 'text-industrial-error'
            }`}>
              {batterySizing.nightCoveragePct !== undefined ? `${batterySizing.nightCoveragePct}%` : '100%'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {(batterySizing.nightCoveragePct ?? 100) >= 100
                ? (lang === 'fa' ? (isOnGrid ? '✓ پوشش کامل خاموشی' : '✓ پوشش کامل شب') : '✓ Fully covered')
                : (lang === 'fa' ? '⚠ کسری انرژی' : '⚠ Deficit')}
            </span>
          </div>

          <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
            <span className="text-slate-400 block mb-0.5">{lang === 'fa' ? 'تعداد کل باتری‌ها' : 'Total Units'}</span>
            <span className="text-lg font-bold font-mono text-industrial-accent">
              {calculatedTotalUnits} عدد
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {calculatedParallel}P × {calculatedSeries}S
            </span>
          </div>

          <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
            <span className="text-slate-400 block mb-0.5">{lang === 'fa' ? 'وزن و مساحت رک' : 'Weight & Area'}</span>
            <span className="text-lg font-bold font-mono text-purple-400">
              {totalWeightKg.toLocaleString()} kg
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              ~{totalFootprintM2} m²
            </span>
          </div>
        </div>

        {/* Physical Rack Arrangement Box */}
        <div className="p-3 bg-industrial-surface rounded border border-industrial-border text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Boxes className="w-6 h-6 text-indigo-400" />
            <div>
              <span className="font-bold text-white block">
                {lang === 'fa' ? 'پیشنهاد جانمایی و استراکچر رک باتری:' : 'Battery Rack Layout Recommendation:'}
              </span>
              <span className="text-slate-400 text-[11px]">
                {calculatedSeries === 1
                  ? `۱ رک استاندارد با ${calculatedParallel} ماژول موازی`
                  : `${Math.ceil(calculatedTotalUnits / 8)} رک باتری صنعتی ۴ طبقه با کابل‌های رابط مسی منعطف`}
              </span>
            </div>
          </div>
          <div className="font-mono text-sky-300 text-xs">
            پیکربندی باس‌بار: {calculatedSeries}S {calculatedParallel}P ({batterySizing.systemVoltageVdc}V DC)
          </div>
        </div>

        {/* C-Rate & Current Limits */}
        <div className="mt-3 p-3 bg-industrial-surface/60 rounded-lg border border-industrial-border/60 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-400 block">جریان دشارژ پیوسته دائم:</span>
            <span className="text-white font-mono font-bold text-sm">
              {batterySizing.continuousDischargeCurrentAmps.toFixed(1)} آمپر
            </span>
            <span className="text-[10px] text-slate-400 block">
              نرخ دشارژ واقعی: {batterySizing.actualContinuousCRate.toFixed(2)}C
            </span>
          </div>
          <div>
            <span className="text-slate-400 block">جریان دشارژ لحظه‌ای هجومی (Peak Surge):</span>
            <span className="text-industrial-error font-mono font-bold text-sm">
              {batterySizing.peakSurgeDischargeCurrentAmps.toFixed(1)} آمپر
            </span>
            <span className="text-[10px] text-slate-400 block">جهت استارت بارهای موتوری</span>
          </div>
          <div>
            <span className="text-slate-400 block">تخمین طول عمر مفید و سیکل:</span>
            <span className="text-industrial-success font-mono font-bold text-sm">
              ~{batterySizing.estimatedLifespanYears} سال
            </span>
            <span className="text-[10px] text-slate-400 block">
              معادل {batterySizing.expectedTotalCycles.toLocaleString()} سیکل شارژ
            </span>
          </div>
        </div>

        {/* Warnings */}
        {batterySizing.warnings.length > 0 && (
          <div className="mt-3 p-2.5 bg-red-950/40 border border-red-600/50 rounded-lg text-xs text-red-200 space-y-1">
            {batterySizing.warnings.map((w, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-industrial-error shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
