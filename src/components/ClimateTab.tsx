import React, { useState } from 'react';
import { MapPin, Sun, ThermometerSnowflake, ThermometerSun, Compass, Wind, Edit3, Check, Globe, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ClimateCity } from '../engine/climaticData';
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
            <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-industrial-warning" />
              {isEn
                ? 'Site Location, Satellite Map & Pure API Solar Resource'
                : 'مکان‌یابی، نقشه ماهواره‌ای و تحلیل تشعشع (Site Location & Solar Resource)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isEn
                ? 'Select project site on interactive hybrid satellite map. Environmental metrics, PSH, and geotechnical data are resolved dynamically via NASA POWER and PVGIS APIs (ADR-005).'
                : 'انتخاب محل نصب از روی نقشه ماهواره‌ای تعاملی. پارامترهای تابش خورشیدی (PSH)، باد، برف و ژئوتکنیک به صورت پویا از پایگاه‌های داده جهانی ناسا و PVGIS استخراج می‌شوند.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-industrial-surface/90 px-3 py-1.5 rounded-lg border border-industrial-border text-xs font-mono text-industrial-accent">
            <Globe className="w-4 h-4 text-industrial-success" />
            <span>{isEn ? 'Provider: ' + (selectedCity.dataSourceEn || 'NASA POWER / PVGIS') : 'داده‌ی: ' + (selectedCity.dataSourceEn || 'ناسا POWER / PVGIS')}</span>
          </div>
        </div>
      </div>

      {/* Analytical Fallback Warning Banner */}
      {(selectedCity.dataSourceEn?.includes('REGIONAL_ANALYTICAL_MODEL') ||
        selectedCity.confidence === 'analytical_estimate') && (
        <div className="p-3 bg-industrial-warning/10 border border-industrial-warning/40 rounded-lg flex items-start gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-industrial-warning shrink-0 mt-0.5" />
          <div className="text-slate-200 leading-relaxed">
            <strong className="text-industrial-warning">⚠ {isEn ? 'Estimated climate data' : 'داده اقلیمی تخمینی'}</strong>{' '}
            {isEn
              ? 'This location is estimated from a regional analytical model, not measured provider data. Confidence: LOW. Real NASA POWER / PVGIS data requires outbound internet access.'
              : 'این محل از مدل تحلیلی منطقه‌ای تخمین گرفته شده است، نه داده‌های اندازه‌گیری شده. اطمینان: پایین. داده‌های واقعی ناسا و PVGIS نیاز به دسترسی به اینترنت دارد.'}
          </div>
        </div>
      )}

      {/* Interactive Map View */}
      <SiteLocationMap currentCity={selectedCity} onSelectLocation={onCityChange} lang={lang} />

      {/* Selected City Details Card */}
      <div className="studio-card">
        <div className="flex items-center justify-between border-b border-industrial-border/80 pb-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-industrial-warning" />
              {isEn ? 'Climate & Solar Metrics:' : 'اطلاعات اقلیمی:'} {isEn ? selectedCity.nameEn : selectedCity.nameFa}
            </h2>
            <p className="text-xs text-industrial-accent mt-0.5">
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
            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Peak Sun Hours (PSH)' : 'میانگین ساعات آفتابی اوج (PSH)'}
              </span>
              <span className="text-xl font-bold font-mono text-industrial-warning">
                {selectedCity.peakSunHours}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Hours/Day (kWh/m²/day)' : 'ساعت در روز (kWh/m²/day)'}
              </span>
            </div>

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Min Design Temp (T_min)' : 'حداقل دمای طراحی (T_min)'}
              </span>
              <span className="text-xl font-bold font-mono text-industrial-accent">
                {selectedCity.tempMinC}°C
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Coldest record for Voc,max (NEC 690.7)' : 'معیار ولتاژ حداکثر استرینگ (Voc)'}
              </span>
            </div>

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Max Design Temp (T_max)' : 'حداکثر دمای طراحی (T_max)'}
              </span>
              <span className="text-xl font-bold font-mono text-industrial-error">
                {selectedCity.tempMaxC}°C
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Hottest record for Vmp,min drop' : 'معیار افت حرارتی توان (Pmp)'}
              </span>
            </div>

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
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

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Optimal Annual Tilt' : 'شیب بهینه سالانه (Annual Tilt)'}
              </span>
              <span className="text-xl font-bold font-mono text-industrial-accent">
                {selectedCity.optimalTiltAnnualDeg}°
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Fixed racking optimal slope' : 'زاویه استراکچر ثابت تمام فصول'}
              </span>
            </div>

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Winter / Summer Tilt' : 'شیب زمستانه / تابستانه'}
              </span>
              <span className="font-mono text-slate-200 block text-xs">
                {isEn ? 'Winter: ' : 'زمستان: '}<strong className="text-sky-300">{selectedCity.optimalTiltWinterDeg}°</strong> | {isEn ? 'Summer: ' : 'تابستان: '}<strong className="text-industrial-warning">{selectedCity.optimalTiltSummerDeg}°</strong>
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'For seasonal adjustable racking' : 'برای سازه‌های با شیب قابل تنظیم فصلی'}
              </span>
            </div>

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Soiling Loss Factor' : 'افت گرد و غبار (Soiling Loss)'}
              </span>
              <span className="text-xl font-bold font-mono text-industrial-warning">
                {selectedCity.soilingLossPct}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isEn ? 'Atmospheric particulate derate' : 'کاهش بازدهی ناشی از نشست ذرات'}
              </span>
            </div>

            <div className="p-3 bg-industrial-surface/80 border border-industrial-border rounded-lg">
              <span className="text-slate-400 block mb-1">
                {isEn ? 'Ground Albedo Factor' : 'ضریب آلبیدو زمین (Albedo)'}
              </span>
              <span className="text-xl font-bold font-mono text-industrial-success">
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

            <div className="flex justify-end gap-2 pt-2 border-t border-industrial-border">
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
