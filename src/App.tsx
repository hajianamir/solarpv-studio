import React, { useState, useMemo } from 'react';
import {
  Sun,
  Zap,
  MapPin,
  Layers,
  Battery as BatteryIcon,
  Shield,
  Activity,
  TrendingUp,
  GitCompare,
  Database,
  Eye,
  FileText,
  CheckCircle2,
  Cpu,
  Grid,
  Droplet,
  Scale,
  Workflow,
  BarChart3,
  TreePine,
  Building2,
  Sliders,
  Globe,
  Settings,
  Hammer,
  AlertTriangle,
} from 'lucide-react';

// i18n
import { Language, translations } from './i18n';

// Engines & Data
import { IRANIAN_CLIMATE_CITIES, ClimateCity } from './engine/climaticData';
import { LOAD_PRESETS, ElectricalLoadItem, analyzeLoadProfile } from './engine/loadProfiles';
import { designPvArray, ModuleSpecs, InverterSpecs } from './engine/pvEngineAdvanced';
import { sizeBatteryBank, BatteryChemistry } from './engine/batteryEngine';
import { evaluateInverterClustering } from './engine/inverterClustering';
import { generateProtectionBom } from './engine/protectionBomEngine';
import { simulate24hEnergyBalance, sizeDieselGenerator } from './engine/simulation24hEngine';
import { performFinancialAnalysis } from './engine/financialEngine';
import { generateScenarios } from './engine/scenarioEngine';
import { CATALOG_MODULES, CATALOG_INVERTERS } from './engine/equipmentCatalogData';

// Components - Core Suite
import { LoadProfilingTab } from './components/LoadProfilingTab';
import { ClimateTab } from './components/ClimateTab';
import { PvArrayEngineeringTab } from './components/PvArrayEngineeringTab';
import { BessTab } from './components/BessTab';
import { ProtectionBomTab } from './components/ProtectionBomTab';
import { Simulation24hTab } from './components/Simulation24hTab';
import { FinancialTab } from './components/FinancialTab';
import { SingleLineDiagram } from './components/SingleLineDiagram';
import { ScenarioComparisonTab } from './components/ScenarioComparisonTab';
import { CatalogTab } from './components/CatalogTab';
import { ThreeJsViewer } from './components/ThreeJsViewer';
import { OfficialReportModal } from './components/OfficialReportModal';

// Components - Advanced Powerplant & Utility Modules
import { PowerplantCadLayoutTab } from './components/PowerplantCadLayoutTab';
import { WaterfallLossTab } from './components/WaterfallLossTab';
import { IvCurveTracerTab } from './components/IvCurveTracerTab';
import { MvSubstationTab } from './components/MvSubstationTab';
import { SolarPumpingTab } from './components/SolarPumpingTab';
import { IranianRegulationsTab } from './components/IranianRegulationsTab';
import { StructuralFoundationTab } from './components/StructuralFoundationTab';
import { HarmonicsGridTab } from './components/HarmonicsGridTab';

export type SystemMode = 'powerplant' | 'ongrid' | 'offgrid';

export type ActiveModuleTab =
  | 'climate'
  | 'loads'
  | 'system_mode'
  | 'array'
  | 'harmonics_grid'
  | 'mv_substation'
  | 'cables_bom'
  | 'bess'
  | 'structural'
  | 'sim24h'
  | 'waterfall_loss'
  | 'financial'
  | 'sld'
  | 'cad_layout'
  | '3d_viewer'
  | 'scenarios'
  | 'catalog'
  | 'iran_regulations'
  | 'solar_pumping'
  | 'iv_curve';

