import React from 'react';
import { X, Printer, ShieldCheck, Sun, Zap, Battery as BatteryIcon, DollarSign, Calendar } from 'lucide-react';

interface EpcProposalProps {
  project: {
    projectId: string;
    projectName: string;
    systemCapacityKwp: number;
    panelCount: number;
    inverterCount: number;
    batteryCount: number;
    lcoeUsdPerKwh: number;
    estimatedAnnualYieldKwh: number;
  };
  onClose: () => void;
}

export const EpcProposalModal: React.FC<EpcProposalProps> = ({ project, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-6 text-slate-100 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-sky-400 font-bold mb-1">
              Engineering, Procurement & Construction (EPC)
            </div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sun className="w-6 h-6 text-amber-400" />
              SolarPV Studio — Design Proposal
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="studio-btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <Printer className="w-4 h-4 text-sky-400" /> Print / Export PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Project Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-lg border border-slate-700/60 mb-6 text-sm">
          <div>
            <span className="text-xs text-slate-400 block">Project Name:</span>
            <span className="font-bold text-white">{project.projectName}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Project Reference ID:</span>
            <span className="font-mono text-xs text-sky-400">{project.projectId}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Proposal Date:</span>
            <span className="text-slate-300 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Specifications Table */}
        <div className="overflow-hidden border border-slate-700 rounded-lg mb-6">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">Component / Metric</th>
                <th className="py-3 px-4 font-semibold">Specification / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-300 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" /> System Capacity (DC)
                </td>
                <td className="py-3 px-4 font-mono font-bold text-white text-base">
                  {project.systemCapacityKwp.toFixed(2)} kWp
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-300 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-sky-400" /> PV Solar Modules
                </td>
                <td className="py-3 px-4 text-slate-200">
                  {project.panelCount} x 575W N-Type Bifacial Monocrystalline Modules
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" /> String Inverters
                </td>
                <td className="py-3 px-4 text-slate-200">
                  {project.inverterCount} x 10kW String Inverters (Three-Phase, Dual MPPT)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-300 flex items-center gap-2">
                  <BatteryIcon className="w-4 h-4 text-indigo-400" /> Battery Energy Storage
                </td>
                <td className="py-3 px-4 text-slate-200">
                  {project.batteryCount} x 10.2kWh LiFePO4 Energy Storage Units
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Estimated Annual Generation
                </td>
                <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-base">
                  {Math.round(project.estimatedAnnualYieldKwh).toLocaleString()} kWh/year
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-4 font-medium text-slate-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" /> Levelized Cost of Energy (LCOE)
                </td>
                <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-base">
                  ${project.lcoeUsdPerKwh.toFixed(4)} / kWh
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Traceability & Compliance */}
        <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/60 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-sky-400 mb-2">
            <ShieldCheck className="w-4 h-4" /> Engineering Standards Compliance
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            <div>• <strong>IEC 62548:2024:</strong> PV Array Sizing & Protection Guidelines</div>
            <div>• <strong>IEC 60364-5-52:</strong> DC Cable Current & Voltage Drop Constraints</div>
            <div>• <strong>IEEE 1547-2018:</strong> DER Grid Interconnection & Ride-Through</div>
            <div>• <strong>IEC 61643-32:</strong> Type 1/2 Surge Protection Device Dimensioning</div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-800">
          Generated by SolarPV Studio Core Simulation Engine | Certified EPC Engineering Specification
        </div>
      </div>
    </div>
  );
};
