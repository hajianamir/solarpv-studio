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
  lang?: 'fa' | 'en';
}

export const LoadProfilingTab: React.FC<LoadProfilingTabProps> = ({
  loads,
  onLoadsChange,
  analysisResult,
  lang = 'fa',
}) => {
  const isFa = lang === 'fa';
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
      name: name.trim() || (isFa ? 'بار جدید' : 'New Appliance'),
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'کل مصرف روزانه' : 'Total Daily Energy Consumption'}
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {analysisResult.totalDailyEnergyKwh.toFixed(2)} <span className="text-xs font-normal text-slate-300">kWh/day</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {Math.round(analysisResult.totalDailyEnergyWh).toLocaleString()} Wh/{isFa ? 'روز' : 'day'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'تفکیک مصرف روز / شب' : 'Day vs Night Split'}
          </div>
          <div className="text-sm font-mono text-slate-200 mt-1">
            {isFa ? 'روز:' : 'Day:'} <span className="text-sky-400 font-bold">{(analysisResult.daytimeEnergyWh / 1000).toFixed(1)}k</span> | {isFa ? 'شب:' : 'Night:'}{' '}
            <span className="text-indigo-400 font-bold">{(analysisResult.nighttimeEnergyWh / 1000).toFixed(1)}k</span> Wh
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'بار شب جهت سایزینگ بانک باتری' : 'Nighttime load drives battery sizing'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'توان پیوسته اکتیو' : 'Continuous Active Power'}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {Math.round(analysisResult.continuousActivePowerWatts).toLocaleString()} <span className="text-xs font-normal text-slate-300">W</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'مجموع توان همزمان تجهیزات' : 'Coincident base load power'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">
            {isFa ? 'حداکثر توان هجومی (Surge)' : 'Peak Inrush Surge Power'}
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1">
            {Math.round(analysisResult.maxSurgePeakPowerWatts).toLocaleString()} <span className="text-xs font-normal text-slate-300">W</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFa ? 'بر مبنای ضریب همزمانی موتورها' : 'Inductive motor start tolerance'}
          </div>
        </div>
      </div>

      {/* Preset Selector & Action Bar */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
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
          <div className="mt-2 text-xs text-sky-400/90 bg-sky-950/40 p-2 rounded border border-sky-800/40">
            {isFa
              ? LOAD_PRESETS.find((p) => p.id === selectedPresetId)?.descriptionFa
              : LOAD_PRESETS.find((p) => p.id === selectedPresetId)?.descriptionEn}
          </div>
        )}
      </div>

      {/* Loads Table */}
      <div className="studio-card overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
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
            <table className={`w-full text-xs text-slate-300 min-w-[700px] ${isFa ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">{isFa ? 'نام وسیله برقی' : 'Appliance Name'}</th>
                  <th className="p-2.5">{isFa ? 'دسته‌بندی' : 'Category'}</th>
                  <th className="p-2.5">{isFa ? 'توان (Watt)' : 'Power (W)'}</th>
                  <th className="p-2.5">{isFa ? 'ضریب هجومی' : 'Surge Multiplier'}</th>
                  <th className="p-2.5">{isFa ? 'تعداد' : 'Qty'}</th>
                  <th className="p-2.5">{isFa ? 'ساعات روز' : 'Day (hrs)'}</th>
                  <th className="p-2.5">{isFa ? 'ساعات شب' : 'Night (hrs)'}</th>
                  <th className="p-2.5">{isFa ? 'انرژی روزانه (Wh)' : 'Daily Wh'}</th>
                  <th className="p-2.5 text-center">{isFa ? 'عملیات' : 'Action'}</th>
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
                          {isFa ? (LOAD_CATEGORY_LABELS[item.category]?.fa || item.category) : (LOAD_CATEGORY_LABELS[item.category]?.en || item.category)}
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
                          <span className="text-[10px] text-red-400 mx-1" title={isFa ? 'بار موتوری هجومی' : 'Inductive Surge Load'}>⚡</span>
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
                      <td className="p-2.5 font-mono text-amber-300 font-bold">
                        {Math.round(itemDailyWh).toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleRemoveLoad(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
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
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sky-400 text-sm mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              {isFa ? 'تعریف بار الکتریکی مصرف‌کننده جدید' : 'Add New Electrical Appliance'}
            </h3>

            <form onSubmit={handleAddLoad} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {isFa ? 'نام وسیله برقی:' : 'Appliance Name:'}
                </label>
                <input
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'دسته‌بندی:' : 'Category:'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LoadCategory)}
                    className="studio-input"
                  >
                    <option value="lighting">{isFa ? 'روشنایی' : 'Lighting'}</option>
                    <option value="refrigeration">{isFa ? 'سرمایشی و یخچال' : 'Refrigeration'}</option>
                    <option value="pump_motor">{isFa ? 'پمپ و الکتروموتور' : 'Pump / Motor'}</option>
                    <option value="cooling_hvac">{isFa ? 'کولر و تهویه' : 'HVAC / Cooling'}</option>
                    <option value="electronics_it">{isFa ? 'الکترونیک و IT' : 'Electronics / IT'}</option>
                    <option value="heating">{isFa ? 'گرمایشی' : 'Heating'}</option>
                    <option value="other">{isFa ? 'سایر' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'تعداد:' : 'Quantity:'}
                  </label>
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'توان نامی (Watt):' : 'Rated Power (W):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={ratedWatts}
                    onChange={(e) => setRatedWatts(parseFloat(e.target.value) || 0)}
                    className="studio-input"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'ضریب استارت هجومی:' : 'Surge Multiplier:'}
                  </label>
                  <input
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'ساعات روز (۰ تا ۱۲):' : 'Day Operation (0-12h):'}
                  </label>
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
                  <label className="block text-slate-300 font-semibold mb-1">
                    {isFa ? 'ساعات شب (۰ تا ۱۲):' : 'Night Operation (0-12h):'}
                  </label>
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
