import React, { useState } from 'react';
import { Plus, Trash2, Zap, Clock, ShieldAlert, Sparkles, Check, RotateCcw } from 'lucide-react';
import {
  ElectricalLoadItem,
  LoadCategory,
  LOAD_CATEGORY_LABELS,
  LOAD_PRESETS,
  STANDARD_APPLIANCE_LIBRARY,
  analyzeLoadProfile,
  LoadAnalysisResult,
} from '../engine/loadProfiles';

interface LoadProfilingTabProps {
  loads: ElectricalLoadItem[];
  onLoadsChange: (loads: ElectricalLoadItem[]) => void;
  analysisResult: LoadAnalysisResult;
}

export const LoadProfilingTab: React.FC<LoadProfilingTabProps> = ({
  loads,
  onLoadsChange,
  analysisResult,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New item form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LoadCategory>('lighting');
  const [ratedWatts, setRatedWatts] = useState(100);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0);
  const [quantity, setQuantity] = useState(1);
  const [dayHours, setDayHours] = useState(4);
  const [nightHours, setNightHours] = useState(4);
  const [isDc, setIsDc] = useState(false);

  const handleApplyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = LOAD_PRESETS.find((p) => p.id === presetId);
    if (found) {
      onLoadsChange(JSON.parse(JSON.stringify(found.items)));
    }
  };

  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: ElectricalLoadItem = {
      id: `load-${Date.now()}`,
      name: name.trim() || 'بار جدید',
      category,
      ratedWatts: Number(ratedWatts),
      surgeMultiplier: Number(surgeMultiplier),
      quantity: Number(quantity),
      dayHours: Number(dayHours),
      nightHours: Number(nightHours),
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
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">کل مصرف روزانه</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {analysisResult.totalDailyEnergyKwh.toFixed(2)} <span className="text-xs font-normal text-slate-300">kWh/day</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {Math.round(analysisResult.totalDailyEnergyWh).toLocaleString()} Wh/روز
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">تفکیک مصرف روز / شب</div>
          <div className="text-sm font-mono text-slate-200 mt-1">
            روز: <span className="text-sky-400 font-bold">{(analysisResult.daytimeEnergyWh / 1000).toFixed(1)}k</span> | شب:{' '}
            <span className="text-indigo-400 font-bold">{(analysisResult.nighttimeEnergyWh / 1000).toFixed(1)}k</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            بار شب جهت سایزینگ بانک باتری
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">توان پیوسته اکتیو</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {Math.round(analysisResult.continuousActivePowerWatts).toLocaleString()} <span className="text-xs font-normal text-slate-300">W</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            مجموع توان همزمان تجهیزات
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">حداکثر توان هجومی (Surge)</div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {Math.round(analysisResult.maxSurgePeakPowerWatts).toLocaleString()} <span className="text-xs font-normal text-slate-300">W</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            بر مبنای ضریب همزمانی موتورها
          </div>
        </div>
      </div>

      {/* Preset Selector & Action Bar */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm text-slate-200">الگوهای مصرف از پیش‌آماده (Presets):</span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleApplyPreset(e.target.value)}
              className="studio-input text-xs py-1.5 px-3 w-auto max-w-xs"
            >
              <option value="">-- انتخاب پکیج آماده مصرف --</option>
              {LOAD_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameFa}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="studio-btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <Plus className="w-4 h-4" /> افزودن بار مصرفی جدید
          </button>
        </div>

        {selectedPresetId && (
          <div className="mt-2 text-xs text-sky-400/90 bg-sky-950/40 p-2 rounded border border-sky-800/40">
            {LOAD_PRESETS.find((p) => p.id === selectedPresetId)?.descriptionFa}
          </div>
        )}
      </div>

      {/* Loads Table */}
      <div className="studio-card overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            لیست تجهیزات و بارهای الکتریکی ({loads.length} مورد)
          </h3>
        </div>

        {loads.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            هیچ بار مصرفی تعریف نشده است. از منوی پکیج‌های آماده بالا استفاده کنید یا بارهای خود را اضافه نمایید.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">نام وسیله برقی</th>
                  <th className="p-2.5">دسته‌بندی</th>
                  <th className="p-2.5">توان (Watt)</th>
                  <th className="p-2.5">ضریب هجومی (Surge)</th>
                  <th className="p-2.5">تعداد</th>
                  <th className="p-2.5">ساعات روز</th>
                  <th className="p-2.5">ساعات شب</th>
                  <th className="p-2.5">انرژی روزانه (Wh)</th>
                  <th className="p-2.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loads.map((item) => {
                  const itemDailyWh = item.ratedWatts * item.quantity * (item.dayHours + item.nightHours);
                  return (
                    <tr key={item.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-2.5 font-medium text-white">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="bg-transparent border-b border-slate-700 focus:border-sky-400 outline-none w-full text-xs text-white"
                        />
                      </td>
                      <td className="p-2.5">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {LOAD_CATEGORY_LABELS[item.category]?.fa || item.category}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={item.ratedWatts}
                          onChange={(e) => handleUpdateItem(item.id, 'ratedWatts', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-emerald-400 font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.1"
                          value={item.surgeMultiplier}
                          onChange={(e) => handleUpdateItem(item.id, 'surgeMultiplier', parseFloat(e.target.value) || 1)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-red-300 font-mono"
                        />
                        {item.surgeMultiplier > 2.0 && (
                          <span className="text-[10px] text-red-400 mr-1" title="بار موتوری هجومی">⚡</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="12"
                          value={item.dayHours}
                          onChange={(e) => handleUpdateItem(item.id, 'dayHours', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-sky-400 font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="12"
                          value={item.nightHours}
                          onChange={(e) => handleUpdateItem(item.id, 'nightHours', parseFloat(e.target.value) || 0)}
                          className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-indigo-400 font-mono"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-amber-300">
                        {Math.round(itemDailyWh).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveLoad(item.id)}
                          className="p-1 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded"
                          title="حذف"
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

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-md w-full">
            <h3 className="text-base font-bold text-sky-400 mb-2">تعریف بار الکتریکی جدید</h3>
            
            {/* Quick appliance picker */}
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg mb-3">
              <label className="block text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                انتخاب سریع از بانک تجهیزات استاندارد (۴۰+ بار خانگی و صنعتی):
              </label>
              <select
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  if (!isNaN(idx) && STANDARD_APPLIANCE_LIBRARY[idx]) {
                    const item = STANDARD_APPLIANCE_LIBRARY[idx];
                    setName(item.nameFa);
                    setCategory(item.category);
                    setRatedWatts(item.ratedWatts);
                    setSurgeMultiplier(item.surgeMultiplier);
                    setDayHours(item.typicalDayHours);
                    setNightHours(item.typicalNightHours);
                    setIsDc(!!item.isDc);
                  }
                }}
                defaultValue=""
                className="studio-input text-xs"
              >
                <option value="" disabled>
                  -- انتخاب بار الکتریکی (خانگی، کارگاهی، مرغداری، ماینینگ، پمپ، چیلر) --
                </option>
                {STANDARD_APPLIANCE_LIBRARY.map((app, idx) => (
                  <option key={idx} value={idx}>
                    {app.nameFa} ({app.ratedWatts >= 1000 ? `${(app.ratedWatts / 1000).toFixed(1)} kW` : `${app.ratedWatts} W`})
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleAddLoad} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام وسیله</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: پمپ آب کشاورزی"
                  className="studio-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">دسته‌بندی</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LoadCategory)}
                    className="studio-input"
                  >
                    {Object.entries(LOAD_CATEGORY_LABELS).map(([catKey, label]) => (
                      <option key={catKey} value={catKey}>
                        {label.fa}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تعداد</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="studio-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">توان نامی (Watt)</label>
                  <input
                    type="number"
                    min="1"
                    value={ratedWatts}
                    onChange={(e) => setRatedWatts(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ضریب استارت هجومی</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={surgeMultiplier}
                    onChange={(e) => setSurgeMultiplier(parseFloat(e.target.value) || 1)}
                    className="studio-input"
                  />
                  <span className="text-[10px] text-slate-400">روشنایی=۱، پمپ و کولر=۳ الی ۵</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ساعات کارکرد روز (۰ تا ۱۲)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    value={dayHours}
                    onChange={(e) => setDayHours(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ساعات کارکرد شب (۰ تا ۱۲)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="12"
                    value={nightHours}
                    onChange={(e) => setNightHours(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="studio-btn-secondary text-xs"
                >
                  انصراف
                </button>
                <button type="submit" className="studio-btn-primary text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> افزودن به لیست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
