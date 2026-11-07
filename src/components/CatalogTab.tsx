import React, { useState, useEffect } from 'react';
import { Database, Search, Filter, Plus, Check, X, Sparkles, Layers, Cpu, Battery as BatteryIcon, AlertTriangle } from 'lucide-react';
import {
  type CatalogPvModule,
  type CatalogInverter,
  type CatalogBattery,
} from '../engine/equipmentCatalogData';
import {
  CatalogRepository,
  type EnhancedCatalogModule,
  type EnhancedCatalogInverter,
  type EnhancedCatalogBattery,
} from '../engine/catalogRepository';

interface CatalogTabProps {
  lang?: 'fa' | 'en';
}

export const CatalogTab: React.FC<CatalogTabProps> = ({ lang = 'fa' }) => {
  const isFa = lang === 'fa';
  const repo = CatalogRepository.getInstance();
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    return repo.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
  }, [repo]);

  const [activeTab, setActiveTab] = useState<'modules' | 'inverters' | 'batteries'>('modules');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');

  const customModules = repo.getModules();
  const customInverters = repo.getInverters();
  const customBatteries = repo.getBatteries();

  // Add Equipment Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Form States for Custom Module (CAT-03)
  const [modManufacturer, setModManufacturer] = useState('');
  const [modModel, setModModel] = useState('');
  const [modPmpWatts, setModPmpWatts] = useState(585);
  const [modVoc, setModVoc] = useState(51.2);
  const [modVmp, setModVmp] = useState(42.5);
  const [modIsc, setModIsc] = useState(14.3);
  const [modImp, setModImp] = useState(13.6);
  const [modCellType, setModCellType] = useState<'N-Type TOPCon' | 'P-Type PERC' | 'HJT Bifacial'>('N-Type TOPCon');
  const [modNoctC, setModNoctC] = useState(45.0);
  const [modTempCoeffVoc, setModTempCoeffVoc] = useState(-0.25);
  const [modTempCoeffPmp, setModTempCoeffPmp] = useState(-0.29);
  const [modLengthMm, setModLengthMm] = useState(2278);
  const [modWidthMm, setModWidthMm] = useState(1134);
  const [modWeightKg, setModWeightKg] = useState(28.5);
  const [modBifacial, setModBifacial] = useState(true);
  const [modBifacialityFactor, setModBifacialityFactor] = useState(0.80);

  // Form States for Custom Inverter (CAT-03)
  const [invManufacturer, setInvManufacturer] = useState('');
  const [invModel, setInvModel] = useState('');
  const [invPnomKw, setInvPnomKw] = useState(330);
  const [invTech, setInvTech] = useState<'string_inverter' | 'mv_turnkey' | 'hybrid_offgrid' | 'grid_tied'>('string_inverter');
  const [invVdcMax, setInvVdcMax] = useState(1500);
  const [invVmpptMin, setInvVmpptMin] = useState(500);
  const [invVmpptMax, setInvVmpptMax] = useState(1500);
  const [invMpptCount, setInvMpptCount] = useState(6);
  const [invMaxPvInputKw, setInvMaxPvInputKw] = useState(445);
  const [invEfficiencyMaxPct, setInvEfficiencyMaxPct] = useState(99.0);
  const [invWeightKg, setInvWeightKg] = useState(110);
  const [invIsThreePhase, setInvIsThreePhase] = useState(true);
  const [invMvKv, setInvMvKv] = useState(20);

  // Form States for Custom Battery (CAT-03)
  const [batManufacturer, setBatManufacturer] = useState('');
  const [batModel, setBatModel] = useState('');
  const [batChemistry, setBatChemistry] = useState<'LiFePO4' | 'Gel Deep Cycle' | 'AGM VRLA' | 'Ternary NCM'>('LiFePO4');
  const [batCapacityKwh, setBatCapacityKwh] = useState(5.12);
  const [batNominalVoltage, setBatNominalVoltage] = useState(51.2);
  const [batNominalAh, setBatNominalAh] = useState(100);
  const [batDoDPct, setBatDoDPct] = useState(90);
  const [batMaxDischargeA, setBatMaxDischargeA] = useState(100);
  const [batCycleLife, setBatCycleLife] = useState(6000);
  const [batWeightKg, setBatWeightKg] = useState(45);
  const [batHasBms, setBatHasBms] = useState(true);

  // Computed module efficiency: Pmp / (L * W / 10^6 * 1000 W/m2) * 100
  const computedModuleEffPct = Number(
    ((modPmpWatts / ((modLengthMm * modWidthMm) / 1000000.0)) / 10.0).toFixed(2)
  );

  // Add Handlers with Engineering Validation (CAT-04)
  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
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
      efficiencyPct: computedModuleEffPct > 0 && computedModuleEffPct <= 35 ? computedModuleEffPct : 22.4,
      tempCoeffVocPct: Number(modTempCoeffVoc),
      tempCoeffPmpPct: Number(modTempCoeffPmp),
      lengthMm: Number(modLengthMm),
      widthMm: Number(modWidthMm),
      weightKg: Number(modWeightKg),
      warrantyYears: 25,
      bifacial: modBifacial,
      bifacialityFactor: modBifacial ? Number(modBifacialityFactor) : 0,
    };
    (newMod as any).noctC = Number(modNoctC);

    const res = repo.saveCustomModule(newMod);
    if (!res.success) {
      setFormErrors(res.errors || ['خطا در اعتبارسنجی مشخصات پنل']);
      return;
    }
    setShowAddModal(false);
  };

  const handleAddInverter = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    const newInv: CatalogInverter = {
      id: `custom-inv-${Date.now()}`,
      manufacturer: invManufacturer.trim(),
      modelName: invModel.trim(),
      type: invTech === 'mv_turnkey' ? 'central' : 'grid_tied',
      technology: invTech,
      pnomKw: Number(invPnomKw),
      maxPvInputKw: Number(invMaxPvInputKw),
      vdcMaxVolts: Number(invVdcMax),
      vmpptMinVolts: Number(invVmpptMin),
      vmpptMaxVolts: Number(invVmpptMax),
      mpptCount: Number(invMpptCount),
      batteryVoltageVdc: invTech === 'hybrid_offgrid' ? 48 : 0,
      isThreePhase: invIsThreePhase,
      parallelCapable: true,
      maxParallelUnits: 50,
      efficiencyMaxPct: Number(invEfficiencyMaxPct),
      weightKg: Number(invWeightKg),
      mvOutputVoltageKv: invTech === 'mv_turnkey' ? Number(invMvKv) : undefined,
    };

    const res = repo.saveCustomInverter(newInv);
    if (!res.success) {
      setFormErrors(res.errors || ['خطا در اعتبارسنجی مشخصات اینورتر']);
      return;
    }
    setShowAddModal(false);
  };

  const handleAddBattery = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    const newBat: CatalogBattery = {
      id: `custom-bat-${Date.now()}`,
      manufacturer: batManufacturer.trim(),
      modelName: batModel.trim(),
      chemistry: batChemistry,
      capacityKwh: Number(batCapacityKwh),
      nominalVoltageVolts: Number(batNominalVoltage),
      nominalCapacityAh: Number(batNominalAh),
      recommendedDoDPct: Number(batDoDPct),
      cycleLifeAt80DoD: Number(batCycleLife),
      maxContinuousDischargeA: Number(batMaxDischargeA),
      weightKg: Number(batWeightKg),
      hasIntegratedBms: batHasBms,
    };

    const res = repo.saveCustomBattery(newBat);
    if (!res.success) {
      setFormErrors(res.errors || ['خطا در اعتبارسنجی مشخصات باتری']);
      return;
    }
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
            <h1 className="text-lg sm:text-xl font-bold text-industrial-accent mb-1 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400 shrink-0" />
              {isFa
                ? 'کتابخانه جامع تجهیزات خورشیدی و ادوات بازار ایران و جهان (Equipment Catalog)'
                : 'Comprehensive Equipment Catalog (Tier-1 Modules, Inverters & BESS)'}
            </h1>
            <p className="text-slate-400 text-xs">
              {isFa
                ? `بانک اطلاعاتی تجهیزات خورشیدی شامل ${customModules.length} پنل N-Type TOPCon/HJT، ${customInverters.length} اینورتر رشته‌ای/پست یکپارچه، و ${customBatteries.length} سیستم ذخیره‌ساز BESS (مجموع ${customModules.length + customInverters.length + customBatteries.length} تجهیز) با امکان ثبت و اعتبارسنجی تجهیز سفارشی.`
                : `Comprehensive database of ${customModules.length} PV modules, ${customInverters.length} inverters & MV stations, and ${customBatteries.length} BESS units (Total ${customModules.length + customInverters.length + customBatteries.length} components) with custom equipment validation.`}
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="studio-btn-primary text-xs py-2 px-3.5 flex items-center gap-2 rounded-lg font-bold shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            {isFa ? 'افزودن تجهیز دلخواه جدید به کاتالوگ' : 'Add Custom Equipment to Catalog'}
          </button>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="studio-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex overflow-x-auto border-b border-industrial-border pb-1 sm:pb-0 gap-1">
            <button
              onClick={() => {
                setActiveTab('modules');
                setSelectedBrand('all');
              }}
              className={`py-2 px-3 sm:px-4 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'modules'
                  ? 'border-sky-400 text-industrial-accent'
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
                  ? 'border-sky-400 text-industrial-accent'
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
                  ? 'border-sky-400 text-industrial-accent'
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
              <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
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
                    <td className="p-2.5 font-mono font-bold text-industrial-success">{m.pmpWatts} W</td>
                    <td className="p-2.5 font-mono">{m.vocVolts} V</td>
                    <td className="p-2.5 font-mono">{m.vmpVolts} V</td>
                    <td className="p-2.5 font-mono">{m.iscAmps} A</td>
                    <td className="p-2.5 font-mono">{m.impAmps} A</td>
                    <td className="p-2.5 font-mono text-industrial-warning font-bold">{m.efficiencyPct}%</td>
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
              <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
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
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-industrial-accent/30 font-bold">
                          {isFa ? 'اینورتر رشته‌ای (String)' : 'String Inverter'}
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-industrial-success">
                      {i.pnomKw >= 1000 ? `${(i.pnomKw / 1000).toFixed(2)} MW` : `${i.pnomKw} kW`}
                    </td>
                    <td className="p-2.5 font-mono text-industrial-warning font-bold">
                      {i.mvOutputVoltageKv ? `${i.mvOutputVoltageKv} kV (MV)` : i.acVoltageVac ? `${i.acVoltageVac} V` : '400 V'}
                    </td>
                    <td className="p-2.5 font-mono text-red-300">{i.vdcMaxVolts} V</td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {i.vmpptMinVolts}V - {i.vmpptMaxVolts}V
                    </td>
                    <td className="p-2.5 font-mono text-industrial-accent">{i.mpptCount} MPPT</td>
                    <td className="p-2.5 font-mono text-industrial-warning font-bold">{i.efficiencyMaxPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'batteries' && (
            <table className={`w-full text-xs text-slate-300 min-w-[760px] ${isFa ? 'text-right' : 'text-left'}`}>
              <thead className="bg-industrial-surface/90 text-slate-400 border-b border-industrial-border">
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
                    <td className="p-2.5 font-mono font-bold text-industrial-success">
                      {b.capacityKwh >= 1000 ? `${(b.capacityKwh / 1000).toFixed(2)} MWh` : `${b.capacityKwh} kWh`}
                    </td>
                    <td className="p-2.5 font-mono">{b.nominalVoltageVolts} V</td>
                    <td className="p-2.5 font-mono">{b.nominalCapacityAh} Ah</td>
                    <td className="p-2.5 font-mono text-industrial-accent font-bold">{b.recommendedDoDPct}%</td>
                    <td className="p-2.5 font-mono text-purple-300">{b.cycleLifeAt80DoD} {isFa ? 'سیکل' : 'cycles'}</td>
                    <td className="p-2.5 text-slate-300">
                      {b.hasIntegratedBms ? (
                        <span className="text-industrial-success font-semibold">{isFa ? 'دارد (CAN/RS485)' : 'Yes (CAN/RS485)'}</span>
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
          <div className="bg-industrial-surface border border-industrial-border rounded-xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-industrial-border mb-4">
              <h3 className="font-bold text-industrial-accent text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-industrial-warning" />
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
                onClick={() => { setActiveTab('modules'); setFormErrors([]); }}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  activeTab === 'modules'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-400 border-industrial-border'
                }`}
              >
                {isFa ? 'پنل خورشیدی' : 'PV Module'}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('inverters'); setFormErrors([]); }}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  activeTab === 'inverters'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-400 border-industrial-border'
                }`}
              >
                {isFa ? 'اینورتر' : 'Inverter'}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('batteries'); setFormErrors([]); }}
                className={`flex-1 py-1.5 rounded-lg font-bold border transition ${
                  activeTab === 'batteries'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-800 text-slate-400 border-industrial-border'
                }`}
              >
                {isFa ? 'باتری' : 'Battery'}
              </button>
            </div>

            {formErrors.length > 0 && (
              <div className="p-2.5 mb-3 bg-red-950/60 border border-red-800 rounded text-red-200 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  {isFa ? 'خطای اعتبارسنجی مشخصات مهندسی:' : 'Engineering Validation Errors:'}
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {formErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* MODULE FORM */}
            {activeTab === 'modules' && (
              <form onSubmit={handleAddModule} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cat-mod-manufacturer" className="text-slate-300 block mb-1">{isFa ? 'نام سازنده (برند):' : 'Manufacturer (Brand):'}</label>
                    <input
                      id="cat-mod-manufacturer"
                      type="text"
                      required
                      placeholder="e.g. Trina Solar"
                      value={modManufacturer}
                      onChange={(e) => setModManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-model" className="text-slate-300 block mb-1">{isFa ? 'نام مدل دقیق:' : 'Model Name:'}</label>
                    <input
                      id="cat-mod-model"
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
                    <label htmlFor="cat-mod-pmp" className="text-slate-300 block mb-1">{isFa ? 'توان (Wp):' : 'P_nom (Wp):'}</label>
                    <input
                      id="cat-mod-pmp"
                      type="number"
                      required
                      value={modPmpWatts}
                      onChange={(e) => setModPmpWatts(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-voc" className="text-slate-300 block mb-1">{isFa ? 'Voc (ولت):' : 'Voc (V):'}</label>
                    <input
                      id="cat-mod-voc"
                      type="number"
                      step="0.01"
                      required
                      value={modVoc}
                      onChange={(e) => setModVoc(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-vmp" className="text-slate-300 block mb-1">{isFa ? 'Vmp (ولت):' : 'Vmp (V):'}</label>
                    <input
                      id="cat-mod-vmp"
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
                    <label htmlFor="cat-mod-isc" className="text-slate-300 block mb-1">{isFa ? 'Isc (آمپر):' : 'Isc (A):'}</label>
                    <input
                      id="cat-mod-isc"
                      type="number"
                      step="0.01"
                      required
                      value={modIsc}
                      onChange={(e) => setModIsc(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-imp" className="text-slate-300 block mb-1">{isFa ? 'Imp (آمپر):' : 'Imp (A):'}</label>
                    <input
                      id="cat-mod-imp"
                      type="number"
                      step="0.01"
                      required
                      value={modImp}
                      onChange={(e) => setModImp(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-cell-type" className="text-slate-300 block mb-1">{isFa ? 'فناوری سلول:' : 'Cell Type:'}</label>
                    <select
                      id="cat-mod-cell-type"
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

                {/* Additional Engineering Specs without Silent Defaults (CAT-03) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="cat-mod-noct" className="text-slate-300 block mb-1">{isFa ? 'NOCT (°C):' : 'NOCT (°C):'}</label>
                    <input
                      id="cat-mod-noct"
                      type="number"
                      step="0.5"
                      value={modNoctC}
                      onChange={(e) => setModNoctC(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-tc-voc" className="text-slate-300 block mb-1">{isFa ? 'ضریب دمای Voc (%/°C):' : 'γ_Voc (%/°C):'}</label>
                    <input
                      id="cat-mod-tc-voc"
                      type="number"
                      step="0.01"
                      value={modTempCoeffVoc}
                      onChange={(e) => setModTempCoeffVoc(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-tc-pmp" className="text-slate-300 block mb-1">{isFa ? 'ضریب دمای Pmp (%/°C):' : 'γ_Pmp (%/°C):'}</label>
                    <input
                      id="cat-mod-tc-pmp"
                      type="number"
                      step="0.01"
                      value={modTempCoeffPmp}
                      onChange={(e) => setModTempCoeffPmp(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="cat-mod-len" className="text-slate-300 block mb-1">{isFa ? 'طول (mm):' : 'Length (mm):'}</label>
                    <input
                      id="cat-mod-len"
                      type="number"
                      value={modLengthMm}
                      onChange={(e) => setModLengthMm(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-width" className="text-slate-300 block mb-1">{isFa ? 'عرض (mm):' : 'Width (mm):'}</label>
                    <input
                      id="cat-mod-width"
                      type="number"
                      value={modWidthMm}
                      onChange={(e) => setModWidthMm(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-mod-weight" className="text-slate-300 block mb-1">{isFa ? 'وزن (kg):' : 'Weight (kg):'}</label>
                    <input
                      id="cat-mod-weight"
                      type="number"
                      step="0.1"
                      value={modWeightKg}
                      onChange={(e) => setModWeightKg(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="p-2 bg-slate-800/60 rounded border border-industrial-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="cat-mod-bifacial"
                      type="checkbox"
                      checked={modBifacial}
                      onChange={(e) => setModBifacial(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="cat-mod-bifacial" className="text-slate-300">{isFa ? 'ماژول دوطرفه (Bifacial)' : 'Bifacial Module'}</label>
                  </div>
                  {modBifacial && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">{isFa ? 'ضریب دید:' : 'Factor:'}</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.5"
                        max="1.0"
                        value={modBifacialityFactor}
                        onChange={(e) => setModBifacialityFactor(Number(e.target.value))}
                        className="studio-input w-16 py-0.5 text-center font-mono"
                      />
                    </div>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isFa ? `بازده محاسبه‌شده: ${computedModuleEffPct}%` : `Calculated Eff: ${computedModuleEffPct}%`}
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setFormErrors([]); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    {isFa ? 'ثبت و اعتبارسنجی در کاتالوگ' : 'Validate & Save Module'}
                  </button>
                </div>
              </form>
            )}

            {/* INVERTER FORM */}
            {activeTab === 'inverters' && (
              <form onSubmit={handleAddInverter} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cat-inv-manufacturer" className="text-slate-300 block mb-1">{isFa ? 'سازنده اینورتر:' : 'Manufacturer:'}</label>
                    <input
                      id="cat-inv-manufacturer"
                      type="text"
                      required
                      placeholder="e.g. Sungrow"
                      value={invManufacturer}
                      onChange={(e) => setInvManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-inv-model" className="text-slate-300 block mb-1">{isFa ? 'مدل اینورتر:' : 'Inverter Model:'}</label>
                    <input
                      id="cat-inv-model"
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
                    <label htmlFor="cat-inv-tech" className="text-slate-300 block mb-1">{isFa ? 'تکنولوژی اینورتر:' : 'Technology Type:'}</label>
                    <select
                      id="cat-inv-tech"
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
                    <label htmlFor="cat-inv-pnom" className="text-slate-300 block mb-1">{isFa ? 'توان نامی AC (kW):' : 'Rated AC Power (kW):'}</label>
                    <input
                      id="cat-inv-pnom"
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
                    <label htmlFor="cat-inv-vdc-max" className="text-slate-300 block mb-1">{isFa ? 'حداکثر Vdc:' : 'Max Vdc:'}</label>
                    <input
                      id="cat-inv-vdc-max"
                      type="number"
                      required
                      value={invVdcMax}
                      onChange={(e) => setInvVdcMax(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-inv-vmppt-min" className="text-slate-300 block mb-1">{isFa ? 'حداقل MPPT (V):' : 'Min MPPT (V):'}</label>
                    <input
                      id="cat-inv-vmppt-min"
                      type="number"
                      required
                      value={invVmpptMin}
                      onChange={(e) => setInvVmpptMin(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-inv-vmppt-max" className="text-slate-300 block mb-1">{isFa ? 'حداکثر MPPT (V):' : 'Max MPPT (V):'}</label>
                    <input
                      id="cat-inv-vmppt-max"
                      type="number"
                      required
                      value={invVmpptMax}
                      onChange={(e) => setInvVmpptMax(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                {/* Additional Engineering Specs for Inverter (CAT-03) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="cat-inv-max-pv" className="text-slate-300 block mb-1">{isFa ? 'حداکثر ورودی DC (kW):' : 'Max DC Input (kW):'}</label>
                    <input
                      id="cat-inv-max-pv"
                      type="number"
                      value={invMaxPvInputKw}
                      onChange={(e) => setInvMaxPvInputKw(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-inv-eff" className="text-slate-300 block mb-1">{isFa ? 'بیشینه بازده (%):' : 'Max Eff (%):'}</label>
                    <input
                      id="cat-inv-eff"
                      type="number"
                      step="0.1"
                      value={invEfficiencyMaxPct}
                      onChange={(e) => setInvEfficiencyMaxPct(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-inv-weight" className="text-slate-300 block mb-1">{isFa ? 'وزن (kg):' : 'Weight (kg):'}</label>
                    <input
                      id="cat-inv-weight"
                      type="number"
                      value={invWeightKg}
                      onChange={(e) => setInvWeightKg(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cat-inv-mppt-count" className="text-slate-300 block mb-1">{isFa ? 'تعداد کانال MPPT:' : 'MPPT Channels:'}</label>
                    <input
                      id="cat-inv-mppt-count"
                      type="number"
                      min="1"
                      max="32"
                      value={invMpptCount}
                      onChange={(e) => setInvMpptCount(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-inv-phases" className="text-slate-300 block mb-1">{isFa ? 'تعداد فاز خروجی:' : 'AC Output Phases:'}</label>
                    <select
                      id="cat-inv-phases"
                      value={invIsThreePhase ? '3' : '1'}
                      onChange={(e) => setInvIsThreePhase(e.target.value === '3')}
                      className="studio-input w-full"
                    >
                      <option value="3">{isFa ? 'سه فاز (3-Phase)' : '3-Phase AC'}</option>
                      <option value="1">{isFa ? 'تک فاز (1-Phase)' : '1-Phase AC'}</option>
                    </select>
                  </div>
                </div>

                {invTech === 'mv_turnkey' && (
                  <div>
                    <label htmlFor="cat-inv-mv-kv" className="text-slate-300 block mb-1">{isFa ? 'ولتاژ خروجی فشار متوسط (kV):' : 'MV Output Voltage (kV):'}</label>
                    <input
                      id="cat-inv-mv-kv"
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
                    onClick={() => { setShowAddModal(false); setFormErrors([]); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    {isFa ? 'ثبت و اعتبارسنجی اینورتر' : 'Validate & Save Inverter'}
                  </button>
                </div>
              </form>
            )}

            {/* BATTERY FORM */}
            {activeTab === 'batteries' && (
              <form onSubmit={handleAddBattery} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cat-bat-manufacturer" className="text-slate-300 block mb-1">{isFa ? 'برند باتری:' : 'Manufacturer (Brand):'}</label>
                    <input
                      id="cat-bat-manufacturer"
                      type="text"
                      required
                      placeholder="e.g. BYD / CATL"
                      value={batManufacturer}
                      onChange={(e) => setBatManufacturer(e.target.value)}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-bat-model" className="text-slate-300 block mb-1">{isFa ? 'مدل باتری:' : 'Model Name:'}</label>
                    <input
                      id="cat-bat-model"
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
                    <label htmlFor="cat-bat-chemistry" className="text-slate-300 block mb-1">{isFa ? 'شیمی باتری:' : 'Battery Chemistry:'}</label>
                    <select
                      id="cat-bat-chemistry"
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
                    <label htmlFor="cat-bat-capacity-kwh" className="text-slate-300 block mb-1">{isFa ? 'ظرفیت انرژی (kWh):' : 'Energy Capacity (kWh):'}</label>
                    <input
                      id="cat-bat-capacity-kwh"
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
                    <label htmlFor="cat-bat-nominal-voltage" className="text-slate-300 block mb-1">{isFa ? 'ولتاژ نامی (V):' : 'Nominal V (V):'}</label>
                    <input
                      id="cat-bat-nominal-voltage"
                      type="number"
                      step="0.1"
                      required
                      value={batNominalVoltage}
                      onChange={(e) => setBatNominalVoltage(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-bat-nominal-ah" className="text-slate-300 block mb-1">{isFa ? 'ظرفیت (Ah):' : 'Capacity (Ah):'}</label>
                    <input
                      id="cat-bat-nominal-ah"
                      type="number"
                      required
                      value={batNominalAh}
                      onChange={(e) => setBatNominalAh(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-bat-dod" className="text-slate-300 block mb-1">{isFa ? 'عمق دشارژ (%):' : 'DoD (%):'}</label>
                    <input
                      id="cat-bat-dod"
                      type="number"
                      required
                      value={batDoDPct}
                      onChange={(e) => setBatDoDPct(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                {/* Additional Engineering Specs for Battery (CAT-03) */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="cat-bat-max-a" className="text-slate-300 block mb-1">{isFa ? 'حداکثر دشارژ پیوسته (A):' : 'Max Continuous A:'}</label>
                    <input
                      id="cat-bat-max-a"
                      type="number"
                      value={batMaxDischargeA}
                      onChange={(e) => setBatMaxDischargeA(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-bat-cycles" className="text-slate-300 block mb-1">{isFa ? 'طول عمر سیکل:' : 'Cycle Life (80%):'}</label>
                    <input
                      id="cat-bat-cycles"
                      type="number"
                      value={batCycleLife}
                      onChange={(e) => setBatCycleLife(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-bat-weight" className="text-slate-300 block mb-1">{isFa ? 'وزن (kg):' : 'Weight (kg):'}</label>
                    <input
                      id="cat-bat-weight"
                      type="number"
                      value={batWeightKg}
                      onChange={(e) => setBatWeightKg(Number(e.target.value))}
                      className="studio-input w-full"
                    />
                  </div>
                </div>

                <div className="p-2 bg-slate-800/60 rounded border border-industrial-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="cat-bat-bms"
                      type="checkbox"
                      checked={batHasBms}
                      onChange={(e) => setBatHasBms(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="cat-bat-bms" className="text-slate-300">{isFa ? 'دارای سیستم یکپارچه مدیریت باتری (BMS)' : 'Integrated BMS System'}</label>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {isFa ? `انرژی محاسبه‌شده: ${((batNominalVoltage * batNominalAh) / 1000).toFixed(2)} kWh` : `Calculated: ${((batNominalVoltage * batNominalAh) / 1000).toFixed(2)} kWh`}
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setFormErrors([]); }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                  >
                    {isFa ? 'انصراف' : 'Cancel'}
                  </button>
                  <button type="submit" className="studio-btn-primary px-4 py-1.5 rounded-lg font-bold">
                    {isFa ? 'ثبت و اعتبارسنجی باتری' : 'Validate & Save Battery'}
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
