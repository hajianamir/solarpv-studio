import React, { useState } from 'react';
import { Grid, Layers, MapPin, ZoomIn, ZoomOut, Check, Maximize2, Shield, Compass, Download } from 'lucide-react';
import {
  generatePowerplantLayout,
  generatePowerplantDxf,
  type PowerplantCadParameters,
  type RackingStructureType,
  type PowerplantCadLayoutResult,
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

  const layoutParams: PowerplantCadParameters = {
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
  };

  const cadResult: PowerplantCadLayoutResult = generatePowerplantLayout(layoutParams);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
          <Grid className="w-5 h-5 text-industrial-warning" />
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
            <label htmlFor="cad-structure-type" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Racking Structure Type:' : 'نوع استراکچر نگهدارنده:'}
            </label>
            <select
              id="cad-structure-type"
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
            <label htmlFor="cad-land-length-m" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Land Length (m):' : 'طول زمین / سقف سوله (m):'}
            </label>
            <input
              id="cad-land-length-m"
              type="number"
              step="10"
              value={landLengthM}
              onChange={(e) => setLandLengthM(Math.max(50, parseFloat(e.target.value) || 100))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="cad-land-width-m" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Land Width (m):' : 'عرض زمین / سقف سوله (m):'}
            </label>
            <input
              id="cad-land-width-m"
              type="number"
              step="10"
              value={landWidthM}
              onChange={(e) => setLandWidthM(Math.max(30, parseFloat(e.target.value) || 60))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="cad-row-pitch-m" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Row Pitch Spacing (m):' : 'فاصله بین ردیف‌ها (Pitch m):'}
            </label>
            <input
              id="cad-row-pitch-m"
              type="number"
              step="0.5"
              value={rowPitchM}
              onChange={(e) => setRowPitchM(Math.max(3.0, parseFloat(e.target.value) || 5.0))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="cad-array-tilt-deg" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Tilt Angle (°):' : 'زاویه شیب استراکچر (°):'}
            </label>
            <input
              id="cad-array-tilt-deg"
              type="number"
              step="1"
              value={arrayTiltDeg}
              onChange={(e) => setArrayTiltDeg(Math.max(0, Math.min(60, parseInt(e.target.value) || 0)))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="cad-module-wattage" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Module Rating (Wp):' : 'توان نامی هر پنل (Wp):'}
            </label>
            <input
              id="cad-module-wattage"
              type="number"
              step="5"
              value={moduleWattage}
              onChange={(e) => setModuleWattage(Math.max(300, parseInt(e.target.value) || 580))}
              className="studio-input font-mono"
            />
          </div>

          <div>
            <label htmlFor="cad-road-width-m" className="block text-slate-300 font-semibold mb-1">
              {isEn ? 'Access Road Width (m):' : 'عرض جاده‌های دسترسی (m):'}
            </label>
            <input
              id="cad-road-width-m"
              type="number"
              step="0.5"
              value={roadWidthM}
              onChange={(e) => setRoadWidthM(Math.max(3.0, parseFloat(e.target.value) || 4.0))}
              className="studio-input font-mono"
            />
          </div>

          <div className="flex items-end">
            <div className="p-2.5 bg-industrial-surface border border-industrial-border/80 rounded-lg w-full text-center">
              <span className="text-[10px] text-slate-400 block">{isEn ? 'Estimated Capacity:' : 'ظرفیت کل زمین:'}</span>
              <span className="text-base font-bold font-mono text-industrial-warning">
                {cadResult.installedCapacityDcMwp.toFixed(2)} MWp
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Total Module Count' : 'تعداد کل پنل‌ها'}</div>
          <div className="text-xl font-bold font-mono text-industrial-warning mt-1">
            {cadResult.totalModulesCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isEn ? `${cadResult.totalTablesCount} Racking Tables` : `${cadResult.totalTablesCount} میز استراکچر`}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Ground Coverage Ratio (GCR)' : 'نسبت پوشش زمین (GCR)'}</div>
          <div className="text-xl font-bold font-mono text-industrial-accent mt-1">
            {(cadResult.groundCoverageRatioGcr * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {cadResult.groundCoverageRatioGcr <= 0.45
              ? isEn
                ? '✓ Optimal (No critical )'
                : '✓ بدون سایه بحرانی'
              : isEn
              ? 'Dense layout'
              : 'متراکم'}
          </div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
          <div className="text-xs text-slate-400">{isEn ? 'Total Land Footprint' : 'مساحت کل عرصه زمین'}</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">
            {cadResult.totalLandAreaHectares} <span className="text-xs font-normal text-slate-300">{isEn ? 'Ha' : 'هکتار'}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cadResult.totalLandAreaM2.toLocaleString()} m²</div>
        </div>

        <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
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
          <h3 className="font-bold text-industrial-accent text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-industrial-accent" />
            {isEn
              ? 'True-Scale CAD Spatial Layout of PV Tables & Civil Infrastructure'
              : 'نقشه‌برداری CAD جانمایی مهندسی با مقیاس واقعی استراکچرها و زیرساخت'}
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => {
                const dxfString = generatePowerplantDxf(cadResult, layoutParams);
                const blob = new Blob([dxfString], { type: 'application/dxf' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `SolarPV_CAD_Layout_${landLengthM}x${landWidthM}m.dxf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="px-2.5 py-1 bg-sky-700 hover:bg-sky-600 text-white font-medium rounded flex items-center gap-1.5 transition-colors border border-sky-500/50"
              title={isEn ? 'Export true-scale AutoCAD DXF file' : 'دریافت فایل استاندارد اتوکد DXF با لایه‌بندی کامل مهندسی'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Export DXF' : 'خروجی فایل اتوکد (DXF)'}</span>
            </button>
            <div className="h-4 w-px bg-industrial-border mx-1" />
            <button
              onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.1))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-industrial-border"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-slate-300 px-1">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(1.5, prev + 0.1))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-industrial-border"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Engineering Scale Disclosure Notice */}
        <div className="mb-2 px-3 py-1.5 bg-sky-950/40 border border-sky-800/40 rounded text-[11px] text-sky-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {isEn
                ? `True Engineering Scale: 1px = ${(1 / Math.min((860 - 70) / landLengthM, (420 - 90) / landWidthM)).toFixed(2)}m | Rendering ${cadResult.tables.length} physical tables (${cadResult.rowsCount} rows × ${cadResult.tablesPerRow} cols)`
                : `مقیاس مهندسی واقعی: هر پیکسل معادل ${(1 / Math.min((860 - 70) / landLengthM, (420 - 90) / landWidthM)).toFixed(2)} متر | جانمایی ${cadResult.tables.length} میز فیزیکی واقعی (${cadResult.rowsCount} ردیف در ${cadResult.tablesPerRow} ستون)`}
            </span>
          </div>
          <span className="text-slate-400 text-[10px]">AutoCAD DXF R15 Compliant</span>
        </div>

        <div className="overflow-x-auto bg-industrial-bg p-4 rounded-lg border border-industrial-border flex justify-center">
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease',
            }}
          >
            {(() => {
              const svgW = 860;
              const svgH = 420;
              const padX = 35;
              const padY = 45;
              const maxDrawW = svgW - 2 * padX;
              const maxDrawH = svgH - 2 * padY;
              const scale = Math.min(maxDrawW / landLengthM, maxDrawH / landWidthM);
              const boundaryW = landLengthM * scale;
              const boundaryH = landWidthM * scale;
              const startX = padX + (maxDrawW - boundaryW) / 2;
              const startY = padY + (maxDrawH - boundaryH) / 2;
              const midXM = landLengthM / 2;

              return (
                <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="select-none font-sans min-w-[700px]">
                  {/* Land Boundary */}
                  <rect
                    x={startX}
                    y={startY}
                    width={boundaryW}
                    height={boundaryH}
                    rx="4"
                    fill="#0f172a"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text x={startX + 10} y={startY - 10} fill="#94a3b8" fontSize="11" fontWeight="bold">
                    {isEn
                      ? `Project Boundary (${landLengthM}m × ${landWidthM}m — ${cadResult.totalLandAreaHectares} Ha)`
                      : `محدوده واقعی زمین (${landLengthM}m × ${landWidthM}m — ${cadResult.totalLandAreaHectares} هکتار)`}
                  </text>

                  {/* Perimeter Road & Setback Buffer */}
                  {boundaryW > 24 * scale && boundaryH > 24 * scale && (
                    <rect
                      x={startX + 6 * scale}
                      y={startY + 6 * scale}
                      width={boundaryW - 12 * scale}
                      height={boundaryH - 12 * scale}
                      rx="3"
                      fill="#1e293b"
                      stroke="#475569"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  )}

                  {/* Main Access Central Corridor */}
                  <rect
                    x={startX + (midXM - roadWidthM / 2) * scale}
                    y={startY + 6 * scale}
                    width={Math.max(4, roadWidthM * scale)}
                    height={Math.max(0, boundaryH - 12 * scale)}
                    fill="#f59e0b"
                    opacity="0.25"
                  />
                  <line
                    x1={startX + midXM * scale}
                    y1={startY + 6 * scale}
                    x2={startX + midXM * scale}
                    y2={startY + boundaryH - 6 * scale}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    opacity="0.8"
                  />

                  {/* Dynamically Placed PV Tables matching Land Dimensions & Table Counts */}
                  {cadResult.tables.map((tbl) => {
                    const tx = startX + tbl.xM * scale;
                    const ty = startY + tbl.yM * scale;
                    const tw = Math.max(2, tbl.lengthM * scale);
                    const th = Math.max(1.5, tbl.widthM * scale);
                    return (
                      <g key={tbl.id}>
                        <rect
                          x={tx}
                          y={ty}
                          width={tw}
                          height={th}
                          rx={tw > 10 ? 1 : 0}
                          fill="#0284c7"
                          stroke="#38bdf8"
                          strokeWidth={tw > 15 ? 0.75 : 0.4}
                          opacity="0.88"
                        />
                        {tw > 25 && (
                          <line
                            x1={tx + tw / 2}
                            y1={ty}
                            x2={tx + tw / 2}
                            y2={ty + th}
                            stroke="#0369a1"
                            strokeWidth="0.5"
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Central MV Power Station Skid */}
                  <rect
                    x={startX + (midXM - 6) * scale}
                    y={startY + 12 * scale}
                    width={Math.max(12, 12 * scale)}
                    height={Math.max(8, 8 * scale)}
                    rx="2"
                    fill="#8b5cf6"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                  />
                  <text
                    x={startX + midXM * scale}
                    y={startY + 12 * scale + Math.max(6, 5 * scale)}
                    fill="#ffffff"
                    fontSize={Math.max(7, Math.min(10, 8 * scale))}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    MV Skid
                  </text>

                  {/* North Arrow Compass Indicator */}
                  <g transform={`translate(${svgW - 40}, 45)`}>
                    <circle cx="0" cy="0" r="15" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                    <polygon points="0,-12 4,0 0,-3 -4,0" fill="#ef4444" />
                    <polygon points="0,12 4,0 0,3 -4,0" fill="#94a3b8" />
                    <text x="0" y="-15" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">
                      N
                    </text>
                  </g>
                </svg>
              );
            })()}
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
              <span className="w-4 h-1 bg-industrial-warning"></span>{' '}
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
