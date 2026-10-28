import React, { useState } from 'react';
import { Grid, Layers, MapPin, ZoomIn, ZoomOut, Check, Maximize2, Shield, Compass } from 'lucide-react';
import {
  generatePowerplantLayout,
  PowerplantCadParameters,
  RackingStructureType,
  PowerplantCadLayoutResult,
} from '../engine/powerplantCadLayout';

interface PowerplantCadLayoutTabProps {
  lang?: 'fa' | 'en';
}

export const PowerplantCadLayoutTab: React.FC<PowerplantCadLayoutTabProps> = ({ lang = 'fa' }) => {
  const isEn = lang === 'en';
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
          {isEn
            ? '2D Powerplant CAD Layout & Civil Siting'
            : 'طراحی آرایش دوبعدی نیروگاه خورشیدی (2D/3D Powerplant CAD Layout & Siting)'}
        </h1>
        <p className="text-slate-400 text-xs">
          {isEn
            ? 'Automated spatial racking layout for fixed-tilt or 1P single-axis trackers, Ground Coverage Ratio (GCR), inter-row shading limit angle, and MV substation positioning.'
            : 'چیدمان خودکار استراکچرهای فیکس یا ترکر تک‌محوره، محاسبه نسبت پوشش زمین (GCR)، زاویه بحرانی سایه‌اندازی و جانمایی پست‌های فشار متوسط'}
        </p>
      </div>

      {/* Control Parameters Grid */}
      <div className="studio-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Racking Structure Type:' : 'نوع استراکچر نگهدارنده:'}
            </label>
            <select
              value={structureType}
              onChange={(e) => setStructureType(e.target.value as RackingStructureType)}
              className="studio-input text-xs"
            >
              <option value="fixed_tilt">{isEn ? 'Fixed-Tilt Ground (2P)' : 'سازه ثابت شیب‌دار (Fixed-Tilt 2P)'}</option>
              <option value="single_axis_tracker">{isEn ? 'Smart 1P Single-Axis Tracker' : 'ترکر هوشمند تک‌محوره (1P Tracker)'}</option>
              <option value="east_west_rooftop">{isEn ? 'East-West Rooftop Shed' : 'سازه شرقی-غربی سقف سوله (East-West)'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Land Length (m):' : 'طول زمین / سقف سوله (m):'}
            </label>
            <input
              type="number"
              step="10"
              value={landLengthM}
              onChange={(e) => setLandLengthM(Math.max(50, parseFloat(e.target.value) || 100))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Land Width (m):' : 'عرض زمین / سقف سوله (m):'}
            </label>
            <input
              type="number"
              step="10"
              value={landWidthM}
              onChange={(e) => setLandWidthM(Math.max(30, parseFloat(e.target.value) || 60))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Row Pitch Spacing (m):' : 'فاصله بین ردیف‌ها (Pitch m):'}
            </label>
            <input
              type="number"
              step="0.5"
              value={rowPitchM}
              onChange={(e) => setRowPitchM(Math.max(3.0, parseFloat(e.target.value) || 5.0))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Tilt Angle (°):' : 'زاویه شیب استراکچر (°):'}
            </label>
            <input
              type="number"
              step="1"
              value={arrayTiltDeg}
              onChange={(e) => setArrayTiltDeg(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Module Rating (Wp):' : 'توان نامی هر پنل (Wp):'}
            </label>
            <input
              type="number"
              step="5"
              value={moduleWattage}
              onChange={(e) => setModuleWattage(Math.max(300, parseInt(e.target.value) || 580))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Access Road Width (m):' : 'عرض جاده‌های دسترسی (m):'}
            </label>
            <input
              type="number"
              step="0.5"
              value={roadWidthM}
              onChange={(e) => setRoadWidthM(Math.max(3.0, parseFloat(e.target.value) || 4.0))}
              className="studio-input font-mono"
            />
          </div>

          <div className="flex items-end">
            <div className="p-2.5 bg-slate-900 border border-slate-700/80 rounded-lg w-full text-center">
              <span className="text-[10px] text-slate-400 block">{isEn ? 'Estimated Capacity:' : 'ظرفیت کل زمین:'}</span>
              <span className="text-base font-bold font-mono text-amber-400">
                {cadResult.installedCapacityDcMwp.toFixed(2)} MWp
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Total Module Count' : 'تعداد کل پنل‌ها'}</div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {cadResult.totalModulesCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isEn ? `${cadResult.totalTablesCount} Racking Tables` : `${cadResult.totalTablesCount} میز استراکچر`}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Ground Coverage Ratio (GCR)' : 'نسبت پوشش زمین (GCR)'}</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            {(cadResult.groundCoverageRatioGcr * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {cadResult.groundCoverageRatioGcr <= 0.45
              ? isEn
                ? '✓ Optimal (No critical shadow)'
                : '✓ بدون سایه بحرانی'
              : isEn
              ? 'Dense layout'
              : 'متراکم'}
          </div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Total Land Footprint' : 'مساحت کل عرصه زمین'}</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {cadResult.totalLandAreaHectares} <span className="text-xs font-normal text-slate-300">{isEn ? 'Ha' : 'هکتار'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cadResult.totalLandAreaM2.toLocaleString()} m²</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-700/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Shading Limit Angle' : 'زاویه حد سایه‌اندازی (Limit)'}</div>
          <div className="text-xl font-bold font-mono text-teal-400 mt-1">
            {cadResult.shadingLimitAngleDeg}°
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isEn ? 'Winter 9:00 AM Criterion' : 'ساعت ۹ صبح زمستان'}
          </div>
        </div>
      </div>

      {/* Interactive 2D CAD Canvas */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            {isEn
              ? 'CAD Spatial Layout of PV Tables, Internal Roads & MV Substations'
              : 'نقشه‌برداری CAD جانمایی استراکچرها، جاده‌ها و پست‌های فشار متوسط'}
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.1))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(1.5, prev + 0.1))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-center">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
          >
            <svg width="860" height="420" viewBox="0 0 860 420" className="select-none font-sans min-w-[700px]">
              {/* Land Boundary */}
              <rect
                x="20"
                y="20"
                width="820"
                height="380"
                rx="8"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <text x="35" y="42" fill="#64748b" fontSize="11" fontWeight="bold">
                {isEn
                  ? `Project Boundary (${landLengthM}m × ${landWidthM}m - ${cadResult.totalLandAreaHectares} Ha)`
                  : `مرز زمین پروژه (${landLengthM}m × ${landWidthM}m - ${cadResult.totalLandAreaHectares} هکتار)`}
              </text>

              {/* Perimeter Road & Buffer */}
              <rect x="40" y="55" width="780" height="325" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1" opacity="0.6" />

              {/* Main Access Central Corridor */}
              <line x1="430" y1="55" x2="430" y2="380" stroke="#f59e0b" strokeWidth="6" strokeDasharray="8 4" opacity="0.7" />
              <text x="435" y="75" fill="#f59e0b" fontSize="9" fontWeight="bold">
                {isEn ? `Main Central Access Corridor (${roadWidthM}m)` : `جاده مرکزی اصلی (${roadWidthM}m)`}
              </text>

              {/* Racking Table Rows */}
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
                        strokeWidth="1"
                        opacity="0.85"
                      />
                      <line x1={x + 29} y1={y} x2={x + 29} y2={y + 20} stroke="#0369a1" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Right Block Tables */}
                  {[460, 530, 600, 670, 740].map((x, colIdx) => (
                    <g key={`r-${colIdx}`}>
                      <rect
                        x={x}
                        y={y}
                        width="58"
                        height="20"
                        rx="2"
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth="1"
                        opacity="0.85"
                      />
                      <line x1={x + 29} y1={y} x2={x + 29} y2={y + 20} stroke="#0369a1" strokeWidth="1" />
                    </g>
                  ))}
                </g>
              ))}

              {/* MV Substation Inverter Skid Station (Center) */}
              <rect
                x="400"
                y="190"
                width="60"
                height="45"
                rx="4"
                fill="#8b5cf6"
                stroke="#c084fc"
                strokeWidth="2"
              />
              <text x="430" y="210" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
                {isEn ? 'MV Sub' : 'پست MV'}
              </text>
              <text x="430" y="224" fill="#ddd6fe" fontSize="8" textAnchor="middle">
                20/33 kV
              </text>

              {/* North Arrow Compass Indicator */}
              <g transform="translate(800, 70)">
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                <polygon points="0,-13 4,0 0,-3 -4,0" fill="#ef4444" />
                <polygon points="0,13 4,0 0,3 -4,0" fill="#94a3b8" />
                <text x="0" y="-17" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">
                  N
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 bg-sky-500 rounded-sm"></span>{' '}
              {isEn ? 'Solar PV Mounting Tables (2P / 1P)' : 'میزهای استراکچر فتوولتائیک (2P یا 1P)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3 bg-purple-500 rounded-sm"></span>{' '}
              {isEn ? 'MV Transformer & Inverter Substation' : 'پست ترانسفورماتور و اینورتر فشار متوسط (MV)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-1 bg-amber-500"></span>{' '}
              {isEn ? 'Internal Service & Maintenance Roads' : 'جاده‌های اصلی و راهروهای تعمیر و نگهداری'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            CAD Coordinate Scale: 1px = {Math.round(landLengthM / 820 * 10) / 10}m
          </div>
        </div>
      </div>
    </div>
  );
};
export default PowerplantCadLayoutTab;
