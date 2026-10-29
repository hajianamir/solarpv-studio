import React, { useState } from 'react';
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  X,
  Cpu,
  Layers,
  Thermometer,
  CloudRain,
  Recycle,
  Zap,
  Hammer,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { useFeatureFlags } from '../engine/core/FeatureFlagContext';
import { FEATURE_FLAG_METADATA, AdvancedFeatureFlags } from '../engine/core/featureFlags';
import { runSystemCrossValidation, SystemValidationReport } from '../engine/core/benchmarks/crossValidation';
import { PHYSICS_MODEL_REGISTRY, ModelSemverEntry } from '../engine/core/modelRegistry';

interface AdvancedFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'fa' | 'en';
}

export const AdvancedFeaturesModal: React.FC<AdvancedFeaturesModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const { flags, setFlag, setAllFlags, resetFlags, activeCount } = useFeatureFlags();
  const [activeTab, setActiveTab] = useState<'flags' | 'validation' | 'registry'>('flags');
  const [validationReport, setValidationReport] = useState<SystemValidationReport | null>(null);
  const [isRunningValidation, setIsRunningValidation] = useState(false);

  if (!isOpen) return null;

  const handleRunValidation = () => {
    setIsRunningValidation(true);
    setTimeout(() => {
      const report = runSystemCrossValidation();
      setValidationReport(report);
      setIsRunningValidation(false);
    }, 150);
  };

  const pillarIcons: Record<string, React.ReactNode> = {
    'Phase 2a': <Thermometer className="w-4 h-4 text-orange-400" />,
    'Phase 2b': <Recycle className="w-4 h-4 text-emerald-400" />,
    'Phase 3a': <Zap className="w-4 h-4 text-amber-400" />,
    'Phase 3b': <Hammer className="w-4 h-4 text-indigo-400" />,
  };

  // Group metadata by phase
  const groupedFlags = Object.entries(FEATURE_FLAG_METADATA).reduce<
    Record<string, Array<{ key: keyof AdvancedFeatureFlags; meta: (typeof FEATURE_FLAG_METADATA)[keyof AdvancedFeatureFlags] }>>
  >((acc, [k, meta]) => {
    const key = k as keyof AdvancedFeatureFlags;
    const pillar = meta.phase;
    if (!acc[pillar]) acc[pillar] = [];
    acc[pillar].push({ key, meta });
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {lang === 'fa' ? 'مدیریت قابلیت‌های پیشرفته مهندسی و اعتبارسنجی' : 'Advanced Engineering & Validation Suite'}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RFC 3.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === 'fa'
                  ? 'مدل‌های فیزیکی، تاب‌آوری، پایداری، ژئوتکنیک و همگرایی با استانداردهای NREL، DNV و IEEE'
                  : 'Physics models, climate resilience, LCA, geotechnics & benchmark validation (NREL, DNV, IEEE)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {activeCount} / {Object.keys(FEATURE_FLAG_METADATA).length} {lang === 'fa' ? 'فعال' : 'Active'}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title={lang === 'fa' ? 'بستن' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 bg-slate-950/60 border-b border-slate-800/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('flags')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'flags'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'fa' ? 'ویژگی‌ها و پرچم‌ها (Feature Flags)' : 'Engineering Feature Flags'}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('validation');
              if (!validationReport) handleRunValidation();
            }}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'validation'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>{lang === 'fa' ? 'گواهی اعتبارسنجی (Cross-Validation)' : 'Validation Benchmark'}</span>
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'registry'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{lang === 'fa' ? 'رجیستری مدل‌های فیزیکی' : 'Model Registry'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: FEATURE FLAGS */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {lang === 'fa'
                      ? 'تمامی قابلیت‌های پیشرفته بر پایه سازگاری با عقب هستند. فعال‌سازی آنها دقت محاسبات را به سطح مهندسی تفصیلی ارتقا می‌دهد.'
                      : 'All advanced features are strictly backward compatible. Activating them upgrades precision to bankable detail.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allOn = Object.keys(FEATURE_FLAG_METADATA).reduce<AdvancedFeatureFlags>((acc, k) => {
                        acc[k as keyof AdvancedFeatureFlags] = true;
                        return acc;
                      }, {} as AdvancedFeatureFlags);
                      setAllFlags(allOn);
                    }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 transition"
                  >
                    {lang === 'fa' ? 'فعال‌سازی همه' : 'Enable All'}
                  </button>
                  <button
                    onClick={resetFlags}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'fa' ? 'بازنشانی پیش‌فرض' : 'Reset'}</span>
                  </button>
                </div>
              </div>

              {/* Grouped Pillars */}
              <div className="space-y-5">
                {Object.entries(groupedFlags).map(([pillar, items]) => (
                  <div key={pillar} className="bg-slate-950/50 border border-slate-800/80 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        {pillarIcons[pillar] || <Layers className="w-4 h-4 text-slate-400" />}
                        <span>{pillar}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {items.filter(i => flags[i.key]).length}/{items.length} {lang === 'fa' ? 'فعال' : 'Active'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-800/60">
                      {items.map(({ key, meta }) => {
                        const isActive = flags[key];
                        return (
                          <div
                            key={key}
                            className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-900/60 transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {lang === 'fa' ? meta.titleFa : meta.titleEn}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  {meta.standards.join(', ')}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {lang === 'fa' ? meta.descriptionFa : meta.descriptionEn}
                              </p>
                            </div>

                            <button
                              onClick={() => setFlag(key, !isActive)}
                              className={`shrink-0 w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                                isActive ? 'bg-indigo-600' : 'bg-slate-700'
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                  isActive ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SYSTEM CROSS-VALIDATION */}
          {activeTab === 'validation' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'fa' ? 'گواهی تطابق و اعتبارسنجی مقایسه‌ای' : 'Benchmark Cross-Validation Certificate'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lang === 'fa'
                      ? 'مقایسه خروجی‌های محاسباتی با بردارهای طلایی NREL SAM, Sandia, DNV, IEA-PVPS و IEEE 2800'
                      : 'Comparison of computed algorithms against golden vectors from NREL SAM, Sandia, DNV, IEA-PVPS & IEEE 2800'}
                  </p>
                </div>
                <button
                  onClick={handleRunValidation}
                  disabled={isRunningValidation}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg disabled:opacity-50 transition"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunningValidation ? 'animate-spin' : ''}`} />
                  <span>{lang === 'fa' ? 'اجرای آزمون‌های اعتبارسنجی' : 'Re-Run Suite'}</span>
                </button>
              </div>

              {validationReport && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                      <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'وضعیت نهایی' : 'Overall Status'}</div>
                      <div className="text-sm font-black text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{validationReport.overallStatus}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                      <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'تست‌های موفق' : 'Passed Tests'}</div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        {validationReport.testsPassed} / {validationReport.testsRun}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                      <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'بیشترین انحراف' : 'Max Error'}</div>
                      <div className="text-sm font-mono font-bold text-sky-400 mt-1">
                        {validationReport.maxDiscrepancyPercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                      <div className="text-[11px] text-slate-400">{lang === 'fa' ? 'کد ردگیری' : 'Trace ID'}</div>
                      <div className="text-[10px] font-mono text-slate-300 mt-1 truncate">
                        {validationReport.traceId.slice(0, 13)}...
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-950 text-slate-400 text-[11px] font-mono">
                        <tr>
                          <th className="p-3">{lang === 'fa' ? 'آزمون و مرجع' : 'Metric & Standard'}</th>
                          <th className="p-3 text-right">{lang === 'fa' ? 'مقدار طلایی' : 'Nominal'}</th>
                          <th className="p-3 text-right">{lang === 'fa' ? 'محاسبه شده' : 'Computed'}</th>
                          <th className="p-3 text-right">{lang === 'fa' ? 'انحراف (%)' : 'Error (%)'}</th>
                          <th className="p-3 text-center">{lang === 'fa' ? 'تلرانس مجاز' : 'Tolerance'}</th>
                          <th className="p-3 text-center">{lang === 'fa' ? 'نتیجه' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono text-[11px]">
                        {validationReport.metrics.map(m => (
                          <tr key={m.testId} className="hover:bg-slate-800/40">
                            <td className="p-3 font-sans">
                              <div className="font-bold text-slate-200">{m.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{m.sourceStandard}</div>
                            </td>
                            <td className="p-3 text-right text-slate-300">{m.nominalValue} {m.unit}</td>
                            <td className="p-3 text-right text-emerald-400 font-bold">{m.calculatedValue} {m.unit}</td>
                            <td className="p-3 text-right font-bold text-sky-300">{m.relativeErrorPercent.toFixed(2)}%</td>
                            <td className="p-3 text-center text-slate-400">&plusmn;{m.tolerancePercent}%</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.status === 'PASS'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}>
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Notes */}
                  <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs font-bold text-slate-300">{lang === 'fa' ? 'نکات فنی تطابق استانداردی:' : 'Standard Compliance Notes:'}</div>
                    <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-0.5">
                      {validationReport.complianceNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PHYSICAL MODEL REGISTRY */}
          {activeTab === 'registry' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>{lang === 'fa' ? 'رجیستری مدل‌های فیزیکی نسخه‌بندی‌شده' : 'Physical Model Versioning & SemVer Registry'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'fa'
                    ? 'هر مدل به صورت مستقل با شماره نسخه SemVer، مراجع دانشگاهی و دامنه اعتبار مشخص ثبت شده است.'
                    : 'Each physical model is decoupled with dedicated SemVer versioning, academic citations, and validity domains.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(PHYSICS_MODEL_REGISTRY).map(([id, item]: [string, ModelSemverEntry]) => (
                  <div key={id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        v{item.version}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-slate-500 font-bold">{lang === 'fa' ? 'مرجع: ' : 'Citation: '}</span>
                      {item.referenceLiterature}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span className="text-slate-500 font-bold">{lang === 'fa' ? 'استانداردها: ' : 'Standards: '}</span>
                      {item.governingStandards.join(', ')}
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      {item.validityBoundaries[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            {lang === 'fa'
              ? 'تغییرات به صورت خودکار در مرورگر ذخیره و در پروژه‌های V3 جاسازی می‌شوند.'
              : 'Changes are auto-persisted to browser storage and embedded in V3 projects.'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg"
          >
            {lang === 'fa' ? 'بستن و ذخیره تنظیمات' : 'Close & Apply'}
          </button>
        </div>

      </div>
    </div>
  );
};
