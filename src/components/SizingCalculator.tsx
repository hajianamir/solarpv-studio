import React, { useState } from 'react';
import { Calculator, AlertTriangle, CheckCircle, Zap, TrendingUp, SunMedium } from 'lucide-react';

export const SizingCalculator: React.FC = () => {
  // 1. String Sizing State
  const [panelVoc, setPanelVoc] = useState<number>(50.0);
  const [panelVmp, setPanelVmp] = useState<number>(42.0);
  const [tempMinC, setTempMinC] = useState<number>(-10.0);
  const [inverterVdcMax, setInverterVdcMax] = useState<number>(1000.0);
  const [stringResult, setStringResult] = useState<{
    minModules: number;
    maxModules: number;
    hasWarning: boolean;
    warnings?: string[];
  } | null>(null);
  const [stringLoading, setStringLoading] = useState(false);

  // 2. Financial LCOE State
  const [capex, setCapex] = useState<number>(10000.0);
  const [opexAnnual, setOpexAnnual] = useState<number>(200.0);
  const [energyAnnual, setEnergyAnnual] = useState<number>(6000.0);
  const [discountRate, setDiscountRate] = useState<number>(0.05);
  const [lifetimeYears, setLifetimeYears] = useState<number>(25);
  const [lcoeResult, setLcoeResult] = useState<{ lcoeValue: number } | null>(null);
  const [lcoeLoading, setLcoeLoading] = useState(false);

  // 3. DC Cable Voltage Drop State
  const [cableLength, setCableLength] = useState<number>(45.0);
  const [cableCurrent, setCableCurrent] = useState<number>(13.5);
  const [cableCrossSection, setCableCrossSection] = useState<number>(4.0);
  const [nominalVoltage, setNominalVoltage] = useState<number>(650.0);
  const [voltageDropResult, setVoltageDropResult] = useState<{ voltageDropPct: number } | null>(null);
  const [voltageLoading, setVoltageLoading] = useState(false);

  // 4. Solar Position State
  const [calcLat, setCalcLat] = useState<number>(35.6895);
  const [calcLng, setCalcLng] = useState<number>(51.3890);
  const [solarPosResult, setSolarPosResult] = useState<{ zenithDeg: number; azimuthDeg: number } | null>(null);
  const [solarPosLoading, setSolarPosLoading] = useState(false);

  // Handlers
  const handleCalculateStringSizing = async () => {
    setStringLoading(true);
    try {
      const res = await fetch('/api/v1/electrical/string-sizing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelVoc: Number(panelVoc),
          panelVmp: Number(panelVmp),
          tempMinC: Number(tempMinC),
          tempMaxC: 60.0,
          betaVocPerC: -0.0028,
          inverterVdcMax: Number(inverterVdcMax),
          inverterMpptMin: 200.0,
          inverterMpptMax: 800.0,
        }),
      });
      const data = await res.json();
      setStringResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setStringLoading(false);
    }
  };

  const handleCalculateLcoe = async () => {
    setLcoeLoading(true);
    try {
      const res = await fetch('/api/v1/finance/lcoe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capex: Number(capex),
          opexAnnual: Number(opexAnnual),
          energyAnnual: Number(energyAnnual),
          discountRate: Number(discountRate),
          lifetimeYears: Number(lifetimeYears),
        }),
      });
      const data = await res.json();
      setLcoeResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLcoeLoading(false);
    }
  };

  const handleCalculateVoltageDrop = async () => {
    setVoltageLoading(true);
    try {
      const res = await fetch('/api/v1/electrical/voltage-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lengthM: Number(cableLength),
          currentA: Number(cableCurrent),
          crossSectionMm2: Number(cableCrossSection),
          vNominal: Number(nominalVoltage),
          rho: 0.0175, // Copper
        }),
      });
      const data = await res.json();
      setVoltageDropResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVoltageLoading(false);
    }
  };

  const handleCalculateSolarPos = async () => {
    setSolarPosLoading(true);
    try {
      const res = await fetch('/api/v1/solar/position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitudeDeg: Number(calcLat),
          longitudeDeg: Number(calcLng),
          utcTs: Math.floor(Date.now() / 1000),
        }),
      });
      const data = await res.json();
      setSolarPosResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setSolarPosLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="studio-card">
        <h1 className="text-2xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-sky-400" />
          SolarPV Studio — Sizing Calculator
        </h1>
        <p className="text-slate-400 text-sm">
          Phase 0 Cross-Platform Sizing Engine connected to ASP.NET Core & Rust FFI Backend
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. String Sizing Calculator */}
        <div className="studio-card">
          <h2 className="text-lg font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            1. String Sizing Calculator (IEC 62548)
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Panel Voc (V)</label>
              <input
                type="number"
                step="0.1"
                className="studio-input"
                value={panelVoc}
                onChange={(e) => setPanelVoc(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Panel Vmp (V)</label>
              <input
                type="number"
                step="0.1"
                className="studio-input"
                value={panelVmp}
                onChange={(e) => setPanelVmp(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Min Temp (°C)</label>
              <input
                type="number"
                className="studio-input"
                value={tempMinC}
                onChange={(e) => setTempMinC(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Inverter Max Vdc (V)</label>
              <input
                type="number"
                className="studio-input"
                value={inverterVdcMax}
                onChange={(e) => setInverterVdcMax(parseFloat(e.target.value) || 0)}
              />
            </div>

            <button
              onClick={handleCalculateStringSizing}
              disabled={stringLoading}
              className="studio-btn-primary w-full mt-2"
            >
              {stringLoading ? 'Calculating...' : 'Calculate String Sizing'}
            </button>

            {stringResult && (
              <div className="result-box text-sm">
                <h3 className="font-bold text-sky-300 mb-2">Result:</h3>
                <div className="space-y-1">
                  <p>
                    <strong>Min Modules per String:</strong>{' '}
                    <span className="text-emerald-400 font-mono text-base">{stringResult.minModules}</span>
                  </p>
                  <p>
                    <strong>Max Modules per String:</strong>{' '}
                    <span className="text-emerald-400 font-mono text-base">{stringResult.maxModules}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <strong>Has Warning:</strong>{' '}
                    {stringResult.hasWarning ? (
                      <span className="text-amber-400 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-4 h-4" /> True
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle className="w-4 h-4" /> False
                      </span>
                    )}
                  </p>
                  {stringResult.warnings && stringResult.warnings.length > 0 && (
                    <div className="text-xs text-amber-300 mt-2 bg-amber-950/40 p-2 rounded">
                      {stringResult.warnings.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Financial LCOE Calculator */}
        <div className="studio-card">
          <h2 className="text-lg font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            2. Financial LCOE Calculator
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Capex ($)</label>
              <input
                type="number"
                className="studio-input"
                value={capex}
                onChange={(e) => setCapex(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Annual Opex ($/yr)</label>
              <input
                type="number"
                className="studio-input"
                value={opexAnnual}
                onChange={(e) => setOpexAnnual(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Annual Energy (kWh/yr)</label>
              <input
                type="number"
                className="studio-input"
                value={energyAnnual}
                onChange={(e) => setEnergyAnnual(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Discount Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="studio-input"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Lifetime (Years)</label>
                <input
                  type="number"
                  className="studio-input"
                  value={lifetimeYears}
                  onChange={(e) => setLifetimeYears(parseInt(e.target.value) || 25)}
                />
              </div>
            </div>

            <button
              onClick={handleCalculateLcoe}
              disabled={lcoeLoading}
              className="studio-btn-primary w-full mt-2"
            >
              {lcoeLoading ? 'Calculating...' : 'Calculate LCOE'}
            </button>

            {lcoeResult && (
              <div className="result-box text-sm">
                <h3 className="font-bold text-sky-300 mb-1">Calculated LCOE:</h3>
                <div className="text-xl font-bold text-emerald-400 font-mono">
                  ${lcoeResult.lcoeValue.toFixed(4)} / kWh
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Based on {lifetimeYears}y horizon at {(discountRate * 100).toFixed(1)}% WACC discount rate
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. DC Cable Voltage Drop (IEC 60364-5-52) */}
        <div className="studio-card">
          <h2 className="text-lg font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            3. DC Cable Voltage Drop (IEC 60364-5-52)
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Length L (m)</label>
                <input
                  type="number"
                  className="studio-input"
                  value={cableLength}
                  onChange={(e) => setCableLength(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Current Imp (A)</label>
                <input
                  type="number"
                  step="0.1"
                  className="studio-input"
                  value={cableCurrent}
                  onChange={(e) => setCableCurrent(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Conductor (mm²)</label>
                <input
                  type="number"
                  step="0.5"
                  className="studio-input"
                  value={cableCrossSection}
                  onChange={(e) => setCableCrossSection(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">String Vmp (V)</label>
                <input
                  type="number"
                  className="studio-input"
                  value={nominalVoltage}
                  onChange={(e) => setNominalVoltage(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <button
              onClick={handleCalculateVoltageDrop}
              disabled={voltageLoading}
              className="studio-btn-primary w-full mt-2"
            >
              {voltageLoading ? 'Calculating...' : 'Calculate Voltage Drop'}
            </button>

            {voltageDropResult && (
              <div className="result-box text-sm">
                <h3 className="font-bold text-sky-300 mb-1">Voltage Drop Result:</h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {voltageDropResult.voltageDropPct.toFixed(3)}%
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    voltageDropResult.voltageDropPct <= 1.5 ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'bg-amber-950 text-amber-400 border border-amber-700'
                  }`}>
                    {voltageDropResult.voltageDropPct <= 1.5 ? 'IEC Compliant (≤ 1.5%)' : 'Exceeds 1.5% Guideline'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Real-time Solar Position (NOAA) */}
        <div className="studio-card">
          <h2 className="text-lg font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <SunMedium className="w-5 h-5 text-amber-400" />
            4. Solar Position Calculator (NOAA)
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Latitude (°)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="studio-input"
                  value={calcLat}
                  onChange={(e) => setCalcLat(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Longitude (°)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="studio-input"
                  value={calcLng}
                  onChange={(e) => setCalcLng(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <button
              onClick={handleCalculateSolarPos}
              disabled={solarPosLoading}
              className="studio-btn-primary w-full mt-2"
            >
              {solarPosLoading ? 'Calculating...' : 'Compute Solar Angles'}
            </button>

            {solarPosResult && (
              <div className="result-box text-sm">
                <h3 className="font-bold text-sky-300 mb-1">NOAA Coordinates:</h3>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm mt-1">
                  <div>
                    <span className="text-slate-400">Zenith:</span>{' '}
                    <span className="text-white font-bold">{solarPosResult.zenithDeg.toFixed(2)}°</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Azimuth:</span>{' '}
                    <span className="text-white font-bold">{solarPosResult.azimuthDeg.toFixed(2)}°</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
