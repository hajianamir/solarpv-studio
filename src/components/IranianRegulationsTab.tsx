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
}

export const IranianRegulationsTab: React.FC<IranianRegulationsTabProps> = ({
  capacityKwp,
  annualGenerationMwh,
}) => {
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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          مقررات تجدیدپذیر ایران، ماده ۱۶ و تابلو سبز بورس انرژی (Iranian Regulations & PPA)
        </h1>
        <p className="text-slate-400 text-xs">
          مدل‌سازی مالی ماده ۱۶ قانون جهش تولید دانش‌بنیان، فروش در تالار سبز بورس انرژی (IRENEX)، قراردادهای خرید تضمینی ۲۰ ساله ساتبا و خودتامین صنایع
        </p>
      </div>

      {/* Framework Selector & Loan Parameters */}
      <div className="studio-card">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          انتخاب چارچوب قانونی و ساختار فروش برق در ایران:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {[
            { id: 'article_16', title: 'ماده ۱۶ جهش تولید دانش‌بنیان', desc: 'تامین ۱ تا ۵ درصد برق صنایع' },
            { id: 'green_exchange', title: 'تابلو سبز بورس انرژی (IRENEX)', desc: 'فروش به صنایع با قیمت رقابتی' },
            { id: 'satba_fit_ppa', title: 'خرید تضمینی ۲۰ ساله ساتبا', desc: 'قرارداد رسمی PPA با تعدیل نرخ ارز' },
            { id: 'self_generation', title: 'خودتامین و دیسپاچینگ ویژه', desc: 'جلوگیری از قطعی برق تابستان' },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => setFramework(item.id as IranianRegulationFramework)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                framework === item.id
                  ? 'bg-sky-950/70 border-sky-400 shadow-md ring-1 ring-sky-400'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-xs text-white mb-0.5">{item.title}</div>
              <div className="text-[10.5px] text-slate-400">{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Financial Drivers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-800">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">نرخ فروش برق (تومان/kWh):</label>
            <input
              type="number"
              step="100"
              value={customTariffToman}
              onChange={(e) => setCustomTariffToman(parseFloat(e.target.value) || 3000)}
              className="studio-input font-mono text-emerald-400 font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">سهم تسهیلات بانکی (وام ٪):</label>
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
            <label className="block text-slate-300 font-semibold mb-1">نرخ سود تسهیلات بانکی (٪):</label>
            <input
              type="number"
              step="1"
              value={loanInterestPct}
              onChange={(e) => setLoanInterestPct(parseFloat(e.target.value) || 18)}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">دوره بازپرداخت وام (سال):</label>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">نرخ بازده داخلی آورده (Equity IRR)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {modelResult.equityIrrPct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Project IRR: {modelResult.projectIrrPct}%</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ارزش خالص فعلی پروژه (NPV)</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {(modelResult.npvMillionToman / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-300">میلیارد تومان</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">با نرخ تنزیل ۲۰٪ ریالی</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">دوره بازگشت سرمایه آورده</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {modelResult.simplePaybackYears} <span className="text-xs font-normal text-slate-300">سال</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">تنزیل‌شده: {modelResult.discountedPaybackYears} سال</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">صرفه‌جویی جریمه ماده ۱۶ / خاموشی</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {(modelResult.article16PenaltyAvoidedMillionToman / 1000).toFixed(1)} <span className="text-xs font-normal text-slate-300">میلیارد/سال</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">جلوگیری از عدم‌النفع توقف خط تولید</div>
        </div>
      </div>

      {/* 25-Year Cash Flow Projection Table */}
      <div className="studio-card overflow-hidden">
        <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          جدول جریان وجوه نقد سالانه ۲۵ ساله (25-Year Cash Flow & DSCR Matrix)
        </h3>

        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-700">
              <tr>
                <th className="p-2.5">سال</th>
                <th className="p-2.5">تولید (MWh)</th>
                <th className="p-2.5">درآمد فروش (میلیون تومان)</th>
                <th className="p-2.5">هزینه جاری OPEX</th>
                <th className="p-2.5">اقساط وام بانکی</th>
                <th className="p-2.5">جریان نقد خالص (NCF)</th>
                <th className="p-2.5">جریان تجمعی</th>
                <th className="p-2.5 text-center">شاخص DSCR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {modelResult.cashFlow25Years.map((cf) => (
                <tr key={cf.year} className="hover:bg-slate-850/60 font-mono">
                  <td className="p-2.5 font-bold text-white">سال {cf.year}</td>
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
