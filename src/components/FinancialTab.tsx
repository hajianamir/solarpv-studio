import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  FinancialAnalysisResult,
  UserFinancialPricing,
} from '../engine/financialEngine';

interface FinancialTabProps {
  financial: FinancialAnalysisResult;
  pricing: UserFinancialPricing;
  onPricingChange: (newPricing: UserFinancialPricing) => void;
  lang?: 'fa' | 'en';
}

export const FinancialTab: React.FC<FinancialTabProps> = ({
  financial,
  pricing,
  onPricingChange,
  lang = 'fa',
}) => {
  const [showCashflowTable, setShowCashflowTable] = useState(false);

  const updateField = (field: keyof UserFinancialPricing, val: any) => {
    onPricingChange({
      ...pricing,
      [field]: val,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
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
        <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          {lang === 'fa' ? 'قیمت‌های برآوردی واحد تجهیزات (ورودی کاربر):' : 'User Unit Pricing Parameters:'}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'قیمت پنل ($/Wp):' : 'Module ($/Wp):'}
            </label>
            <input
              type="number"
              step="0.01"
              value={pricing.moduleUsdPerWp}
              onChange={(e) => updateField('moduleUsdPerWp', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-amber-300 text-xs"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ~{(pricing.moduleUsdPerWp * pricing.usdToTomanRate).toLocaleString()} تومان/Wp
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
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

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'قیمت باتری ($/kWh):' : 'Battery ($/kWh):'}
            </label>
            <input
              type="number"
              step="10"
              value={pricing.batteryUsdPerKwh}
              onChange={(e) => updateField('batteryUsdPerKwh', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-emerald-300 text-xs"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">
              ~{(pricing.batteryUsdPerKwh * pricing.usdToTomanRate).toLocaleString()} تومان/kWh
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
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

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
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

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'پست MV و اتصال ($/MVA):' : 'MV Substation ($/MVA):'}
            </label>
            <input
              type="number"
              step="5000"
              value={pricing.substationUsdPerMva}
              onChange={(e) => updateField('substationUsdPerMva', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-amber-300 text-xs"
            />
          </div>

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'تعرفه فروش برق (تومان/kWh):' : 'Tariff (Toman/kWh):'}
            </label>
            <input
              type="number"
              step="500"
              value={pricing.gridTariffTomanPerKwh}
              onChange={(e) => updateField('gridTariffTomanPerKwh', parseFloat(e.target.value) || 0)}
              className="studio-input w-full font-mono font-bold text-emerald-400 text-xs"
            />
          </div>

          <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
            <label className="text-slate-400 block mb-1">
              {lang === 'fa' ? 'نرخ تسعیر دلار (تومان):' : 'USD/Toman Rate:'}
            </label>
            <input
              type="number"
              step="1000"
              value={pricing.usdToTomanRate}
              onChange={(e) => updateField('usdToTomanRate', parseFloat(e.target.value) || 90000)}
              className="studio-input w-full font-mono font-bold text-amber-400 text-xs"
            />
          </div>
        </div>

        {/* Optional Diesel Generator Pricing Toggle */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-amber-300 font-bold">
            <input
              type="checkbox"
              checked={!!pricing.includeDieselGenSet}
              onChange={(e) => updateField('includeDieselGenSet', e.target.checked)}
              className="w-4 h-4 rounded text-sky-500"
            />
            <Flame className="w-4 h-4 text-amber-400" />
            {lang === 'fa'
              ? 'محاسبه دیزل ژنراتور اضطراری پشتیبان در هزینه‌های مالی (CAPEX/OPEX)'
              : 'Include Backup Diesel GenSet in CAPEX/OPEX Financial Model'}
          </label>

          {pricing.includeDieselGenSet && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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
                <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'مصرف گازوئیل سالانه (لیتر):' : 'Annual Fuel (Liters):'}</label>
                <input
                  type="number"
                  value={pricing.dieselAnnualFuelLiters || 2500}
                  onChange={(e) => updateField('dieselAnnualFuelLiters', parseFloat(e.target.value) || 0)}
                  className="studio-input w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">{lang === 'fa' ? 'نرخ هر لیتر گازوئیل (تومان):' : 'Fuel Price (Toman/L):'}</label>
                <input
                  type="number"
                  value={pricing.dieselFuelPriceTomanPerLiter || 3500}
                  onChange={(e) => updateField('dieselFuelPriceTomanPerLiter', parseFloat(e.target.value) || 0)}
                  className="studio-input w-full text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'کل سرمایه‌گذاری اولیه (CAPEX)' : 'Total Initial CAPEX'}</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${financial.capexBreakdown.totalCapexUsd.toLocaleString()}
          </div>
          <div className="text-xs font-mono text-amber-400 mt-0.5">
            {(financial.capexBreakdown.totalCapexToman / 1_000_000_000).toFixed(2)} میلیارد تومان
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'دوره بازگشت سرمایه ساده' : 'Simple Payback Period'}</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {financial.simplePaybackPeriodYears} <span className="text-xs font-normal text-slate-300">{lang === 'fa' ? 'سال' : 'Years'}</span>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">
            {lang === 'fa' ? 'تنزیل‌شده:' : 'Discounted:'} {financial.discountedPaybackPeriodYears} {lang === 'fa' ? 'سال' : 'yrs'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'نرخ بازده داخلی (IRR)' : 'Internal Rate of Return (IRR)'}</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {financial.irrPct}%
          </div>
          <div className="text-xs font-mono text-emerald-400 mt-0.5">
            NPV: {(financial.npvToman / 1_000_000_000).toFixed(2)} میلیارد تومان
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{lang === 'fa' ? 'بهای تمام‌شده انرژی (LCOE)' : 'Levelized Cost of Energy (LCOE)'}</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            ${financial.lcoeUsdPerKwh.toFixed(4)}
          </div>
          <div className="text-xs font-mono text-slate-300 mt-0.5">
            {financial.lcoeTomanPerKwh.toLocaleString()} تومان / kWh
          </div>
        </div>
      </div>

      {/* Itemized CAPEX Breakdown Table */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-sky-400 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          {lang === 'fa' ? 'تفکیک اقلام هزینه‌ای پروژه (CAPEX Breakdown)' : 'Itemized CAPEX Breakdown'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
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
                <td className="p-2.5 text-emerald-400">${financial.capexBreakdown.pvModulesUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.pvModulesToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.pvModulesUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'اینورترها (Inverters / Turnkey)' : 'Inverters / Turnkey'}</td>
                <td className="p-2.5 text-sky-400">${financial.capexBreakdown.invertersUsd.toLocaleString()}</td>
                <td className="p-2.5">{(financial.capexBreakdown.invertersToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-slate-400">
                  {((financial.capexBreakdown.invertersUsd / Math.max(1, financial.capexBreakdown.totalCapexUsd)) * 100).toFixed(1)}%
                </td>
              </tr>
              {financial.capexBreakdown.batteriesUsd > 0 && (
                <tr>
                  <td className="p-2.5 font-sans font-bold text-white">{lang === 'fa' ? 'بانک باتری ذخیره‌ساز (BESS)' : 'BESS Battery Bank'}</td>
                  <td className="p-2.5 text-amber-400">${financial.capexBreakdown.batteriesUsd.toLocaleString()}</td>
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
                  <td className="p-2.5 text-amber-400">${financial.capexBreakdown.dieselGenSetUsd.toLocaleString()}</td>
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
              <tr className="bg-slate-950 font-bold border-t border-slate-700">
                <td className="p-2.5 font-sans text-sky-400">{lang === 'fa' ? 'مجموع کل سرمایه‌گذاری اولیه (Total CAPEX)' : 'Total Initial CAPEX'}</td>
                <td className="p-2.5 text-emerald-400 text-sm">${financial.capexBreakdown.totalCapexUsd.toLocaleString()}</td>
                <td className="p-2.5 text-amber-400 text-sm">{(financial.capexBreakdown.totalCapexToman / 1_000_000).toLocaleString()} م.ت</td>
                <td className="p-2.5 text-white">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 25-Year Cash Flow Toggle */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
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
          <div className="mt-4 overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
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
                {financial.cashFlow25Years.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-850/50">
                    <td className="p-2 text-white font-bold">{row.year}</td>
                    <td className="p-2 text-sky-400">{row.generationKwh.toLocaleString()}</td>
                    <td className="p-2 text-emerald-400">{(row.revenueToman / 1_000_000).toFixed(1)} م.ت</td>
                    <td className="p-2 text-red-300">{(row.opexToman / 1_000_000).toFixed(1)} م.ت</td>
                    <td className="p-2 font-bold text-slate-100">{(row.netCashFlowToman / 1_000_000).toFixed(1)} م.ت</td>
                    <td className={`p-2 font-bold ${row.cumulativeCashFlowToman >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(row.cumulativeCashFlowToman / 1_000_000).toFixed(1)} م.ت
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
