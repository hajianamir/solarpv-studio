import React, { useState } from 'react';
import { Scale, TrendingUp, DollarSign, ShieldAlert, Award, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import {
  runIranianRegulationFinancialModel,
  IranianRegulationFramework,
  IranianFinancialModelResult,
} from '../engine/iranianRegulationsFinancial';

interface IranianRegulationsTabProps {
  capacityKwp: number;
  annualGenerationMwh: number;
  lang?: 'fa' | 'en';
}

export const IranianRegulationsTab: React.FC<IranianRegulationsTabProps> = ({
  capacityKwp,
  annualGenerationMwh,
  lang = 'fa',
}) => {
  const isFa = lang === 'fa';
  const [framework, setFramework] = useState<IranianRegulationFramework>('article_16');
  const [customTariffToman, setCustomTariffToman] = useState<number>(4500);
  const [loanSharePct, setLoanSharePct] = useState<number>(70);
  const [loanInterestPct, setLoanInterestPct] = useState<number>(23);
  const [loanTermYears, setLoanTermYears] = useState<number>(5);

  const modelResult: IranianFinancialModelResult = runIranianRegulationFinancialModel(
    capacityKwp,
    annualGenerationMwh,
    framework,
    customTariffToman,
    loanSharePct,
    loanInterestPct,
    loanTermYears
  );

  const frameworksList = [
    {
      id: 'article_16',
      titleFa: 'ماده ۱۶ جهش تولید دانش‌بنیان',
      titleEn: 'Article 16 Industrial Mandate',
      descFa: 'تامین ۱ تا ۵ درصد برق صنایع مشمول',
      descEn: 'Supply 1% to 5% power to avoid penalties',
    },
    {
      id: 'green_exchange',
      titleFa: 'تابلو سبز بورس انرژی (IRENEX)',
      titleEn: 'IRENEX Green Power Board',
      descFa: 'فروش به صنایع با قیمت رقابتی بورس',
      descEn: 'Competitive bilateral power trading',
    },
    {
      id: 'satba_fit_ppa',
      titleFa: 'خرید تضمینی ۲۰ ساله ساتبا (FIT)',
      titleEn: 'SATBA 20-Year Feed-in-Tariff',
      descFa: 'قرارداد رسمی PPA با تعدیل نرخ ارز و تورم',
      descEn: 'Official government PPA with FX indexation',
    },
    {
      id: 'self_generation',
      titleFa: 'خودتامین و دیسپاچینگ ویژه',
      titleEn: 'Self-Generation & Peak Shaving',
      descFa: 'جلوگیری از قطعی برق تابستان صنایع',
      descEn: 'Prevent summer grid blackout production loss',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-lg sm:text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400 shrink-0" />
          {isFa
            ? 'مقررات تجدیدپذیر ایران، ماده ۱۶ و تابلو سبز بورس انرژی (Iranian Regulations & PPA)'
            : 'Iranian Renewable Regulatory Frameworks, Article 16 & IRENEX Green Board'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isFa
            ? 'مدل‌سازی مالی ماده ۱۶ قانون جهش تولید دانش‌بنیان، فروش در تالار سبز بورس انرژی (IRENEX)، قراردادهای خرید تضمینی ۲۰ ساله ساتبا و خودتامین صنایع'
            : 'Pro-forma financial modeling for Article 16 knowledge-based mandates, IRENEX Green Exchange sales, SATBA 20-year PPA with currency indexation, and industrial captive power.'}
        </p>
      </div>

      {/* Framework Selector & Loan Parameters */}
      <div className="studio-card">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          {isFa ? 'انتخاب چارچوب قانونی و ساختار فروش برق در ایران:' : 'Select Regulatory Power Offtake Framework in Iran:'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {frameworksList.map((item) => (
            <div
              key={item.id}
              onClick={() => setFramework(item.id as IranianRegulationFramework)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                framework === item.id
                  ? 'bg-sky-950/70 border-sky-400 shadow-md ring-1 ring-sky-400'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-xs text-white mb-0.5">
                {isFa ? item.titleFa : item.titleEn}
              </div>
              <div className="text-[10.5px] text-slate-400">
                {isFa ? item.descFa : item.descEn}
              </div>
            </div>
          ))}
        </div>

        {/* Financial Drivers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-800">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'نرخ فروش برق (تومان/kWh):' : 'Electricity Tariff (Toman/kWh):'}
            </label>
            <input
              type="number"
              step="100"
              value={customTariffToman}
              onChange={(e) => setCustomTariffToman(parseFloat(e.target.value) || 3000)}
              className="studio-input font-mono text-emerald-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'سهم تسهیلات بانکی (وام ٪):' : 'Bank Debt Financing (%):'}
            </label>
            <input
              type="number"
              step="5"
              min="0"
              max="90"
              value={loanSharePct}
              onChange={(e) => setLoanSharePct(parseInt(e.target.value) || 0)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'نرخ سود تسهیلات بانکی (٪):' : 'Loan Interest Rate (%):'}
            </label>
            <input
              type="number"
              step="1"
              value={loanInterestPct}
              onChange={(e) => setLoanInterestPct(parseFloat(e.target.value) || 18)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'دوره بازپرداخت وام (سال):' : 'Debt Tenor (Years):'}
            </label>
            <input
              type="number"
              step="1"
              value={loanTermYears}
              onChange={(e) => setLoanTermYears(parseInt(e.target.value) || 5)}
              className="studio-input font-mono"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'نرخ بازده داخلی آورده (Equity IRR)' : 'Equity IRR (%)'}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {modelResult.equityIrrPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Project IRR: {modelResult.projectIrrPct}%</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'ارزش خالص فعلی پروژه (NPV)' : 'Project NPV'}
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {(modelResult.npvMillionToman / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-300">{isFa ? 'میلیارد تومان' : 'Billion Toman'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'با نرخ تنزیل ۲۰٪ ریالی' : '20% IRR Discount Rate'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'دوره بازگشت سرمایه آورده' : 'Equity Simple Payback'}
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {modelResult.simplePaybackYears} <span className="text-xs font-normal text-slate-300">{isFa ? 'سال' : 'years'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? `تنزیل‌شده: ${modelResult.discountedPaybackYears} سال` : `Discounted: ${modelResult.discountedPaybackYears} yrs`}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'صرفه‌جویی جریمه ماده ۱۶ / خاموشی' : 'Avoided Penalty / Outage Savings'}
          </div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {(modelResult.article16PenaltyAvoidedMillionToman / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-300">{isFa ? 'میلیارد/سال' : 'Billion/yr'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'جلوگیری از عدم‌النفع توقف خط تولید' : 'Protection against industrial downtime'}
          </div>
        </div>
      </div>

      {/* 25-Year Cash Flow Projection Table */}
      <div className="studio-card overflow-hidden">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
          {isFa
            ? 'جدول جریان وجوه نقد سالانه ۲۵ ساله (25-Year Cash Flow & DSCR Matrix)'
            : '25-Year Cash Flow Matrix & Debt Service Coverage Ratio (DSCR)'}
        </h3>

        <div className="overflow-x-auto max-h-[380px] -mx-3 sm:mx-0">
          <table className={`w-full text-xs text-slate-300 min-w-[700px] ${isFa ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-700">
              <tr>
                <th className="p-2.5">{isFa ? 'سال' : 'Year'}</th>
                <th className="p-2.5">{isFa ? 'تولید (MWh)' : 'Generation (MWh)'}</th>
                <th className="p-2.5">{isFa ? 'درآمد فروش (م.ت)' : 'Revenue (M Toman)'}</th>
                <th className="p-2.5">{isFa ? 'هزینه جاری OPEX' : 'OPEX (M Toman)'}</th>
                <th className="p-2.5">{isFa ? 'اقساط وام بانکی' : 'Debt Service'}</th>
                <th className="p-2.5">{isFa ? 'جریان نقد خالص (NCF)' : 'Net Cash Flow'}</th>
                <th className="p-2.5">{isFa ? 'جریان تجمعی' : 'Cumulative CF'}</th>
                <th className="p-2.5 text-center">{isFa ? 'شاخص DSCR' : 'DSCR'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {modelResult.cashFlow25Years.map((cf) => (
                <tr key={cf.year} className="hover:bg-slate-850/60 font-mono">
                  <td className="p-2.5 font-bold text-white">
                    {isFa ? `سال ${cf.year}` : `Yr ${cf.year}`}
                  </td>
                  <td className="p-2.5 text-slate-200">{cf.generationMwh.toLocaleString()}</td>
                  <td className="p-2.5 text-emerald-400 font-bold">{cf.revenueMillionToman.toLocaleString()}</td>
                  <td className="p-2.5 text-slate-400">{cf.opexMillionToman.toLocaleString()}</td>
                  <td className="p-2.5 text-red-300">{cf.debtServiceMillionToman > 0 ? cf.debtServiceMillionToman.toLocaleString() : '-'}</td>
                  <td className="p-2.5 text-sky-300 font-bold">{cf.netCashFlowMillionToman.toLocaleString()}</td>
                  <td className="p-2.5">
                    <span className={cf.cumulativeCashFlowMillionToman >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                      {cf.cumulativeCashFlowMillionToman.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${cf.dscr >= 1.25 ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {cf.dscr > 5 ? '> 5.0' : cf.dscr.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
