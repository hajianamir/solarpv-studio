import React from 'react';
import { GitCompare, CheckCircle2, XCircle, Award, Shield, AlertTriangle } from 'lucide-react';
import { ScenarioDetails } from '../engine/scenarioEngine';

interface ScenarioComparisonTabProps {
  scenarios: ScenarioDetails[];
}

export const ScenarioComparisonTab: React.FC<ScenarioComparisonTabProps> = ({ scenarios }) => {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-purple-400" />
          مقایسه هوشمند سناریوهای طراحی (Scenario Comparison Engine)
        </h1>
        <p className="text-slate-400 text-xs">
          مقایسه بلادرنگ ۳ سناریوی مهندسی مختلف برای پروژه: سیستم بهینه پیشنهادی، سیستم اقتصادی کم‌هزینه و سیستم فوق‌پایدار صنعتی
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
                    سناریوی {idx + 1}
                  </span>
                  {isOptimized && (
                    <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Award className="w-3 h-3" /> گزینه پیشنهادی
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-white text-sm mb-1">{sc.titleFa}</h3>
                <p className="text-xs text-slate-400 mb-3">{sc.descriptionFa}</p>

                <div className="space-y-2 text-xs border-t border-b border-slate-800 py-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">سرمایه‌گذاری اولیه:</span>
                    <strong className="text-white font-mono">
                      ${sc.initialCapexUsd.toLocaleString()} ({(sc.initialCapexToman / 1_000_000).toFixed(0)} م.ت)
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">هزینه مالکیت ۲۵ ساله (TCO):</span>
                    <strong className={isOptimized ? 'text-emerald-400 font-mono' : 'text-slate-200 font-mono'}>
                      ${sc.tco25yUsd.toLocaleString()}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">طول عمر مفید باتری:</span>
                    <strong className="text-sky-300 font-mono">{sc.bessLifespanYears} سال</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">وزن کل تجهیزات سیستم:</span>
                    <strong className="text-slate-300 font-mono">{sc.totalSystemWeightKg} کیلوگرم</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">ضریب اطمینان پایداری:</span>
                    <strong className="text-teal-400 font-mono">{sc.reliabilityIndexPct}%</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">بهای تمام‌شده انرژی (LCOE):</span>
                    <strong className="text-amber-400 font-mono">${sc.lcoeUsdPerKwh.toFixed(4)}/kWh</strong>
                  </div>
                </div>

                {/* Advantages */}
                <div className="mb-2">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-1">نقاط قوت و مزایا:</span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {sc.advantagesFa.map((adv, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Disadvantages */}
                <div>
                  <span className="text-[11px] font-bold text-red-400 block mb-1">محدودیت‌ها و ملاحظات:</span>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {sc.disadvantagesFa.map((dis, i) => (
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
