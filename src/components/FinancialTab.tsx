import React from 'react';
import { DollarSign, TrendingUp, PiggyBank, Leaf, Calendar, ShieldCheck } from 'lucide-react';
import { FinancialAnalysisResult } from '../engine/financialEngine';

interface FinancialTabProps {
  financial: FinancialAnalysisResult;
  usdToTomanRate: number;
  onUsdToTomanRateChange: (rate: number) => void;
  gridTariffToman: number;
  onGridTariffTomanChange: (tariff: number) => void;
}

export const FinancialTab: React.FC<FinancialTabProps> = ({
  financial,
  usdToTomanRate,
  onUsdToTomanRateChange,
  gridTariffToman,
  onGridTariffTomanChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          تحلیل اقتصادی، دوره بازگشت سرمایه و LCOE (Financial Engine)
        </h1>
        <p className="text-slate-400 text-xs">
          برآورد هزینه اولیه سرمایه‌گذاری (CAPEX) به تفکیک تجهیزات به تومان و دلار، صرفه‌جویی سالانه، بهای تمام‌شده تراز شده انرژی و کاهش کربن
        </p>
      </div>

      {/* Currency & Tariff Controls */}
      <div className="studio-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              نرخ تسعیر دلار به تومان:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1000"
                value={usdToTomanRate}
                onChange={(e) => onUsdToTomanRateChange(parseFloat(e.target.value) || 90000)}
                className="studio-input font-mono font-bold text-amber-400 w-44"
              />
              <span className="text-slate-400">تومان به ازای هر دلار آمریکا</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              تعرفه خرید برق شبکه / هزینه سوخت جایگزین:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="500"
                value={gridTariffToman}
                onChange={(e) => onGridTariffTomanChange(parseFloat(e.target.value) || 3500)}
                className="studio-input font-mono font-bold text-emerald-400 w-44"
              />
              <span className="text-slate-400">تومان به ازای هر کیلووات ساعت (kWh)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">کل سرمایه‌گذاری اولیه (CAPEX)</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${financial.capexBreakdown.totalCapexUsd.toLocaleString()}
          </div>
          <div className="text-xs font-mono text-amber-400 mt-0.5">
            {(financial.capexBreakdown.totalCapexToman / 1_000_000).toFixed(1)} میلیون تومان
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">دوره ساده بازگشت سرمایه</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {financial.simplePaybackPeriodYears} <span className="text-xs font-normal text-slate-300">سال</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            صرفه‌جویی سالانه: {(financial.annualElectricitySavingsToman / 1_000_000).toFixed(1)} م.ت
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">بهای تمام‌شده انرژی (LCOE)</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            ${financial.lcoeUsdPerKwh.toFixed(4)}
          </div>
          <div className="text-xs font-mono text-slate-300 mt-0.5">
            {financial.lcoeTomanPerKwh.toLocaleString()} تومان / kWh
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">کاهش انتشار کربن (CO2)</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {financial.annualCo2ReductionTons} <span className="text-xs font-normal text-slate-300">تن/سال</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            طول عمر ۲۵ ساله: {financial.lifetime25yCo2ReductionTons} تن
          </div>
        </div>
      </div>

      {/* CAPEX Detailed Breakdown Table */}
      <div className="studio-card">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          ریز برآورد مالی هزینه‌های سرمایه‌ای پروژه (Detailed CAPEX Breakdown)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-2.5">آیتم سرمایه‌گذاری</th>
                <th className="p-2.5">برآورد ارزی (USD)</th>
                <th className="p-2.5">برآورد ریالی (میلیون تومان)</th>
                <th className="p-2.5">سهم از کل بودجه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="p-2.5 font-medium text-white">ماژول‌های فتوولتائیک (PV Modules)</td>
                <td className="p-2.5 font-mono text-white">${financial.capexBreakdown.pvModulesUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-amber-300">{(financial.capexBreakdown.pvModulesToman / 1_000_000).toFixed(1)} م.ت</td>
                <td className="p-2.5 font-mono text-slate-400">
                  {((financial.capexBreakdown.pvModulesUsd / financial.capexBreakdown.totalCapexUsd) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">اینورترهای خورشیدی (Inverters)</td>
                <td className="p-2.5 font-mono text-white">${financial.capexBreakdown.invertersUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-amber-300">{(financial.capexBreakdown.invertersToman / 1_000_000).toFixed(1)} م.ت</td>
                <td className="p-2.5 font-mono text-slate-400">
                  {((financial.capexBreakdown.invertersUsd / financial.capexBreakdown.totalCapexUsd) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">بانک باتری ذخیره‌ساز انرژی (BESS)</td>
                <td className="p-2.5 font-mono text-white">${financial.capexBreakdown.batteriesUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-amber-300">{(financial.capexBreakdown.batteriesToman / 1_000_000).toFixed(1)} م.ت</td>
                <td className="p-2.5 font-mono text-slate-400">
                  {((financial.capexBreakdown.batteriesUsd / financial.capexBreakdown.totalCapexUsd) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">استراکچر و سازه‌های نگه‌دارنده گالوانیزه</td>
                <td className="p-2.5 font-mono text-white">${financial.capexBreakdown.structuresUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-amber-300">{(financial.capexBreakdown.structuresToman / 1_000_000).toFixed(1)} م.ت</td>
                <td className="p-2.5 font-mono text-slate-400">
                  {((financial.capexBreakdown.structuresUsd / financial.capexBreakdown.totalCapexUsd) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">کابل‌کشی خورشیدی، تابلوها و ادوات حفاظتی</td>
                <td className="p-2.5 font-mono text-white">${financial.capexBreakdown.cablesAndProtectionUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-amber-300">{(financial.capexBreakdown.cablesAndProtectionToman / 1_000_000).toFixed(1)} م.ت</td>
                <td className="p-2.5 font-mono text-slate-400">
                  {((financial.capexBreakdown.cablesAndProtectionUsd / financial.capexBreakdown.totalCapexUsd) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-white">مهندسی طراحی، نصب، تست و راه‌اندازی</td>
                <td className="p-2.5 font-mono text-white">${financial.capexBreakdown.engineeringAndInstallationUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-amber-300">{(financial.capexBreakdown.engineeringAndInstallationToman / 1_000_000).toFixed(1)} م.ت</td>
                <td className="p-2.5 font-mono text-slate-400">
                  {((financial.capexBreakdown.engineeringAndInstallationUsd / financial.capexBreakdown.totalCapexUsd) * 100).toFixed(1)}%
                </td>
              </tr>
              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700">
                <td className="p-2.5 text-sky-400 text-sm">مجموع کل سرمایه‌گذاری (Total CAPEX)</td>
                <td className="p-2.5 font-mono text-emerald-400 text-sm">${financial.capexBreakdown.totalCapexUsd.toLocaleString()}</td>
                <td className="p-2.5 font-mono text-emerald-400 text-sm">{(financial.capexBreakdown.totalCapexToman / 1_000_000).toFixed(1)} میلیون تومان</td>
                <td className="p-2.5 font-mono text-white">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
