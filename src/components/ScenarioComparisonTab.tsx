import React from 'react';
import { GitCompare, CheckCircle2, XCircle, Award, Shield, AlertTriangle } from 'lucide-react';
import { type ScenarioDetails } from '../engine/scenarioEngine';

interface ScenarioComparisonTabProps {
  scenarios: ScenarioDetails[];
  peakSunHours?: number;
  lang?: 'fa' | 'en';
}

export const ScenarioComparisonTab: React.FC<ScenarioComparisonTabProps> = ({ scenarios, peakSunHours, lang = 'fa' }) => {
  const isFa = lang === 'fa';
  const isUnsizable = scenarios.length === 0 || scenarios.every((s) => s.pvCapacityKwp <= 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-lg sm:text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-purple-400 shrink-0" />
          {isFa
            ? 'مقایسه هوشمند سناریوهای طراحی (Scenario Comparison Engine)'
            : 'Comparative Engineering Scenarios & Multi-Criteria Trade-offs'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isFa
            ? 'مقایسه بلادرنگ ۳ سناریوی مهندسی مختلف برای پروژه: سیستم بهینه پیشنهادی، سیستم اقتصادی کم‌هزینه و پیش‌فرض صنعتی با ظرفیت افزوده'
            : 'Multi-scenario techno-economic trade-off analysis comparing optimized LiFePO4, economical lead-acid, and an unassessed higher-capacity industrial preset.'}
        </p>
      </div>

      <div role="note" data-testid="scenario-lcoe-method" className="studio-card text-xs text-slate-400">
        {isFa
          ? 'LCOE سناریو یک غربالگری بدون مالیات و بدهی با هزینه‌های دلاری و مبنای اسمی ثابت است؛ ذخیرهٔ ارزش فعلی تعویض باتری در CAPEX منظور شده است. انرژی، تقریب تولید است نه انرژی تحویلی یا تأمین‌شدهٔ تأییدشده. مقدار ناموجود با صفرِ هزینه یکسان نیست. گرد کردن فقط برای نمایش است؛ انطباق مفروضات و صلاحیت مالی تأیید نشده است.'
          : 'Scenario LCOE is a pre-tax, unlevered USD screening estimate under a flat nominal-cost assumption; a present-value battery replacement reserve is included in CAPEX. Energy is an illustrative generation proxy, not assessed delivered/served energy. Unavailable is distinct from genuinely zero cost. Rounding is display-only; assumption applicability and financial eligibility are not established.'}
      </div>

      <p role="note" data-testid="scenario-assessment-limits" className="studio-card text-xs">{isFa?'تمام سناریوها پیش‌فرض فرضی‌اند؛ احتمال تأمین، افت ولتاژ، افزونگی، ایمنی آتش و حفاظت صاعقه ارزیابی نشده‌اند. طول عمر و هزینه‌ها مفروض‌اند، نه ضمانت یا رتبه‌بندی مهندسی.':'All scenarios are illustrative presets. Availability, cable drop, redundancy, fire safety and lightning protection are not assessed. Lifetime and cost values are assumptions, not warranties or an engineered ranking.'}</p>
      {/* Unsizable Banner if pvCapacityKwp === 0 */}
      {isUnsizable && (
        <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-lg text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {isFa
              ? 'سایت به دلیل تابش صفر یا مختصات نامعتبر غیرقابل طراحی (Unsizable) است. خروجی سناریوها روی صفر تنظیم شده است.'
              : 'Site is physically unsizable due to non-positive solar irradiance (PSH ≤ 0) or invalid coordinates. Scenario capacities and yields default to zero.'}
          </span>
        </div>
      )}

      {peakSunHours !== undefined && peakSunHours > 0 && peakSunHours < 1 && (
        <div role="note" className="p-3 bg-amber-500/10 border border-amber-500/35 rounded-lg text-xs text-amber-200">
          {isFa
            ? 'PSH پایین: تقریب تولید از مقدار مثبت ورودی بدون کف ۱ استفاده می‌کند؛ قابلیت تأمین بار و انطباق با سایت همچنان ارزیابی نشده‌اند.'
            : 'Low PSH: the generation proxy uses the supplied positive value without a 1.0 floor; load service and site applicability remain unassessed.'}
        </div>
      )}

      {/* 3 Scenario Cards */}
      {!isUnsizable && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((sc, idx) => {
          const isOptimized = sc.id === 'optimized_lifepo4';
          const isIndustrial = sc.id === 'industrial_redundant';
          return (
            <div
              key={sc.id}
              data-testid={`scenario-card-${sc.id}`}
              data-pv-kwp={sc.pvCapacityKwp}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isOptimized
                  ? 'bg-industrial-surface/90 border-sky-400 ring-1 ring-sky-400/50'
                  : isIndustrial
                  ? 'bg-industrial-surface/80 border-purple-500/70'
                  : 'bg-industrial-surface/80 border-industrial-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isFa ? `سناریوی ${idx + 1}` : `Scenario ${idx + 1}`}
                  </span>
                  {isOptimized && (
                    <span className="text-[10px] bg-sky-950 text-industrial-accent border border-sky-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" /> {isFa ? 'پیش‌فرض لیتیوم' : 'Lithium preset'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-theme-strong text-sm mb-1">{isFa ? sc.titleFa : sc.titleEn}</h3>
                <p className="text-xs text-slate-400 mb-3">{isFa ? sc.descriptionFa : sc.descriptionEn}</p>

                <div className="space-y-2 text-xs border-t border-b border-industrial-border py-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'سرمایه‌گذاری اولیه:' : 'Initial CAPEX:'}</span>
                    <strong className="text-theme-strong font-mono">
                      ${sc.initialCapexUsd.toLocaleString()} {isFa ? `(${(sc.initialCapexToman / 1_000_000).toFixed(0)} م.ت)` : ''}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'هزینه مالکیت ۲۵ ساله (TCO):' : '25-Year TCO:'}</span>
                    <strong className={isOptimized ? 'text-industrial-success font-mono' : 'text-slate-200 font-mono'}>
                      ${sc.tco25yUsd.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'طول عمر مفید باتری:' : 'BESS Lifespan:'}</span>
                    <strong className="text-sky-300 font-mono">{sc.bessLifespanYears} {isFa ? 'سال' : 'years'}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'وزن کل تجهیزات سیستم:' : 'System Weight:'}</span>
                    <strong className="text-slate-300 font-mono">{sc.totalSystemWeightKg} {isFa ? 'کیلوگرم' : 'kg'}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'قابلیت تأمین بار:' : 'Service availability:'}</span>
                    <strong data-testid={`scenario-reliability-${sc.id}`} className="text-teal-400 font-mono">
                      {isFa ? 'ارزیابی‌نشده' : 'Not assessed'}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span>{isFa?'تقریب تولید سال اول:':'First-year generation proxy:'}</span>
                    <strong data-testid={`scenario-energy-${sc.id}`} data-raw-kwh={sc.firstYearGenerationProxyKwh}>{sc.firstYearGenerationProxyKwh.toFixed(1)} kWh</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'بهای تمام‌شده انرژی (LCOE):' : 'LCOE:'}</span>
                    <strong data-testid={`scenario-lcoe-${sc.id}`} data-assessment={sc.lcoeAssessment.status} data-raw-lcoe={sc.lcoeUsdPerKwh ?? 'unavailable'} className="text-industrial-warning font-mono">
                      {sc.lcoeAssessment.status === 'available' && sc.lcoeUsdPerKwh !== null
                        ? `$${sc.lcoeUsdPerKwh.toFixed(4)}/kWh`
                        : (isFa ? 'در دسترس نیست (ورودی نامعتبر یا تولید صفر)' : 'Unavailable (invalid or zero generation)')}
                    </strong>
                  </div>
                </div>

                {/* Advantages */}
                <div className="mb-2">
                  <span className="text-[11px] font-bold text-industrial-success block mb-1">
                    {isFa ? 'مفروضات و ملاحظات:' : 'Assumptions & considerations:'}
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {(isFa ? sc.advantagesFa : sc.advantagesEn).map((adv, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-industrial-success shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Disadvantages */}
                <div>
                  <span className="text-[11px] font-bold text-industrial-error block mb-1">
                    {isFa ? 'محدودیت‌ها و ملاحظات:' : 'Limitations & Considerations:'}
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {(isFa ? sc.disadvantagesFa : sc.disadvantagesEn).map((dis, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-industrial-warning shrink-0 mt-0.5" />
                        <span>{dis}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
