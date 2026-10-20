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
} from 'lucide-react';

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

export type ActiveModuleTab =
  | 'loads'
  | 'climate'
  | 'array'
  | 'bess'
  | 'cables_bom'
  | 'sim24h'
  | 'financial'
  | 'sld'
  | 'scenarios'
  | 'catalog'
  | '3d_viewer'
  | 'cad_layout'
  | 'waterfall_loss'
  | 'iv_curve'
  | 'mv_substation'
  | 'solar_pumping'
  | 'iran_regulations';

type ModuleCategory = 'all' | 'core' | 'utility' | 'specialized' | 'finance_sld';

export const App: React.FC = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('loads');
  const [activeCategory, setActiveCategory] = useState<ModuleCategory>('all');
  const [showReportModal, setShowReportModal] = useState(false);

  // Core System State
  const [projectName, setProjectName] = useState('طرح نیروگاه خورشیدی مهندسی و EPC');
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
    tempCoeffVocPct: CATALOG_MODULES[0].tempCoeffVocPct,
    tempCoeffPmpPct: CATALOG_MODULES[0].tempCoeffPmpPct,
    noctC: 45.0,
    lengthM: CATALOG_MODULES[0].lengthMm / 1000.0,
    widthM: CATALOG_MODULES[0].widthMm / 1000.0,
  });

  const [selectedInverter, setSelectedInverter] = useState<InverterSpecs>({
    manufacturer: CATALOG_INVERTERS[0].manufacturer,
    modelName: CATALOG_INVERTERS[0].modelName,
    pnomAcKw: CATALOG_INVERTERS[0].pnomKw,
    vdcMaxVolts: CATALOG_INVERTERS[0].vdcMaxVolts,
    vmpptMinVolts: CATALOG_INVERTERS[0].vmpptMinVolts,
    vmpptMaxVolts: CATALOG_INVERTERS[0].vmpptMaxVolts,
    iscMaxAmpsPerMppt: 26.0,
    imppMaxAmpsPerMppt: 22.0,
    mpptChannelsCount: CATALOG_INVERTERS[0].mpptCount,
    efficiencyMaxPct: CATALOG_INVERTERS[0].efficiencyMaxPct,
    isThreePhase: CATALOG_INVERTERS[0].isThreePhase,
  });

  const [selectedChemistry, setSelectedChemistry] = useState<BatteryChemistry>('lifepo4');
  const [autonomyDays, setAutonomyDays] = useState<number>(1.5);
  const [outageHours, setOutageHours] = useState<number>(24);

  const [usdToTomanRate, setUsdToTomanRate] = useState<number>(90_000);
  const [gridTariffToman, setGridTariffToman] = useState<number>(3_500);

  // 1. Reactive Load Analysis
  const loadAnalysis = useMemo(() => {
    return analyzeLoadProfile(loads);
  }, [loads]);

  // 2. Inverter Clustering & Paralleling
  const inverterClustering = useMemo(() => {
    return evaluateInverterClustering(
      loadAnalysis.continuousActivePowerWatts,
      loadAnalysis.maxSurgePeakPowerWatts,
      selectedInverter.pnomAcKw
    );
  }, [loadAnalysis, selectedInverter]);

  // 3. Reactive PV Array Engineering
  const arrayDesign = useMemo(() => {
    return designPvArray(
      loadAnalysis.totalDailyEnergyKwh,
      city.peakSunHours,
      selectedModule,
      selectedInverter,
      {
        ambientTempMinC: city.tempMinC,
        ambientTempMaxC: city.tempMaxC,
        soilingLossPct: city.soilingLossPct,
        dcCableLossPct: 1.5,
        mismatchAndLidLossPct: 2.0,
        inverterClippingLossPct: 1.0,
        systemAvailabilityPct: 99.0,
        groundAlbedo: city.albedo,
        arrayTiltDeg: city.optimalTiltAnnualDeg,
      }
    );
  }, [loadAnalysis, city, selectedModule, selectedInverter]);

  // 4. Reactive Battery Sizing
  const batterySizing = useMemo(() => {
    return sizeBatteryBank(
      loadAnalysis.nighttimeEnergyWh / 1000.0,
      autonomyDays,
      selectedChemistry,
      inverterClustering.recommendedDcVoltageVdc,
      loadAnalysis.maxSurgePeakPowerWatts,
      loadAnalysis.continuousActivePowerWatts,
      city.tempMinC
    );
  }, [loadAnalysis, autonomyDays, selectedChemistry, inverterClustering, city]);

  // 5. Reactive Protection BOM & Cable Runs
  const protectionResult = useMemo(() => {
    return generateProtectionBom(
      arrayDesign.parallelStringsCount,
      selectedModule.iscAmps,
      arrayDesign.stringVocMaxColdVolts,
      inverterClustering.totalInverterCapacityKw,
      inverterClustering.inverterDcContinuousCurrentAmps,
      inverterClustering.recommendedDcVoltageVdc,
      selectedInverter.isThreePhase
    );
  }, [arrayDesign, selectedModule, inverterClustering, selectedInverter]);

  // 6. Reactive 24h Energy Simulation & Generator Sizer
  const simulationResult = useMemo(() => {
    return simulate24hEnergyBalance(
      arrayDesign.totalPvCapacityKwp,
      city.peakSunHours,
      loadAnalysis.daytimeEnergyWh / 1000.0,
      loadAnalysis.nighttimeEnergyWh / 1000.0,
      batterySizing.usableCapacityKwh,
      batterySizing.grossCapacityKwh
    );
  }, [arrayDesign, city, loadAnalysis, batterySizing]);

  const generatorSizing = useMemo(() => {
    return sizeDieselGenerator(
      loadAnalysis.continuousActivePowerWatts,
      loadAnalysis.maxSurgePeakPowerWatts,
      outageHours
    );
  }, [loadAnalysis, outageHours]);

  // 7. Reactive Financial Valuation
  const estimatedAnnualYieldMwh = useMemo(() => {
    return (arrayDesign.totalPvCapacityKwp * city.peakSunHours * 365.0 * 0.78) / 1000.0;
  }, [arrayDesign, city]);

  const financialResult = useMemo(() => {
    const annualYieldKwh = estimatedAnnualYieldMwh * 1000.0;
    return performFinancialAnalysis(
      arrayDesign.totalPvCapacityKwp,
      batterySizing.grossCapacityKwh,
      inverterClustering.totalInverterCapacityKw,
      annualYieldKwh,
      usdToTomanRate,
      gridTariffToman
    );
  }, [arrayDesign, estimatedAnnualYieldMwh, batterySizing, inverterClustering, usdToTomanRate, gridTariffToman]);

  // 8. Scenario Comparison
  const scenarios = useMemo(() => {
    return generateScenarios(
      arrayDesign.totalPvCapacityKwp,
      loadAnalysis.totalDailyEnergyKwh,
      autonomyDays,
      usdToTomanRate
    );
  }, [arrayDesign, loadAnalysis, autonomyDays, usdToTomanRate]);

  // Import project JSON handler
  const handleImportProject = (imported: any) => {
    if (imported.projectName) setProjectName(imported.projectName);
    if (imported.city) setCity(imported.city);
    if (imported.loads) setLoads(imported.loads);
  };

  // Tab definitions with category tagging
  const tabsConfig: {
    id: ActiveModuleTab;
    category: 'core' | 'utility' | 'specialized' | 'finance_sld';
    num: string;
    title: string;
    icon: React.ReactNode;
  }[] = [
    // Core PV Engineering
    { id: 'loads', category: 'core', num: '۱', title: 'پروفایل بار و دینامیک هجومی', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'climate', category: 'core', num: '۲', title: 'دیتابیس اقلیم ایران و PSH', icon: <MapPin className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'array', category: 'core', num: '۳', title: 'مهندسی آرایه PV و اینورتر', icon: <Sun className="w-3.5 h-3.5 text-sky-400" /> },
    { id: 'bess', category: 'core', num: '۴', title: 'ذخیره‌ساز باتری BESS و زوال', icon: <BatteryIcon className="w-3.5 h-3.5 text-indigo-400" /> },
    { id: 'cables_bom', category: 'core', num: '۵', title: 'سایزینگ کابل و تجهیزات حفاظتی', icon: <Shield className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'sim24h', category: 'core', num: '۶', title: 'شبیه‌سازی ۲۴ ساعته و ژنراتور', icon: <Activity className="w-3.5 h-3.5 text-teal-400" /> },

    // Utility & Powerplant Scale
    { id: 'cad_layout', category: 'utility', num: '۷', title: 'چیدمان CAD مزرعه خورشیدی', icon: <Grid className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'waterfall_loss', category: 'utility', num: '۸', title: 'آبشار تلفات سالانه و ضریب PR', icon: <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'iv_curve', category: 'utility', num: '۹', title: 'ترِیسر مشخصه I-V و اثر سایه', icon: <Activity className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'mv_substation', category: 'utility', num: '۱۰', title: 'پست فشار متوسط، ترانس و ارتینگ', icon: <Building2 className="w-3.5 h-3.5 text-amber-400" /> },

    // Specialized & Regulations
    { id: 'solar_pumping', category: 'specialized', num: '۱۱', title: 'پمپاژ خورشیدی چاه‌های کشاورزی', icon: <Droplet className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'iran_regulations', category: 'specialized', num: '۱۲', title: 'ماده ۱۶، بورس انرژی و PPA ساتبا', icon: <Scale className="w-3.5 h-3.5 text-amber-300" /> },
    { id: '3d_viewer', category: 'specialized', num: '۱۳', title: 'شبیه‌ساز ۳D و سایه‌اندازی اشعه‌ای', icon: <Eye className="w-3.5 h-3.5 text-purple-300" /> },

    // Financial, Diagrams & Equipment
    { id: 'sld', category: 'finance_sld', num: '۱۴', title: 'نقشه الکتریکی تک‌خطی (SLD)', icon: <Layers className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'financial', category: 'finance_sld', num: '۱۵', title: 'تحلیل مالی، LCOE و IRR', icon: <TrendingUp className="w-3.5 h-3.5 text-green-400" /> },
    { id: 'scenarios', category: 'finance_sld', num: '۱۶', title: 'مقایسه ۴ سناریوی مهندسی', icon: <GitCompare className="w-3.5 h-3.5 text-pink-400" /> },
    { id: 'catalog', category: 'finance_sld', num: '۱۷', title: 'بانک تجهیزات معتبر جهانی', icon: <Database className="w-3.5 h-3.5 text-indigo-300" /> },
  ];

  const visibleTabs = useMemo(() => {
    if (activeCategory === 'all') return tabsConfig;
    return tabsConfig.filter((t) => t.category === activeCategory);
  }, [activeCategory, tabsConfig]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Application Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-sky-400/30 rounded-xl">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">SolarPV Studio</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-600 text-white shadow-sm">
                  Pro Powerplant Suite v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                مجموعه جامع مهندسی نیروگاه خورشیدی، محاسبات اتصال به شبکه، پست MV، پمپاژ کشاورزی و ماده ۱۶
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Project Quick Overview Badge */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-amber-400 font-bold">{arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp DC</span>
              <span className="text-slate-500">|</span>
              <span className="text-sky-400 font-bold">{inverterClustering.totalInverterCapacityKw.toFixed(0)} kVA AC</span>
              <span className="text-slate-500">|</span>
              <span className="text-indigo-400 font-bold">{batterySizing.grossCapacityKwh.toFixed(1)} kWh BESS</span>
              <span className="text-slate-500">|</span>
              <span className="text-emerald-400 font-bold">{city.nameFa} ({city.peakSunHours} PSH)</span>
            </div>

            <button
              onClick={() => setShowReportModal(true)}
              className="studio-btn-primary flex items-center gap-1.5 text-xs py-2 px-3 shadow-md"
            >
              <FileText className="w-4 h-4" />
              دفترچه فنی EPC / خروجی PDF
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="max-w-7xl mx-auto px-4 pt-1.5 pb-1 flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none border-t border-slate-800/50">
          <span className="text-[11px] text-slate-400 font-semibold ml-2 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            بخش‌های مهندسی:
          </span>

          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
              activeCategory === 'all'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            همه ماژول‌ها (۱۷ ماژول)
          </button>

          <button
            onClick={() => setActiveCategory('core')}
            className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
              activeCategory === 'core'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ۱. طراحی و سایزینگ پایه (۶)
          </button>

          <button
            onClick={() => setActiveCategory('utility')}
            className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
              activeCategory === 'utility'
                ? 'bg-indigo-500 text-white font-bold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ۲. مزارع خورشیدی و شبکه MV (۴)
          </button>

          <button
            onClick={() => setActiveCategory('specialized')}
            className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
              activeCategory === 'specialized'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ۳. پمپاژ کشاورزی و قوانین ایران (۳)
          </button>

          <button
            onClick={() => setActiveCategory('finance_sld')}
            className={`px-2.5 py-1 rounded-md transition-all text-xs font-semibold ${
              activeCategory === 'finance_sld'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ۴. نقشه SLD، مالی و کاتالوگ (۴)
          </button>
        </div>

        {/* 17 Core Engineering Module Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto text-xs font-medium border-t border-slate-800/80 pt-1.5 pb-1 scrollbar-none">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3 rounded-t-lg flex items-center gap-1.5 transition-all whitespace-nowrap text-xs ${
                  isActive
                    ? 'bg-slate-800 text-sky-400 border-t-2 border-sky-400 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {tab.icon}
                <span>{tab.num}. {tab.title}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        {/* Core Suite */}
        {activeTab === 'loads' && (
          <LoadProfilingTab
            loads={loads}
            onLoadsChange={setLoads}
            analysisResult={loadAnalysis}
          />
        )}

        {activeTab === 'climate' && (
          <ClimateTab selectedCity={city} onCityChange={setCity} />
        )}

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

        {activeTab === 'bess' && (
          <BessTab
            selectedChemistry={selectedChemistry}
            onChemistryChange={setSelectedChemistry}
            autonomyDays={autonomyDays}
            onAutonomyDaysChange={setAutonomyDays}
            batterySizing={batterySizing}
          />
        )}

        {activeTab === 'cables_bom' && (
          <ProtectionBomTab protectionResult={protectionResult} />
        )}

        {activeTab === 'sim24h' && (
          <Simulation24hTab
            simulationResult={simulationResult}
            generatorSizing={generatorSizing}
            outageHours={outageHours}
            onOutageHoursChange={setOutageHours}
          />
        )}

        {/* Utility & Powerplant Scale Modules */}
        {activeTab === 'cad_layout' && <PowerplantCadLayoutTab />}

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

        {activeTab === 'iv_curve' && <IvCurveTracerTab />}

        {activeTab === 'mv_substation' && (
          <MvSubstationTab
            plantCapacityAcMw={inverterClustering.totalInverterCapacityKw / 1000.0}
          />
        )}

        {/* Specialized Modules & Iranian Regulations */}
        {activeTab === 'solar_pumping' && (
          <SolarPumpingTab peakSunHours={city.peakSunHours} />
        )}

        {activeTab === 'iran_regulations' && (
          <IranianRegulationsTab
            capacityKwp={arrayDesign.totalPvCapacityKwp}
            annualGenerationMwh={estimatedAnnualYieldMwh}
          />
        )}

        {activeTab === '3d_viewer' && <ThreeJsViewer />}

        {/* Financial, Diagrams & Catalog */}
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

        {activeTab === 'financial' && (
          <FinancialTab
            financial={financialResult}
            usdToTomanRate={usdToTomanRate}
            onUsdToTomanRateChange={setUsdToTomanRate}
            gridTariffToman={gridTariffToman}
            onGridTariffTomanChange={setGridTariffToman}
          />
        )}

        {activeTab === 'scenarios' && <ScenarioComparisonTab scenarios={scenarios} />}

        {activeTab === 'catalog' && <CatalogTab />}
      </main>

      {/* Enhanced Engineering Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-3 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-300">SolarPV Studio Pro v2.0 Engineering Suite</span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="text-slate-400 text-[11px]">
              مطابق استانداردهای IEC 62548:2024, IEC 60364-5-52, IEEE 80, IEEE 1547 و ضوابط فنی ساتبا و توانیر
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> موتور تحلیلی فعال
            </span>
            <span className="text-slate-400">
              تولید سالانه: <strong className="text-amber-400">{estimatedAnnualYieldMwh.toFixed(1)} MWh</strong>
            </span>
            <span className="text-slate-400">
              صرفه‌جویی کربن: <strong className="text-emerald-400">{(estimatedAnnualYieldMwh * 0.65).toFixed(1)} tCO₂/yr</strong>
            </span>
          </div>
        </div>
      </footer>

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
