import {IranianScreenSettingsSchema,createDefaultIranianScreenSettings,type IranianScreenSettings} from '../contracts/iranianEconomicPolicy';
import {ECONOMIC_DISCLOSURE, BIFACIAL_READINESS} from '../presentation/phase1Evidence';
import React, { useState } from 'react';
import { Scale, TrendingUp, DollarSign, ShieldAlert, Award, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import {
  runIranianRegulationFinancialModel,
  type IranianRegulationFramework,
  type IranianFinancialModelResult,
} from '../engine/iranianRegulationsFinancial';

interface IranianRegulationsTabProps {
  capacityKwp: number;
  annualGenerationMwh: number;
  /** Legacy scalar framework cannot value an adopted dispatch/import ledger. */
  operationalEnergyBlocked?: boolean;
  lang?: 'fa' | 'en';
  settings?: IranianScreenSettings;
  onSettingsChange?: (settings:IranianScreenSettings)=>void;
}

export const IranianRegulationsTab: React.FC<IranianRegulationsTabProps> = ({
  capacityKwp,
  annualGenerationMwh,
  lang = 'fa',
  operationalEnergyBlocked = false,
  settings:controlledSettings,
  onSettingsChange,
}) => {
  const isFa = lang === 'fa';
  const [localSettings,setLocalSettings]=useState(createDefaultIranianScreenSettings);
  const [inputError,setInputError]=useState(false);
  const settings=controlledSettings??localSettings;
  const {framework,customTariffToman,loanSharePct,loanInterestPct,loanTermYears,economicPolicy}=settings;
  const updateSettings=(patch:Partial<IranianScreenSettings>)=>{
    const checked=IranianScreenSettingsSchema.safeParse({...settings,...patch});
    setInputError(!checked.success);
    if(checked.success){setLocalSettings(checked.data);onSettingsChange?.(checked.data);}
  };


  if (operationalEnergyBlocked) return (
    <div role="alert" data-testid="iranian-operational-blocked" className="studio-card">
      {isFa
        ? 'مدل مالی سادهٔ مقررات ایران برای انرژی عملیاتی پذیرفته‌شده در دسترس نیست: هزینهٔ واردات و دفتر دیسپاچ را محاسبه نمی‌کند. از تب مالی و گزارش عملیاتی استفاده کنید؛ هیچ جایگزینی با تولید خام یا روز نماینده انجام نشد.'
        : 'The scalar Iranian framework is unavailable for adopted operational energy: it does not value import costs or the dispatch ledger. Use Financial and Operational reports. No gross-PV or representative-day fallback was applied.'}
    </div>
  );

  let modelResult: IranianFinancialModelResult;
  try {
  modelResult = runIranianRegulationFinancialModel(
    capacityKwp,
    annualGenerationMwh,
    framework,
    customTariffToman,
    loanSharePct,
    loanInterestPct,
    loanTermYears,
    25,
    economicPolicy
  );
  } catch {return <div role="alert" data-testid="iranian-model-unavailable">{isFa?'محاسبه مالی در دسترس نیست؛ ورودی یا دامنه عددی نامعتبر است.':'Financial screen unavailable: invalid input or numerical domain.'}</div>;}

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
    <div className="space-y-6" data-testid="iranian-financial-screen">
      <div role="note">{ECONOMIC_DISCLOSURE}<p>{BIFACIAL_READINESS.warning}</p></div>
      <div role="note" data-testid="iranian-energy-basis" className="studio-card text-sm">
        {isFa ? 'ظرفیت واقعی DC و انرژی سالانهٔ خالص AC از همان مبنای تب مالی؛ نه هدف AC و نه روز نماینده × ۳۶۵. نرخ‌ها و تعدیل‌ها فرض غربالگری‌اند، نه تعرفهٔ رسمی به‌روز.' : 'Actual DC capacity and annual net AC energy use the Financial tab screening basis, not the AC target or a representative day × 365. Rates and escalation are screening assumptions, not verified current official tariffs.'}
        <p>{isFa
          ? `فرض غربالگری، نه نرخ رسمی: CAPEX برابر۳۱٫۵میلیون تومان/kWp، OPEX اولیه۱٫۵٪، افت سالانه۰٫۴۵٪؛ تنزیل اسمی ${economicPolicy.discountRatePct}٪، رشد تعرفه ${economicPolicy.tariffEscalationPct}٪ و رشد OPEX ${economicPolicy.opexEscalationPct}٪. مالیات، جایگزینی و ارزش اسقاط محاسبه نمی‌شوند. مبنای انرژی همچنان غربالگری است؛ پذیرش مالی مجاز نیست.`
          : `Illustrative, not verified official rates: CAPEX31.5 million Toman/kWp, initial OPEX1.5%, annual degradation0.45%; nominal discount ${economicPolicy.discountRatePct}%, tariff escalation ${economicPolicy.tariffEscalationPct}%, OPEX escalation ${economicPolicy.opexEscalationPct}%. No taxes, replacement or salvage schedules. Energy remains a screening basis; financial adoption is not authorized.`}</p>
        <p data-testid="iranian-applied-tariff">{isFa
          ? `تعرفه واردشده ${customTariffToman}، تعرفه اعمال‌شده ${modelResult.tariffPerKwhToman} تومان/kWh. کف‌های فرضی چارچوب ۳۸۰۰/۴۵۰۰/۳۲۰۰/۵۰۰۰ است؛ منبع/تاریخ اعتبار تأیید نشده. یک نرخ تنزیل اسمی انتخاب‌شده برای هر دو NPV استفاده می‌شود، نه WACC یا هزینه آورده تأییدشده.`
          : `Entered tariff ${customTariffToman}; applied tariff ${modelResult.tariffPerKwhToman} Toman/kWh. Illustrative framework floors3800/4500/3200/5000 remain; source/effective dates unverified. Both NPVs use the selected nominal screening discount, not an assessed WACC or cost of equity.`}</p>
        <p data-testid="iranian-policy" data-policy={JSON.stringify(modelResult.economicPolicy)}>{economicPolicy.modelPolicy} · TOMAN · nominal · pre-tax · 25 years · financialAdoptionEligible: false</p>
        <div data-testid="iranian-input-summary" data-dc-kwp={capacityKwp} data-annual-mwh={annualGenerationMwh}>{capacityKwp.toFixed(2)} kWp DC · {annualGenerationMwh.toFixed(3)} MWh/yr</div>
      </div>
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-lg sm:text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <Scale className="w-5 h-5 text-industrial-warning shrink-0" />
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
        <span className="block text-xs font-semibold text-slate-300 mb-2">
          {isFa ? 'انتخاب چارچوب قانونی و ساختار فروش برق در ایران:' : 'Select Regulatory Power Offtake Framework in Iran:'}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {frameworksList.map((item) => (
            <div
              key={item.id}
              onClick={() => updateSettings({framework:item.id as IranianRegulationFramework})}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                framework === item.id
                  ? 'bg-sky-950/70 border-sky-400 ring-1 ring-sky-400'
                  : 'bg-industrial-surface border-industrial-border hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-xs text-theme-strong mb-0.5">
                {isFa ? item.titleFa : item.titleEn}
              </div>
              <div className="text-[10.5px] text-slate-400">
                {isFa ? item.descFa : item.descEn}
              </div>
            </div>
          ))}
        </div>

        {/* Financial Drivers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-3 border-t border-industrial-border">
          <div>
            <label htmlFor="iran-reg-tariff" className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'نرخ فروش برق (تومان/kWh):' : 'Electricity Tariff (Toman/kWh):'}
            </label>
            <input
              id="iran-reg-tariff"
              type="number"
              step="100"
              value={customTariffToman}
              onChange={(e) => updateSettings({customTariffToman:e.currentTarget.valueAsNumber})}
              className="studio-input font-mono text-industrial-success font-bold"
            />
          </div>

          <div>
            <label htmlFor="iran-reg-debt-ratio" className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'سهم تسهیلات بانکی (وام ٪):' : 'Bank Debt Financing (%):'}
            </label>
            <input
              id="iran-reg-debt-ratio"
              type="number"
              step="5"
              min="0"
              max="100"
              value={loanSharePct}
              onChange={(e) => updateSettings({loanSharePct:e.currentTarget.valueAsNumber})}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="iran-reg-interest-rate" className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'نرخ سود تسهیلات بانکی (٪):' : 'Loan Interest Rate (%):'}
            </label>
            <input
              id="iran-reg-interest-rate"
              type="number"
              step="1"
              value={loanInterestPct}
              onChange={(e) => updateSettings({loanInterestPct:e.currentTarget.valueAsNumber})}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="iran-reg-debt-tenor" className="block text-slate-300 font-semibold mb-1">
              {isFa ? 'دوره بازپرداخت وام (سال):' : 'Debt Tenor (Years):'}
            </label>
            <input
              id="iran-reg-debt-tenor"
              type="number"
              step="1"
              value={loanTermYears}
              onChange={(e) => updateSettings({loanTermYears:e.currentTarget.valueAsNumber})}
              className="studio-input font-mono"
            />
          </div>
        </div>
      </div>

      <div className="studio-card grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(['discountRatePct','tariffEscalationPct','opexEscalationPct'] as const).map((key,index)=><label key={key} htmlFor={`iran-policy-${key}`}>
          {isFa?['نرخ تنزیل اسمی (٪)','رشد سالانه تعرفه (٪)','رشد سالانه OPEX (٪)'][index]:['Nominal discount (%)','Annual tariff escalation (%)','Annual OPEX escalation (%)'][index]}
          <input id={`iran-policy-${key}`} type="number" step="0.1" value={economicPolicy[key]} onChange={event=>updateSettings({economicPolicy:{...economicPolicy,[key]:event.currentTarget.valueAsNumber}})} className="studio-input"/>
        </label>)}
        {inputError&&<p role="alert">{isFa?'ورودی نامعتبر پذیرفته نشد؛ آخرین مقدار معتبر حفظ شد.':'Invalid input rejected; last validated value retained.'}</p>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'نرخ بازده داخلی آورده (Equity IRR)' : 'Equity IRR (%)'}
          </div>
          <div className="text-2xl font-bold font-mono text-industrial-success mt-1">
            {modelResult.equityIrrPct !== null ? `${modelResult.equityIrrPct}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Project IRR: {modelResult.projectIrrPct !== null ? `${modelResult.projectIrrPct}%` : 'N/A'}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'ارزش خالص فعلی آورده (Equity NPV)' : 'Equity NPV'}
          </div>
          <div className="text-xl font-bold font-mono text-theme-strong mt-1">
            <span data-testid="iranian-equity-npv" data-value={modelResult.equityNpvMillionToman}>{(modelResult.equityNpvMillionToman / 1000).toFixed(1)}</span> <span className="text-xs font-normal text-slate-300">{isFa ? 'میلیارد تومان' : 'Billion Toman'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? `نرخ تنزیل اسمی ${economicPolicy.discountRatePct}٪، تومان` : `${economicPolicy.discountRatePct}% nominal discount, TOMAN`}
            <div data-testid="iranian-project-npv" data-value={modelResult.projectNpvMillionToman}>{isFa?'NPV پروژه پیش از بدهی: ':'Project NPV before debt: '}{modelResult.projectNpvMillionToman.toFixed(6)} {isFa?'میلیون تومان':'million Toman'}</div>
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'دوره بازگشت سرمایه آورده' : 'Equity Simple Payback'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-warning mt-1">
            {modelResult.simplePaybackYears !== null ? (
              <>
                {modelResult.simplePaybackYears} <span className="text-xs font-normal text-slate-300">{isFa ? 'سال' : 'years'}</span>
              </>
            ) : (
              <span className="text-xs font-normal text-amber-400">{isFa ? 'محقق نشد (>۲۵ سال)' : 'Not achieved (>25y)'}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa
              ? `تنزیل‌شده: ${modelResult.discountedPaybackYears !== null ? `${modelResult.discountedPaybackYears} سال` : 'محقق نشد'}`
              : `Discounted: ${modelResult.discountedPaybackYears !== null ? `${modelResult.discountedPaybackYears} yrs` : 'Not achieved'}`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
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
        <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-industrial-success shrink-0" />
          {isFa
            ? 'جدول جریان وجوه نقد سالانه ۲۵ ساله (25-Year Cash Flow & DSCR Matrix)'
            : '25-Year Cash Flow Matrix & Debt Service Coverage Ratio (DSCR)'}
        </h3>

        <p className="text-[10px] text-slate-400 mb-2" data-testid="f04-regulatory-annualization-disclosure">
          {isFa
            ? 'این برآورد صرفاً برون‌یابی مدل ۲۴ ساعته از جمع روزانه گردنشده است، نه پیش‌بینی ۸۷۶۰ ساعته. ردیف‌های تولید سالانه هرکدام مستقل به مگاوات‌ساعت صحیح گرد می‌شوند؛ LCOE از تولید سالانه گردنشده استفاده می‌کند. مدل درآمد و هزینه، مبالغ را به میلیون تومان گرد می‌کند.'
            : 'This illustrative projection extrapolates the unrounded 24-hour daily total, not an 8,760-hour forecast. Annual generation rows are independently rounded to whole MWh; LCOE uses unrounded annual generation. The revenue and cost model rounds amounts to millions of Toman.'}
        </p>
        <div className="overflow-x-auto max-h-[380px] -mx-3 sm:mx-0">
          <table className={`w-full text-xs text-slate-300 min-w-[700px] ${isFa ? 'text-right' : 'text-left'}`}>
            <thead className="bg-industrial-surface text-slate-400 sticky top-0 border-b border-industrial-border">
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
                  <td className="p-2.5 font-bold text-theme-strong">
                    {isFa ? `سال ${cf.year}` : `Yr ${cf.year}`}
                  </td>
                  <td className="p-2.5 text-slate-200" data-testid={`f04-regulatory-generation-year-${cf.year}`}>{cf.generationMwh.toLocaleString()}</td>
                  <td className="p-2.5 text-industrial-success font-bold">{cf.revenueMillionToman.toLocaleString()}</td>
                  <td className="p-2.5 text-slate-400">{cf.opexMillionToman.toLocaleString()}</td>
                  <td className="p-2.5 text-red-300">{cf.debtServiceMillionToman > 0 ? cf.debtServiceMillionToman.toLocaleString() : '-'}</td>
                  <td className="p-2.5 text-sky-300 font-bold">{cf.netCashFlowMillionToman.toLocaleString()}</td>
                  <td className="p-2.5">
                    <span className={cf.cumulativeCashFlowMillionToman >= 0 ? 'text-industrial-success font-bold' : 'text-industrial-error'}>
                      {cf.cumulativeCashFlowMillionToman.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    {cf.dscr !== null ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${cf.dscr >= 1.25 ? 'bg-industrial-success text-industrial-success' : 'bg-slate-800 text-slate-400'}`}>
                        {cf.dscr > 5 ? '> 5.0' : cf.dscr.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">—</span>
                    )}
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
