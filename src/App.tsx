import React, { useState, useEffect } from 'react';
import { Sun, Calculator, Eye, Database, FolderGit2, CheckCircle2, Shield, Activity } from 'lucide-react';
import { QuickSizing } from './components/QuickSizing';
import { SizingCalculator } from './components/SizingCalculator';
import { ThreeJsViewer } from './components/ThreeJsViewer';
import { CatalogManager } from './components/CatalogManager';
import { EpcProposalModal } from './components/EpcProposalModal';

type ActiveTab = 'quick-sizing' | 'sizing-calc' | '3d-viewer' | 'catalog' | 'projects';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('quick-sizing');
  const [reportModalData, setReportModalData] = useState<any | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeTab]);

  const handleSyncNow = async () => {
    setSyncStatus('syncing');
    try {
      await fetch('/api/v1/sync/pull');
      await fetchProjects();
    } finally {
      setTimeout(() => setSyncStatus('synced'), 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg">
              <Sun className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">SolarPV Studio</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800/60">
                  v1.0 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Solar PV Design, 3D Shading Simulation & Engineering Sizing Suite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncNow}
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded"
              title="Local Sync Manager"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Engine Synced'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 sm:gap-2 overflow-x-auto text-sm font-medium border-t border-slate-800/60 pt-1">
          <button
            onClick={() => setActiveTab('quick-sizing')}
            className={`py-2 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'quick-sizing'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-400" />
            Quick Sizing
          </button>

          <button
            onClick={() => setActiveTab('sizing-calc')}
            className={`py-2 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'sizing-calc'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4 text-sky-400" />
            Sizing Calculator
          </button>

          <button
            onClick={() => setActiveTab('3d-viewer')}
            className={`py-2 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === '3d-viewer'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            3D Shading Viewer
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-2 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-400" />
            Equipment Catalog
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2 px-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-sky-400 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit2 className="w-4 h-4 text-purple-400" />
            Saved Projects ({projects.length})
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {activeTab === 'quick-sizing' && (
          <QuickSizing onOpenReport={(res) => setReportModalData(res)} />
        )}

        {activeTab === 'sizing-calc' && <SizingCalculator />}

        {activeTab === '3d-viewer' && <ThreeJsViewer />}

        {activeTab === 'catalog' && <CatalogManager />}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="studio-card">
              <h1 className="text-2xl font-bold text-sky-400 mb-1 flex items-center gap-2">
                <FolderGit2 className="w-6 h-6 text-sky-400" />
                Saved Solar Projects
              </h1>
              <p className="text-slate-400 text-sm">
                In-Memory Database & Local Offline Outbox Synced Repositories
              </p>
            </div>

            <div className="studio-card">
              {projects.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No projects saved yet. Create one via the Quick Sizing tab.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 bg-slate-900/70 border border-slate-700/80 rounded-lg hover:border-sky-500/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-white text-base">{p.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                            {p.systemCapacityKwp.toFixed(1)} kWp
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mb-3">ID: {p.id}</div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <div>
                            <span className="text-slate-400">Location:</span> {p.latitude.toFixed(2)}°, {p.longitude.toFixed(2)}°
                          </div>
                          <div>
                            <span className="text-slate-400">Daily Load:</span> {p.dailyLoadKwh} kWh/d
                          </div>
                          <div>
                            <span className="text-slate-400">Panels:</span> {p.panelCount} units
                          </div>
                          <div>
                            <span className="text-slate-400">LCOE:</span> ${p.lcoeUsdPerKwh.toFixed(4)}/kWh
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={() => setReportModalData(p)}
                          className="studio-btn-primary text-xs py-1.5 px-3"
                        >
                          View EPC Proposal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SolarPV Studio Engineering Core | IEC 62548 & IEEE 1547 Standards</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Shield className="w-3.5 h-3.5 text-sky-400" /> Certified Sizing Algorithm
          </span>
        </div>
      </footer>

      {/* EPC Proposal Modal */}
      {reportModalData && (
        <EpcProposalModal
          project={{
            projectId: reportModalData.projectId || reportModalData.id,
            projectName: reportModalData.projectName || reportModalData.name,
            systemCapacityKwp: reportModalData.systemCapacityKwp,
            panelCount: reportModalData.panelCount,
            inverterCount: reportModalData.inverterCount,
            batteryCount: reportModalData.batteryCount,
            lcoeUsdPerKwh: reportModalData.lcoeUsdPerKwh,
            estimatedAnnualYieldKwh: reportModalData.estimatedAnnualYieldKwh || 26000,
          }}
          onClose={() => setReportModalData(null)}
        />
      )}
    </div>
  );
};

export default App;
