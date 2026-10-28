import React from 'react';
import { GitCompare, CheckCircle2, XCircle, Award, Shield, AlertTriangle } from 'lucide-react';
import { ScenarioDetails } from '../engine/scenarioEngine';

interface ScenarioComparisonTabProps {
  scenarios: ScenarioDetails[];
  lang?: 'fa' | 'en';
}

export const ScenarioComparisonTab: React.FC<ScenarioComparisonTabProps> = ({ scenarios, lang = 'fa' }) => {
  const isFa = lang === 'fa';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-lg sm:text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
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

      {/* 3 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((sc, idx) => {
          const isOptimized = sc.id === 'optimized_lifepo4';
          const isIndustrial = sc.id === 'industrial_redundant';
          return (
            <div
              key={sc.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isOptimized
                  ? 'bg-slate-900/90 border-sky-400 shadow-lg ring-1 ring-sky-400/50'
                  : isIndustrial
                  ? 'bg-slate-900/80 border-purple-500/70'
                  : 'bg-slate-900/80 border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isFa ? `سناریوی ${idx + 1}` : `Scenario ${idx + 1}`}
                  </span>
                  {isOptimized && (
                    <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" /> {isFa ? 'گزینه پیشنهادی' : 'Recommended'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-sm mb-1">{isFa ? sc.titleFa : sc.titleEn}</h3>
                <p className="text-xs text-slate-400 mb-3">{isFa ? sc.descriptionFa : sc.descriptionEn}</p>

                <div className="space-y-2 text-xs border-t border-b border-slate-800 py-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'سرمایه‌گذاری اولیه:' : 'Initial CAPEX:'}</span>
                    <strong className="text-white font-mono">
                      ${sc.initialCapexUsd.toLocaleString()} {isFa ? `(${(sc.initialCapexToman / 1_000_000).toFixed(0)} م.ت)` : ''}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'هزینه مالکیت ۲۵ ساله (TCO):' : '25-Year TCO:'}</span>
                    <strong className={isOptimized ? 'text-emerald-400 font-mono' : 'text-slate-200 font-mono'}>
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
                    <strong className="text-teal-400 font-mono">{sc.reliabilityIndexPct}%</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{isFa ? 'بهای تمام‌شده انرژی (LCOE):' : 'LCOE:'}</span>
                    <strong className="text-amber-400 font-mono">${sc.lcoeUsdPerKwh.toFixed(4)}/kWh</strong>
                  </div>
                </div>

                {/* Advantages */}
                <div className="mb-2">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                    {isFa ? 'نقاط قوت و مزایا:' : 'Strengths & Advantages:'}
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {(isFa ? sc.advantagesFa : sc.advantagesEn).map((adv, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Disadvantages */}
                <div>
                  <span className="text-[11px] font-bold text-red-400 block mb-1">
                    {isFa ? 'محدودیت‌ها و ملاحظات:' : 'Limitations & Considerations:'}
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {(isFa ? sc.disadvantagesFa : sc.disadvantagesEn).map((dis, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
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
    </div>
  );
};
