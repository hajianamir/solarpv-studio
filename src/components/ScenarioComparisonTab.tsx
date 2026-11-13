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
            ? 'مقایسه بلادرنگ ۳ سناریوی مهندسی مختلف برای پروژه: سیستم بهینه پیشنهادی، سیستم اقتصادی کم‌هزینه و سیستم فوق‌پایدار صنعتی'
            : 'Multi-scenario techno-economic trade-off analysis comparing optimized LiFePO4, economical lead-acid, and redundant industrial BESS.'}
        </p>
      </div>

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
            ? 'محدودیت PSH پایین: engine سناریو برای PSH مثبت کمتر از ۱، کف ۱٫۰ اعمال می‌کند؛ این رفتار فعلی حفظ شده و خروجی با سایزینگ آرایه که از PSH واقعی استفاده می‌کند یکسان نیست.'
            : 'Low-PSH limitation: the scenario engine currently floors positive PSH below 1.0 to 1.0. This behavior is preserved; scenario yield does not match array sizing, which uses actual PSH.'}
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
                      <Award className="w-3 h-3" /> {isFa ? 'گزینه پیشنهادی' : 'Recommended'}
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
                    <span className="text-slate-400">{isFa ? 'ضریب اطمینان پایداری:' : 'Reliability Index:'}</span>
                    <strong className="text-teal-400 font-mono">
                      {sc.pvCapacityKwp > 0 ? `${sc.reliabilityIndexPct}%` : (isFa ? 'ارزیابی‌نشده' : 'Not assessed')}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'بهای تمام‌شده انرژی (LCOE):' : 'LCOE:'}</span>
                    <strong className="text-industrial-warning font-mono">
                      {sc.pvCapacityKwp > 0 && sc.lcoeUsdPerKwh > 0
                        ? `$${sc.lcoeUsdPerKwh.toFixed(4)}/kWh`
                        : (isFa ? 'تعریف‌نشده (تولید صفر)' : 'N/A (Unsizable)')}
                    </strong>
                  </div>
                </div>

                {/* Advantages */}
                <div className="mb-2">
                  <span className="text-[11px] font-bold text-industrial-success block mb-1">
                    {isFa ? 'نقاط قوت و مزایا:' : 'Strengths & Advantages:'}
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
