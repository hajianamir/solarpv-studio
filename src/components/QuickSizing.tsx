import React, { useState, useEffect } from 'react';
import { Sun, Battery as BatteryIcon, Cpu, Zap, DollarSign, FileText, CheckCircle2, RefreshCw } from 'lucide-react';

interface QuickSizingResult {
  projectId: string;
  projectName: string;
  systemCapacityKwp: number;
  panelCount: number;
  inverterCount: number;
  batteryCount: number;
  lcoeUsdPerKwh: number;
  estimatedAnnualYieldKwh: number;
}

interface QuickSizingProps {
  onOpenReport?: (result: QuickSizingResult) => void;
}

export const QuickSizing: React.FC<QuickSizingProps> = ({ onOpenReport }) => {
  const [projectName, setProjectName] = useState('Tehran Villa System');
  const [latitude, setLatitude] = useState<number>(35.6895);
  const [longitude, setLongitude] = useState<number>(51.3890);
  const [dailyKwh, setDailyKwh] = useState<number>(20.0);
  const [autonomyDays, setAutonomyDays] = useState<number>(1.5);

  const [modules, setModules] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);

  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedInverter, setSelectedInverter] = useState<string>('');
  const [selectedBattery, setSelectedBattery] = useState<string>('');

  const [result, setResult] = useState<QuickSizingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch hardware catalog
    Promise.all([
      fetch('/api/v1/catalog/modules').then(r => r.json()).catch(() => []),
      fetch('/api/v1/catalog/inverters').then(r => r.json()).catch(() => []),
      fetch('/api/v1/catalog/batteries').then(r => r.json()).catch(() => []),
    ]).then(([modData, invData, batData]) => {
      setModules(modData);
      setInverters(invData);
      setBatteries(batData);
      if (modData.length > 0) setSelectedModule(modData[0].id);
      if (invData.length > 0) setSelectedInverter(invData[0].id);
      if (batData.length > 0) setSelectedBattery(batData[0].id);
    });
  }, []);

  const handleRunQuickSizing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/projects/quick-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          latitude: Number(latitude),
          longitude: Number(longitude),
          dailyKwh: Number(dailyKwh),
          autonomyDays: Number(autonomyDays),
          moduleId: selectedModule,
          inverterId: selectedInverter,
          batteryId: selectedBattery,
        }),
      });

      if (!res.ok) {
        throw new Error(`Calculation failed with status ${res.status}`);
      }
      const data: QuickSizingResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing sizing calculation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="studio-card">
        <h1 className="text-2xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Sun className="w-6 h-6 text-amber-400" />
          SolarPV Studio — Quick PV Sizing
        </h1>
        <p className="text-slate-400 text-sm">
          Phase 1 Vertical Slice: End-to-end solar array, battery storage, and financial LCOE sizing engine
        </p>
      </div>

      {/* Inputs Form */}
      <div className="studio-card">
        <h2 className="text-xl font-semibold text-sky-400 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-400" />
          Project Location & Energy Requirements
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-300">Project Name</label>
            <input
              type="text"
              className="studio-input"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-300">Daily Consumption (kWh/day)</label>
            <input
              type="number"
              step="0.5"
              className="studio-input"
              value={dailyKwh}
              onChange={(e) => setDailyKwh(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-300">Latitude (°)</label>
            <input
              type="number"
              step="0.0001"
              className="studio-input"
              value={latitude}
              onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-300">Longitude (°)</label>
            <input
              type="number"
              step="0.0001"
              className="studio-input"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold text-slate-300">Autonomy Days (Days)</label>
            <input
              type="number"
              step="0.5"
              className="studio-input"
              value={autonomyDays}
              onChange={(e) => setAutonomyDays(parseFloat(e.target.value) || 0)}
            />
          </div>

          {modules.length > 0 && (
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-300">PV Module Model</label>
              <select
                className="studio-input"
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
              >
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.manufacturer} {m.modelName} ({m.pmpWatts}W)
                  </option>
                ))}
              </select>
            </div>
          )}

          {inverters.length > 0 && (
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-300">Inverter Model</label>
              <select
                className="studio-input"
                value={selectedInverter}
                onChange={(e) => setSelectedInverter(e.target.value)}
              >
                {inverters.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.manufacturer} {inv.modelName} ({inv.pnomAcKw}kW)
                  </option>
                ))}
              </select>
            </div>
          )}

          {batteries.length > 0 && (
            <div>
              <label className="block mb-1 text-sm font-semibold text-slate-300">Battery Model</label>
              <select
                className="studio-input"
                value={selectedBattery}
                onChange={(e) => setSelectedBattery(e.target.value)}
              >
                {batteries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.manufacturer} {b.modelName} ({b.capacityKwh}kWh)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunQuickSizing}
            disabled={loading}
            className="studio-btn-primary flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : (
              'Calculate System Sizing'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Result Box */}
        {result && (
          <div className="result-box mt-6 animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-sky-400">
                  Sizing Results for "{result.projectName}"
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Project ID: {result.projectId}
                </span>
              </div>
              {onOpenReport && (
                <button
                  onClick={() => onOpenReport(result)}
                  className="studio-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  View EPC Proposal
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-200 text-sm">
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded border border-slate-700/60">
                <Sun className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">System Capacity</div>
                  <div className="font-bold text-white text-base">
                    {result.systemCapacityKwp.toFixed(2)} kWp
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded border border-slate-700/60">
                <Cpu className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Solar Array Configuration</div>
                  <div className="font-bold text-white text-base">
                    {result.panelCount} x 575W N-Type Panels
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded border border-slate-700/60">
                <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">String Inverters</div>
                  <div className="font-bold text-white text-base">
                    {result.inverterCount} x 10kW String Inverters
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded border border-slate-700/60">
                <BatteryIcon className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Battery Storage Bank</div>
                  <div className="font-bold text-white text-base">
                    {result.batteryCount} x 10.2kWh LiFePO4 Units
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded border border-slate-700/60">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Estimated Annual Generation</div>
                  <div className="font-bold text-white text-base">
                    {Math.round(result.estimatedAnnualYieldKwh).toLocaleString()} kWh/yr
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded border border-slate-700/60">
                <DollarSign className="w-5 h-5 text-green-400 shrink-0" />
                <div>
                  <div className="text-xs text-slate-400">Levelized Cost of Energy (LCOE)</div>
                  <div className="font-bold text-white text-base">
                    ${result.lcoeUsdPerKwh.toFixed(4)} / kWh
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
