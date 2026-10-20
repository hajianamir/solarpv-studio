import React, { useState, useEffect } from 'react';
import { Database, Plus, Check, RefreshCw } from 'lucide-react';

export const CatalogManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'modules' | 'inverters' | 'batteries'>('modules');
  const [modules, setModules] = useState<any[]>([]);
  const [inverters, setInverters] = useState<any[]>([]);
  const [batteries, setBatteries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New module form
  const [modManufacturer, setModManufacturer] = useState('');
  const [modModel, setModModel] = useState('');
  const [modPmp, setModPmp] = useState(550);
  const [modVoc, setModVoc] = useState(49.8);
  const [modVmp, setModVmp] = useState(41.5);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [mRes, iRes, bRes] = await Promise.all([
        fetch('/api/v1/catalog/modules').then(r => r.json()),
        fetch('/api/v1/catalog/inverters').then(r => r.json()),
        fetch('/api/v1/catalog/batteries').then(r => r.json()),
      ]);
      setModules(mRes);
      setInverters(iRes);
      setBatteries(bRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/v1/catalog/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer: modManufacturer || 'Custom PV',
          modelName: modModel || 'Solar Pro 550W',
          pmpWatts: Number(modPmp),
          vocVolts: Number(modVoc),
          vmpVolts: Number(modVmp),
          iscAmps: 13.9,
          impAmps: 13.25,
          betaVocPerC: -0.0028,
        }),
      });
      setShowAddModal(false);
      fetchCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="studio-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-sky-400 mb-1 flex items-center gap-2">
              <Database className="w-6 h-6 text-sky-400" />
              SolarPV Component Catalog
            </h1>
            <p className="text-slate-400 text-sm">
              Standardized Photovoltaic Modules, String Inverters, and LiFePO4 Battery Banks
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="studio-btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
          >
            <Plus className="w-4 h-4" /> Add Component
          </button>
        </div>
      </div>

      <div className="studio-card">
        <div className="flex border-b border-slate-700 mb-4">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'modules'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            PV Modules ({modules.length})
          </button>
          <button
            onClick={() => setActiveTab('inverters')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'inverters'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Inverters ({inverters.length})
          </button>
          <button
            onClick={() => setActiveTab('batteries')}
            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'batteries'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Battery Banks ({batteries.length})
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading catalog...
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'modules' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Manufacturer</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Power (Pmp)</th>
                    <th className="p-3">Voc (V)</th>
                    <th className="p-3">Vmp (V)</th>
                    <th className="p-3">Temp Coeff β</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {modules.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-semibold text-white">{m.manufacturer}</td>
                      <td className="p-3 text-sky-300">{m.modelName}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{m.pmpWatts} W</td>
                      <td className="p-3 font-mono">{m.vocVolts} V</td>
                      <td className="p-3 font-mono">{m.vmpVolts} V</td>
                      <td className="p-3 font-mono text-xs">{m.betaVocPerC}/°C</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'inverters' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Manufacturer</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">AC Power</th>
                    <th className="p-3">Max Vdc</th>
                    <th className="p-3">MPPT Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {inverters.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-semibold text-white">{inv.manufacturer}</td>
                      <td className="p-3 text-sky-300">{inv.modelName}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{inv.pnomAcKw} kW</td>
                      <td className="p-3 font-mono">{inv.vdcMaxVolts} V</td>
                      <td className="p-3 font-mono text-xs">
                        {inv.vmpptMinVolts}V - {inv.vmpptMaxVolts}V
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'batteries' && (
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Manufacturer</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Usable Capacity</th>
                    <th className="p-3">Nominal Voltage</th>
                    <th className="p-3">Max DOD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {batteries.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-semibold text-white">{b.manufacturer}</td>
                      <td className="p-3 text-sky-300">{b.modelName}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{b.capacityKwh} kWh</td>
                      <td className="p-3 font-mono">{b.nominalVoltageVolts} V</td>
                      <td className="p-3 font-mono text-xs">{(b.depthOfDischargeMax * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Component Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-sky-400 mb-3">Add Photovoltaic Module</h3>
            <form onSubmit={handleAddModule} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Manufacturer</label>
                <input
                  type="text"
                  required
                  className="studio-input"
                  value={modManufacturer}
                  onChange={(e) => setModManufacturer(e.target.value)}
                  placeholder="e.g. Canadian Solar"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  className="studio-input"
                  value={modModel}
                  onChange={(e) => setModModel(e.target.value)}
                  placeholder="e.g. HiKu7 Mono 550W"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pmp (W)</label>
                  <input
                    type="number"
                    className="studio-input"
                    value={modPmp}
                    onChange={(e) => setModPmp(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Voc (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="studio-input"
                    value={modVoc}
                    onChange={(e) => setModVoc(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vmp (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="studio-input"
                    value={modVmp}
                    onChange={(e) => setModVmp(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="studio-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="studio-btn-primary text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Save to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
