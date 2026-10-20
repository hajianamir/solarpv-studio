import React, { useState } from 'react';
import { Grid, Layers, MapPin, ZoomIn, ZoomOut, Check, Maximize2, Shield, Compass } from 'lucide-react';
import {
  generatePowerplantLayout,
  PowerplantCadParameters,
  RackingStructureType,
  PowerplantCadLayoutResult,
} from '../engine/powerplantCadLayout';

export const PowerplantCadLayoutTab: React.FC = () => {
  const [structureType, setStructureType] = useState<RackingStructureType>('fixed_tilt');
  const [landLengthM, setLandLengthM] = useState<number>(300);
  const [landWidthM, setLandWidthM] = useState<number>(200);
  const [rowPitchM, setRowPitchM] = useState<number>(8.5);
  const [arrayTiltDeg, setArrayTiltDeg] = useState<number>(28);
  const [moduleWattage, setModuleWattage] = useState<number>(585);
  const [roadWidthM, setRoadWidthM] = useState<number>(6.0);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  const cadResult: PowerplantCadLayoutResult = generatePowerplantLayout({
    structureType,
    landLengthM,
    landWidthM,
    arrayTiltDeg,
    arrayAzimuthDeg: 0,
    rowPitchM,
    moduleWattage,
    moduleLengthM: 2.278,
    moduleWidthM: 1.134,
    roadWidthM,
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Grid className="w-5 h-5 text-amber-400" />
          طراحی آرایش دوبعدی نیروگاه خورشیدی (2D/3D Powerplant CAD Layout & Siting)
        </h1>
        <p className="text-slate-400 text-xs">
          چیدمان خودکار استراکچرهای فیکس یا ترکر تک‌محوره، محاسبه نسبت پوشش زمین (GCR)، زاویه بحرانی سایه‌اندازی و جانمایی پست‌های فشار متوسط
        </p>
      </div>

      {/* Control Parameters */}
      <div className="studio-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">نوع استراکچر نگهدارنده:</label>
            <select
              value={structureType}
              onChange={(e) => setStructureType(e.target.value as RackingStructureType)}
              className="studio-input text-xs"
            >
              <option value="fixed_tilt">سازه ثابت شیب‌دار (Fixed-Tilt 2P)</option>
              <option value="single_axis_tracker">ترکر هوشمند تک‌محوره (1P Tracker)</option>
              <option value="east_west_rooftop">سازه شرقی-غربی سقف سوله (East-West)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">طول زمین / سقف سوله (m):</label>
            <input
              type="number"
              step="10"
              value={landLengthM}
              onChange={(e) => setLandLengthM(Math.max(50, parseFloat(e.target.value) || 100))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">عرض زمین / سقف سوله (m):</label>
            <input
              type="number"
              step="10"
              value={landWidthM}
              onChange={(e) => setLandWidthM(Math.max(50, parseFloat(e.target.value) || 100))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">فاصله مرکز به مرکز ردیف‌ها (Pitch m):</label>
            <input
              type="number"
              step="0.5"
              value={rowPitchM}
              onChange={(e) => setRowPitchM(Math.max(3.0, parseFloat(e.target.value) || 6))}
              className="studio-input font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">زاویه شیب پنل‌ها (°):</label>
            <input
              type="number"
              step="1"
              value={arrayTiltDeg}
              onChange={(e) => setArrayTiltDeg(parseInt(e.target.value) || 25)}
              className="studio-input font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">توان نامی هر پنل (Watt):</label>
            <input
              type="number"
              step="5"
              value={moduleWattage}
              onChange={(e) => setModuleWattage(parseFloat(e.target.value) || 580)}
              className="studio-input font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-semibold mb-1">عرض جاده‌های دسترسی (m):</label>
            <input
              type="number"
              step="1"
              value={roadWidthM}
              onChange={(e) => setRoadWidthM(parseFloat(e.target.value) || 6)}
              className="studio-input font-mono"
            />
          </div>
          <div className="flex items-end">
            <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-700/60 w-full">
              ابعاد میز: {cadResult.tableConfig.tableLengthM}m × {cadResult.tableConfig.tableWidthM}m ({cadResult.tableConfig.totalModulesPerTable} پنل)
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ظرفیت کل نامی نیروگاه (DC)</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {cadResult.installedCapacityDcMwp.toFixed(2)} <span className="text-xs font-normal text-slate-300">MWp</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cadResult.totalModulesCount.toLocaleString()} عدد پنل</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">ظرفیت تزریق به شبکه (AC)</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {cadResult.installedCapacityAcMw.toFixed(2)} <span className="text-xs font-normal text-slate-300">MWac</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">DC/AC = 1.25x</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">نسبت پوشش زمین (GCR)</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {(cadResult.groundCoverageRatioGcr * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {cadResult.groundCoverageRatioGcr <= 0.45 ? '✓ بدون سایه بحرانی' : 'متراکم'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">مساحت کل عرصه زمین</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {cadResult.totalLandAreaHectares} <span className="text-xs font-normal text-slate-300">هکتار</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cadResult.totalLandAreaM2.toLocaleString()} m²</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">زاویه حد سایه‌اندازی (Limit)</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {cadResult.shadingLimitAngleDeg}°
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">ساعت ۹ صبح زمستان</div>
        </div>
      </div>

      {/* Interactive 2D CAD Canvas */}
      <div className="studio-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            نقشه برداری CAD جانمایی استراکچرها، جاده‌ها و پست‌های فشار متوسط
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-center">
          <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
            <svg width="860" height="420" viewBox="0 0 860 420" className="select-none font-sans">
              {/* Land Boundary */}
              <rect x="20" y="20" width="820" height="380" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="2" strokeDasharray="5 5" />
              <text x="35" y="42" fill="#64748b" fontSize="11" fontWeight="bold">مرز زمین پروژه ({landLengthM}m × {landWidthM}m - {cadResult.totalLandAreaHectares} Hectares)</text>

              {/* Perimeter Road & Buffer */}
              <rect x="40" y="55" width="780" height="325" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" opacity="0.6" />

              {/* Main Access Central Corridor */}
              <line x1="430" y1="55" x2="430" y2="380" stroke="#f59e0b" strokeWidth="6" strokeDasharray="8 4" opacity="0.7" />
              <text x="435" y="75" fill="#f59e0b" fontSize="9" fontWeight="bold">جاده مرکزی اصلی ({roadWidthM}m)</text>

              {/* Racking Table Rows (stylized representation of East-West tables) */}
              {[90, 130, 170, 210, 250, 290, 330].map((y, rowIdx) => (
                <g key={rowIdx}>
                  {/* Left Block Tables */}
                  {[60, 130, 200, 270, 340].map((x, colIdx) => (
                    <g key={`l-${colIdx}`}>
                      <rect
                        x={x}
                        y={y}
                        width="58"
                        height="20"
                        rx="2"
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth="0.8"
                        opacity="0.85"
                      />
                      {/* String dividing line */}
                      <line x1={x + 29} y1={y} x2={x + 29} y2={y + 20} stroke="#0f172a" strokeWidth="0.8" />
                    </g>
                  ))}

                  {/* Right Block Tables */}
                  {[450, 520, 590, 660, 730].map((x, colIdx) => (
                    <g key={`r-${colIdx}`}>
                      <rect
                        x={x}
                        y={y}
                        width="58"
                        height="20"
                        rx="2"
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth="0.8"
                        opacity="0.85"
                      />
                      <line x1={x + 29} y1={y} x2={x + 29} y2={y + 20} stroke="#0f172a" strokeWidth="0.8" />
                    </g>
                  ))}
                </g>
              ))}

              {/* MV Power Station Skids (Centrally Sited) */}
              <g>
                <rect x="405" y="190" width="50" height="40" rx="4" fill="#10b981" stroke="#34d399" strokeWidth="1.5" />
                <text x="430" y="210" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">MV Skid</text>
                <text x="430" y="222" textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="bold">3.125 MVA</text>
              </g>

              {/* Substation Interconnection Point */}
              <g>
                <rect x="730" y="25" width="80" height="26" rx="4" fill="#a855f7" stroke="#c084fc" strokeWidth="1.5" />
                <text x="770" y="42" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="bold">پست اتصال 20kV</text>
              </g>

              {/* Compass North Arrow */}
              <g transform="translate(80, 80)">
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                <polygon points="0,-12 4,2 0,0 -4,2" fill="#ef4444" />
                <polygon points="0,12 4,-2 0,0 -4,-2" fill="#94a3b8" />
                <text x="0" y="-14" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">N</text>
              </g>
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-sm bg-sky-500"></span> میزهای فتوولتائیک ({cadResult.tableConfig.orientation})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-sm bg-emerald-500"></span> پست تجمیع فشار متوسط (MV Skid)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 rounded-sm bg-purple-500"></span> نقطه اتصال به شبکه (Point of Common Coupling)
            </span>
          </div>

          <div className="font-mono text-slate-300">
            تعداد کل میزها: <strong className="text-white">{cadResult.totalTablesCount}</strong> | ترانشه کابل DC: <strong className="text-amber-400">~{cadResult.estimatedDcTrenchCableKm} km</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
