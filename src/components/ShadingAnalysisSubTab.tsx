import React, { useState, useMemo } from 'react';
import {
  Sun,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Compass,
  ArrowRight,
  TrendingDown,
  Info,
  Sliders,
  Maximize2,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  analyze3dShadingAndSunPath,
  ShadingGeometryInput,
  ShadingAnalysisResult,
  calculateSolarPosition,
} from '../engine/shadingSunPathEngine';
import { ClimateCity } from '../engine/climaticData';

interface ShadingAnalysisSubTabProps {
  city: ClimateCity;
  tiltAngleDeg: number;
  lang?: 'fa' | 'en';
}

export const ShadingAnalysisSubTab: React.FC<ShadingAnalysisSubTabProps> = ({
  city,
  tiltAngleDeg = 28,
  lang = 'fa',
}) => {
  const isEn = lang === 'en';

  // State inputs
  const [pitchDistanceM, setPitchDistanceM] = useState<number>(7.2);
  const [arrayTiltDeg, setArrayTiltDeg] = useState<number>(tiltAngleDeg);
  const [tableSlopedWidthM, setTableSlopedWidthM] = useState<number>(4.6);
  const [groundClearanceM, setGroundClearanceM] = useState<number>(0.9);
  const [arrayAzimuthDeg, setArrayAzimuthDeg] = useState<number>(0); // 0 = Due South
  const [selectedSeason, setSelectedSeason] = useState<'winter' | 'equinox' | 'summer'>('winter');
  const [activeHour, setActiveHour] = useState<number>(10); // 10:00 AM

  // Obstacle toggle
  const [hasObstacle, setHasObstacle] = useState<boolean>(false);
  const [obstacleHeightM, setObstacleHeightM] = useState<number>(3.5);
  const [obstacleDistanceM, setObstacleDistanceM] = useState<number>(8.0);
  const [obstacleAzimuthDeg, setObstacleAzimuthDeg] = useState<number>(-30);

  // Run 3D Shading & Sun Path Analysis
  const shadingResult: ShadingAnalysisResult = useMemo(() => {
    return analyze3dShadingAndSunPath({
      latitude: city.latitude,
      longitude: city.longitude,
      arrayTiltDeg,
      arrayAzimuthDeg,
      pitchDistanceM,
      tableSlopedWidthM,
      groundClearanceM,
      modulesPerTable: 28,
      hasObstacle,
      obstacleHeightM,
      obstacleDistanceM,
      obstacleAzimuthDeg,
    });
  }, [
    city.latitude,
    city.longitude,
    arrayTiltDeg,
    arrayAzimuthDeg,
    pitchDistanceM,
    tableSlopedWidthM,
    groundClearanceM,
    hasObstacle,
    obstacleHeightM,
    obstacleDistanceM,
    obstacleAzimuthDeg,
  ]);

  // Selected profile
  const activeProfile =
    selectedSeason === 'winter'
      ? shadingResult.winterSolsticeProfile
      : selectedSeason === 'equinox'
      ? shadingResult.equinoxProfile
      : shadingResult.summerSolsticeProfile;

  const currentHourPoint = activeProfile.hourlyPoints.find((p) => p.hour === activeHour) || activeProfile.hourlyPoints[4];

  // Dynamic SVG Sun position for geometric cross-section
  const sunElevation = currentHourPoint?.sunPosition.altitudeDeg || 25;
  const sunElevationRad = (Math.max(5, sunElevation) * Math.PI) / 180.0;
  const rayAngleDeg = 180 - sunElevation;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="studio-card bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border border-sky-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-sky-400 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" />
              {isEn
                ? '3D Geometric Shading & Sun Path Analysis (IEC 62548)'
                : 'تحلیل پیشرفته هندسه سایه‌اندازی سه‌بعدی و مسیر خورشید (IEC 62548)'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isEn
                ? `Calculates inter-row cross-shading, bypass diode mismatch, and Sun Path for ${city.nameEn} (Lat: ${city.latitude}°, Lon: ${city.longitude}°)`
                : `محاسبه دقیق سایه‌اندازی بین‌ردیفی، فعال‌سازی دیود بای‌پس و مسیر خورشید برای ${city.nameFa} (عرض: ${city.latitude}°، طول: ${city.longitude}°)`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                shadingResult.isWinterNoonFreeOfShading
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {shadingResult.isWinterNoonFreeOfShading
                ? isEn
                  ? 'IEC 62548 Winter Noon Compliant'
                  : 'پایدار در پیک زمستان (مطابق استاندارد)'
                : isEn
                ? 'Winter Noon Shading Detected'
                : 'هشدار سایه‌اندازی در ظهر زمستان'}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono">
              GCR: {shadingResult.gcrPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Geometry Control & Real-time Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Interactive Inputs */}
        <div className="studio-card space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            {isEn ? 'Array Spacing & Geometry' : 'پارامترهای هندسی آرایه و فاصله ردیف‌ها'}
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex justify-between">
              <span>{isEn ? 'Row Pitch Distance (m):' : 'فاصله محور تا محور ردیف‌ها (Pitch):'}</span>
              <span className="text-sky-400 font-mono font-bold">{pitchDistanceM} m</span>
            </label>
            <input
              type="range"
              min="4.0"
              max="15.0"
              step="0.1"
              value={pitchDistanceM}
              onChange={(e) => setPitchDistanceM(parseFloat(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
              <span>4.0 m</span>
              <span className="text-amber-400 font-mono">
                {isEn ? 'Min Recommended:' : 'حداقل پیشنهادی:'} {shadingResult.recommendedMinPitchM} m
              </span>
              <span>15.0 m</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isEn ? 'Tilt Angle (°):' : 'زاویه شیب استراکچر:'}
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={arrayTiltDeg}
                onChange={(e) => setArrayTiltDeg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isEn ? 'Table Sloped Width (m):' : 'طول شیبدار میز (متر):'}
              </label>
              <input
                type="number"
                step="0.1"
                min="1.5"
                max="8.0"
                value={tableSlopedWidthM}
                onChange={(e) => setTableSlopedWidthM(parseFloat(e.target.value) || 2)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isEn ? 'Ground Clearance (m):' : 'ارتفاع لبه پایین (متر):'}
              </label>
              <input
                type="number"
                step="0.05"
                min="0.3"
                max="2.5"
                value={groundClearanceM}
                onChange={(e) => setGroundClearanceM(parseFloat(e.target.value) || 0.5)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {isEn ? 'Array Azimuth (°):' : 'آزیموت آرایه (جنوب=۰):'}
              </label>
              <input
                type="number"
                step="1"
                min="-60"
                max="60"
                value={arrayAzimuthDeg}
                onChange={(e) => setArrayAzimuthDeg(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Obstacle Sizing */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasObstacle}
                  onChange={(e) => setHasObstacle(e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <span>{isEn ? 'Simulate Nearby Obstacle / Parapet' : 'شبیه‌سازی مانع مجاور (دیوار، درخت، پست)'}</span>
              </label>
            </div>
            {hasObstacle && (
              <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Height (m)' : 'ارتفاع (m)'}</span>
                  <input
                    type="number"
                    step="0.5"
                    value={obstacleHeightM}
                    onChange={(e) => setObstacleHeightM(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Distance (m)' : 'فاصله (m)'}</span>
                  <input
                    type="number"
                    step="0.5"
                    value={obstacleDistanceM}
                    onChange={(e) => setObstacleDistanceM(parseFloat(e.target.value) || 1)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{isEn ? 'Azimuth (°)' : 'زاویه (°)'}</span>
                  <input
                    type="number"
                    step="5"
                    value={obstacleAzimuthDeg}
                    onChange={(e) => setObstacleAzimuthDeg(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Col: Visual 2D Cross-Section SVG & Sun Simulation */}
        <div className="studio-card lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-700 pb-2">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              {isEn ? 'Geometric Shadow Ray Cross-Section' : 'برش مقطع هندسی زاویه تابش خورشید و سایه بین‌ردیفی'}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedSeason('winter')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedSeason === 'winter' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {isEn ? 'Winter Solstice (Dec 21)' : 'انقلاب زمستانی (۲۱ دسامبر)'}
              </button>
              <button
                onClick={() => setSelectedSeason('equinox')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedSeason === 'equinox' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {isEn ? 'Equinox (Mar 21)' : 'اعتدال بهاری (۲۱ مارس)'}
              </button>
              <button
                onClick={() => setSelectedSeason('summer')}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  selectedSeason === 'summer' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {isEn ? 'Summer Solstice (Jun 21)' : 'انقلاب تابستانی (۲۱ ژوئن)'}
              </button>
            </div>
          </div>

          {/* Time of Day Slider */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Solar Hour of Day:' : 'ساعت خورشیدی روز:'}
              </span>
              <span className="text-amber-400 font-mono font-bold text-sm">
                {activeHour.toString().padStart(2, '0')}:00
              </span>
              <span className="text-slate-400 text-[11px] font-mono">
                {isEn ? 'Sun Altitude:' : 'ارتفاع خورشید:'}{' '}
                <strong className="text-sky-300">{currentHourPoint.sunPosition.altitudeDeg}°</strong> |{' '}
                {isEn ? 'Azimuth:' : 'آزیموت:'}{' '}
                <strong className="text-sky-300">{currentHourPoint.sunPosition.azimuthDeg}°</strong>
              </span>
            </div>
            <input
              type="range"
              min="7"
              max="17"
              step="1"
              value={activeHour}
              onChange={(e) => setActiveHour(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>07:00</span>
              <span>09:00</span>
              <span>12:00 (Noon)</span>
              <span>15:00</span>
              <span>17:00</span>
            </div>
          </div>

          {/* SVG Diagram */}
          <div className="relative bg-slate-950/80 border border-slate-800 rounded-lg p-2 overflow-hidden flex items-center justify-center">
            <svg viewBox="0 0 700 240" className="w-full h-52 select-none">
              {/* Sky gradient background */}
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#0c1729" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="shadowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              <rect x="0" y="0" width="700" height="240" fill="url(#skyGrad)" />

              {/* Ground Line */}
              <line x1="20" y1="200" x2="680" y2="200" stroke="#475569" strokeWidth="2.5" />
              {/* Soil hatch */}
              {[40, 80, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 560, 600, 640].map((x) => (
                <line key={x} x1={x} y1="200" x2={x - 15} y2="218" stroke="#334155" strokeWidth="1.5" />
              ))}

              {/* Sun Indicator */}
              <g transform="translate(130, 40)">
                <circle cx="0" cy="0" r="16" fill="#fbbf24" filter="drop-shadow(0 0 12px #f59e0b)" />
                <line x1="-24" y1="0" x2="24" y2="0" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="0" y1="-24" x2="0" y2="24" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 3" />
                <text x="24" y="5" fill="#fef08a" fontSize="11" fontFamily="monospace">
                  {currentHourPoint.sunPosition.altitudeDeg}°
                </text>
              </g>

              {/* Row 1 (Front Row) */}
              {/* Post */}
              <line x1="220" y1="200" x2="220" y2="160" stroke="#94a3b8" strokeWidth="3" />
              {/* Tilted Panel Table 1 */}
              <line
                x1="180"
                y1="175"
                x2="255"
                y2="135"
                stroke="#0284c7"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <text x="180" y="125" fill="#38bdf8" fontSize="10" fontWeight="bold">
                {isEn ? 'Row 1 (South)' : 'ردیف ۱ (جنوب)'}
              </text>

              {/* Shadow from Row 1 onto Ground */}
              {currentHourPoint.shadowLengthOnGroundM > 0 && (
                <polygon
                  points={`255,135 255,200 ${Math.min(650, 255 + currentHourPoint.shadowLengthOnGroundM * 35)},200`}
                  fill="#000000"
                  fillOpacity="0.45"
                />
              )}

              {/* Row 2 (Rear Row) */}
              <g transform="translate(240, 0)">
                {/* Post */}
                <line x1="220" y1="200" x2="220" y2="160" stroke="#94a3b8" strokeWidth="3" />
                {/* Tilted Panel Table 2 */}
                <line
                  x1="180"
                  y1="175"
                  x2="255"
                  y2="135"
                  stroke="#0284c7"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <text x="180" y="125" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  {isEn ? 'Row 2 (North)' : 'ردیف ۲ (شمال)'}
                </text>

                {/* Shaded portion on Row 2 if any */}
                {currentHourPoint.shadedSlopedLengthM > 0 && (
                  <line
                    x1="180"
                    y1="175"
                    x2={180 + (currentHourPoint.shadedSlopedLengthM / tableSlopedWidthM) * 75}
                    y2={175 - (currentHourPoint.shadedSlopedLengthM / tableSlopedWidthM) * 40}
                    stroke="#ef4444"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                )}
              </g>

              {/* Sun rays streaming towards panels */}
              <line
                x1="145"
                y1="50"
                x2="255"
                y2="135"
                stroke="#fef08a"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeOpacity="0.7"
              />
              <line
                x1="255"
                y1="135"
                x2={Math.min(650, 255 + currentHourPoint.shadowLengthOnGroundM * 35)}
                y2="200"
                stroke="#f87171"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Dimension: Pitch */}
              <line x1="220" y1="215" x2="460" y2="215" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="220" y1="210" x2="220" y2="220" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="460" y1="210" x2="460" y2="220" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="320" y="230" fill="#38bdf8" fontSize="11" fontFamily="monospace" textAnchor="middle">
                Pitch = {pitchDistanceM} m
              </text>
            </svg>
          </div>

          {/* Hour Status Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[11px]">
                {isEn ? 'Linear Shadow Coverage' : 'درصد پوشش سایه خطی:'}
              </span>
              <strong className="text-base font-mono text-sky-400">
                {currentHourPoint.linearShadingFactorPct}%
              </strong>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[11px]">
                {isEn ? 'Bypass Diode Trigger' : 'تحریک دیودهای بای‌پاس:'}
              </span>
              <strong
                className={`text-xs font-semibold ${
                  currentHourPoint.isBypassDiodeTriggered ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {currentHourPoint.isBypassDiodeTriggered
                  ? isEn
                    ? 'Active (33-100% loss)'
                    : 'فعال (قطع رشته سلول)'
                  : isEn
                  ? 'All Off (100% Active)'
                  : 'غیرفعال (تولید کامل)'}
              </strong>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[11px]">
                {isEn ? 'Electrical Shading Loss' : 'تلفات توان الکتریکی:'}
              </span>
              <strong className="text-base font-mono text-amber-400">
                {currentHourPoint.netCombinedShadingLossPct}%
              </strong>
            </div>
            <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-slate-400 block text-[11px]">
                {isEn ? 'Ground Shadow Length' : 'طول سایه روی زمین:'}
              </span>
              <strong className="text-base font-mono text-slate-200">
                {currentHourPoint.shadowLengthOnGroundM} m
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Shading Matrix Table */}
      <div className="studio-card">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            {isEn ? '12-Month Shading & Derating Matrix (PVsyst Methodology)' : 'ماتریس ۱۲ ماهه تلفات سایه‌اندازی (متدولوژی PVsyst)'}
          </span>
          <span className="text-xs text-sky-400 font-mono">
            {isEn ? 'Annual Beam Loss:' : 'افت سالانه پرتو مستقیم:'}{' '}
            <strong>{shadingResult.annualGeometricBeamLossPct}%</strong> |{' '}
            {isEn ? 'Effective Derate Factor:' : 'ضریب اصلاح سالانه:'}{' '}
            <strong>{shadingResult.annualEffectiveShadingDerateFactor}</strong>
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300">
                <th className="p-2 border border-slate-700">{isEn ? 'Month' : 'ماه'}</th>
                {shadingResult.monthlyMatrix.map((m) => (
                  <th key={m.monthIndex} className="p-2 border border-slate-700 font-medium">
                    {isEn ? m.monthNameEn.substring(0, 3) : m.monthNameFa.split(' ')[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-700 font-semibold bg-slate-800/40 text-slate-300 text-right">
                  {isEn ? 'Beam Shading Loss (%)' : 'تلفات هندسی پرتو (%)'}
                </td>
                {shadingResult.monthlyMatrix.map((m) => (
                  <td
                    key={m.monthIndex}
                    className={`p-2 border border-slate-700 font-mono ${
                      m.averageBeamLossPct > 5
                        ? 'bg-rose-500/20 text-rose-300 font-bold'
                        : m.averageBeamLossPct > 2
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.averageBeamLossPct}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 border border-slate-700 font-semibold bg-slate-800/40 text-slate-300 text-right">
                  {isEn ? 'Electrical Mismatch (%)' : 'تلفات الکتریکی نهایی (%)'}
                </td>
                {shadingResult.monthlyMatrix.map((m) => (
                  <td
                    key={m.monthIndex}
                    className={`p-2 border border-slate-700 font-mono ${
                      m.averageElectricalLossPct > 10
                        ? 'bg-rose-500/30 text-rose-400 font-bold'
                        : m.averageElectricalLossPct > 4
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {m.averageElectricalLossPct}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Warnings & Engineering Recommendations */}
        {shadingResult.warningMessagesFa.length > 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1">
            {(isEn ? shadingResult.warningMessagesEn : shadingResult.warningMessagesFa).map((msg, idx) => (
              <p key={idx} className="text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>{msg}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
