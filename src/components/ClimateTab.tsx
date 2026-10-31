import React, { useState } from 'react';
import { MapPin, Sun, ThermometerSnowflake, ThermometerSun, Compass, Wind, Edit3, Check, Globe, Layers } from 'lucide-react';
import { ClimateCity, IRANIAN_CLIMATE_CITIES, INTERNATIONAL_CLIMATE_CITIES, ALL_CLIMATE_CITIES } from '../engine/climaticData';
import { SiteLocationMap } from './SiteLocationMap';

interface ClimateTabProps {
  selectedCity: ClimateCity;
  onCityChange: (city: ClimateCity) => void;
  lang?: 'fa' | 'en';
}

export const ClimateTab: React.FC<ClimateTabProps> = ({ selectedCity, onCityChange, lang = 'fa' }) => {
  const isEn = lang === 'en';
  const [isEditing, setIsEditing] = useState(false);
  const [customCity, setCustomCity] = useState<ClimateCity>(selectedCity);
  const [viewMode, setViewMode] = useState<'map' | 'presets'>('map');
  const [regionFilter, setRegionFilter] = useState<'all' | 'international' | 'iranian'>('all');

  const handleSelectCityId = (cityId: string) => {
    const found = ALL_CLIMATE_CITIES.find((c) => c.id === cityId);
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
              {isEn
                ? 'Site Location, Hybrid Satellite Map & Solar Resource'
                : 'مکان‌یابی، نقشه ماهواره‌ای و تحلیل تشعشع (Site Location & Solar Resource)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isEn
                ? 'Select project site on interactive hybrid satellite map, access regional meteorological solar irradiation (PSH), and optimal tilt angles.'
                : 'امکان انتخاب محل نصب از روی نقشه ماهواره‌ای، دیتابیس اقلیمی شهرهای ایران، ساعات آفتابی اوج (PSH) و شیب بهینه سالانه'}
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
              {isEn ? 'Interactive Satellite Map' : 'نقشه تعاملی ماهواره‌ای'}
            </button>
            <button
              onClick={() => setViewMode('presets')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'presets' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              {isEn ? 'Regional Climate Cities' : 'شهرهای اقلیمی ایران'}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Map View */}
      {viewMode === 'map' && (
        <SiteLocationMap currentCity={selectedCity} onSelectLocation={onCityChange} lang={lang} />
      )}

      {/* City Selector Buttons with International / Regional Filter */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            {isEn ? 'Global & Regional Solar Climate Hubs:' : 'هاب‌های اقلیمی و خورشیدی بین‌المللی و منطقه‌ای:'}
          </label>
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setRegionFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                regionFilter === 'all' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEn ? 'All Locations' : 'همه مکان‌ها'}
            </button>
            <button
              onClick={() => setRegionFilter('international')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                regionFilter === 'international' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEn ? 'International (US, EU, MENA, Chile)' : 'بین‌المللی (جهانی)'}
            </button>
            <button
              onClick={() => setRegionFilter('iranian')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                regionFilter === 'iranian' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isEn ? 'Iran Regional' : 'ایران'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
          {(regionFilter === 'all'
            ? ALL_CLIMATE_CITIES
            : regionFilter === 'international'
            ? INTERNATIONAL_CLIMATE_CITIES
            : IRANIAN_CLIMATE_CITIES
          ).map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelectCityId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedCity.id === c.id
                  ? 'bg-sky-600 border-sky-400 text-white shadow-md ring-1 ring-sky-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {isEn ? c.nameEn : c.nameFa} <span className="text-[10px] opacity-75">({c.peakSunHours} PSH)</span>
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
              {isEn ? 'Climate & Solar Metrics:' : 'اطلاعات اقلیمی:'} {isEn ? selectedCity.nameEn : selectedCity.nameFa}
            </h2>
            <p className="text-xs text-sky-400 mt-0.5">
              {isEn ? selectedCity.descriptionEn : selectedCity.descriptionFa}
            </p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="studio-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing
              ? isEn
                ? 'Cancel Edit'
                : 'انصراف از ویرایش'
              : isEn
              ? 'Edit Climate Parameters'
              : 'ویرایش پارامترهای اقلیمی'}
          </button>
        </div>

        {/* Display Grid */}
        {!isEditing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Peak Sun Hours (PSH)' : 'میانگین ساعات آفتابی اوج (PSH)'}
              </span>
              <span className="text-xl font-bold font-mono text-amber-400">
                {selectedCity.peakSunHours}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Hours/Day (kWh/m²/day)' : 'ساعت در روز (kWh/m²/day)'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Min Design Temp (T_min)' : 'حداقل دمای طراحی (T_min)'}
              </span>
              <span className="text-xl font-bold font-mono text-cyan-400">
                {selectedCity.tempMinC}°C
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Coldest record for Voc,max (NEC 690.7)' : 'معیار ولتاژ حداکثر استرینگ (Voc)'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Max Design Temp (T_max)' : 'حداکثر دمای طراحی (T_max)'}
              </span>
              <span className="text-xl font-bold font-mono text-red-400">
                {selectedCity.tempMaxC}°C
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Hottest record for Vmp,min drop' : 'معیار افت حرارتی توان (Pmp)'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Coordinates & Elevation' : 'مختصات جغرافیایی و ارتفاع'}
              </span>
              <span className="font-mono text-slate-200 block text-xs">
                {selectedCity.latitude}° N, {selectedCity.longitude}° E
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? `Elevation: ${selectedCity.elevationM} m MSL` : `ارتفاع از دریا: ${selectedCity.elevationM} متر`}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Optimal Annual Tilt' : 'شیب بهینه سالانه (Annual Tilt)'}
              </span>
              <span className="text-xl font-bold font-mono text-sky-400">
                {selectedCity.optimalTiltAnnualDeg}°
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Fixed racking optimal slope' : 'زاویه استراکچر ثابت تمام فصول'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Winter / Summer Tilt' : 'شیب زمستانه / تابستانه'}
              </span>
              <span className="font-mono text-slate-200 block text-xs">
                {isEn ? 'Winter: ' : 'زمستان: '}<strong className="text-sky-300">{selectedCity.optimalTiltWinterDeg}°</strong> | {isEn ? 'Summer: ' : 'تابستان: '}<strong className="text-amber-300">{selectedCity.optimalTiltSummerDeg}°</strong>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'For seasonal adjustable racking' : 'برای سازه‌های با شیب قابل تنظیم فصلی'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Soiling Loss Factor' : 'افت گرد و غبار (Soiling Loss)'}
              </span>
              <span className="text-xl font-bold font-mono text-amber-300">
                {selectedCity.soilingLossPct}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Atmospheric particulate derate' : 'کاهش بازدهی ناشی از نشست ذرات'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Ground Albedo Factor' : 'ضریب آلبیدو زمین (Albedo)'}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {selectedCity.albedo}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Bifacial rear reflection' : 'بازتابش تشعشع برای پنل‌های دوطرفه'}
              </span>
            </div>
          </div>
        ) : (
          /* Custom Parameter Editor Form */
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Peak Sun Hours (PSH)' : 'ساعات آفتابی اوج (PSH)'}
                </label>
                <input
                  type="number"
                  step="0.05"
                  className="studio-input"
                  value={customCity.peakSunHours}
                  onChange={(e) => setCustomCity({ ...customCity, peakSunHours: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Min Design Temp (°C)' : 'حداقل دمای طراحی (°C)'}
                </label>
                <input
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.tempMinC}
                  onChange={(e) => setCustomCity({ ...customCity, tempMinC: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Max Design Temp (°C)' : 'حداکثر دمای طراحی (°C)'}
                </label>
                <input
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.tempMaxC}
                  onChange={(e) => setCustomCity({ ...customCity, tempMaxC: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Optimal Annual Tilt (°)' : 'شیب بهینه سالانه (°)'}
                </label>
                <input
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.optimalTiltAnnualDeg}
                  onChange={(e) => setCustomCity({ ...customCity, optimalTiltAnnualDeg: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Soiling Loss (%)' : 'افت گرد و غبار (%)'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="studio-input"
                  value={customCity.soilingLossPct}
                  onChange={(e) => setCustomCity({ ...customCity, soilingLossPct: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Albedo Factor' : 'ضریب آلبیدو'}
                </label>
                <input
                  type="number"
                  step="0.02"
                  className="studio-input"
                  value={customCity.albedo}
                  onChange={(e) => setCustomCity({ ...customCity, albedo: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Latitude (°N)' : 'عرض جغرافیایی (°)'}
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="studio-input"
                  value={customCity.latitude}
                  onChange={(e) => setCustomCity({ ...customCity, latitude: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  {isEn ? 'Longitude (°E)' : 'طول جغرافیایی (°)'}
                </label>
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
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                onClick={handleSaveCustom}
                className="studio-btn-primary text-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {isEn ? 'Apply Custom Parameters' : 'اعمال پارامترهای سفارشی'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ClimateTab;
