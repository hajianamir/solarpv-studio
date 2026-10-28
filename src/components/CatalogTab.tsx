import React, { useState } from 'react';
import { Database, Search, Filter, Plus, Check, X, Sparkles, Layers, Cpu, Battery as BatteryIcon } from 'lucide-react';
import {
  getFullModulesCatalog,
  getFullInvertersCatalog,
  getFullBatteriesCatalog,
  saveCustomModule,
  saveCustomInverter,
  saveCustomBattery,
  CatalogPvModule,
  CatalogInverter,
  CatalogBattery,
} from '../engine/equipmentCatalogData';

interface CatalogTabProps {
  lang?: 'fa' | 'en';
}

export const CatalogTab: React.FC<CatalogTabProps> = ({ lang = 'fa' }) => {
  const isFa = lang === 'fa';
  const [activeTab, setActiveTab] = useState<'modules' | 'inverters' | 'batteries'>('modules');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');

  const [customModules, setCustomModules] = useState<CatalogPvModule[]>(getFullModulesCatalog());
  const [customInverters, setCustomInverters] = useState<CatalogInverter[]>(getFullInvertersCatalog());
  const [customBatteries, setCustomBatteries] = useState<CatalogBattery[]>(getFullBatteriesCatalog());

  // Add Equipment Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Form States for Custom Module
  const [modManufacturer, setModManufacturer] = useState('');
  const [modModel, setModModel] = useState('');
  const [modPmpWatts, setModPmpWatts] = useState(585);
  const [modVoc, setModVoc] = useState(51.2);
  const [modVmp, setModVmp] = useState(42.5);
  const [modIsc, setModIsc] = useState(14.3);
  const [modImp, setModImp] = useState(13.6);
  const [modCellType, setModCellType] = useState<'N-Type TOPCon' | 'P-Type PERC' | 'HJT Bifacial'>('N-Type TOPCon');

  // Form States for Custom Inverter
  const [invManufacturer, setInvManufacturer] = useState('');
  const [invModel, setInvModel] = useState('');
  const [invPnomKw, setInvPnomKw] = useState(330);
  const [invTech, setInvTech] = useState<'string_inverter' | 'mv_turnkey' | 'hybrid_offgrid' | 'grid_tied'>('string_inverter');
  const [invVdcMax, setInvVdcMax] = useState(1500);
  const [invVmpptMin, setInvVmpptMin] = useState(500);
  const [invVmpptMax, setInvVmpptMax] = useState(1500);
  const [invMpptCount, setInvMpptCount] = useState(6);
  const [invMvKv, setInvMvKv] = useState(20);

  // Form States for Custom Battery
  const [batManufacturer, setBatManufacturer] = useState('');
  const [batModel, setBatModel] = useState('');
  const [batChemistry, setBatChemistry] = useState<'LiFePO4' | 'Gel Deep Cycle' | 'AGM VRLA' | 'Ternary NCM'>('LiFePO4');
  const [batCapacityKwh, setBatCapacityKwh] = useState(5.12);
  const [batNominalVoltage, setBatNominalVoltage] = useState(51.2);
  const [batNominalAh, setBatNominalAh] = useState(100);
  const [batDoDPct, setBatDoDPct] = useState(90);

  // Add Handlers
  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modManufacturer || !modModel) return;
    const newMod: CatalogPvModule = {
      id: `custom-mod-${Date.now()}`,
      manufacturer: modManufacturer.trim(),
      modelName: modModel.trim(),
      cellType: modCellType,
      pmpWatts: Number(modPmpWatts),
      vocVolts: Number(modVoc),
      vmpVolts: Number(modVmp),
      iscAmps: Number(modIsc),
      impAmps: Number(modImp),
      efficiencyPct: 22.4,
      tempCoeffVocPct: -0.25,
      tempCoeffPmpPct: -0.29,
      lengthMm: 2278,
      widthMm: 1134,
      weightKg: 28.5,
      warrantyYears: 25,
    };
    saveCustomModule(newMod);
    setCustomModules([...customModules, newMod]);
    setShowAddModal(false);
  };

  const handleAddInverter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invManufacturer || !invModel) return;
    const newInv: CatalogInverter = {
      id: `custom-inv-${Date.now()}`,
      manufacturer: invManufacturer.trim(),
      modelName: invModel.trim(),
      type: invTech === 'mv_turnkey' ? 'central' : 'grid_tied',
      technology: invTech,
      pnomKw: Number(invPnomKw),
      maxPvInputKw: Number(invPnomKw) * 1.35,
      vdcMaxVolts: Number(invVdcMax),
      vmpptMinVolts: Number(invVmpptMin),
      vmpptMaxVolts: Number(invVmpptMax),
      mpptCount: Number(invMpptCount),
      batteryVoltageVdc: invTech === 'hybrid_offgrid' ? 48 : 0,
      isThreePhase: true,
      parallelCapable: true,
      maxParallelUnits: 50,
      efficiencyMaxPct: 99.0,
      weightKg: invTech === 'mv_turnkey' ? 18000 : 110,
      mvOutputVoltageKv: invTech === 'mv_turnkey' ? Number(invMvKv) : undefined,
    };
    saveCustomInverter(newInv);
    setCustomInverters([...customInverters, newInv]);
    setShowAddModal(false);
  };

  const handleAddBattery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batManufacturer || !batModel) return;
    const newBat: CatalogBattery = {
      id: `custom-bat-${Date.now()}`,
      manufacturer: batManufacturer.trim(),
      modelName: batModel.trim(),
      chemistry: batChemistry,
      capacityKwh: Number(batCapacityKwh),
      nominalVoltageVolts: Number(batNominalVoltage),
      nominalCapacityAh: Number(batNominalAh),
      recommendedDoDPct: Number(batDoDPct),
      cycleLifeAt80DoD: batChemistry === 'LiFePO4' ? 6000 : 1200,
      maxContinuousDischargeA: Number(batNominalAh),
      weightKg: 45,
      hasIntegratedBms: batChemistry === 'LiFePO4',
    };
    saveCustomBattery(newBat);
    setCustomBatteries([...customBatteries, newBat]);
    setShowAddModal(false);
  };

  // Filter modules
  const filteredModules = customModules.filter((m) => {
    const matchesSearch =
      m.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cellType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || m.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter inverters
  const filteredInverters = customInverters.filter((i) => {
    const matchesSearch =
      i.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.technology && i.technology.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBrand = selectedBrand === 'all' || i.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter batteries
  const filteredBatteries = customBatteries.filter((b) => {
    const matchesSearch =
      b.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.chemistry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || b.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Unique brand lists
  const moduleBrands = ['all', ...Array.from(new Set(customModules.map((m) => m.manufacturer)))];
  const inverterBrands = ['all', ...Array.from(new Set(customInverters.map((i) => i.manufacturer)))];
  const batteryBrands = ['all', ...Array.from(new Set(customBatteries.map((b) => b.manufacturer)))];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400 shrink-0" />
              {isFa
                ? 'کتابخانه جامع تجهیزات خورشیدی و ادوات بازار ایران و جهان (Equipment Catalog)'
                : 'Comprehensive Equipment Catalog (Tier-1 Modules, Inverters & BESS)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isFa
                ? 'بانک اطلاعاتی بیش از ۱۰۰ پنل N-Type TOPCon/HJT، اینورترهای رشته‌ای و پست‌های یکپارچه MV Turnkey و باتری‌های BESS با امکان ثبت تجهیز دلخواه.'
                : 'Database of 2024-2026 Tier-1 PV modules, high-capacity string & MV Turnkey stations, and utility BESS with custom equipment registration.'}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="studio-btn-primary text-xs py-2 px-3.5 flex items-center gap-2 rounded-lg font-bold shadow-lg shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {isFa ? 'افزودن تجهیز دلخواه جدید به کاتالوگ' : 'Add Custom Equipment to Catalog'}
          </button>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex overflow-x-auto border-b border-slate-700 pb-1 sm:pb-0 gap-1">
            <button
              onClick={() => {
                setActiveTab('modules');
                setSelectedBrand('all');
              }}
              className={`py-2 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'modules'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {isFa ? `پنل‌های خورشیدی (${customModules.length})` : `PV Modules (${customModules.length})`}
            </button>
            <button
              onClick={() => {
                setActiveTab('inverters');
                setSelectedBrand('all');
              }}
              className={`py-2 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'inverters'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              {isFa ? `اینورترها (${customInverters.length})` : `Inverters (${customInverters.length})`}
            </button>
            <button
              onClick={() => {
                setActiveTab('batteries');
                setSelectedBrand('all');
              }}
              className={`py-2 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'batteries'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BatteryIcon className="w-3.5 h-3.5" />
              {isFa ? `باتری‌ها و BESS (${customBatteries.length})` : `BESS Batteries (${customBatteries.length})`}
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute top-2.5 ${isFa ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                placeholder={isFa ? 'جستجو بر اساس مدل یا برند...' : 'Search model, brand or tech...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`studio-input text-xs py-1.5 w-full sm:w-56 ${isFa ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
              />
            </div>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="studio-input text-xs py-1.5"
            >
              <option value="all">{isFa ? 'همه برندها' : 'All Brands'}</option>
              {(activeTab === 'modules'
                ? moduleBrands
                : activeTab === 'inverters'
                ? inverterBrands
                : batteryBrands
              )
                .filter((b) => b !== 'all')
                .map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Content Tables */}
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          {activeTab === 'modules' && (
            <table className={`w-full text-xs text-slate-300 min-w-[760px] ${isFa ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">{isFa ? 'سازنده' : 'Manufacturer'}</th>
                  <th className="p-2.5">{isFa ? 'مدل ماژول' : 'Module Model'}</th>
                  <th className="p-2.5">{isFa ? 'فناوری سلول' : 'Cell Technology'}</th>
                  <th className="p-2.5">{isFa ? 'توان نامی (Wp)' : 'P_nom (Wp)'}</th>
                  <th className="p-2.5">{isFa ? 'ولتاژ مدار باز (Voc)' : 'Voc (V)'}</th>
                  <th className="p-2.5">{isFa ? 'ولتاژ کارکرد (Vmp)' : 'Vmp (V)'}</th>
                  <th className="p-2.5">{isFa ? 'جریان اتصال کوتاه (Isc)' : 'Isc (A)'}</th>
                  <th className="p-2.5">{isFa ? 'جریان کارکرد (Imp)' : 'Imp (A)'}</th>
                  <th className="p-2.5">{isFa ? 'راندمان' : 'Efficiency'}</th>
                  <th className="p-2.5">{isFa ? 'ابعاد (mm)' : 'Dimensions (mm)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredModules.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-2.5 font-bold text-white">{m.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{m.modelName}</td>
                    <td className="p-2.5 text-[11px] text-slate-400">{m.cellType}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{m.pmpWatts} W</td>
                    <td className="p-2.5 font-mono">{m.vocVolts} V</td>
                    <td className="p-2.5 font-mono">{m.vmpVolts} V</td>
                    <td className="p-2.5 font-mono">{m.iscAmps} A</td>
                    <td className="p-2.5 font-mono">{m.impAmps} A</td>
                    <td className="p-2.5 font-mono text-amber-300 font-bold">{m.efficiencyPct}%</td>
                    <td className="p-2.5 text-[11px] text-slate-400 font-mono">
                      {m.lengthMm} × {m.widthMm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'inverters' && (
            <table className={`w-full text-xs text-slate-300 min-w-[760px] ${isFa ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">{isFa ? 'سازنده' : 'Manufacturer'}</th>
                  <th className="p-2.5">{isFa ? 'مدل اینورتر' : 'Inverter Model'}</th>
                  <th className="p-2.5">{isFa ? 'فناوری / پکیج' : 'Technology / Skid'}</th>
                  <th className="p-2.5">{isFa ? 'توان AC' : 'Rated AC Power'}</th>
                  <th className="p-2.5">{isFa ? 'ولتاژ خروجی AC/MV' : 'AC Output Voltage'}</th>
                  <th className="p-2.5">{isFa ? 'حداکثر Vdc' : 'Max Vdc'}</th>
                  <th className="p-2.5">{isFa ? 'محدوده MPPT' : 'MPPT Window'}</th>
                  <th className="p-2.5">{isFa ? 'تعداد MPPT' : 'MPPT Inputs'}</th>
                  <th className="p-2.5">{isFa ? 'بازدهی' : 'Efficiency'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInverters.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-2.5 font-bold text-white">{i.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{i.modelName}</td>
                    <td className="p-2.5 text-[11px]">
                      {i.technology === 'mv_turnkey' ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          {isFa ? 'پست یکپارچه (MV Turnkey Skid)' : 'MV Turnkey Skid Station'}
                        </span>
                      ) : i.technology === 'string_inverter' ? (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                          {isFa ? 'اینورتر رشته‌ای (String)' : 'String Inverter'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">
                      {i.pnomKw >= 1000 ? `${(i.pnomKw / 1000).toFixed(2)} MW` : `${i.pnomKw} kW`}
                    </td>
                    <td className="p-2.5 font-mono text-amber-300 font-bold">
                      {i.mvOutputVoltageKv ? `${i.mvOutputVoltageKv} kV (MV)` : i.acVoltageVac ? `${i.acVoltageVac} V` : '400 V'}
                    </td>
                    <td className="p-2.5 font-mono text-red-300">{i.vdcMaxVolts} V</td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {i.vmpptMinVolts}V - {i.vmpptMaxVolts}V
                    </td>
                    <td className="p-2.5 font-mono text-sky-400">{i.mpptCount} MPPT</td>
                    <td className="p-2.5 font-mono text-amber-300 font-bold">{i.efficiencyMaxPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'batteries' && (
            <table className={`w-full text-xs text-slate-300 min-w-[760px] ${isFa ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">{isFa ? 'سازنده' : 'Manufacturer'}</th>
                  <th className="p-2.5">{isFa ? 'مدل باتری' : 'Battery Model'}</th>
                  <th className="p-2.5">{isFa ? 'شیمی باتری' : 'Chemistry'}</th>
                  <th className="p-2.5">{isFa ? 'ظرفیت ناخالص' : 'Gross Energy'}</th>
                  <th className="p-2.5">{isFa ? 'ولتاژ نامی' : 'Nominal Voltage'}</th>
                  <th className="p-2.5">{isFa ? 'آمپر ساعت (Ah)' : 'Capacity (Ah)'}</th>
                  <th className="p-2.5">{isFa ? 'عمق دشارژ (DoD)' : 'DoD (%)'}</th>
                  <th className="p-2.5">{isFa ? 'طول عمر سیکلی' : 'Cycle Life'}</th>
                  <th className="p-2.5">{isFa ? 'BMS هوشمند' : 'Smart BMS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBatteries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="p-2.5 font-bold text-white">{b.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{b.modelName}</td>
                    <td className="p-2.5 text-[11px] text-slate-300">{b.chemistry}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">
                      {b.capacityKwh >= 1000 ? `${(b.capacityKwh / 1000).toFixed(2)} MWh` : `${b.capacityKwh} kWh`}
                    </td>
                    <td className="p-2.5 font-mono">{b.nominalVoltageVolts} V</td>
                    <td className="p-2.5 font-mono">{b.nominalCapacityAh} Ah</td>
                    <td className="p-2.5 font-mono text-sky-400 font-bold">{b.recommendedDoDPct}%</td>
                    <td className="p-2.5 font-mono text-purple-300">{b.cycleLifeAt80DoD} {isFa ? 'سیکل' : 'cycles'}</td>
                    <td className="p-2.5 text-slate-300">
                      {b.hasIntegratedBms ? (
                        <span className="text-emerald-400 font-semibold">{isFa ? 'دارد (CAN/RS485)' : 'Yes (CAN/RS485)'}</span>
                      ) : (
                        <span className="text-slate-500">{isFa ? 'ندارد' : 'External'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD CUSTOM EQUIPMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sky-400 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                {isFa ? 'تعریف و ثبت تجهیز جدید در کاتالوگ مهندسی' : 'Register New Custom Equipment in Catalog'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector in modal */}
            <div className="flex gap-2 mb-4 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('modules')}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  activeTab === 'modules'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isFa ? 'پنل خورشیدی' : 'PV Module'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('inverters')}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  activeTab === 'inverters'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isFa ? 'اینورتر' : 'Inverter'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('batteries')}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  activeTab === 'batteries'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isFa ? 'باتری' : 'Battery'}
              </button>
            </div>

            {/* MODULE FORM */}
            {activeTab === 'modules' && (
              <form onSubmit={handleAddModule} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'نام سازنده (برند):' : 'Manufacturer (Brand):'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Trina Solar"
                      value={modManufacturer}
                      onChange={(e) => setModManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'نام مدل دقیق:' : 'Model Name:'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vertex N 605W"
                      value={modModel}
                      onChange={(e) => setModModel(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'توان (Wp):' : 'P_nom (Wp):'}</label>
                    <input
                      type="number"
                      required
                      value={modPmpWatts}
                      onChange={(e) => setModPmpWatts(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'Voc (ولت):' : 'Voc (V):'}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={modVoc}
                      onChange={(e) => setModVoc(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'Vmp (ولت):' : 'Vmp (V):'}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={modVmp}
                      onChange={(e) => setModVmp(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'Isc (آمپر):' : 'Isc (A):'}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={modIsc}
                      onChange={(e) => setModIsc(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'Imp (آمپر):' : 'Imp (A):'}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={modImp}
                      onChange={(e) => setModImp(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'فناوری سلول:' : 'Cell Type:'}</label>
                    <select
                      value={modCellType}
                      onChange={(e) => setModCellType(e.target.value as any)}
                      className="studio-input w-full"
                    >
                      <option value="N-Type TOPCon">N-Type TOPCon</option>
                      <option value="P-Type PERC">P-Type PERC</option>
                      <option value="HJT Bifacial">HJT Bifacial</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    {isFa ? 'ثبت در کاتالوگ' : 'Save Module'}
                  </button>
                </div>
              </form>
            )}

            {/* INVERTER FORM */}
            {activeTab === 'inverters' && (
              <form onSubmit={handleAddInverter} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'سازنده اینورتر:' : 'Manufacturer:'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sungrow"
                      value={invManufacturer}
                      onChange={(e) => setInvManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'مدل اینورتر:' : 'Inverter Model:'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SG350HX"
                      value={invModel}
                      onChange={(e) => setInvModel(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'تکنولوژی اینورتر:' : 'Technology Type:'}</label>
                    <select
                      value={invTech}
                      onChange={(e) => setInvTech(e.target.value as any)}
                      className="studio-input w-full"
                    >
                      <option value="string_inverter">{isFa ? 'اینورتر رشته‌ای (String)' : 'String Inverter'}</option>
                      <option value="mv_turnkey">{isFa ? 'پست یکپارچه (MV Turnkey Skid Station)' : 'MV Turnkey Skid Station'}</option>
                      <option value="grid_tied">{isFa ? 'متصل به شبکه معمولی (Grid-Tied)' : 'Grid-Tied Standard'}</option>
                      <option value="hybrid_offgrid">{isFa ? 'هیبرید / با باتری (Hybrid/Offgrid)' : 'Hybrid / Storage'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'توان نامی AC (kW):' : 'Rated AC Power (kW):'}</label>
                    <input
                      type="number"
                      required
                      value={invPnomKw}
                      onChange={(e) => setInvPnomKw(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'حداکثر Vdc:' : 'Max Vdc:'}</label>
                    <input
                      type="number"
                      required
                      value={invVdcMax}
                      onChange={(e) => setInvVdcMax(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'حداقل MPPT (V):' : 'Min MPPT (V):'}</label>
                    <input
                      type="number"
                      required
                      value={invVmpptMin}
                      onChange={(e) => setInvVmpptMin(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'حداکثر MPPT (V):' : 'Max MPPT (V):'}</label>
                    <input
                      type="number"
                      required
                      value={invVmpptMax}
                      onChange={(e) => setInvVmpptMax(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                {invTech === 'mv_turnkey' && (
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'ولتاژ خروجی فشار متوسط (kV):' : 'MV Output Voltage (kV):'}</label>
                    <input
                      type="number"
                      value={invMvKv}
                      onChange={(e) => setInvMvKv(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    {isFa ? 'ثبت اینورتر' : 'Save Inverter'}
                  </button>
                </div>
              </form>
            )}

            {/* BATTERY FORM */}
            {activeTab === 'batteries' && (
              <form onSubmit={handleAddBattery} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'برند باتری:' : 'Manufacturer (Brand):'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BYD / CATL"
                      value={batManufacturer}
                      onChange={(e) => setBatManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'مدل باتری:' : 'Model Name:'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MC Cube-T 5MWh"
                      value={batModel}
                      onChange={(e) => setBatModel(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'شیمی باتری:' : 'Battery Chemistry:'}</label>
                    <select
                      value={batChemistry}
                      onChange={(e) => setBatChemistry(e.target.value as any)}
                      className="studio-input w-full"
                    >
                      <option value="LiFePO4">LiFePO4 (Lithium Iron Phosphate)</option>
                      <option value="Gel Deep Cycle">Gel Deep Cycle</option>
                      <option value="AGM VRLA">AGM VRLA Sealed Lead Acid</option>
                      <option value="Ternary NCM">Ternary NCM Lithium</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'ظرفیت انرژی (kWh):' : 'Energy Capacity (kWh):'}</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={batCapacityKwh}
                      onChange={(e) => setBatCapacityKwh(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'ولتاژ نامی (V):' : 'Nominal V (V):'}</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={batNominalVoltage}
                      onChange={(e) => setBatNominalVoltage(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'ظرفیت (Ah):' : 'Capacity (Ah):'}</label>
                    <input
                      type="number"
                      required
                      value={batNominalAh}
                      onChange={(e) => setBatNominalAh(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">{isFa ? 'عمق دشارژ (%):' : 'DoD (%):'}</label>
                    <input
                      type="number"
                      required
                      value={batDoDPct}
                      onChange={(e) => setBatDoDPct(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    {isFa ? 'ثبت باتری' : 'Save Battery'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
