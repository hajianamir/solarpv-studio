import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  Leaf,
  Calendar,
  ShieldCheck,
  Sliders,
  Flame,
  CheckCircle2,
  Table,
  Activity,
  Play,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import {
  type FinancialAnalysisResult,
  type UserFinancialPricing,
} from '../engine/financialEngine';
import { type ClimateCity } from '../engine/climaticData';
import { type FoundationType } from '../engine/structuralEngine';
import { assessSaltCorrosion, type SaltCorrosionOutput } from '../engine/corrosion/saltCorrosionEngine';
import {
  runFinancialUncertaintyPropagation,
  type FinancialUqResult,
} from '../engine/core/uncertaintyPropagation';
import { type AppliedShading3dRecord } from '../engine/shadingLifecycle';

interface FinancialTabProps {
  financial: FinancialAnalysisResult;
  pricing: UserFinancialPricing;
  onPricingChange: (newPricing: UserFinancialPricing) => void;
  city?: ClimateCity;
  foundationType?: FoundationType;
  lang?: 'fa' | 'en';
  isBifacial?: boolean;
  bifacialityFactor?: number;
  groundCoverRatio?: number;
  bifacialGainPct?: number;
  shadingProvenance?: AppliedShading3dRecord | null;
  isShadingStale?: boolean;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({
  financial,
  pricing,
  onPricingChange,
  city,
  foundationType = 'rammed_steel_pile',
  lang = 'fa',
  isBifacial = false,
  bifacialityFactor = 0.80,
  groundCoverRatio = 0.38,
  bifacialGainPct,
  shadingProvenance,
  isShadingStale = false,
}) => {
  const [showCashflowTable, setShowCashflowTable] = useState(false);
  const [corrosion, setCorrosion] = useState<SaltCorrosionOutput | null>(null);
  const [uqResult, setUqResult] = useState<FinancialUqResult | null>(null);
  const [uqSampleSize, setUqSampleSize] = useState<number>(100);
  const [isUqRunning, setIsUqRunning] = useState<boolean>(false);
  const [uqErrorMessage, setUqErrorMessage] = useState<string | null>(null);

  const isReadyForUq = (financial.systemKwp ?? 0) > 0 && (financial.annualEnergyYieldKwh ?? 0) > 0;

  const handleRunUqSimulation = () => {
    setUqErrorMessage(null);
    if (!isReadyForUq) {
      setUqErrorMessage(
        lang === 'fa'
          ? 'ظرفیت سامانه یا انرژی تولیدی سالانه در مدل مالی تعیین نشده است. لطفاً ابتدا ظرفیت پنل‌ها و تولید سالانه را تنظیم نمایید.'
          : 'System capacity or annual energy yield is missing or non-positive. Please configure system sizing before running financial UQ.'
      );
      return;
    }

    setIsUqRunning(true);
    setTimeout(() => {
      try {
        const res = runFinancialUncertaintyPropagation({
          plantCapacityKwp: financial.systemKwp,
          batteryCapacityKwh: financial.batteryKwh || 0,
          inverterCapacityKw: financial.inverterKw || financial.systemKwp,
          baseAnnualYieldKwh: financial.annualEnergyYieldKwh,
          basePricing: pricing,
          systemMode: financial.systemMode || 'powerplant',
          sampleSize: uqSampleSize,
          seed: 42,
          isBifacial,
          bifacialityFactor,
          groundCoverRatio,
        });
        setUqResult(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setUqErrorMessage(
          lang === 'fa'
            ? `خطا در اجرای شبیه‌سازی عدم قطعیت مالی: ${msg}`
            : `Error executing financial UQ simulation: ${msg}`
        );
      } finally {
        setIsUqRunning(false);
      }
    }, 100);
  };

  // Salt corrosion / ISO 9223 exposure for LCOE derating (resolved via OSM Nominatim shoreline distance)
  useEffect(() => {
    let mounted = true;
    if (!city) { setCorrosion(null); return; }
    assessSaltCorrosion({ latitude: city.latitude, longitude: city.longitude, resolveDistance: true })
      .then((res) => { if (mounted) setCorrosion(res); })
      .catch(() => { if (mounted) setCorrosion(null); });
    return () => { mounted = false; };
  }, [city]);

  // Per-field sanitisation that closes BUG-8 at the source:
  //   - Reject NaN / Infinity / negatives by falling back to the previous value.
  //   - Enforce field-specific minimums that prevent division-by-zero
  //     downstream (discountRatePct = 0 produces crf = 0/0 = NaN inside
  //     performFinancialAnalysis).
  const FIELD_MINIMUMS: Partial<Record<keyof UserFinancialPricing, number>> = {
    discountRatePct: 0.01,
    usdToTomanRate: 1,
    moduleUsdPerWp: 0.0001,
    inverterUsdPerKw: 0.01,
    batteryUsdPerKwh: 0.01,
    structureUsdPerWp: 0.0001,
    cablingBopUsdPerWp: 0.0001,
    substationUsdPerMva: 0.01,
    epcLaborUsdPerKw: 0.01,
    gridTariffTomanPerKwh: 0.01,
    ppaTariffTomanPerKwh: 0.01,
    offgridAvoidedCostTomanPerKwh: 0.01,
    hvConnectionUsdPerKva: 0.01,
    dieselFuelPriceTomanPerLiter: 100,
  };

  const sanitizeNumericField = (
    field: keyof UserFinancialPricing,
    raw: string | number,
  ): number => {
    const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
    const previous = pricing[field];
    const fallback = typeof previous === 'number' ? previous : 0;
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    const min = FIELD_MINIMUMS[field];
    return min !== undefined ? Math.max(min, parsed) : parsed;
  };

  const updateField = (field: keyof UserFinancialPricing, val: any) => {
    // Route through sanitizeNumericField for every numeric field.
    const currentVal = pricing[field];
    const isNumeric = typeof currentVal === 'number';
    const next = isNumeric ? sanitizeNumericField(field, val) : val;
    onPricingChange({
      ...pricing,
      [field]: next,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-industrial-success" />
          {lang === 'fa'
            ? 'تحلیل جامع مالی، قیمت‌گذاری سفارشی، بازگشت سرمایه (IRR/NPV) و جریان نقدینگی ۲۵ ساله'
            : 'Custom Pricing Financial Feasibility, IRR, NPV, LCOE & 25-Year Cash Flow Pro-Forma'}
        </h1>
        <p className="text-slate-400 text-xs">
          {lang === 'fa'
            ? 'امکان ورود قیمت‌های برآوردی تجهیزات توسط کاربر به دلار یا تومان، محاسبه دقیق CAPEX، دوره بازگشت سرمایه، نرخ بازده داخلی (IRR) و بهای تمام‌شده تراز شده انرژی (LCOE).'
            : 'Custom user unit pricing for modules, inverters, batteries, BOS and civil works, calculating dynamic CAPEX, IRR, NPV, and 25-year cashflows.'}
        </p>
      </div>

      {/* Customizable Pricing Parameters Form */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-industrial-warning" />
          {lang === 'fa' ? 'قیمت‌های برآوردی واحد تجهیزات (ورودی کاربر):' : 'User Unit Pricing Parameters:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'قیمت پنل ($/Wp):' : 'Module ($/Wp):'}
            </label>
            <input
              type="number"
              step="0.01"
              value={pricing.moduleUsdPerWp}
              onChange={(e) => updateField('moduleUsdPerWp', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-industrial-warning text-xs"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ~{(pricing.moduleUsdPerWp * pricing.usdToTomanRate).toLocaleString()} تومان/Wp
            </span>
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'قیمت اینورتر ($/kW):' : 'Inverter ($/kW):'}
            </label>
            <input
              type="number"
              step="5"
              value={pricing.inverterUsdPerKw}
              onChange={(e) => updateField('inverterUsdPerKw', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-sky-300 text-xs"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ~{((pricing.inverterUsdPerKw * pricing.usdToTomanRate) / 1000).toLocaleString()} هزار تومان/kW
            </span>
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'قیمت باتری ($/kWh):' : 'Battery ($/kWh):'}
            </label>
            <input
              type="number"
              step="10"
              value={pricing.batteryUsdPerKwh}
              onChange={(e) => updateField('batteryUsdPerKwh', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-industrial-success text-xs"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ~{(pricing.batteryUsdPerKwh * pricing.usdToTomanRate).toLocaleString()} تومان/kWh
            </span>
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'سازه و استراکچر ($/Wp):' : 'Structure ($/Wp):'}
            </label>
            <input
              type="number"
              step="0.005"
              value={pricing.structureUsdPerWp}
              onChange={(e) => updateField('structureUsdPerWp', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-purple-300 text-xs"
            />
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'کابل‌کشی و BOP ($/Wp):' : 'BOP & Cabling ($/Wp):'}
            </label>
            <input
              type="number"
              step="0.005"
              value={pricing.cablingBopUsdPerWp}
              onChange={(e) => updateField('cablingBopUsdPerWp', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-slate-200 text-xs"
            />
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'پست MV و اتصال ($/MVA):' : 'MV Substation ($/MVA):'}
            </label>
            <input
              type="number"
              step="5000"
              value={pricing.substationUsdPerMva}
              onChange={(e) => updateField('substationUsdPerMva', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-industrial-warning text-xs"
            />
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {financial.systemMode === 'powerplant'
                ? (lang === 'fa' ? 'تعرفه قرارداد PPA (تومان/kWh):' : 'PPA Tariff (Toman/kWh):')
                : financial.systemMode === 'offgrid'
                  ? (lang === 'fa' ? 'هزینه اجتناب‌شده دیزل (تومان/kWh):' : 'Avoided Diesel Cost (Toman/kWh):')
                  : (lang === 'fa' ? 'تعرفه فروش برق خانگی/صنعتی (تومان/kWh):' : 'Retail Tariff (Toman/kWh):')}
            </label>
            <input
              type="number"
              step="500"
              value={
                financial.systemMode === 'powerplant'
                  ? pricing.ppaTariffTomanPerKwh
                  : financial.systemMode === 'offgrid'
                    ? (pricing.offgridAvoidedCostTomanPerKwh ?? 21600)
                    : pricing.gridTariffTomanPerKwh
              }
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                if (financial.systemMode === 'powerplant') {
                  updateField('ppaTariffTomanPerKwh', val);
                } else if (financial.systemMode === 'offgrid') {
                  updateField('offgridAvoidedCostTomanPerKwh', val);
                } else {
                  updateField('gridTariffTomanPerKwh', val);
                }
              }}
              className="studio-input w-full font-mono font-bold text-industrial-success text-xs"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {financial.systemMode === 'powerplant'
                ? (lang === 'fa' ? 'مدل قرارداد خرید تضمینی ساتبا' : 'SATBA Guaranteed PPA')
                : financial.systemMode === 'offgrid'
                  ? (lang === 'fa' ? 'پروکسی هزینه تولید برق با ژنراتور دیزلی' : 'Diesel displacement proxy')
                  : (lang === 'fa' ? 'تعرفه مصوب شرکت توزیع/برق منطقه‌ای' : 'Utility retail net-metering')}
            </span>
          </div>

          <div className="p-2.5 bg-industrial-bg/70 border border-industrial-border rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'نرخ تسعیر دلار (تومان):' : 'USD/Toman Rate:'}
            </label>
            <input
              type="number"
              step="1000"
              value={pricing.usdToTomanRate}
              onChange={(e) => updateField('usdToTomanRate', parseFloat(e.target.value) || 90000)}
              className="studio-input w-full font-mono font-bold text-industrial-warning text-xs"
            />
          </div>
        </div>

        {/* Optional Diesel Generator Pricing Toggle */}
        <div className="p-3 bg-industrial-bg border border-industrial-border rounded-lg text-xs space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-industrial-warning font-bold">
            <input
              type="checkbox"
              checked={!!pricing.includeDieselGenSet}
              onChange={(e) => updateField('includeDieselGenSet', e.target.checked)}
              className="w-4 h-4 rounded text-industrial-accent"
            />
            <Flame className="w-4 h-4 text-industrial-warning" />
            {lang === 'fa'
              ? 'محاسبه دیزل ژنراتور اضطراری پشتیبان در هزینه‌های مالی (CAPEX/OPEX)'
              : 'Include Backup Diesel GenSet in CAPEX/OPEX Financial Model'}
          </label>

          {pricing.includeDieselGenSet && (
            <div className="space-y-2 pt-2">
              <div className="text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/40">
                {lang === 'fa'
                  ? '⚠ توجه مهندسی (پروکسی تخمینی): محاسبات سوخت دیزل بر اساس ساعات کارکرد سالانه و نرخ مصرف تخمینی است و شبیه‌سازی ساعتی ۸۷۶۰ ساعته دیسپچ را نمایندگی نمی‌کند.'
                  : '⚠ Engineering Notice (Estimated Proxy): Diesel fuel economics are estimated from annual runtime and consumption parameters; this is an indicative proxy without 8760h hourly dispatch simulation.'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'قیمت خرید دیزل ($):' : 'GenSet CAPEX ($):'}</label>
                  <input
                    type="number"
                    value={pricing.dieselGenSetCapexUsd || 15000}
                    onChange={(e) => updateField('dieselGenSetCapexUsd', parseFloat(e.target.value) || 0)}
                    className="studio-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'ساعات کارکرد سالانه (h):' : 'Annual Run Hours (h):'}</label>
                  <input
                    type="number"
                    value={pricing.dieselAnnualRunHours || 250}
                    onChange={(e) => updateField('dieselAnnualRunHours', parseFloat(e.target.value) || 0)}
                    className="studio-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'مصرف گازوئیل (L/h):' : 'Fuel Rate (L/h):'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricing.dieselFuelConsumptionLitersPerHour || 14}
                    onChange={(e) => updateField('dieselFuelConsumptionLitersPerHour', parseFloat(e.target.value) || 0)}
                    className="studio-input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'نرخ هر لیتر (تومان):' : 'Fuel Price (Toman/L):'}</label>
                  <input
                    type="number"
                    value={pricing.dieselFuelPriceTomanPerLiter || 3500}
                    onChange={(e) => updateField('dieselFuelPriceTomanPerLiter', parseFloat(e.target.value) || 0)}
                    className="studio-input w-full text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'کل سرمایه‌گذاری اولیه (CAPEX)' : 'Total Initial CAPEX'}</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${financial.capexBreakdown.totalCapexUsd.toLocaleString()}
          </div>
          <div className="text-xs font-mono text-industrial-warning mt-0.5">
            {(financial.capexBreakdown.totalCapexToman / 1_000_000_000).toFixed(2)} میلیارد تومان
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'دوره بازگشت سرمایه ساده' : 'Simple Payback Period'}</div>
          <div className="text-xl font-bold font-mono text-industrial-success mt-1">
            {financial.simplePayback ? financial.simplePayback.formattedYears : `${financial.simplePaybackPeriodYears} سال`}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">
            {lang === 'fa' ? 'تنزیل‌شده:' : 'Discounted:'} {financial.discountedPayback ? financial.discountedPayback.formattedYears : `${financial.discountedPaybackPeriodYears} سال`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'نرخ بازده داخلی (IRR)' : 'Internal Rate of Return (IRR)'}</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {financial.isIrrDefined && financial.irrPct !== null
              ? `${financial.irrPct}%`
              : (lang === 'fa' ? `تعریف‌نشده (${financial.irrStatus})` : `N/A (${financial.irrStatus})`)}
          </div>
          <div className="text-xs font-mono text-industrial-success mt-0.5">
            NPV: {(financial.npvToman / 1_000_000_000).toFixed(2)} میلیارد تومان
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'بهای تمام‌شده انرژی (LCOE)' : 'Levelized Cost of Energy (LCOE)'}</div>
          <div className="text-xl font-bold font-mono text-industrial-accent mt-1">
            {financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null
              ? `$${financial.lcoeUsdPerKwh.toFixed(4)}`
              : (lang === 'fa' ? 'نامعتبر (تولید صفر)' : 'N/A (Zero Energy)')}
          </div>
          <div className="text-xs font-mono text-slate-300 mt-0.5">
            {financial.isLcoeDefined && financial.lcoeTomanPerKwh !== null
              ? `${financial.lcoeTomanPerKwh.toLocaleString()} تومان / kWh`
              : '—'}
          </div>
        </div>
      </div>

      {/* Itemized LCOE & Cross-Tab Technical Impact Breakdown (PR-2a-6) */}
      {(() => {
        // PR-2a-7-P0 (P0-5): the fake "base LCOE" decomposition (division by an
        // invented derate-multiplier constant) is REMOVED. LCOE is derived
        // only from (totalCapex + Σ discounted OPEX/fuel/battery) / Σ discounted
        // energy inside financialEngine.ts. Only real, engine-sourced impacts
        // (ISO 9223 salinity derating, foundation typology) are shown below.
        const salinityDeratePct = corrosion ? corrosion.moduleDeratePct + corrosion.inverterDeratePct : 0;
        const foundationCapexImpactUsd =
          foundationType === 'concrete_pier' ? 0.0028
          : foundationType === 'ground_screw' ? 0.0016
          : foundationType === 'pre_drilled_grouted_pile' ? 0.0019
          : foundationType === 'surface_ballasted_block' ? 0.0022
          : foundationType === 'shed_roof_clamp_rail' ? -0.0030
          : foundationType === 'rooftop_anchor_bolted' ? 0.0010
          : 0.0;

        return (
          <div className="studio-card border border-sky-600/40 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-industrial-border pb-2">
              <h3 className="text-sm font-bold text-industrial-accent flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-industrial-success" />
                {lang === 'fa'
                  ? 'تفکیک اجزای بهای تمام‌شده انرژی (Itemized LCOE Decomposition & Cross-Tab Impact)'
                  : 'Itemized LCOE Decomposition & Cross-Tab Impact'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-industrial-accent/30">
                IEC 61724 / ASCE 7
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'تأثیر زهکش شوری (ISO 9223):' : 'Salinity Corrosion Derating (ISO 9223):'}</span>
                <span className="font-mono font-bold text-industrial-warning text-base">-{salinityDeratePct.toFixed(1)}%</span>
                <span className="text-[9px] text-industrial-warning/80 block mt-0.5">
                  {corrosion ? `${corrosion.iso9223Category} · ${corrosion.distanceToSeaKm} km to sea · ${corrosion.traceId}` : '—'}
                </span>
              </div>

              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'ثبت نگهداری شوری (O&M):' : 'Corrosion Maintenance OPEX:'}</span>
                <span className="font-mono font-bold text-industrial-warning text-base">
                  +{corrosion ? corrosion.maintenanceOpexAdderPct : 0}%
                </span>
                <span className="text-[9px] text-industrial-warning/80 block mt-0.5">
                  {corrosion ? `${corrosion.categoryLabel} · ${corrosion.traceId}` : '—'}
                </span>
              </div>

              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'اثر CAPEX فونداسیون سازه:' : 'Foundation Typology Impact:'}</span>
                <span className="font-mono font-bold text-purple-400 text-base">
                  {foundationCapexImpactUsd > 0 ? `+$${foundationCapexImpactUsd.toFixed(4)}` : '$0.0000'}
                </span>
                <span className="text-[9px] text-purple-300/80 block mt-0.5">
                  {foundationType.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="p-2.5 bg-industrial-surface/80 rounded-lg border border-industrial-border">
                <span className="text-slate-400 block text-[10px]">{lang === 'fa' ? 'بهای تمام‌شده تراز شده کل:' : 'Net Levelized LCOE:'}</span>
                <span className="font-mono font-bold text-industrial-success text-base">{financial.lcoeUsdPerKwh !== null ? `$${financial.lcoeUsdPerKwh.toFixed(4)}` : 'N/A'}</span>
                <span className="text-[9px] text-slate-300 block mt-0.5">
                  {financial.lcoeTomanPerKwh !== null ? `~${financial.lcoeTomanPerKwh.toLocaleString()} Toman/kWh` : '—'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Itemized CAPEX Breakdown Table */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-industrial-accent mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-industrial-success" />
          {lang === 'fa' ? 'تفکیک اقلام هزینه‌ای پروژه (CAPEX Breakdown)' : 'Itemized CAPEX Breakdown'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
              <tr>
                <th className="p-2.5">{lang === 'fa' ? 'ردیف هزینه' : 'Cost Item'}</th>
                <th className="p-2.5">{lang === 'fa' ? 'مبلغ به دلار (USD)' : 'Cost in USD'}</th>
                <th className="p-2.5">{lang === 'fa' ? 'مبلغ به تومان' : 'Cost in Toman'}</th>
                <th className="p-2.5">{lang === 'fa' ? 'سهم از کل' : 'Share (%)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              <tr>
                <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'ماژول‌های فتوولتائیک (PV Modules)' : 'PV Modules'}</td>
                <td className="p-2.5 text-industrial-success">${financial.capexBreakdown.pvModulesUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.pvModulesToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.pvModulesUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'اینورترها (Inverters / Turnkey)' : 'Inverters / Turnkey'}</td>
                <td className="p-2.5 text-industrial-accent">${financial.capexBreakdown.invertersUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.invertersToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.invertersUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              {financial.capexBreakdown.batteriesUsd > 0 && (
                <tr>
                  <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'بانک باتری ذخیره‌ساز (BESS)' : 'BESS Battery Bank'}</td>
                  <td className="p-2.5 text-industrial-warning">${financial.capexBreakdown.batteriesUsd.toLocaleString()}</td>
                  <td className="p-2.5">{(financial.capexBreakdown.batteriesToman / 1_000_000).toLocaleString()} م.ت</td>
                  <td className="p-2.5 text-slate-400">
                    {((financial.capexBreakdown.batteriesUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                  </td>
                </tr>
              )}
              <tr>
                <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'استراکچر و سازه‌های فلزی' : 'Mounting Structures'}</td>
                <td className="p-2.5">${financial.capexBreakdown.structuresUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.structuresToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.structuresUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'کابل‌کشی، تابلوها و حفاظت (BOP)' : 'BOP & Protection'}</td>
                <td className="p-2.5">${financial.capexBreakdown.cablesAndProtectionUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.cablesAndProtectionToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.cablesAndProtectionUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              {financial.capexBreakdown.substationMvUsd > 0 && (
                <tr>
                  <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'پست فشار متوسط و اتصال به شبکه' : 'MV Substation & Grid Connection'}</td>
                  <td className="p-2.5 text-purple-400">${financial.capexBreakdown.substationMvUsd.toLocaleString()}</td>
                  <td className="p-2.5">{(financial.capexBreakdown.substationMvToman / 1_000_000).toLocaleString()} م.ت</td>
                  <td className="p-2.5 text-slate-400">
                    {((financial.capexBreakdown.substationMvUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                  </td>
                </tr>
              )}
              {financial.capexBreakdown.dieselGenSetUsd > 0 && (
                <tr>
                  <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'دیزل ژنراتور اضطراری' : 'Emergency Diesel GenSet'}</td>
                  <td className="p-2.5 text-industrial-warning">${financial.capexBreakdown.dieselGenSetUsd.toLocaleString()}</td>
                  <td className="p-2.5">{(financial.capexBreakdown.dieselGenSetToman / 1_000_000).toLocaleString()} م.ت</td>
                  <td className="p-2.5 text-slate-400">
                    {((financial.capexBreakdown.dieselGenSetUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                  </td>
                </tr>
              )}
              <tr>
                <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'مهندسی، نصب و راه‌اندازی (EPC)' : 'EPC Labor & Commissioning'}</td>
                <td className="p-2.5">${financial.capexBreakdown.engineeringAndInstallationUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.engineeringAndInstallationToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.engineeringAndInstallationUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr className="bg-industrial-bg font-bold border-t border-industrial-border">
                <td className="p-2.5 font-sans text-industrial-accent">{lang === 'fa' ? 'مجموع کل سرمایه‌گذاری اولیه (Total CAPEX)' : 'Total Initial CAPEX'}</td>
                <td className="p-2.5 text-industrial-success text-sm">${financial.capexBreakdown.totalCapexUsd.toLocaleString()}</td>
                <td className="p-2.5 text-industrial-warning text-sm">{(financial.capexBreakdown.totalCapexToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-white">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 25-Year Cash Flow Toggle */}
        <div className="mt-4 pt-3 border-t border-industrial-border flex items-center justify-between">
          <button
            onClick={() => setShowCashflowTable(!showCashflowTable)}
            className="studio-btn-primary text-xs py-2 px-3 flex items-center gap-2 rounded-lg font-bold"
          >
            <Table className="w-4 h-4" />
            {showCashflowTable
              ? (lang === 'fa' ? 'بستن جدول جریان نقدینگی ۲۵ ساله' : 'Hide 25-Year Cashflow Table')
              : (lang === 'fa' ? 'مشاهده جدول کامل جریان نقدینگی ۲۵ ساله (Cash Flow Pro-Forma)' : 'View Full 25-Year Cashflow Table')}
          </button>
        </div>

        {showCashflowTable && (
          <div className="mt-4 overflow-x-auto border border-industrial-border rounded-lg">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-industrial-bg text-slate-400 border-b border-industrial-border text-[11px]">
                <tr>
                  <th className="p-2">{lang === 'fa' ? 'سال' : 'Year'}</th>
                  <th className="p-2">{lang === 'fa' ? 'تولید سالانه (kWh)' : 'Generation (kWh)'}</th>
                  <th className="p-2">{lang === 'fa' ? 'درآمد (تومان)' : 'Revenue (Toman)'}</th>
                  <th className="p-2">{lang === 'fa' ? 'OPEX (تومان)' : 'OPEX (Toman)'}</th>
                  <th className="p-2">{lang === 'fa' ? 'جریان نقدینگی خالص' : 'Net Cashflow'}</th>
                  <th className="p-2">{lang === 'fa' ? 'نقدینگی تجمعی' : 'Cumulative Cashflow'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                {(financial.cashFlowWithYear0 || financial.cashFlow25Years).map((row) => (
                  <tr key={row.year} className="hover:bg-slate-850/50">
                    <td className="p-2 text-white font-bold">{row.year === 0 ? (lang === 'fa' ? 'سال ۰ (CAPEX)' : 'Year 0 (CAPEX)') : row.year}</td>
                    <td className="p-2 text-industrial-accent">{row.generationKwh.toLocaleString()}</td>
                    <td className="p-2 text-industrial-success">{(row.revenueToman / 1_000_000).toFixed(1)} م.ت</td>
                    <td className="p-2 text-red-300">{((row.year === 0 ? row.capexToman : row.opexToman) / 1_000_000).toFixed(1)} م.ت</td>
                    <td className="p-2 font-bold text-slate-100">{(row.netCashFlowToman / 1_000_000).toFixed(1)} م.ت</td>
                    <td className={`p-2 font-bold ${row.cumulativeCashFlowToman >= 0 ? 'text-industrial-success' : 'text-industrial-error'}`}>
                      {(row.cumulativeCashFlowToman / 1_000_000).toFixed(1)} م.ت
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Uncertainty Quantification (UQ) & Latin Hypercube Sampling Card */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-industrial-accent flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              {lang === 'fa'
                ? 'تحلیل عدم قطعیت آماری، کوپولا و حساسیت تورنادو (Monte Carlo & Latin Hypercube Sampling)'
                : 'Financial Uncertainty Quantification (LHS & Copula-driven Monte Carlo)'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'fa'
                ? 'نمونه‌برداری ساختاریافته LHS از عدم قطعیت تابش خورشیدی (GHI)، گردوغبار، آلبدو، هزینه CAPEX/OPEX و نرخ تنزیل'
                : 'Stratified LHS sampling across GHI irradiance, soiling, albedo, CAPEX, OPEX, and discount rate.'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {isBifacial
                  ? (lang === 'fa'
                    ? `ماژول دوطرفه (Bifacial BF=${bifacialityFactor.toFixed(2)}, GCR=${groundCoverRatio.toFixed(2)}, آلبدو ۰.۲۲) — بهره تابش پشت +${(bifacialGainPct ?? 3.0).toFixed(1)}٪ (تقریب درجه اول)`
                    : `Bifacial Array (BF=${bifacialityFactor.toFixed(2)}, GCR=${groundCoverRatio.toFixed(2)}, albedo 0.22) — Rear gain +${(bifacialGainPct ?? 3.0).toFixed(1)}% (first-order proxy)`)
                  : (lang === 'fa'
                    ? 'ماژول یک‌طرفه (Monofacial) - اثر آلبدو محدود به بازتاب افقی'
                    : 'Monofacial Array - Low Albedo Sensitivity')}
              </span>
              {shadingProvenance && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {lang === 'fa'
                    ? `سایه سه‌بعدی: -${shadingProvenance.lossPct}٪`
                    : `3D Shading: -${shadingProvenance.lossPct}%`}
                  {isShadingStale && (
                    <span className="text-amber-300 ml-1 font-bold">
                      {lang === 'fa' ? '(⚠️ تغییر ظرفیت)' : '(⚠️ Stale: Capacity changed)'}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={uqSampleSize}
              onChange={(e) => setUqSampleSize(parseInt(e.target.value) || 100)}
              className="studio-input text-xs font-mono py-1.5"
            >
              <option value="50">50 {lang === 'fa' ? 'نمونه (سریع)' : 'trials (fast)'}</option>
              <option value="100">100 {lang === 'fa' ? 'نمونه (استاندارد)' : 'trials (standard)'}</option>
              <option value="200">200 {lang === 'fa' ? 'نمونه (دقیق)' : 'trials (high-res)'}</option>
            </select>

            <button
              onClick={handleRunUqSimulation}
              disabled={isUqRunning || !isReadyForUq}
              className={`studio-btn-primary text-xs py-1.5 px-3 flex items-center gap-2 rounded-lg font-bold ${
                !isReadyForUq ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUqRunning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'fa' ? 'درحال اجرای شبیه‌سازی...' : 'Running LHS Trials...'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{lang === 'fa' ? 'اجرای شبیه‌سازی عدم قطعیت' : 'Run LHS UQ Simulation'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {uqErrorMessage && (
          <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uqErrorMessage}</span>
          </div>
        )}

        {!isReadyForUq && (
          <div className="mt-3 p-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-industrial-warning shrink-0" />
            <span>
              {lang === 'fa'
                ? 'توجه: برای اجرای تحلیل عدم قطعیت، ابتدا باید ظرفیت سامانه (kWp) و انرژی سالانه محاسبه شده باشد.'
                : 'Notice: System capacity (kWp) and annual yield must be computed before running UQ sensitivity analysis.'}
            </span>
          </div>
        )}

        {uqResult && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            {/* Bankable Category & Quantile Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
                <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'رتبه اعتباری و ریسک مالی' : 'Bankability Risk Rating'}</div>
                <div className="text-base font-bold font-mono text-industrial-success mt-1">
                  {uqResult.bankableRiskCategory}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {uqResult.sampleCount} {lang === 'fa' ? 'آزمون ساختاریافته LHS' : 'stratified LHS trials'}
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
                <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'تولید سالانه (MWh) - P10/P50/P90' : 'Annual Yield (MWh) - P10/P50/P90'}</div>
                <div className="text-base font-bold font-mono text-sky-400 mt-1">
                  {uqResult.annualGenerationMwh.p50} <span className="text-xs font-normal text-slate-300">MWh</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  P10: {uqResult.annualGenerationMwh.p10} | P90: {uqResult.annualGenerationMwh.p90} (±{uqResult.annualGenerationMwh.relativeSpreadPercent}%)
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
                <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'بهای تمام‌شده انرژی (LCOE $/MWh)' : 'LCOE ($/MWh) - P10/P50/P90'}</div>
                <div className="text-base font-bold font-mono text-industrial-warning mt-1">
                  ${uqResult.lcoeUsdPerMwh.p50} <span className="text-xs font-normal text-slate-300">/MWh</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  P10: ${uqResult.lcoeUsdPerMwh.p10} | P90: ${uqResult.lcoeUsdPerMwh.p90}
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border rounded-lg">
                <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'ارزش فعلی خالص (NPV USD)' : 'Project NPV (USD) - P10/P50/P90'}</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                  ${uqResult.npvUsd.p50.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  P10: ${uqResult.npvUsd.p10.toLocaleString()} | P90: ${uqResult.npvUsd.p90.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Aleatory vs Epistemic Uncertainty Breakdown */}
            {uqResult.uncertaintyDecomposition && (
              <div className="p-3 bg-slate-900/60 border border-industrial-border rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    {lang === 'fa' ? 'تفکیک عدم قطعیت فیزیکی (Aleatory) و مدل/اقتصادی (Epistemic):' : 'Aleatory vs Epistemic Uncertainty Decomposition:'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {lang === 'fa' ? 'خطای استاندارد همگرایی: ' : 'Std Error: '}
                    ${uqResult.convergenceStandardErrorNpvUsd?.toLocaleString()} USD
                  </span>
                </div>

                {/* Split Bar */}
                <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${uqResult.uncertaintyDecomposition.aleatoryVariancePct}%` }}
                    className="bg-sky-500 h-full"
                    title={`Aleatory (Physical Climate): ${uqResult.uncertaintyDecomposition.aleatoryVariancePct}%`}
                  />
                  <div
                    style={{ width: `${uqResult.uncertaintyDecomposition.epistemicVariancePct}%` }}
                    className="bg-amber-500 h-full"
                    title={`Epistemic (Techno-Economic): ${uqResult.uncertaintyDecomposition.epistemicVariancePct}%`}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="text-sky-300">
                    ● {lang === 'fa' ? 'عدم قطعیت فیزیکی اقلیم (تابش، غبار، آلبدو):' : 'Aleatory Climate Variance (GHI, soiling, albedo):'}{' '}
                    <strong>{uqResult.uncertaintyDecomposition.aleatoryVariancePct}%</strong>
                  </span>
                  <span className="text-amber-300">
                    ● {lang === 'fa' ? 'عدم قطعیت اقتصادی و پارامترها (CAPEX, OPEX, تعرفه، تنزیل):' : 'Epistemic Financial Variance (CAPEX, OPEX, tariff, discount):'}{' '}
                    <strong>{uqResult.uncertaintyDecomposition.epistemicVariancePct}%</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Sensitivity Tornado Ranking */}
            <div className="studio-card">
              <h4 className="text-xs font-bold text-slate-300 mb-2">
                {lang === 'fa'
                  ? 'رتبه‌بندی حساسیت تورنادو (سهم از واریانس کل NPV طبق رگرسیون رتبه‌ای استاندارد SRC²):'
                  : 'Tornado Sensitivity Ranking (First-Order Variance Contribution via SRC² per Saltelli et al.):'}
              </h4>
              <div className="space-y-2">
                {uqResult.tornadoSensitivityRanking.map((item) => (
                  <div key={item.variableId} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300 font-mono">
                      <span>{item.name}</span>
                      <span className="text-industrial-accent font-bold">{item.varianceContributionPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, item.varianceContributionPercent)}%` }}
                        className={`h-full rounded-full ${
                          item.sensitivityType === 'aleatory' ? 'bg-sky-500' : 'bg-industrial-warning'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Screening and Bankability Notice */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">{lang === 'fa' ? 'اطلاعیه ارزیابی ریسک و تأمین مالی: ' : 'Bankability & Risk Notice: '}</span>
                {lang === 'fa' ? uqResult.screeningAndBankabilityNoticeFa : uqResult.screeningAndBankabilityNoticeEn}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
