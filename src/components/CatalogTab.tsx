import React, { useState } from 'react';
import { Database, Search, Filter, Plus, Check, X, Sparkles } from 'lucide-react';
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

export const CatalogTab: React.FC = () => {
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
  const [modPmpWatts, setModPmpWatts] = useState(580);
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
      m.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || m.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter inverters
  const filteredInverters = customInverters.filter((i) => {
    const matchesSearch =
      i.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = selectedBrand === 'all' || i.manufacturer === selectedBrand;
    return matchesSearch && matchesBrand;
  });

  // Filter batteries
  const filteredBatteries = customBatteries.filter((b) => {
    const matchesSearch =
      b.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              کتابخانه جامع تجهیزات خورشیدی و ادوات بازار ایران و جهان (Equipment Catalog)
            </h1>
            <p className="text-slate-400 text-xs">
              بانک اطلاعاتی بیش از ۱۰۰ پنل، اینورترهای رشته‌ای (String) و پست‌های یکپارچه (MV Turnkey) و باتری‌های معتبر با قابلیت اضافه کردن تجهیز دلخواه توسط کاربر.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="studio-btn-primary text-xs py-2 px-3.5 flex items-center gap-2 rounded-lg font-bold shadow-lg"
          >
            <Plus className="w-4 h-4" />
            افزودن تجهیز دلخواه جدید به کاتالوگ
          </button>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="studio-card">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => {
                setActiveTab('modules');
                setSelectedBrand('all');
              }}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'modules'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              پنل‌های خورشیدی ({customModules.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('inverters');
                setSelectedBrand('all');
              }}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'inverters'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              اینورترها (String & MV Turnkey) ({customInverters.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('batteries');
                setSelectedBrand('all');
              }}
              className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'batteries'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              باتری‌ها و ذخیره‌ساز BESS ({customBatteries.length})
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجو بر اساس مدل یا برند..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="studio-input pr-8 text-xs py-1.5 w-56"
              />
            </div>

            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="studio-input text-xs py-1.5"
            >
              <option value="all">همه برندها</option>
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
        <div className="overflow-x-auto">
          {activeTab === 'modules' && (
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">سازنده</th>
                  <th className="p-2.5">مدل ماژول</th>
                  <th className="p-2.5">فناوری سلول</th>
                  <th className="p-2.5">توان نامی (Wp)</th>
                  <th className="p-2.5">ولتاژ مدار باز (Voc)</th>
                  <th className="p-2.5">ولتاژ نقطه توان ماکزیمم (Vmp)</th>
                  <th className="p-2.5">جریان اتصال کوتاه (Isc)</th>
                  <th className="p-2.5">جریان کارکرد (Imp)</th>
                  <th className="p-2.5">راندمان</th>
                  <th className="p-2.5">ابعاد (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredModules.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-850/60">
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
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">سازنده</th>
                  <th className="p-2.5">مدل اینورتر</th>
                  <th className="p-2.5">فناوری / پکیج</th>
                  <th className="p-2.5">توان AC</th>
                  <th className="p-2.5">ولتاژ خروجی AC/MV</th>
                  <th className="p-2.5">حداکثر Vdc</th>
                  <th className="p-2.5">محدوده MPPT</th>
                  <th className="p-2.5">تعداد MPPT</th>
                  <th className="p-2.5">بازدهی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredInverters.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-bold text-white">{i.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{i.modelName}</td>
                    <td className="p-2.5 text-[11px]">
                      {i.technology === 'mv_turnkey' ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                          پست یکپارچه (MV Turnkey Skid)
                        </span>
                      ) : i.technology === 'string_inverter' ? (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                          اینورتر رشته‌ای (String)
                        </span>
                      ) : (
                        <span className="text-slate-400">استاندارد</span>
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
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="p-2.5">سازنده</th>
                  <th className="p-2.5">مدل باتری</th>
                  <th className="p-2.5">شیمی باتری</th>
                  <th className="p-2.5">ظرفیت ناخالص</th>
                  <th className="p-2.5">ولتاژ نامی</th>
                  <th className="p-2.5">آمپر ساعت (Ah)</th>
                  <th className="p-2.5">عمق دشارژ (DoD)</th>
                  <th className="p-2.5">طول عمر سیکلی</th>
                  <th className="p-2.5">BMS هوشمند</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredBatteries.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850/60">
                    <td className="p-2.5 font-bold text-white">{b.manufacturer}</td>
                    <td className="p-2.5 text-sky-300 font-mono">{b.modelName}</td>
                    <td className="p-2.5 text-[11px] text-slate-300">{b.chemistry}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{b.capacityKwh} kWh</td>
                    <td className="p-2.5 font-mono">{b.nominalVoltageVolts} V</td>
                    <td className="p-2.5 font-mono">{b.nominalCapacityAh} Ah</td>
                    <td className="p-2.5 font-mono text-sky-400 font-bold">{b.recommendedDoDPct}%</td>
                    <td className="p-2.5 font-mono text-purple-300">{b.cycleLifeAt80DoD} سیکل</td>
                    <td className="p-2.5 text-slate-300">
                      {b.hasIntegratedBms ? (
                        <span className="text-emerald-400">دارد (CAN/RS485)</span>
                      ) : (
                        <span className="text-slate-500">ندارد</span>
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
                تعریف و ثبت تجهیز جدید در کاتالوگ مهندسی
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
                پنل خورشیدی
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
                اینورتر (String/Turnkey)
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
                باتری
              </button>
            </div>

            {/* MODULE FORM */}
            {activeTab === 'modules' && (
              <form onSubmit={handleAddModule} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">نام سازنده (برند):</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: Trina Solar"
                      value={modManufacturer}
                      onChange={(e) => setModManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">نام مدل دقیق:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: Vertex N 600W"
                      value={modModel}
                      onChange={(e) => setModModel(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">توان نامی (Wp):</label>
                    <input
                      type="number"
                      required
                      value={modPmpWatts}
                      onChange={(e) => setModPmpWatts(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">Voc (ولت):</label>
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
                    <label className="text-slate-300 block mb-1">Vmp (ولت):</label>
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
                    <label className="text-slate-300 block mb-1">Isc (آمپر):</label>
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
                    <label className="text-slate-300 block mb-1">Imp (آمپر):</label>
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
                    <label className="text-slate-300 block mb-1">فناوری سلول:</label>
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
                    انصراف
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    ثبت در کاتالوگ
                  </button>
                </div>
              </form>
            )}

            {/* INVERTER FORM */}
            {activeTab === 'inverters' && (
              <form onSubmit={handleAddInverter} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">سازنده اینورتر:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: Sungrow"
                      value={invManufacturer}
                      onChange={(e) => setInvManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">مدل اینورتر:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: SG350HX"
                      value={invModel}
                      onChange={(e) => setInvModel(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">تکنولوژی اینورتر:</label>
                    <select
                      value={invTech}
                      onChange={(e) => setInvTech(e.target.value as any)}
                      className="studio-input w-full"
                    >
                      <option value="string_inverter">اینورتر رشته‌ای (String Inverter)</option>
                      <option value="mv_turnkey">پست یکپارچه (MV Turnkey Skid Station)</option>
                      <option value="grid_tied">متصل به شبکه معمولی (Grid-Tied)</option>
                      <option value="hybrid_offgrid">هیبرید / با باتری (Hybrid/Offgrid)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">توان نامی AC (کیلووات):</label>
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
                    <label className="text-slate-300 block mb-1">حداکثر Vdc:</label>
                    <input
                      type="number"
                      required
                      value={invVdcMax}
                      onChange={(e) => setInvVdcMax(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">حداقل MPPT (V):</label>
                    <input
                      type="number"
                      required
                      value={invVmpptMin}
                      onChange={(e) => setInvVmpptMin(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">حداکثر MPPT (V):</label>
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
                    <label className="text-slate-300 block mb-1">ولتاژ خروجی فشار متوسط (kV):</label>
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
                    انصراف
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    ثبت اینورتر
                  </button>
                </div>
              </form>
            )}

            {/* BATTERY FORM */}
            {activeTab === 'batteries' && (
              <form onSubmit={handleAddBattery} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">برند باتری:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: BYD"
                      value={batManufacturer}
                      onChange={(e) => setBatManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">مدل باتری:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: Battery-Box 10kWh"
                      value={batModel}
                      onChange={(e) => setBatModel(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-300 block mb-1">شیمی باتری:</label>
                    <select
                      value={batChemistry}
                      onChange={(e) => setBatChemistry(e.target.value as any)}
                      className="studio-input w-full"
                    >
                      <option value="LiFePO4">لیتیوم آهن فسفات (LiFePO4)</option>
                      <option value="Gel Deep Cycle">ژل دیپ سایکل (Gel Deep Cycle)</option>
                      <option value="AGM VRLA">اسید سرب سیلد (AGM VRLA)</option>
                      <option value="Ternary NCM">لیتیم ترنری (Ternary NCM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">ظرفیت انرژی (kWh):</label>
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
                    <label className="text-slate-300 block mb-1">ولتاژ نامی (V):</label>
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
                    <label className="text-slate-300 block mb-1">ظرفیت (Ah):</label>
                    <input
                      type="number"
                      required
                      value={batNominalAh}
                      onChange={(e) => setBatNominalAh(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 block mb-1">عمق دشارژ DoD (%):</label>
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
                    انصراف
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    ثبت باتری
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
