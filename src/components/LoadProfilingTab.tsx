import React, { useState } from 'react';
import { Plus, Trash2, Zap, Clock, ShieldAlert, Sparkles, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatPsh } from '../engine/formatters';
import {
  type ElectricalLoadItem,
  type LoadCategory,
  LOAD_CATEGORY_LABELS,
  LOAD_PRESETS,
  STANDARD_APPLIANCE_LIBRARY,
  analyzeLoadProfile,
  type LoadAnalysisResult,
  type ClimateDayNightWindow,
  normalizeLoadsToWindow,
} from '../engine/loadProfiles';

interface LoadProfilingTabProps {
  loads: ElectricalLoadItem[];
  onLoadsChange: (loads: ElectricalLoadItem[]) => void;
  analysisResult: LoadAnalysisResult;
  climateWindow?: ClimateDayNightWindow;
  dayCapHours?: number;
  nightCapHours?: number;
  systemMode?: 'powerplant' | 'ongrid' | 'offgrid';
  outageHours?: number;
  peakSunHours?: number;
  lang?: 'fa' | 'en';
}

export const LoadProfilingTab: React.FC<LoadProfilingTabProps> = ({
  loads,
  onLoadsChange,
  analysisResult,
  climateWindow,
  dayCapHours = 9.58,
  nightCapHours = 14.42,
  systemMode = 'ongrid',
  outageHours = 6,
  peakSunHours = 5.35,
  lang = 'fa',
}) => {
  const isFa = lang === 'fa';
  const resolvedDay = climateWindow?.dayCapHours ?? climateWindow?.daylightHoursDesign ?? dayCapHours;
  const resolvedNight = climateWindow?.nightCapHours ?? climateWindow?.nightHoursDesign ?? nightCapHours;
  const dayCap = Number(resolvedDay.toFixed(1));
  const nightCap = Number(resolvedNight.toFixed(1));
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LoadCategory>('lighting');
  const [ratedWatts, setRatedWatts] = useState(100);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [quantity, setQuantity] = useState(1);
  const [dayHours, setDayHours] = useState(Math.min(dayCap, 4));
  const [nightHours, setNightHours] = useState(Math.min(nightCap, 4));
  const [isDc, setIsDc] = useState(false);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = LOAD_PRESETS.find((p) => p.id === presetId);
    if (found) {
      const cloned = JSON.parse(JSON.stringify(found.items));
      const normalized = normalizeLoadsToWindow(cloned, { dayCapHours: dayCap, nightCapHours: nightCap });
      onLoadsChange(normalized.items);
    }
  };

  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const clampedDay = Math.max(0, Math.min(dayCap, Number(dayHours) || 0));
    const clampedNight = Math.max(0, Math.min(nightCap, Number(nightHours) || 0));
    const newItem: ElectricalLoadItem = {
      id: `load-${Date.now()}`,
      name: name.trim() || (isFa ? 'بار جدید' : 'New Appliance'),
      category,
      ratedWatts: Math.max(1, Number(ratedWatts) || 100),
      surgeMultiplier: Math.max(1.0, Number(surgeMultiplier) || 1.0),
      quantity: Math.max(1, Number(quantity) || 1),
      dayHours: clampedDay,
      nightHours: clampedNight,
      isDc: Boolean(isDc),
    };
    onLoadsChange([...loads, newItem]);
    setName('');
    setShowAddForm(false);
  };

  const handleRemoveLoad = (id: string) => {
    onLoadsChange(loads.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ElectricalLoadItem, val: any) => {
    onLoadsChange(
      loads.map((item) => {
        if (item.id === id) {
          let updatedVal = val;
          if (field === 'dayHours') {
            updatedVal = Math.max(0, Math.min(dayCap, parseFloat(val) || 0));
          } else if (field === 'nightHours') {
            updatedVal = Math.max(0, Math.min(nightCap, parseFloat(val) || 0));
          } else if (field === 'ratedWatts') {
            // The project schema requires positive power. Keep edits saveable;
            // users should remove a load rather than retain a zero-watt record.
            updatedVal = Math.max(1, parseFloat(val) || 0);
          } else if (field === 'quantity') {
            updatedVal = Math.max(1, parseInt(val) || 1);
          } else if (field === 'surgeMultiplier') {
            updatedVal = Math.max(1, parseFloat(val) || 1);
          }
          return { ...item, [field]: updatedVal };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Warnings Banner */}
      {analysisResult.warnings && analysisResult.warnings.length > 0 && (
        <div className="p-3 bg-amber-950/40 border border-amber-600/40 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-industrial-warning shrink-0" />
            <span>{isFa ? 'هشدار انطباق با پنجره اقلیمی سایت:' : 'Site Climate Window Alignment Notices:'}</span>
          </div>
          <ul className="list-disc list-inside text-amber-200/90 text-[11px] space-y-0.5">
            {analysisResult.warnings.slice(0, 4).map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'کل مصرف روزانه' : 'Total Daily Energy Consumption'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-warning mt-1">
            {analysisResult.totalDailyEnergyKwh.toFixed(2)} <span className="text-xs font-normal text-slate-300">kWh/day</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {Math.round(analysisResult.totalDailyEnergyWh).toLocaleString()} Wh/{isFa ? 'روز' : 'day'}
          </div>
          <div className="text-[10px] text-sky-400/90 font-mono mt-1">
            {isFa ? `پنجره سایت: روز ${dayCap}h / شب ${nightCap}h` : `Site Window: Day ${dayCap}h / Night ${nightCap}h`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'تفکیک مصرف روز / شب' : 'Day vs Night Split'}
          </div>
          <div className="text-sm font-mono text-slate-200 mt-1">
            {isFa ? 'روز:' : 'Day:'} <span className="text-industrial-accent font-bold">{(analysisResult.daytimeEnergyWh / 1000).toFixed(1)}k</span> | {isFa ? 'شب:' : 'Night:'}{' '}
            <span className="text-indigo-400 font-bold">{(analysisResult.nighttimeEnergyWh / 1000).toFixed(1)}k</span> Wh
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {systemMode === 'ongrid'
              ? (isFa ? `در On-Grid: بار شب مبنای باتری خاموشی (${outageHours}h)` : `On-Grid: Night load drives ${outageHours}h outage BESS`)
              : (isFa ? 'در Off-Grid: کل ۲۴h مبناست؛ شب برای «پوشش شب»' : 'Off-Grid: 24h total sizes BESS; night for Night Coverage')}
          </div>
          <div className="text-[10px] text-amber-400/90 font-mono mt-1">
            {isFa ? `PSH سایت: ${formatPsh(peakSunHours)} kWh/m²/day (مختص PV)` : `Site PSH: ${formatPsh(peakSunHours)} kWh/m²/day (PV Sizing only)`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'توان پیوسته (Worst-case / حاکم)' : 'Continuous Power (Worst-Case / Governing)'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-success mt-1">
            {Math.round(analysisResult.continuousActivePowerWatts).toLocaleString()} <span className="text-xs font-normal text-slate-300">W</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {isFa
              ? `AC: ${Math.round(analysisResult.acContinuousActivePowerWatts)}W | DC: ${Math.round(analysisResult.dcContinuousActivePowerWatts)}W`
              : `AC: ${Math.round(analysisResult.acContinuousActivePowerWatts)}W | DC: ${Math.round(analysisResult.dcContinuousActivePowerWatts)}W`}
          </div>
          <div className="text-[10px] text-emerald-400/90 font-mono mt-1">
            {isFa ? `توان حاکم دوره‌ای: ${Math.round(analysisResult.governingContinuousWatts || analysisResult.continuousActivePowerWatts)}W` : `Governing Period: ${Math.round(analysisResult.governingContinuousWatts || analysisResult.continuousActivePowerWatts)}W`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'توان هجومی (Worst-case Coincident)' : 'Peak Inrush Surge (Worst-Case Coincident)'}
          </div>
          <div className="text-xl font-bold font-mono text-industrial-error mt-1">
            {Math.round(analysisResult.maxSurgePeakPowerWatts).toLocaleString()} <span className="text-xs font-normal text-slate-300">W</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {isFa
              ? `اینورتر AC پیشنهادی: ${Math.round(analysisResult.recommendedInverterPeakSurgeWatts)}W`
              : `Rec. AC Inverter Surge: ${Math.round(analysisResult.recommendedInverterPeakSurgeWatts)}W`}
          </div>
          <div className="text-[10px] text-red-400/90 font-mono mt-1">
            {isFa ? `هجومی حاکم: ${Math.round(analysisResult.governingSurgeWatts || analysisResult.maxSurgePeakPowerWatts)}W` : `Governing Surge: ${Math.round(analysisResult.governingSurgeWatts || analysisResult.maxSurgePeakPowerWatts)}W`}
          </div>
        </div>
      </div>

      {/* Preset Selector & Action Bar */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="w-5 h-5 text-industrial-warning shrink-0" />
            <span className="font-semibold text-xs sm:text-sm text-slate-200">
              {isFa ? 'الگوهای مصرف از پیش‌آماده (Presets):' : 'Predefined Load Presets:'}
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="studio-input text-xs py-1.5 px-3 w-full sm:w-auto max-w-xs"
            >
              <option value="">{isFa ? '-- انتخاب پکیج آماده مصرف --' : '-- Choose a Preset Package --'}</option>
              {LOAD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {isFa ? p.nameFa : p.nameEn}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="studio-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> {isFa ? 'افزودن بار مصرفی جدید' : 'Add New Electrical Load'}
          </button>
        </div>

        {selectedPresetId && (
          <div className="mt-2 text-xs text-industrial-accent/90 bg-sky-950/40 p-2 rounded border border-sky-800/40">
            {isFa
              ? LOAD_PRESETS.find((p) => p.id === selectedPresetId)?.descriptionFa
              : LOAD_PRESETS.find((p) => p.id === selectedPresetId)?.descriptionEn}
          </div>
        )}
      </div>

      {/* Loads Table */}
      <div className="studio-card overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-industrial-accent text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-industrial-warning shrink-0" />
            {isFa ? `لیست تجهیزات و بارهای الکتریکی (${loads.length} مورد)` : `Electrical Appliance Registry (${loads.length} items)`}
          </h3>
        </div>

        {loads.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            {isFa
              ? 'هیچ بار مصرفی تعریف نشده است. از منوی پکیج‌های آماده بالا استفاده کنید یا بارهای خود را اضافه نمایید.'
              : 'No electrical loads defined yet. Select a preset package above or add appliances manually.'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className={`w-full text-xs text-slate-300 min-w-[750px] ${isFa ? 'text-right' : 'text-left'}`}>
              <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
                <tr>
                  <th className="p-2.5">{isFa ? 'نام وسیله برقی' : 'Appliance Name'}</th>
                  <th className="p-2.5">{isFa ? 'دسته‌بندی' : 'Category'}</th>
                  <th className="p-2.5">{isFa ? 'تغذیه (AC/DC)' : 'Bus (AC/DC)'}</th>
                  <th className="p-2.5">{isFa ? 'توان (Watt)' : 'Power (W)'}</th>
                  <th className="p-2.5">{isFa ? 'ضریب هجومی' : 'Surge Multiplier'}</th>
                  <th className="p-2.5">{isFa ? 'تعداد' : 'Qty'}</th>
                  <th className="p-2.5">{isFa ? `ساعات روز (۰ تا ${dayCap})` : `Day (0-${dayCap}h)`}</th>
                  <th className="p-2.5">{isFa ? `ساعات شب (۰ تا ${nightCap})` : `Night (0-${nightCap}h)`}</th>
                  <th className="p-2.5">{isFa ? 'انرژی روزانه (Wh)' : 'Daily Wh'}</th>
                  <th className="p-2.5 text-center">{isFa ? 'عملیات' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loads.map((item) => {
                  const itemAnalysis =
                    analysisResult.itemBreakdown?.[item.id] ||
                    analysisResult.items?.find((i) => i.itemId === item.id);
                  const itemDailyWh =
                    itemAnalysis?.totalDailyEnergyWh ??
                    item.ratedWatts * item.quantity * (item.dayHours + item.nightHours);

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-2.5 font-medium text-theme-strong">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="bg-transparent border-b border-industrial-border focus:border-sky-400 outline-none w-full text-xs text-theme-strong"
                        />
                      </td>
                      <td className="p-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {isFa ? (LOAD_CATEGORY_LABELS[item.category]?.fa || item.category) : (LOAD_CATEGORY_LABELS[item.category]?.en || item.category)}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(item.id, 'isDc', !item.isDc)}
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                            item.isDc
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          }`}
                          title={isFa ? 'کلیک جهت تغییر بین AC و DC' : 'Click to toggle AC / DC'}
                        >
                          {item.isDc ? (isFa ? 'باتری DC' : 'DC Bus') : (isFa ? 'اینورتر AC' : 'AC Inverter')}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={item.ratedWatts}
                          onChange={(e) => handleUpdateItem(item.id, 'ratedWatts', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-industrial-surface border border-industrial-border rounded px-1.5 py-0.5 text-xs text-industrial-success font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.1"
                          value={item.surgeMultiplier}
                          onChange={(e) => handleUpdateItem(item.id, 'surgeMultiplier', parseFloat(e.target.value) || 1)}
                          className="w-14 bg-industrial-surface border border-industrial-border rounded px-1.5 py-0.5 text-xs text-red-300 font-mono"
                        />
                        {item.surgeMultiplier > 2.0 && (
                          <span className="text-[10px] text-industrial-error mx-1" title={isFa ? 'بار موتوری هجومی' : 'Inductive Surge Load'}>⚡</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-12 bg-industrial-surface border border-industrial-border rounded px-1.5 py-0.5 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={dayCap}
                          value={item.dayHours}
                          onChange={(e) => handleUpdateItem(item.id, 'dayHours', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-industrial-surface border border-industrial-border rounded px-1.5 py-0.5 text-xs text-industrial-accent font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={nightCap}
                          value={item.nightHours}
                          onChange={(e) => handleUpdateItem(item.id, 'nightHours', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-industrial-surface border border-industrial-border rounded px-1.5 py-0.5 text-xs text-indigo-400 font-mono"
                        />
                      </td>
                      <td className="p-2.5 font-mono text-industrial-warning font-bold">
                        {Math.round(itemDailyWh).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveLoad(item.id)}
                          className="text-slate-500 hover:text-industrial-error p-1"
                          title={isFa ? 'حذف' : 'Remove'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Load Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-industrial-surface border border-industrial-border rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-industrial-accent text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-industrial-success" />
              {isFa ? 'تعریف بار الکتریکی مصرف‌کننده جدید' : 'Add New Electrical Appliance'}
            </h3>

            <form onSubmit={handleAddLoad} className="space-y-3 text-xs">
              {/* Predefined Appliance Template Picker */}
              <div>
                <label htmlFor="load-standard-template-picker" className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'انتخاب از تجهیزات استاندارد (الگوی آماده):' : 'Standard Appliance Template:'}
                </label>
                <select
                  id="load-standard-template-picker"
                  onChange={(e) => {
                    const idx = parseInt(e.target.value);
                    if (!isNaN(idx) && STANDARD_APPLIANCE_LIBRARY[idx]) {
                      const app = STANDARD_APPLIANCE_LIBRARY[idx];
                      setName(isFa ? app.nameFa : app.nameEn);
                      setCategory(app.category);
                      setRatedWatts(app.ratedWatts);
                      setSurgeMultiplier(app.surgeMultiplier);
                      setDayHours(Math.min(dayCap, app.typicalDayHours));
                      setNightHours(Math.min(nightCap, app.typicalNightHours));
                      setIsDc(Boolean(app.isDc));
                    }
                  }}
                  className="studio-input"
                  defaultValue=""
                >
                  <option value="">{isFa ? '-- بار سفارشی یا انتخاب از لیست --' : '-- Custom or Choose Template --'}</option>
                  {STANDARD_APPLIANCE_LIBRARY.map((app, idx) => (
                    <option key={idx} value={idx}>
                      {isFa ? app.nameFa : app.nameEn} ({app.ratedWatts}W - {LOAD_CATEGORY_LABELS[app.category]?.fa || app.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="load-appliance-name" className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'نام وسیله برقی:' : 'Appliance Name:'}
                </label>
                <input
                  id="load-appliance-name"
                  type="text"
                  required
                  placeholder={isFa ? 'مثال: یخچال، پمپ آب، اسپلیت' : 'e.g. Refrigerator, Pump, AC'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="studio-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="load-category-select" className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'دسته‌بندی:' : 'Category:'}
                  </label>
                  <select
                    id="load-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LoadCategory)}
                    className="studio-input"
                  >
                    {(Object.keys(LOAD_CATEGORY_LABELS) as LoadCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {isFa ? LOAD_CATEGORY_LABELS[cat].fa : LOAD_CATEGORY_LABELS[cat].en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="load-quantity-input" className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'تعداد:' : 'Quantity:'}
                  </label>
                  <input
                    id="load-quantity-input"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="studio-input"
                  />
                </div>
              </div>

              {/* DC Load Toggle */}
              <div className="flex items-center gap-2 p-2 bg-slate-900/60 rounded border border-industrial-border">
                <input
                  id="load-is-dc-checkbox"
                  type="checkbox"
                  checked={isDc}
                  onChange={(e) => setIsDc(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
                />
                <label htmlFor="load-is-dc-checkbox" className="text-slate-200 text-xs font-semibold cursor-pointer">
                  {isFa
                    ? 'بار ولتاژ مستقیم DC (اتصال به باس باتری، بدون نیاز به اینورتر AC)'
                    : 'DC Load (Direct Battery Bus, Bypasses AC Inverter)'}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="load-rated-watts-input" className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'توان نامی (Watt):' : 'Rated Power (W):'}
                  </label>
                  <input
                    id="load-rated-watts-input"
                    type="number"
                    min="1"
                    value={ratedWatts}
                    onChange={(e) => setRatedWatts(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
                <div>
                  <label htmlFor="load-surge-multiplier-input" className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'ضریب استارت هجومی:' : 'Surge Multiplier:'}
                  </label>
                  <input
                    id="load-surge-multiplier-input"
                    type="number"
                    step="0.1"
                    min="1"
                    value={surgeMultiplier}
                    onChange={(e) => setSurgeMultiplier(parseFloat(e.target.value) || 1)}
                    className="studio-input"
                  />
                  <span className="text-[10px] text-slate-400">
                    {isFa ? 'روشنایی=۱، پمپ=۳ الی ۵' : 'Resistive=1, Motors=3-5'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="load-day-hours-input" className="block text-slate-300 font-semibold mb-1">
                    {isFa ? `ساعات روز (۰ تا ${dayCap}):` : `Day Operation (0-${dayCap}h):`}
                  </label>
                  <input
                    id="load-day-hours-input"
                    type="number"
                    step="0.5"
                    min="0"
                    max={dayCap}
                    value={dayHours}
                    onChange={(e) => setDayHours(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
                <div>
                  <label htmlFor="load-night-hours-input" className="block text-slate-300 font-semibold mb-1">
                    {isFa ? `ساعات شب (۰ تا ${nightCap}):` : `Night Operation (0-${nightCap}h):`}
                  </label>
                  <input
                    id="load-night-hours-input"
                    type="number"
                    step="0.5"
                    min="0"
                    max={nightCap}
                    value={nightHours}
                    onChange={(e) => setNightHours(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
              </div>

              <div className="text-[11px] text-sky-400 bg-sky-950/40 p-2 rounded border border-sky-800/40">
                {isFa
                  ? `طول روز خورشیدی سایت: ${dayCap} ساعت | طول شب: ${nightCap} ساعت | PSH اوج تابش: ${formatPsh(peakSunHours)} kWh/m²/day (ساعات روز دیواری ≠ PSH)`
                  : `Site Design Daylight: ${dayCap}h | Night: ${nightCap}h | Peak Sun Hours: ${formatPsh(peakSunHours)} kWh/m²/day (Wall clock daylight ≠ PSH)`}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-industrial-border">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="studio-btn-secondary text-xs"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button type="submit" className="studio-btn-primary text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {isFa ? 'افزودن به لیست' : 'Add Appliance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