export const App: React.FC = () => {
  // Language & i18n
  const [lang, setLang] = useState<Language>('fa');
  const t = translations[lang];

  // Navigation & System Mode State
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('climate');
  const [systemMode, setSystemMode] = useState<SystemMode>('powerplant');
  const [showReportModal, setShowReportModal] = useState(false);

  // Core System State
  const [projectName, setProjectName] = useState(
    lang === 'fa' ? 'طرح نیروگاه خورشیدی مهندسی و EPC' : 'Solar PV Engineering & EPC Project'
  );
  const [city, setCity] = useState<ClimateCity>(IRANIAN_CLIMATE_CITIES[0]); // Default Tehran
  const [loads, setLoads] = useState<ElectricalLoadItem[]>(LOAD_PRESETS[1].items); // Default Medium Residential

  const [selectedModule, setSelectedModule] = useState<ModuleSpecs>({
    manufacturer: CATALOG_MODULES[0].manufacturer,
    modelName: CATALOG_MODULES[0].modelName,
    pmpWatts: CATALOG_MODULES[0].pmpWatts,
    vocVolts: CATALOG_MODULES[0].vocVolts,
    vmpVolts: CATALOG_MODULES[0].vmpVolts,
    iscAmps: CATALOG_MODULES[0].iscAmps,
    impAmps: CATALOG_MODULES[0].impAmps,
    tempCoeffVocPctPerC: CATALOG_MODULES[0].tempCoeffVocPctPerC,
    tempCoeffPmpPctPerC: CATALOG_MODULES[0].tempCoeffPmpPctPerC,
  });

  const [selectedInverter, setSelectedInverter] = useState<InverterSpecs>({
    manufacturer: CATALOG_INVERTERS[0].manufacturer,
    modelName: CATALOG_INVERTERS[0].modelName,
    pnomAcKw: CATALOG_INVERTERS[0].pnomAcKw,
    maxMpptVoltageVolts: CATALOG_INVERTERS[0].maxMpptVoltageVolts,
    minMpptVoltageVolts: CATALOG_INVERTERS[0].minMpptVoltageVolts,
    maxDcVoltageVolts: CATALOG_INVERTERS[0].maxDcVoltageVolts,
    maxDcCurrentAmps: CATALOG_INVERTERS[0].maxDcCurrentAmps,
    efficiencyPct: CATALOG_INVERTERS[0].efficiencyPct,
    isThreePhase: CATALOG_INVERTERS[0].isThreePhase,
  });

  const [selectedChemistry, setSelectedChemistry] = useState<BatteryChemistry>('LiFePO4');
  const [autonomyDays, setAutonomyDays] = useState<number>(1.5);
  const [outageHours, setOutageHours] = useState<number>(6); // For ongrid mode blackout calculation
  const [targetPowerplantCapacityKw, setTargetPowerplantCapacityKw] = useState<number>(1000); // 1MW default
  const [usdToTomanRate, setUsdToTomanRate] = useState<number>(650000);
  const [gridTariffToman, setGridTariffToman] = useState<number>(3000);

  // 1. Analyze Loads
  const loadAnalysis = useMemo(() => analyzeLoadProfile(loads), [loads]);

  // 2. Compute Target Energy Demand Based on System Mode
  const effectiveDailyKwhDemand = useMemo(() => {
    if (systemMode === 'powerplant') {
      return targetPowerplantCapacityKw * city.peakSunHours * 0.82; // Commercial Generation target
    } else if (systemMode === 'ongrid') {
      // Outage duration energy coverage
      const averagePowerKw = loadAnalysis.totalDailyKwh / 24.0;
      return averagePowerKw * outageHours;
    } else {
      // Offgrid: Full 24h daily energy demand
      return loadAnalysis.totalDailyKwh;
    }
  }, [systemMode, targetPowerplantCapacityKw, city.peakSunHours, loadAnalysis.totalDailyKwh, outageHours]);

  // 3. Advanced PV Array Engineering Sizing
  const arrayDesign = useMemo(() => {
    return designPvArray(
      effectiveDailyKwhDemand,
      city.peakSunHours,
      city.tempMinC,
      city.tempMaxC,
      selectedModule,
      selectedInverter
    );
  }, [effectiveDailyKwhDemand, city, selectedModule, selectedInverter]);

  // 4. Inverter Clustering Evaluation
  const inverterClustering = useMemo(() => {
    return evaluateInverterClustering(
      arrayDesign.totalPvCapacityKwp,
      arrayDesign.parallelStringsCount,
      selectedInverter
    );
  }, [arrayDesign, selectedInverter]);

  // 5. Battery Storage Sizing
  const batterySizing = useMemo(() => {
    const energyRequirementKwh =
      systemMode === 'powerplant'
        ? 0
        : systemMode === 'ongrid'
        ? (loadAnalysis.totalDailyKwh / 24.0) * outageHours
        : loadAnalysis.totalDailyKwh;

    return sizeBatteryBank(
      energyRequirementKwh,
      systemMode === 'powerplant' ? 0 : autonomyDays,
      selectedChemistry,
      48
    );
  }, [systemMode, loadAnalysis.totalDailyKwh, outageHours, autonomyDays, selectedChemistry]);

  // 6. Protection BOM Engine
  const protectionResult = useMemo(() => {
    return generateProtectionBom(
      arrayDesign.totalPvCapacityKwp,
      selectedModule.vocVolts,
      arrayDesign.modulesPerString,
      selectedModule.iscAmps,
      arrayDesign.parallelStringsCount,
      inverterClustering.totalInverterCapacityKw,
      selectedInverter.isThreePhase,
      batterySizing.grossCapacityKwh,
      batterySizing.systemVoltageVdc
    );
  }, [arrayDesign, selectedModule, inverterClustering, selectedInverter, batterySizing]);

  // 7. 24-Hour Balance Simulation
  const simulationResult = useMemo(() => {
    return simulate24hEnergyBalance(
      loadAnalysis.hourlyProfileKw,
      arrayDesign.totalPvCapacityKwp,
      city.peakSunHours,
      batterySizing.usableCapacityKwh,
      0.92
    );
  }, [loadAnalysis, arrayDesign, city, batterySizing]);

  // 8. Diesel Backup Generator Sizing
  const generatorSizing = useMemo(() => {
    return sizeDieselGenerator(
      loadAnalysis.peakDemandKw,
      loadAnalysis.surgeDemandKw,
      batterySizing.usableCapacityKwh
    );
  }, [loadAnalysis, batterySizing]);

  // 9. Financial Analysis
  const financialResult = useMemo(() => {
    return performFinancialAnalysis(
      arrayDesign.totalPvCapacityKwp,
      batterySizing.grossCapacityKwh,
      inverterClustering.totalInverterCapacityKw,
      loadAnalysis.totalDailyKwh * 365.0,
      usdToTomanRate,
      gridTariffToman
    );
  }, [arrayDesign, batterySizing, inverterClustering, loadAnalysis, usdToTomanRate, gridTariffToman]);

  // 10. Scenario Analysis
  const scenarios = useMemo(() => {
    return generateScenarios(
      loadAnalysis.totalDailyKwh,
      city.peakSunHours,
      city.tempMinC,
      city.tempMaxC,
      selectedModule,
      selectedInverter,
      selectedChemistry,
      autonomyDays,
      usdToTomanRate,
      gridTariffToman
    );
  }, [loadAnalysis, city, selectedModule, selectedInverter, selectedChemistry, autonomyDays, usdToTomanRate, gridTariffToman]);

  const estimatedAnnualYieldMwh = (arrayDesign.totalPvCapacityKwp * city.peakSunHours * 365 * 0.82) / 1000;

  // Handler for restoring imported project from JSON
  const handleImportProject = (importedData: any) => {
    if (importedData.city) setCity(importedData.city);
    if (importedData.loads) setLoads(importedData.loads);
    if (importedData.module) setSelectedModule(importedData.module);
    if (importedData.inverter) setSelectedInverter(importedData.inverter);
    if (importedData.projectName) setProjectName(importedData.projectName);
  };

  // Structured Workflow Sections
  const menuSections = [
    {
      categoryTitle: t.catSiteClimate,
      tabs: [
        { id: 'climate' as ActiveModuleTab, title: t.tabSiteLocation, icon: <MapPin className="w-4 h-4 text-amber-400" /> },
      ],
    },
    {
      categoryTitle: t.catLoads,
      tabs: [
        { id: 'loads' as ActiveModuleTab, title: t.tabLoads, icon: <Zap className="w-4 h-4 text-yellow-400" /> },
      ],
    },
    {
      categoryTitle: t.catSystemMode,
      tabs: [
        { id: 'system_mode' as ActiveModuleTab, title: t.tabSystemMode, icon: <Sliders className="w-4 h-4 text-sky-400" /> },
      ],
    },
    {
      categoryTitle: t.catPvEngineering,
      tabs: [
        { id: 'array' as ActiveModuleTab, title: t.tabPvEngineering, icon: <Sun className="w-4 h-4 text-amber-500" /> },
        { id: 'iv_curve' as ActiveModuleTab, title: t.tabIvCurve, icon: <Activity className="w-4 h-4 text-teal-400" /> },
        { id: 'waterfall_loss' as ActiveModuleTab, title: t.tabLossWaterfall, icon: <BarChart3 className="w-4 h-4 text-red-400" /> },
      ],
    },
    {
      categoryTitle: t.catUpstreamGrid,
      tabs: [
        { id: 'harmonics_grid' as ActiveModuleTab, title: t.tabUpstreamGrid, icon: <Activity className="w-4 h-4 text-indigo-400" /> },
      ],
    },
    {
      categoryTitle: t.catMvSubstation,
      tabs: [
        { id: 'mv_substation' as ActiveModuleTab, title: t.tabMvSubstation, icon: <Building2 className="w-4 h-4 text-purple-400" /> },
        { id: 'cables_bom' as ActiveModuleTab, title: 'BOM & حفاظت الکتریکی', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
      ],
    },
    {
      categoryTitle: t.catBess,
      tabs: [
        { id: 'bess' as ActiveModuleTab, title: t.tabBess, icon: <BatteryIcon className="w-4 h-4 text-green-400" /> },
      ],
    },
    {
      categoryTitle: t.catStructural,
      tabs: [
        { id: 'structural' as ActiveModuleTab, title: t.tabStructural, icon: <Hammer className="w-4 h-4 text-amber-600" /> },
      ],
    },
    {
      categoryTitle: t.catSimulation,
      tabs: [
        { id: 'sim24h' as ActiveModuleTab, title: t.tabSimulation24h, icon: <Workflow className="w-4 h-4 text-cyan-400" /> },
        { id: 'financial' as ActiveModuleTab, title: t.tabFinancial, icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
        { id: 'sld' as ActiveModuleTab, title: 'نقشه تک خطی SLD', icon: <Layers className="w-4 h-4 text-purple-400" /> },
        { id: 'cad_layout' as ActiveModuleTab, title: t.tabCadLayout, icon: <Grid className="w-4 h-4 text-blue-400" /> },
        { id: '3d_viewer' as ActiveModuleTab, title: t.tab3dViewer, icon: <Eye className="w-4 h-4 text-orange-400" /> },
        { id: 'scenarios' as ActiveModuleTab, title: 'مقایسه سناریوها', icon: <GitCompare className="w-4 h-4 text-pink-400" /> },
        { id: 'solar_pumping' as ActiveModuleTab, title: t.tabSolarPumping, icon: <Droplet className="w-4 h-4 text-blue-400" /> },
        { id: 'iran_regulations' as ActiveModuleTab, title: t.tabIranRegs, icon: <Scale className="w-4 h-4 text-emerald-400" /> },
        { id: 'catalog' as ActiveModuleTab, title: t.tabCatalog, icon: <Database className="w-4 h-4 text-slate-400" /> },
      ],
    },
  ];

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex ${lang === 'fa' ? 'font-vazir' : 'font-sans'}`} dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Fixed Operational Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col fixed inset-y-0 z-30 shadow-2xl overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-sky-600 text-slate-950 font-bold shadow-lg">
              <Sun className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-wide">SolarPV Studio</h1>
              <p className="text-[10px] text-sky-400 font-medium">Engineering Pro Suite</p>
            </div>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
            title={t.language}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'fa' ? 'EN' : 'فا'}</span>
          </button>
        </div>

        {/* Operating System Mode Quick Selector in Sidebar */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
            <span>{t.systemMode}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 uppercase font-mono">
              {systemMode}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-bold">
            <button
              onClick={() => setSystemMode('powerplant')}
              className={`p-1.5 rounded text-center transition ${
                systemMode === 'powerplant'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              نیروگاهی
            </button>
            <button
              onClick={() => setSystemMode('ongrid')}
              className={`p-1.5 rounded text-center transition ${
                systemMode === 'ongrid'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              On-Grid
            </button>
            <button
              onClick={() => setSystemMode('offgrid')}
              className={`p-1.5 rounded text-center transition ${
                systemMode === 'offgrid'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Off-Grid
            </button>
          </div>
        </div>

        {/* Workflow Menu List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[11px] font-bold text-sky-400 px-2 py-1 uppercase tracking-wider bg-slate-950/30 rounded border-l-2 border-sky-500">
                {section.categoryTitle}
              </div>
              <div className="space-y-0.5">
                {section.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const isBessDisabled = systemMode === 'powerplant' && tab.id === 'bess';

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-xs text-right ${
                        isActive
                          ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white font-bold shadow-md'
                          : isBessDisabled
                          ? 'opacity-50 text-slate-500 hover:bg-slate-800/40'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {tab.icon}
                        <span>{tab.title}</span>
                      </div>
                      {isBessDisabled && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded">غیرضروری</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Report Generator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90">
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full py-2.5 px-3 studio-btn-primary flex items-center justify-center gap-2 text-xs font-bold rounded-lg shadow-lg"
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>{t.generateReport}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace Offset by Sidebar */}
      <div className={`flex-1 flex flex-col ${lang === 'fa' ? 'mr-72' : 'ml-72'} min-h-screen`}>
        {/* Top Header Bar */}
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between">
          <div>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-lg font-bold text-white border-b border-transparent hover:border-slate-600 focus:border-sky-400 focus:outline-none transition px-1 py-0.5"
            />
            <p className="text-xs text-slate-400 px-1 mt-0.5">
              مکان: <strong className="text-sky-300">{city.cityNameFa}</strong> | تابش شیبدار: <strong className="text-amber-300">{city.peakSunHours} PSH</strong> | نوع سیستم: <strong className="text-emerald-300">{systemMode.toUpperCase()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
              <span className="text-slate-400">ظرفیت PV:</span>
              <span className="text-amber-400 font-bold">{arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp</span>
            </div>
            <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
              <span className="text-slate-400">ظرفیت اینورتر:</span>
              <span className="text-sky-400 font-bold">{inverterClustering.totalInverterCapacityKw.toFixed(1)} kW</span>
            </div>
            {systemMode !== 'powerplant' && (
              <div className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2">
                <span className="text-slate-400">بانک باتری:</span>
                <span className="text-emerald-400 font-bold">{batterySizing.grossCapacityKwh.toFixed(1)} kWh</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Operational Workspace Content */}
        <main className="p-6 flex-1 w-full max-w-7xl mx-auto space-y-6">
          {/* Notification banner if battery is not needed in powerplant mode */}
          {systemMode === 'powerplant' && activeTab === 'bess' && (
            <div className="studio-card border-amber-500/40 bg-amber-950/20 text-amber-200 p-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-300">{t.powerplantNoBatteryNotice}</h4>
                <p className="text-xs text-amber-200/80 mt-1">
                  در حالت نیروگاهی (IPP) تولید انرژی مستقیماً به شبکه سراسری تزریق می‌شود. در صورت نیاز به افزودن ذخیره‌ساز فرکانسی یا پیک‌سایی می‌توانید پارامترها را تنظیم کنید.
                </p>
              </div>
            </div>
          )}

          {/* System Mode Tab */}
          {activeTab === 'system_mode' && (
            <div className="space-y-6">
              <div className="studio-card">
                <h2 className="text-xl font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Sliders className="w-6 h-6 text-amber-400" />
                  تعیین ساختار و نحوه اتصال به شبکه (On-grid / Off-grid / Utility Powerplant)
                </h2>
                <p className="text-slate-300 text-xs leading-relaxed">
                  نحوه تعامل سیستم با شبکه برق بالادست پایه محاسبات سایزینگ PV، باتری و تجهیزات حفاظتی است.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  {/* Powerplant */}
                  <div
                    onClick={() => setSystemMode('powerplant')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                      systemMode === 'powerplant'
                        ? 'border-amber-500 bg-amber-950/20 shadow-lg'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-amber-400 flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        نیروگاه خورشیدی (IPP Powerplant)
                      </h3>
                      {systemMode === 'powerplant' && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      اتصال مستقیم به شبکه فشار متوسط/قوی جهت فروش برق تجاری. محاسبات باتری پشتیبان کاملاً غیرضروری و حذف می‌شود.
                    </p>
                  </div>

                  {/* On-grid with Backup */}
                  <div
                    onClick={() => setSystemMode('ongrid')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                      systemMode === 'ongrid'
                        ? 'border-sky-500 bg-sky-950/20 shadow-lg'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sky-400 flex items-center gap-2">
                        <Grid className="w-5 h-5" />
                        متصل به شبکه با پشتیبان (On-grid)
                      </h3>
                      {systemMode === 'ongrid' && <CheckCircle2 className="w-5 h-5 text-sky-400" />}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      تامین بار از شبکه و PV. باتری صرفاً بر اساس میزان ساعات قطعی و خاموشی شبکه پشتیبان محاسبه می‌شود.
                    </p>
                  </div>

                  {/* Off-grid */}
                  <div
                    onClick={() => setSystemMode('offgrid')}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                      systemMode === 'offgrid'
                        ? 'border-emerald-500 bg-emerald-950/20 shadow-lg'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-emerald-400 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        مستقل از شبکه (Off-grid Standalone)
                      </h3>
                      {systemMode === 'offgrid' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      عدم دسترسی به شبکه. سایزینگ بر اساس بار ۲۴ ساعته، عدم تولید PV در شب و روزهای ابری (Autonomy) انجام می‌پذیرد.
                    </p>
                  </div>
                </div>

                {/* Specific Parameter Config per Mode */}
                <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  {systemMode === 'powerplant' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-amber-300 block">
                        ظرفیت هدف نیروگاه (kW AC / Target Plant Capacity):
                      </label>
                      <input
                        type="number"
                        value={targetPowerplantCapacityKw}
                        onChange={(e) => setTargetPowerplantCapacityKw(Math.max(1, Number(e.target.value)))}
                        className="studio-input w-64"
                      />
                      <p className="text-[11px] text-slate-400">
                        طراحی بر اساس حداکثر توان خروجی تزریقی به پست MV/HV و متناسب با دیماند درخواستی از شبکه.
                      </p>
                    </div>
                  )}

                  {systemMode === 'ongrid' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-sky-300 block">
                        مدت زمان انتظار خاموشی و قطعی شبکه (ساعت در روز / Blackout Hours):
                      </label>
                      <input
                        type="number"
                        value={outageHours}
                        onChange={(e) => setOutageHours(Math.max(1, Math.min(24, Number(e.target.value))))}
                        className="studio-input w-64"
                      />
                      <p className="text-[11px] text-slate-400">
                        سایزینگ باتری برای تامین انرژی بار در طی ساعات خاموشی شبکه محاسبه خواهد شد.
                      </p>
                    </div>
                  )}

                  {systemMode === 'offgrid' && (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-emerald-300 block">
                        روزهای خودکفایی و پشتیبانی ابری (Autonomy Days):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={autonomyDays}
                        onChange={(e) => setAutonomyDays(Math.max(0.5, Number(e.target.value)))}
                        className="studio-input w-64"
                      />
                      <p className="text-[11px] text-slate-400">
                        تعداد روزهایی که سیستم باید بدون تابش آفتاب بار را کلا از باتری تغذیه نماید.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Site & Climate Map Tab */}
          {activeTab === 'climate' && (
            <ClimateTab selectedCity={city} onCityChange={setCity} />
          )}

          {/* Loads Tab */}
          {activeTab === 'loads' && (
            <LoadProfilingTab
              loads={loads}
              onLoadsChange={setLoads}
              analysisResult={loadAnalysis}
            />
          )}

          {/* Array Engineering Tab */}
          {activeTab === 'array' && (
            <PvArrayEngineeringTab
              selectedModule={selectedModule}
              onModuleChange={setSelectedModule}
              selectedInverter={selectedInverter}
              onInverterChange={setSelectedInverter}
              arrayDesign={arrayDesign}
              inverterClustering={inverterClustering}
            />
          )}

          {/* Harmonics & Upstream Grid Tab */}
          {activeTab === 'harmonics_grid' && <HarmonicsGridTab />}

          {/* MV Substation Tab */}
          {activeTab === 'mv_substation' && (
            <MvSubstationTab
              plantCapacityAcMw={inverterClustering.totalInverterCapacityKw / 1000.0}
            />
          )}

          {/* Cables & Protection BOM Tab */}
          {activeTab === 'cables_bom' && (
            <ProtectionBomTab protectionResult={protectionResult} />
          )}

          {/* BESS Battery Storage Tab */}
          {activeTab === 'bess' && (
            <BessTab
              selectedChemistry={selectedChemistry}
              onChemistryChange={setSelectedChemistry}
              autonomyDays={autonomyDays}
              onAutonomyDaysChange={setAutonomyDays}
              batterySizing={batterySizing}
            />
          )}

          {/* Structural & Foundation Design Tab */}
          {activeTab === 'structural' && <StructuralFoundationTab />}

          {/* 24h Simulation Tab */}
          {activeTab === 'sim24h' && (
            <Simulation24hTab
              simulationResult={simulationResult}
              generatorSizing={generatorSizing}
              outageHours={outageHours}
              onOutageHoursChange={setOutageHours}
            />
          )}

          {/* Waterfall Loss Tab */}
          {activeTab === 'waterfall_loss' && (
            <WaterfallLossTab
              installedCapacityKwp={arrayDesign.totalPvCapacityKwp}
              peakSunHours={city.peakSunHours}
              ambientTempMaxC={city.tempMaxC}
              soilingLossPct={city.soilingLossPct}
              dcAcRatio={
                arrayDesign.totalPvCapacityKwp /
                Math.max(0.1, inverterClustering.totalInverterCapacityKw)
              }
            />
          )}

          {/* Financial Analysis Tab */}
          {activeTab === 'financial' && (
            <FinancialTab
              financial={financialResult}
              usdToTomanRate={usdToTomanRate}
              onUsdToTomanRateChange={setUsdToTomanRate}
              gridTariffToman={gridTariffToman}
              onGridTariffTomanChange={setGridTariffToman}
            />
          )}

          {/* Single Line Diagram Tab */}
          {activeTab === 'sld' && (
            <div className="space-y-4">
              <div className="studio-card">
                <h1 className="text-xl font-bold text-sky-400 mb-1 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  نقشه شماتیک تک‌خطی تعاملی سیستم فتوولتائیک (Interactive Single-Line Diagram)
                </h1>
                <p className="text-slate-400 text-xs">
                  نقشه الکتریکی استاندارد مهندسی شامل آرایه پنل‌ها، تابلوی تجمیع DC، سرج ارسترها، باسبار اشتراکی، اینورترها، باتری و تابلوی توزیع AC
                </p>
              </div>
              <SingleLineDiagram
                pvCapacityKwp={arrayDesign.totalPvCapacityKwp}
                panelCount={arrayDesign.totalModulesCount}
                modulesPerString={arrayDesign.modulesPerString}
                parallelStrings={arrayDesign.parallelStringsCount}
                stringVocVolts={arrayDesign.stringVocMaxColdVolts}
                stringVmpVolts={arrayDesign.stringVmpMinHotVolts}
                stringIscAmps={selectedModule.iscAmps}
                inverterKw={selectedInverter.pnomAcKw}
                inverterCount={inverterClustering.parallelUnitsCount}
                isThreePhase={selectedInverter.isThreePhase}
                batteryKwh={batterySizing.grossCapacityKwh}
                batteryVoltageVdc={batterySizing.systemVoltageVdc}
                batteryAh={batterySizing.totalCapacityAh}
                batteryFuseAmps={Math.max(
                  100,
                  Math.ceil((inverterClustering.inverterDcContinuousCurrentAmps * 1.35) / 25) * 25
                )}
                acCurrentAmps={
                  (inverterClustering.totalInverterCapacityKw * 1000) /
                  (selectedInverter.isThreePhase ? Math.sqrt(3) * 400 * 0.95 : 230 * 0.95)
                }
                dcCableMm2={protectionResult.cableRuns[0]?.selectedStandardCrossSectionMm2 || 6.0}
                batCableMm2={protectionResult.cableRuns[1]?.selectedStandardCrossSectionMm2 || 35.0}
                acCableMm2={protectionResult.cableRuns[2]?.selectedStandardCrossSectionMm2 || 10.0}
              />
            </div>
          )}

          {/* CAD Layout Tab */}
          {activeTab === 'cad_layout' && <PowerplantCadLayoutTab />}

          {/* 3D Ray-Tracer Viewer Tab */}
          {activeTab === '3d_viewer' && <ThreeJsViewer />}

          {/* Scenario Comparison Tab */}
          {activeTab === 'scenarios' && <ScenarioComparisonTab scenarios={scenarios} />}

          {/* Equipment Catalog Tab */}
          {activeTab === 'catalog' && <CatalogTab />}

          {/* Iranian PPA Regulations Tab */}
          {activeTab === 'iran_regulations' && (
            <IranianRegulationsTab
              capacityKwp={arrayDesign.totalPvCapacityKwp}
              annualGenerationMwh={estimatedAnnualYieldMwh}
            />
          )}

          {/* Solar Pumping Tab */}
          {activeTab === 'solar_pumping' && (
            <SolarPumpingTab peakSunHours={city.peakSunHours} />
          )}

          {/* IV Curve Tracer Tab */}
          {activeTab === 'iv_curve' && <IvCurveTracerTab />}
        </main>
      </div>

      {/* Official EPC Report Modal */}
      {showReportModal && (
        <OfficialReportModal
          projectName={projectName}
          city={city}
          loadAnalysis={loadAnalysis}
          module={selectedModule}
          inverter={selectedInverter}
          arrayDesign={arrayDesign}
          batterySizing={batterySizing}
          protection={protectionResult}
          simulation={simulationResult}
          generator={generatorSizing}
          financial={financialResult}
          onClose={() => setShowReportModal(false)}
          onImportProject={handleImportProject}
        />
      )}
    </div>
  );
};

export default App;
