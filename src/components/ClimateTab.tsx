import React, { useState } from 'react';
import { MapPin, Sun, ThermometerSnowflake, ThermometerSun, Compass, Wind, Edit3, Check, Globe } from 'lucide-react';
import { ClimateCity, IRANIAN_CLIMATE_CITIES } from '../engine/climaticData';
import { SiteLocationMap } from './SiteLocationMap';

interface ClimateTabProps {
  selectedCity: ClimateCity;
  onCityChange: (city: ClimateCity) => void;
}

export const ClimateTab: React.FC<ClimateTabProps> = ({ selectedCity, onCityChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customCity, setCustomCity] = useState<ClimateCity>(selectedCity);
  const [viewMode, setViewMode] = useState<'map' | 'presets'>('map');

  const handleSelectCityId = (cityId: string) => {
    const found = IRANIAN_CLIMATE_CITIES.find((c) => c.id === cityId);
    if (found) {
      onCityChange(found);
      setCustomCity(found);
      setIsEditing(false);
    }
  };

  const handleSaveCustom = () => {
    onCityChange(customCity);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-400" />
              مکان‌یابی، نقشه ماهواره‌ای و تحلیل تشعشع (Site Location & Solar Resource)
            </h1>
            <p className="text-slate-400 text-xs">
              امکان انتخاب محل نصب از روی نقشه ماهواره‌ای، دیتابیس اقلیمی شهرهای ایران، ساعات آفتابی اوج (PSH) و شیب بهینه سالانه
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'map' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              نقشه تعاملی ماهواره‌ای
            </button>
            <button
              onClick={() => setViewMode('presets')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'presets' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              شهرهای اقلیمی ایران
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Map View */}
      {viewMode === 'map' && (
        <SiteLocationMap currentCity={selectedCity} onSelectLocation={onCityChange} lang="fa" />
      )}

      {/* City Selector Buttons */}
      <div className="studio-card">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          انتخاب شهر اقلیمی ایران:
        </label>
        <div className="flex flex-wrap gap-2">
          {IRANIAN_CLIMATE_CITIES.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectCityId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedCity.id === c.id
                  ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {c.nameFa} <span className="text-[10px] opacity-75">({c.peakSunHours} PSH)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected City Details Card */}
      <div className="studio-card">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              اطلاعات اقلیمی: {selectedCity.nameFa} ({selectedCity.nameEn})
            </h2>
            <p className="text-xs text-sky-400 mt-0.5">{selectedCity.descriptionFa}</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="studio-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? 'انصراف از ویرایش' : 'ویرایش پارامترهای اقلیمی'}
          </button>
        </div>

        {/* Display Grid */}
        {!isEditing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">میانگین ساعات آفتابی اوج (PSH)</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {selectedCity.peakSunHours}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">ساعت در روز (kWh/m²/day)</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">حداقل دمای طراحی (T_min)</span>
              <span className="text-xl font-bold font-mono text-cyan-400">
                {selectedCity.tempMinC}°C
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">معیار ولتاژ حداکثر استرینگ (Voc)</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">حداکثر دمای طراحی (T_max)</span>
              <span className="text-xl font-bold font-mono text-red-400">
                {selectedCity.tempMaxC}°C
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">معیار افت حرارتی توان (Pmp)</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">مختصات جغرافیایی و ارتفاع</span>
              <span className="font-mono text-slate-200 block text-xs">
                {selectedCity.latitude}° N, {selectedCity.longitude}° E
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">ارتفاع از دریا: {selectedCity.elevationM} متر</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">شیب بهینه سالانه (Annual Tilt)</span>
              <span className="text-xl font-bold font-mono text-sky-400">
                {selectedCity.optimalTiltAnnualDeg}°
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">زاویه استراکچر ثابت تمام فصول</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">شیب زمستانه / تابستانه</span>
              <span className="font-mono text-slate-200 block text-xs">
                زمستان: <strong className="text-sky-300">{selectedCity.optimalTiltWinterDeg}°</strong> | تابستان: <strong className="text-amber-300">{selectedCity.optimalTiltSummerDeg}°</strong>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">برای سازه‌های با شیب قابل تنظیم فصلی</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">افت گرد و غبار (Soiling Loss)</span>
              <span className="text-xl font-bold font-mono text-amber-300">
                {selectedCity.soilingLossPct}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">کاهش بازدهی ناشی از نشست ذرات</span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">ضریب آلبیدو زمین (Albedo)</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {selectedCity.albedo}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">بازتابش تشعشع برای پنل‌های دوطرفه</span>
            </div>
          </div>
        ) : (
          /* Custom Parameter Editor Form */
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">ساعات آفتابی اوج (PSH)</label>
                <input
                  type="number"
                  step="0.05"
                  className="studio-input"
                  value={customCity.peakSunHours}
                  onChange={(e) => setCustomCity({ ...customCity, peakSunHours: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">حداقل دمای طراحی (°C)</label>
                <input
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.tempMinC}
                  onChange={(e) => setCustomCity({ ...customCity, tempMinC: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">حداکثر دمای طراحی (°C)</label>
                <input
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.tempMaxC}
                  onChange={(e) => setCustomCity({ ...customCity, tempMaxC: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">شیب بهینه سالانه (°)</label>
                <input
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.optimalTiltAnnualDeg}
                  onChange={(e) => setCustomCity({ ...customCity, optimalTiltAnnualDeg: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">افت گرد و غبار (%)</label>
                <input
                  type="number"
                  step="0.5"
                  className="studio-input"
                  value={customCity.soilingLossPct}
                  onChange={(e) => setCustomCity({ ...customCity, soilingLossPct: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ضریب آلبیدو</label>
                <input
                  type="number"
                  step="0.02"
                  className="studio-input"
                  value={customCity.albedo}
                  onChange={(e) => setCustomCity({ ...customCity, albedo: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">عرض جغرافیایی (°)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="studio-input"
                  value={customCity.latitude}
                  onChange={(e) => setCustomCity({ ...customCity, latitude: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">طول جغرافیایی (°)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="studio-input"
                  value={customCity.longitude}
                  onChange={(e) => setCustomCity({ ...customCity, longitude: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="studio-btn-secondary text-xs"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="studio-btn-primary text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> اعمال پارامترهای سفارشی
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
