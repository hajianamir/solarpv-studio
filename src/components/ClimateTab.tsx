import React, { useState } from 'react';
import { MapPin, Sun, ThermometerSnowflake, ThermometerSun, Compass, Wind, Edit3, Check, Globe, Layers, ShieldCheck, AlertTriangle, Loader2, Database, Info } from 'lucide-react';
import { type ClimateCity } from '../engine/climaticData';
import { formatCoordinates } from '../engine/geoCoordinates';

const SiteLocationMap = React.lazy(() => import('./SiteLocationMap'));

interface ClimateTabProps {
  selectedCity: ClimateCity;
  onCityChange: (city: ClimateCity) => void;
  onCreate3dRooftop?: (city: ClimateCity) => void;
  lang?: 'fa' | 'en';
}

export const ClimateTab: React.FC<ClimateTabProps> = ({
  selectedCity,
  onCityChange,
  onCreate3dRooftop,
  lang = 'fa',
}) => {
  const isEn = lang === 'en';
  const isFa = lang === 'fa';
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
      <React.Suspense
        fallback={
          <div className="h-[400px] w-full rounded-xl border border-industrial-border bg-industrial-surface/50 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-industrial-accent" />
            <span className="text-xs">{lang === 'fa' ? 'در حال بارگذاری نقشه...' : 'Loading GIS Map Engine...'}</span>
          </div>
        }
      >
        <SiteLocationMap
          currentCity={selectedCity}
          onSelectLocation={onCityChange}
          onCreate3dRooftop={onCreate3dRooftop}
          lang={lang}
        />
      </React.Suspense>

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
                {formatCoordinates(selectedCity.latitude, selectedCity.longitude)}
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
                <label htmlFor="climate-psh-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Peak Sun Hours (PSH)' : 'ساعات آفتابی اوج (PSH)'}
                </label>
                <input
                  id="climate-psh-input"
                  type="number"
                  step="0.05"
                  className="studio-input"
                  value={customCity.peakSunHours}
                  onChange={(e) => setCustomCity({ ...customCity, peakSunHours: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-temp-min-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Min Design Temp (°C)' : 'حداقل دمای طراحی (°C)'}
                </label>
                <input
                  id="climate-temp-min-input"
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.tempMinC}
                  onChange={(e) => setCustomCity({ ...customCity, tempMinC: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-temp-max-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Max Design Temp (°C)' : 'حداکثر دمای طراحی (°C)'}
                </label>
                <input
                  id="climate-temp-max-input"
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.tempMaxC}
                  onChange={(e) => setCustomCity({ ...customCity, tempMaxC: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-optimal-tilt-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Optimal Annual Tilt (°)' : 'شیب بهینه سالانه (°)'}
                </label>
                <input
                  id="climate-optimal-tilt-input"
                  type="number"
                  step="1"
                  className="studio-input"
                  value={customCity.optimalTiltAnnualDeg}
                  onChange={(e) => setCustomCity({ ...customCity, optimalTiltAnnualDeg: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-soiling-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Soiling Loss (%)' : 'افت گرد و غبار (%)'}
                </label>
                <input
                  id="climate-soiling-input"
                  type="number"
                  step="0.5"
                  className="studio-input"
                  value={customCity.soilingLossPct}
                  onChange={(e) => setCustomCity({ ...customCity, soilingLossPct: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-albedo-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Albedo Factor' : 'ضریب آلبیدو'}
                </label>
                <input
                  id="climate-albedo-input"
                  type="number"
                  step="0.02"
                  className="studio-input"
                  value={customCity.albedo}
                  onChange={(e) => setCustomCity({ ...customCity, albedo: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-latitude-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Latitude (° [-90..+90])' : 'عرض جغرافیایی (°)'}
                </label>
                <input
                  id="climate-latitude-input"
                  type="number"
                  step="0.0001"
                  className="studio-input"
                  value={customCity.latitude}
                  onChange={(e) => setCustomCity({ ...customCity, latitude: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label htmlFor="climate-longitude-input" className="block text-slate-300 mb-1">
                  {isEn ? 'Longitude (° [-180..+180])' : 'طول جغرافیایی (°)'}
                </label>
                <input
                  id="climate-longitude-input"
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

      {/* Parameter-Level Data Provenance Table (ENV-07) */}
      <div className="studio-card space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-industrial-border pb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              {isEn ? 'Environmental & Geotechnical Telemetry Provenance' : 'جدول ردیابی منشأ و اصالت داده‌های محیطی و ژئوتکنیکی (ENV-01..07)'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>{isEn ? 'Source:' : 'مرجع پایگاه:'} <strong className="text-slate-200">{isEn ? selectedCity.dataSourceEn : selectedCity.dataSourceFa}</strong></span>
            {selectedCity.dataRetrievalDate && (
              <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                {selectedCity.dataRetrievalDate}
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          {isFa
            ? 'بر اساس الزامات استاندارد، تک‌تک پارامترهای طراحی دارای شناسه اصالت (Provenance) تفکیک‌شده هستند. پارامترهای با منبع مدل غربالگری یا پیش‌فرض نیازمند صحه‌گذاری میدانی در محل سایت می‌باشند.'
            : 'Per engineering compliance standards, each parameter carries distinct origin telemetry. Values marked as screening models or defaults require field verification during site investigation.'}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="border-b border-industrial-border text-slate-400 bg-industrial-surface/60">
                <th className="p-2 text-right">{isFa ? 'پارامتر مهندسی' : 'Parameter'}</th>
                <th className="p-2 text-center">{isFa ? 'مقدار طراحی' : 'Design Value'}</th>
                <th className="p-2 text-center">{isFa ? 'تأمین‌کننده / منبع' : 'Provider / Source'}</th>
                <th className="p-2 text-center">{isFa ? 'نوع اصالت (Origin Kind)' : 'Origin Telemetry'}</th>
                <th className="p-2 text-right">{isFa ? 'روش مشتق‌سازی / توضیحات کیفی' : 'Derivation / Notes'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-border/40 font-mono text-[11px]">
              {(() => {
                const prov = selectedCity.fieldProvenance || {};
                const rows = [
                  {
                    key: 'peakSunHours',
                    nameFa: 'ساعات اوج تابش (PSH)',
                    nameEn: 'Peak Sun Hours (PSH)',
                    val: `${selectedCity.peakSunHours} kWh/m²/day`,
                    defaultKind: 'provider_value' as const,
                    defaultSource: 'NASA_POWER / PVGIS',
                  },
                  {
                    key: 'daylightHoursDesign',
                    nameFa: 'پنجره نجومی روز طراحی (انقلاب زمستانی)',
                    nameEn: 'Design Daylight Hours (Winter Solstice)',
                    val: `${selectedCity.daylightHoursDesign} h`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'ASTRONOMICAL_SPA_MODEL',
                  },
                  {
                    key: 'tempMinC',
                    nameFa: 'حداقل دمای حدی طراحی (T_min)',
                    nameEn: 'Min Design Ambient Temp',
                    val: `${selectedCity.tempMinC} °C`,
                    defaultKind: 'provider_value' as const,
                    defaultSource: 'NASA_POWER (T2M_MIN)',
                  },
                  {
                    key: 'tempMaxC',
                    nameFa: 'حداکثر دمای حدی طراحی (T_max)',
                    nameEn: 'Max Design Ambient Temp',
                    val: `${selectedCity.tempMaxC} °C`,
                    defaultKind: 'provider_value' as const,
                    defaultSource: 'NASA_POWER (T2M_MAX)',
                  },
                  {
                    key: 'annualRainfallMm',
                    nameFa: 'بارش سالانه باران (Precipitation)',
                    nameEn: 'Annual Precipitation',
                    val: `${selectedCity.annualRainfallMm} mm`,
                    defaultKind: prov.annualPrecipitationMm?.sourceKind || 'local_model',
                    defaultSource: prov.annualPrecipitationMm?.providerName || 'REGIONAL_ANALYTICAL_MODEL',
                  },
                  {
                    key: 'basicWindSpeedKmh',
                    nameFa: 'سرعت مبنای باد (V_b - وزش ۳ ثانیه‌ای)',
                    nameEn: 'Basic Wind Speed (3-sec gust)',
                    val: `${selectedCity.basicWindSpeedKmh} km/h`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'REGIONAL_ANALYTICAL_MODEL (Code Screening)',
                  },
                  {
                    key: 'groundSnowLoadKgM2',
                    nameFa: 'بار برف مبنای زمین (S_k)',
                    nameEn: 'Ground Snow Load (S_k)',
                    val: `${selectedCity.groundSnowLoadKgM2} kg/m²`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'REGIONAL_ANALYTICAL_MODEL (Code Screening)',
                  },
                  {
                    key: 'soilBearingCapacityKpa',
                    nameFa: 'ظرفیت باربری مجاز خاک (q_a)',
                    nameEn: 'Allowable Soil Bearing Capacity',
                    val: `${selectedCity.soilBearingCapacityKpa} kPa`,
                    defaultKind: prov.soilBearingCapacityKpa?.sourceKind || 'provider_derived',
                    defaultSource: prov.soilBearingCapacityKpa?.providerName || 'ISRIC_SOILGRIDS / USCS',
                  },
                  {
                    key: 'soilInternalFrictionAngleDeg',
                    nameFa: 'زاویه اصطکاک داخلی خاک (φ)',
                    nameEn: 'Soil Internal Friction Angle',
                    val: `${selectedCity.soilInternalFrictionAngleDeg}°`,
                    defaultKind: prov.soilInternalFrictionAngleDeg?.sourceKind || 'provider_derived',
                    defaultSource: 'ISRIC_SOILGRIDS / USCS',
                  },
                  {
                    key: 'frostDepthCm',
                    nameFa: 'عمق یخبندان فصلی (Frost Depth)',
                    nameEn: 'Seasonal Frost Penetration Depth',
                    val: `${selectedCity.frostDepthCm} cm`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'REGIONAL_ANALYTICAL_MODEL',
                  },
                  {
                    key: 'groundwaterDepthM',
                    nameFa: 'تراز آب زیرزمینی (GWL)',
                    nameEn: 'Groundwater Table Depth',
                    val: `${selectedCity.groundwaterDepthM ?? 6.0} m`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'REGIONAL_ANALYTICAL_MODEL (Coastal Proximity)',
                  },
                  {
                    key: 'albedo',
                    nameFa: 'ضریب بازتابش زمین (Albedo)',
                    nameEn: 'Ground Surface Albedo',
                    val: `${selectedCity.albedo}`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'Standard Surface Heuristic (0.20)',
                  },
                  {
                    key: 'optimalTiltAnnualDeg',
                    nameFa: 'زاویه شیب بهینه سالانه',
                    nameEn: 'Optimal Annual Tilt Angle',
                    val: `${selectedCity.optimalTiltAnnualDeg}°`,
                    defaultKind: 'local_model' as const,
                    defaultSource: 'Latitude-Based Geometric Rule',
                  },
                ];

                return rows.map((r) => {
                  const p = prov[r.key];
                  const kind = p?.sourceKind || r.defaultKind;
                  const source = p?.providerName || r.defaultSource;
                  const note = p?.qualityNote || p?.derivationMethod || (kind === 'local_model' ? (isFa ? 'مدل تحلیلی غربالگری منطقه‌ای — نیازمند مطالعه میدانی سایت' : 'Regional screening model — requires site geotechnical investigation') : (isFa ? 'داده مستقیم اندازه‌گیری / ماهواره‌ای' : 'Satellite / direct provider data'));

                  const kindBadge = (() => {
                    switch (kind) {
                      case 'provider_value':
                        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">{isFa ? 'داده مستقیم منبع' : 'Provider Value'}</span>;
                      case 'provider_derived':
                        return <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40">{isFa ? 'مشتق از منبع' : 'Provider Derived'}</span>;
                      case 'local_model':
                        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">{isFa ? 'مدل غربالگری تحلیلی' : 'Local Screening Model'}</span>;
                      case 'unavailable':
                        return <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500/40">{isFa ? 'ناموجود در منبع' : 'Unavailable'}</span>;
                      case 'user_input':
                        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">{isFa ? 'ورودی دستی کاربر' : 'User Input'}</span>;
                      default:
                        return <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{kind}</span>;
                    }
                  })();

                  return (
                    <tr key={r.key} className="hover:bg-slate-800/40 transition">
                      <td className="p-2 text-slate-200 font-sans font-medium">{isFa ? r.nameFa : r.nameEn}</td>
                      <td className="p-2 text-center text-white font-bold">{r.val}</td>
                      <td className="p-2 text-center text-slate-300">{source}</td>
                      <td className="p-2 text-center">{kindBadge}</td>
                      <td className="p-2 text-slate-400 font-sans text-[10px] leading-tight">{note}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ClimateTab;
