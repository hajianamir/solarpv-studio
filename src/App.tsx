import React, { useState, useMemo, useEffect } from 'react';
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
  Save,
  FolderOpen,
  Download,
  Upload,
  Radio,
  Boxes,
  HelpCircle,
  Wrench,
  Menu,
  X,
} from 'lucide-react';

// i18n
import { Language, translations } from './i18n';

// Engines & Data
import { IRANIAN_CLIMATE_CITIES, ClimateCity, SiteGeotechnicalOverrides } from './engine/climaticData';
import { LOAD_PRESETS, ElectricalLoadItem, analyzeLoadProfile } from './engine/loadProfiles';
import { designPvArray, ModuleSpecs, InverterSpecs } from './engine/pvEngineAdvanced';
import { sizeBatteryBank, BatteryChemistry, BATTERY_CHEMISTRIES } from './engine/batteryEngine';
import { evaluateInverterClustering } from './engine/inverterClustering';
import {
  calculateAdvancedCableRun,
  calculateEarthingSystem,
  calculateLightningProtection,
  CompleteProtectionSystemResult,
} from './engine/protectionBomEngine';
import { simulate24hEnergyBalance, sizeDieselGenerator } from './engine/simulation24hEngine';
import {
  performFinancialAnalysis,
  UserFinancialPricing,
  DEFAULT_FINANCIAL_PRICING,
} from './engine/financialEngine';
import { generateScenarios } from './engine/scenarioEngine';
import {
  CATALOG_MODULES,
  CATALOG_INVERTERS,
  getFullModulesCatalog,
  getFullInvertersCatalog,
} from './engine/equipmentCatalogData';
import {
  designPowerplantBays,
  InverterTechnology,
  PowerplantBayArchitectureResult,
} from './engine/powerplantBayEngine';

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
import { AdvancedFeaturesModal } from './components/AdvancedFeaturesModal';
import { useFeatureFlags } from './engine/core/FeatureFlagContext';
import { migrateProjectToV3 } from './engine/core/projectMigration';
import { generateTraceId } from './engine/core/modelRegistry';

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

const LOCAL_STORAGE_KEY = 'solarpv_project_save';

export const App: React.FC = () => {
  // Language & i18n
  const [lang, setLang] = useState<Language>('fa');
  const t = translations[lang];

  // Navigation & System Mode State
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('climate');
  const [systemMode, setSystemMode] = useState<SystemMode>('powerplant');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // RFC 3.0 Advanced Feature Flags
  const { flags, setAllFlags, activeCount } = useFeatureFlags();

  // Inverter Technology & MV Bay Architecture (for Powerplant mode)
  const [inverterTech, setInverterTech] = useState<InverterTechnology>('string_inverter');
  const [customBaysCount, setCustomBaysCount] = useState<number>(2);
  const [mvVoltageKv, setMvVoltageKv] = useState<number>(20); // 20 kV standard in Iran

  // Core System State
  const [projectName, setProjectName] = useState(
    lang === 'fa' ? 'طرح مهندسی نیروگاه خورشیدی و EPC' : 'Solar PV Engineering & EPC Project'
  );
  const [city, setCity] = useState<ClimateCity>(IRANIAN_CLIMATE_CITIES[0]); // Default Tehran
  const [siteOverrides, setSiteOverrides] = useState<SiteGeotechnicalOverrides>({});
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

  // Default utility inverter
  const defaultUtilInv = CATALOG_INVERTERS.find((i) => i.id === 'inv-huawei-330ktl') || CATALOG_INVERTERS[0];

  const [selectedInverter, setSelectedInverter] = useState<InverterSpecs>({
    manufacturer: defaultUtilInv.manufacturer,
    modelName: defaultUtilInv.modelName,
    pnomAcKw: defaultUtilInv.pnomKw,
    vdcMaxVolts: defaultUtilInv.vdcMaxVolts,
    vmpptMinVolts: defaultUtilInv.vmpptMinVolts,
    vmpptMaxVolts: defaultUtilInv.vmpptMaxVolts,
    iscMaxAmpsPerMppt: 26.0,
    imppMaxAmpsPerMppt: 22.0,
    mpptChannelsCount: defaultUtilInv.mpptCount,
    efficiencyMaxPct: defaultUtilInv.efficiencyMaxPct,
    isThreePhase: defaultUtilInv.isThreePhase,
  });

  const [selectedChemistry, setSelectedChemistry] = useState<BatteryChemistry>('lifepo4');
  const [autonomyDays, setAutonomyDays] = useState<number>(1.5);
  const [outageHours, setOutageHours] = useState<number>(6); // For ongrid mode blackout calculation
  const [targetPowerplantCapacityKw, setTargetPowerplantCapacityKw] = useState<number>(1000); // 1MW default
  const [enableDieselGenerator, setEnableDieselGenerator] = useState<boolean>(false); // User-selectable optional genset
  
  // Custom User Financial Pricing
  const [userPricing, setUserPricing] = useState<UserFinancialPricing>(DEFAULT_FINANCIAL_PRICING);

  // Persistence & Save State
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Auto-switch inverters when Inverter Technology changes
  const handleInverterTechChange = (tech: InverterTechnology) => {
    setInverterTech(tech);
    if (tech === 'mv_turnkey') {
      const turnkey = CATALOG_INVERTERS.find((i) => i.technology === 'mv_turnkey');
      if (turnkey) {
        setSelectedInverter({
          manufacturer: turnkey.manufacturer,
          modelName: turnkey.modelName,
          pnomAcKw: turnkey.pnomKw,
          vdcMaxVolts: turnkey.vdcMaxVolts,
          vmpptMinVolts: turnkey.vmpptMinVolts,
          vmpptMaxVolts: turnkey.vmpptMaxVolts,
          iscMaxAmpsPerMppt: 100.0,
          imppMaxAmpsPerMppt: 85.0,
          mpptChannelsCount: turnkey.mpptCount,
          efficiencyMaxPct: turnkey.efficiencyMaxPct,
          isThreePhase: true,
        });
      }
    } else {
      const stringInv = CATALOG_INVERTERS.find((i) => i.technology === 'string_inverter');
      if (stringInv) {
        setSelectedInverter({
          manufacturer: stringInv.manufacturer,
          modelName: stringInv.modelName,
          pnomAcKw: stringInv.pnomKw,
          vdcMaxVolts: stringInv.vdcMaxVolts,
          vmpptMinVolts: stringInv.vmpptMinVolts,
          vmpptMaxVolts: stringInv.vmpptMaxVolts,
          iscMaxAmpsPerMppt: 30.0,
          imppMaxAmpsPerMppt: 26.0,
          mpptChannelsCount: stringInv.mpptCount,
          efficiencyMaxPct: stringInv.efficiencyMaxPct,
          isThreePhase: true,
        });
      }
    }
  };

  // Redirect invalid active tabs when switching system mode
  useEffect(() => {
    if (systemMode === 'powerplant') {
      if (activeTab === 'loads' || activeTab === 'bess' || activeTab === 'scenarios') {
        setActiveTab('system_mode');
      }
    } else {
      if (activeTab === 'mv_substation') {
        setActiveTab('system_mode');
      }
    }
  }, [systemMode, activeTab]);

  // Load saved project on initial mount if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.savedAt) setLastSavedTime(data.savedAt);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Save Project to LocalStorage (v3.0.0 Compliant with Trace ID)
  const handleSaveProject = () => {
    const timeStr = new Date().toLocaleTimeString(lang === 'fa' ? 'fa-IR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const traceId = generateTraceId();
    const projectData = {
      version: '3.0.0',
      savedAt: timeStr,
      traceId,
      projectName,
      systemMode,
      inverterTech,
      customBaysCount,
      mvVoltageKv,
      city,
      siteOverrides,
      loads,
      selectedModule,
      selectedInverter,
      selectedChemistry,
      autonomyDays,
      outageHours,
      targetPowerplantCapacityKw,
      enableDieselGenerator,
      userPricing,
      featureFlags: flags,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectData));
      setLastSavedTime(timeStr);
      setSaveToast(
        lang === 'fa'
          ? `پروژه v3 با کد ردگیری ${traceId.slice(0, 8)} در ساعت ${timeStr} ذخیره شد.`
          : `Project v3 saved with trace ${traceId.slice(0, 8)} at ${timeStr}`
      );
      setTimeout(() => setSaveToast(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  // Load Project from LocalStorage
  const handleLoadLastProject = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        handleImportProject(data);
        setSaveToast(lang === 'fa' ? 'پروژه ذخیره‌شده بازیابی شد.' : 'Project successfully restored.');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (e) {
      alert(lang === 'fa' ? 'خطا در بارگذاری پروژه ذخیره شده.' : 'Error loading project.');
    }
  };

  // 1. Analyze Loads
  const loadAnalysis = useMemo(() => analyzeLoadProfile(loads), [loads]);

  // 2. Compute Target Energy Demand Based on System Mode
  const effectiveDailyKwhDemand = useMemo(() => {
    if (systemMode === 'powerplant') {
      return (targetPowerplantCapacityKw || 1000) * city.peakSunHours * 0.82; // Commercial Generation target
    } else if (systemMode === 'ongrid') {
      const averagePowerKw = (loadAnalysis.totalDailyEnergyKwh || 20) / 24.0;
      return Math.max(1, averagePowerKw * (outageHours || 6));
    } else {
      return Math.max(1, loadAnalysis.totalDailyEnergyKwh || 20);
    }
  }, [systemMode, targetPowerplantCapacityKw, city.peakSunHours, loadAnalysis.totalDailyEnergyKwh, outageHours]);

  // 3. Advanced PV Array Engineering Sizing
  const arrayDesign = useMemo(() => {
    return designPvArray(
      effectiveDailyKwhDemand,
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
  }, [effectiveDailyKwhDemand, city, selectedModule, selectedInverter]);

  // 4. Inverter Clustering Evaluation
  const inverterClustering = useMemo(() => {
    const contWatts =
      systemMode === 'powerplant'
        ? (targetPowerplantCapacityKw || 1000) * 1000
        : loadAnalysis.continuousActivePowerWatts;
    const peakWatts =
      systemMode === 'powerplant'
        ? (targetPowerplantCapacityKw || 1000) * 1100
        : loadAnalysis.maxSurgePeakPowerWatts;

    return evaluateInverterClustering(
      contWatts,
      peakWatts,
      selectedInverter.pnomAcKw
    );
  }, [systemMode, targetPowerplantCapacityKw, loadAnalysis, selectedInverter]);

  // 5. Battery Storage Sizing
  const batterySizing = useMemo(() => {
    const energyRequirementKwh =
      systemMode === 'powerplant'
        ? 0
        : systemMode === 'ongrid'
        ? (loadAnalysis.nighttimeEnergyWh / 1000.0) * ((outageHours || 6) / 24.0)
        : loadAnalysis.nighttimeEnergyWh / 1000.0;

    return sizeBatteryBank(
      energyRequirementKwh,
      systemMode === 'powerplant' ? 0 : autonomyDays,
      selectedChemistry,
      inverterClustering.recommendedDcVoltageVdc || 48,
      loadAnalysis.maxSurgePeakPowerWatts,
      loadAnalysis.continuousActivePowerWatts,
      city.tempMinC
    );
  }, [systemMode, loadAnalysis, outageHours, autonomyDays, selectedChemistry, inverterClustering, city]);

  // 6. Powerplant MV Bay Architecture (for Powerplant mode)
  const bayArchitecture: PowerplantBayArchitectureResult | undefined = useMemo(() => {
    if (systemMode !== 'powerplant') return undefined;
    return designPowerplantBays(
      (targetPowerplantCapacityKw || 1000) / 1000.0,
      arrayDesign.totalPvCapacityKwp / 1000.0,
      inverterTech,
      customBaysCount,
      mvVoltageKv,
      selectedInverter.pnomAcKw
    );
  }, [
    systemMode,
    targetPowerplantCapacityKw,
    arrayDesign.totalPvCapacityKwp,
    inverterTech,
    customBaysCount,
    mvVoltageKv,
    selectedInverter,
  ]);

  // 7. Complete Protection System (Cables, Earthing & Lightning)
  const protectionSystem: CompleteProtectionSystemResult = useMemo(() => {
    const dcStringRun = calculateAdvancedCableRun({
      id: 'dc-str',
      sectionNameFa: 'کابل DC استرینگ خورشیدی',
      sectionNameEn: 'PV DC String Cable',
      oneWayLengthM: 35,
      designCurrentAmps: selectedModule.iscAmps * 1.25,
      nominalVoltageVolts: arrayDesign.stringVocMaxColdVolts * 0.85,
      conductorMaterial: 'copper',
      insulationType: 'xlpe',
      allowableDropPct: 1.5,
      isDc: true,
    });

    const isUtil = systemMode === 'powerplant';
    const earthing = calculateEarthingSystem(
      systemMode === 'powerplant' ? targetPowerplantCapacityKw : inverterClustering.totalInverterCapacityKw,
      100,
      'solidly_grounded',
      isUtil
    );

    const lightning = calculateLightningProtection(
      systemMode === 'powerplant' ? targetPowerplantCapacityKw : inverterClustering.totalInverterCapacityKw,
      isUtil
    );

    return {
      cableRuns: [dcStringRun],
      earthing,
      lightning,
      protectionBom: [],
    };
  }, [arrayDesign, selectedModule, inverterClustering, systemMode, targetPowerplantCapacityKw]);

  // 8. 24-Hour Balance Simulation
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

  // 9. Diesel Backup Generator Sizing (Optionally activated by user)
  const generatorSizing = useMemo(() => {
    const contWatts =
      systemMode === 'powerplant'
        ? Math.max(15000, (targetPowerplantCapacityKw || 1000) * 15) // Substation auxiliary power (~1.5%)
        : loadAnalysis.continuousActivePowerWatts;
    const peakWatts =
      systemMode === 'powerplant'
        ? contWatts * 2.2
        : loadAnalysis.maxSurgePeakPowerWatts;

    return sizeDieselGenerator(
      contWatts,
      peakWatts,
      systemMode === 'powerplant' ? 4 : outageHours
    );
  }, [systemMode, targetPowerplantCapacityKw, loadAnalysis, outageHours]);

  // 10. Financial Analysis with User Unit Pricing & Optional Genset CAPEX
  const estimatedAnnualYieldMwh = (arrayDesign.totalPvCapacityKwp * city.peakSunHours * 365 * 0.82) / 1000;

  const financialResult = useMemo(() => {
    const annualYieldKwh = estimatedAnnualYieldMwh * 1000.0;
    return performFinancialAnalysis(
      arrayDesign.totalPvCapacityKwp,
      batterySizing.grossCapacityKwh,
      inverterClustering.totalInverterCapacityKw,
      annualYieldKwh,
      {
        ...userPricing,
        includeDieselGenSet: enableDieselGenerator,
        dieselGenSetCapexUsd: enableDieselGenerator ? generatorSizing.estimatedCapexUsd : 0,
        dieselAnnualFuelLiters: enableDieselGenerator ? Math.round(generatorSizing.fuelConsumptionLitersPerHour * 100) : 0,
      }
    );
  }, [arrayDesign, batterySizing, inverterClustering, estimatedAnnualYieldMwh, userPricing, enableDieselGenerator, generatorSizing]);

  // 11. Scenario Analysis (only for Battery modes)
  const scenarios = useMemo(() => {
    return generateScenarios(
      arrayDesign.totalPvCapacityKwp,
      loadAnalysis.totalDailyEnergyKwh,
      autonomyDays,
      userPricing.usdToTomanRate
    );
  }, [arrayDesign, loadAnalysis, autonomyDays, userPricing.usdToTomanRate]);

  // Handler for restoring imported project from JSON with Zod migration & fallback recovery
  const handleImportProject = (importedData: any) => {
    try {
      const migrationResult = migrateProjectToV3(importedData);
      const clean = migrationResult.project;

      if (clean.city) setCity(clean.city as unknown as ClimateCity);
      if (clean.siteOverrides) setSiteOverrides(clean.siteOverrides);
      if (clean.loads) setLoads(clean.loads as ElectricalLoadItem[]);
      if (clean.selectedModule) setSelectedModule(clean.selectedModule as ModuleSpecs);
      if (clean.selectedInverter) setSelectedInverter(clean.selectedInverter as InverterSpecs);
      if (clean.projectName) setProjectName(clean.projectName);
      if (clean.systemMode) setSystemMode(clean.systemMode as SystemMode);
      if (clean.inverterTech) setInverterTech(clean.inverterTech as InverterTechnology);
      if (clean.customBaysCount) setCustomBaysCount(clean.customBaysCount);
      if (clean.mvVoltageKv) setMvVoltageKv(clean.mvVoltageKv);
      if (clean.targetPowerplantCapacityKw) setTargetPowerplantCapacityKw(clean.targetPowerplantCapacityKw);
      if (clean.enableDieselGenerator !== undefined) setEnableDieselGenerator(Boolean(clean.enableDieselGenerator));
      if (clean.userPricing) setUserPricing(clean.userPricing as UserFinancialPricing);
      if (clean.selectedChemistry) setSelectedChemistry(clean.selectedChemistry as BatteryChemistry);
      if (clean.autonomyDays !== undefined) setAutonomyDays(clean.autonomyDays);
      if (clean.outageHours !== undefined) setOutageHours(clean.outageHours);
      if (clean.featureFlags) setAllFlags(clean.featureFlags);

      if (migrationResult.migratedFromVersion !== '3.0.0') {
        setSaveToast(
          lang === 'fa'
            ? `پروژه نسخه ${migrationResult.migratedFromVersion} با موفقیت به نسخه 3.0.0 ارتقا یافت.`
            : `Project migrated from v${migrationResult.migratedFromVersion} to v3.0.0.`
        );
        setTimeout(() => setSaveToast(null), 3500);
      }
    } catch (err) {
      console.error('Project import migration error:', err);
      // Direct fallback
      if (importedData.city) setCity(importedData.city);
      if (importedData.loads) setLoads(importedData.loads);
      if (importedData.projectName) setProjectName(importedData.projectName);
    }
  };

  // Structured Workflow Sections dynamically conditioned on systemMode
  const menuSections = useMemo(() => {
    if (systemMode === 'powerplant') {
      // In Powerplant mode: HIDE Loads, HIDE Scenarios, HIDE Battery Sizing
      return [
        {
          categoryTitle: t.catSiteClimate,
          tabs: [
            { id: 'climate' as ActiveModuleTab, title: t.tabSiteLocation, icon: <MapPin className="w-4 h-4 text-amber-400" /> },
          ],
        },
        {
          categoryTitle: t.catSystemMode,
          tabs: [
            { id: 'system_mode' as ActiveModuleTab, title: lang === 'fa' ? `${t.tabSystemMode} & بی‌های MV` : `${t.tabSystemMode} & MV Bays`, icon: <Sliders className="w-4 h-4 text-sky-400" /> },
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
            { id: 'cables_bom' as ActiveModuleTab, title: t.tabCablesBom, icon: <Shield className="w-4 h-4 text-emerald-400" /> },
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
            { id: 'cad_layout' as ActiveModuleTab, title: t.tabCadLayout, icon: <Grid className="w-4 h-4 text-blue-400" /> },
            { id: '3d_viewer' as ActiveModuleTab, title: t.tab3dViewer, icon: <Eye className="w-4 h-4 text-orange-400" /> },
            { id: 'catalog' as ActiveModuleTab, title: t.tabCatalog, icon: <Database className="w-4 h-4 text-slate-400" /> },
            { id: 'solar_pumping' as ActiveModuleTab, title: t.tabSolarPumping, icon: <Droplet className="w-4 h-4 text-blue-400" /> },
            { id: 'iran_regulations' as ActiveModuleTab, title: t.tabIranRegs, icon: <Scale className="w-4 h-4 text-emerald-400" /> },
          ],
        },
      ];
    } else {
      // In On-Grid & Off-Grid modes: SHOW Loads, MOVE Battery to PV Engineering, HIDE MV Substation
      return [
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
            { id: 'bess' as ActiveModuleTab, title: t.tabBess, icon: <BatteryIcon className="w-4 h-4 text-green-400" /> },
            { id: 'iv_curve' as ActiveModuleTab, title: t.tabIvCurve, icon: <Activity className="w-4 h-4 text-teal-400" /> },
            { id: 'waterfall_loss' as ActiveModuleTab, title: t.tabLossWaterfall, icon: <BarChart3 className="w-4 h-4 text-red-400" /> },
          ],
        },
        {
          categoryTitle: t.catUpstreamGrid,
          tabs: [
            { id: 'harmonics_grid' as ActiveModuleTab, title: t.tabUpstreamGrid, icon: <Activity className="w-4 h-4 text-indigo-400" /> },
            { id: 'cables_bom' as ActiveModuleTab, title: t.tabCablesBom, icon: <Shield className="w-4 h-4 text-emerald-400" /> },
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
            { id: 'scenarios' as ActiveModuleTab, title: t.tabScenarios, icon: <GitCompare className="w-4 h-4 text-pink-400" /> },
            { id: 'cad_layout' as ActiveModuleTab, title: t.tabCadLayout, icon: <Grid className="w-4 h-4 text-blue-400" /> },
            { id: '3d_viewer' as ActiveModuleTab, title: t.tab3dViewer, icon: <Eye className="w-4 h-4 text-orange-400" /> },
            { id: 'catalog' as ActiveModuleTab, title: t.tabCatalog, icon: <Database className="w-4 h-4 text-slate-400" /> },
            { id: 'solar_pumping' as ActiveModuleTab, title: t.tabSolarPumping, icon: <Droplet className="w-4 h-4 text-blue-400" /> },
            { id: 'iran_regulations' as ActiveModuleTab, title: t.tabIranRegs, icon: <Scale className="w-4 h-4 text-emerald-400" /> },
          ],
        },
      ];
    }
  }, [systemMode, t, lang]);

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex ${lang === 'fa' ? 'font-vazir' : 'font-sans'}`}
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
    >
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-emerald-400 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* BACKDROP OVERLAY FOR MOBILE SIDEBAR */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* FIXED OPERATIONAL SIDEBAR — DOCKED ON THE RIGHT SIDE, RESPONSIVE SLIDE-OVER ON MOBILE */}
      <aside
        className={`w-72 bg-slate-900 right-0 border-l border-slate-800 flex flex-col fixed inset-y-0 z-40 shadow-2xl overflow-hidden transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
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

          <div className="flex items-center gap-1.5">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-sky-500 transition shadow-sm font-bold"
              title={t.language}
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
              {t.modePowerplant}
            </button>
            <button
              onClick={() => setSystemMode('ongrid')}
              className={`p-1.5 rounded text-center transition ${
                systemMode === 'ongrid'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.modeOnGrid}
            </button>
            <button
              onClick={() => setSystemMode('offgrid')}
              className={`p-1.5 rounded text-center transition ${
                systemMode === 'offgrid'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.modeOffGrid}
            </button>
          </div>
        </div>

        {/* Workflow Menu List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-700">
          {menuSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <div className="text-[11px] font-bold text-sky-400 px-2 py-1 uppercase tracking-wider bg-slate-950/30 rounded border-r-2 border-sky-500">
                {section.categoryTitle}
              </div>
              <div className="space-y-0.5">
                {section.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all text-xs text-right ${
                        isActive
                          ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white font-bold shadow-md'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {tab.icon}
                        <span>{tab.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Save & Report Generator */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveProject}
              className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.saveProject}</span>
            </button>
            {lastSavedTime && (
              <button
                onClick={handleLoadLastProject}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] text-sky-300"
                title={lang === 'fa' ? 'بازیابی آخرین وضعیت ذخیره‌شده' : 'Restore last saved'}
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowReportModal(true)}
            className="w-full py-2 px-3 studio-btn-primary flex items-center justify-center gap-2 text-xs font-bold rounded-lg shadow-lg"
          >
            <FileText className="w-4 h-4 text-amber-300" />
            <span>{t.generateReport}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE OFFSET BY FIXED RIGHT SIDEBAR (RESPONSIVE) */}
      <div className="flex-1 flex flex-col lg:mr-72 mr-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shrink-0"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5 text-sky-400" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="bg-transparent text-sm sm:text-base font-bold text-white border-b border-transparent hover:border-slate-600 focus:border-sky-400 focus:outline-none transition px-1 py-0.5"
                />
                {lastSavedTime && (
                  <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-800/80">
                    {t.lastSaved} {lastSavedTime}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 px-1 mt-0.5 truncate max-w-xs sm:max-w-md">
                {lang === 'en' ? 'Location:' : 'مکان:'}{' '}
                <strong className="text-sky-300">{lang === 'en' ? city.nameEn : city.nameFa}</strong> |{' '}
                {lang === 'en' ? 'POA Irradiance:' : 'تابش شیبدار:'}{' '}
                <strong className="text-amber-300">{city.peakSunHours} PSH</strong> |{' '}
                {lang === 'en' ? 'Mode:' : 'حالت:'}{' '}
                <strong className="text-emerald-300">{systemMode.toUpperCase()}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono">
            <button
              onClick={() => setShowAdvancedModal(true)}
              className="py-1.5 px-2.5 sm:px-3 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg text-indigo-300 flex items-center gap-1.5 text-xs font-bold transition shadow-sm"
              title={lang === 'fa' ? 'قابلیت‌های پیشرفته مهندسی و اعتبارسنجی' : 'Advanced Engineering & Validation Suite'}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">RFC 3.0</span>
              <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 text-[10px] font-mono border border-indigo-500/30">
                {activeCount}
              </span>
            </button>

            <button
              onClick={handleSaveProject}
              className="studio-btn text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 font-bold"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t.saveProject}</span>
            </button>

            <div className="hidden md:flex bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 items-center gap-2">
              <span className="text-slate-400">{lang === 'en' ? 'PV Peak:' : 'ظرفیت PV:'}</span>
              <span className="text-amber-400 font-bold">{arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp</span>
            </div>

            <div className="hidden md:flex bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 items-center gap-2">
              <span className="text-slate-400">{lang === 'en' ? 'Inverter:' : 'اینورتر:'}</span>
              <span className="text-sky-400 font-bold">{inverterClustering.totalInverterCapacityKw.toFixed(1)} kW</span>
            </div>

            {systemMode !== 'powerplant' && (
              <div className="hidden md:flex bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 items-center gap-2">
                <span className="text-slate-400">{lang === 'en' ? 'Battery:' : 'باتری:'}</span>
                <span className="text-emerald-400 font-bold">{batterySizing.grossCapacityKwh.toFixed(1)} kWh</span>
              </div>
            )}
          </div>
        </header>

        {/* Main Operational Workspace Content */}
        <main className="p-6 flex-1 w-full max-w-7xl mx-auto space-y-6">
          {/* SYSTEM MODE & GRID ARCHITECTURE TAB */}
          {activeTab === 'system_mode' && (
            <div className="space-y-6">
              <div className="studio-card">
                <h2 className="text-xl font-bold text-sky-400 mb-2 flex items-center gap-2">
                  <Sliders className="w-6 h-6 text-amber-400" />
                  {lang === 'fa'
                    ? 'تعیین ساختار کاری سیستم و نحوه اتصال به شبکه (System Mode & Grid Strategy)'
                    : 'System Architecture & Grid Interconnection Strategy'}
                </h2>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {lang === 'fa'
                    ? 'نحوه اتصال به شبکه مبنای محاسبات آرایه PV، عدم نیاز یا سایزینگ باتری، اینورترهای رشته‌ای در برابر پست‌های یکپارچه Turnkey و آرایش بی‌های فشار متوسط است.'
                    : 'The grid connection topology governs PV sizing, battery requirements, inverter selection (string vs MV Turnkey), and medium-voltage collector bay architecture.'}
                </p>

                {/* 3 Main Topologies */}
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
                      <h3 className="font-bold text-amber-400 flex items-center gap-2 text-sm sm:text-base">
                        <Building2 className="w-5 h-5 shrink-0" />
                        {lang === 'fa' ? 'نیروگاه تجاری (IPP Powerplant)' : 'Utility Powerplant (IPP)'}
                      </h3>
                      {systemMode === 'powerplant' && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'fa'
                        ? 'اتصال مستقیم به شبکه فشار متوسط (20kV/33kV). محاسبات باتری و بارهای الکتریکی به طور کامل غیرضروری و حذف می‌شوند.'
                        : 'Direct MV grid injection (20kV/33kV). Battery storage and local load profiling are bypassed.'}
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
                      <h3 className="font-bold text-sky-400 flex items-center gap-2 text-sm sm:text-base">
                        <Grid className="w-5 h-5 shrink-0" />
                        {lang === 'fa' ? 'متصل به شبکه با پشتیبان (On-grid)' : 'On-Grid with Backup'}
                      </h3>
                      {systemMode === 'ongrid' && <CheckCircle2 className="w-5 h-5 text-sky-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'fa'
                        ? 'تأمین بار از شبکه و PV. باتری صرفاً بر مبنای ساعات قطعی و خاموشی شبکه در ساعات اوج بار سایز می‌شود.'
                        : 'Supplies local loads via grid and PV. Battery storage is sized strictly for grid outage hours.'}
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
                      <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm sm:text-base">
                        <Zap className="w-5 h-5 shrink-0" />
                        {lang === 'fa' ? 'مستقل از شبکه (Off-grid Standalone)' : 'Standalone Off-Grid'}
                      </h3>
                      {systemMode === 'offgrid' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'fa'
                        ? 'عدم دسترسی به شبکه سراسری. سایزینگ بر مبنای بار ۲۴ ساعته و روزهای خودمختاری ابری (Autonomy) انجام می‌پذیرد.'
                        : '100% autonomous off-grid operation. Sizing is governed by 24h load profile and autonomy days.'}
                    </p>
                  </div>
                </div>

                {/* POWERPLANT SPECIFIC ARCHITECTURE: STRING vs MV TURNKEY & BAY BREAKDOWN */}
                {systemMode === 'powerplant' && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-5">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      {lang === 'fa'
                        ? 'انتخاب فناوری اینورتر نیروگاهی و طراحی بی‌های فشار متوسط (MV Bays):'
                        : 'Utility Inverter Technology & MV Collector Bays Design:'}
                    </h3>

                    {/* Technology Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        onClick={() => handleInverterTechChange('string_inverter')}
                        className={`p-3.5 rounded-lg border cursor-pointer transition ${
                          inverterTech === 'string_inverter'
                            ? 'border-sky-400 bg-sky-950/30 ring-1 ring-sky-400'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-white text-xs">
                            {lang === 'fa' ? '۱. اینورترهای رشته‌ای (String Inverter 1500V)' : '1. High-Power String Inverters (1500V)'}
                          </strong>
                          {inverterTech === 'string_inverter' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {lang === 'fa'
                            ? 'اینورترهای رشته‌ای ۲۵۰ تا ۳۵۰ کیلوواتی (مانند Huawei 330KTL یا Sungrow 350HX). بازدهی بالا در سایه‌اندازی، چند MPPT، نگهداری آسان با MTTR زیر ۲ ساعت.'
                            : 'Distributed 250kW-350kW string units (e.g. Sungrow 350HX, Huawei 330KTL). Multi-MPPT shading tolerance, easy maintenance, and <2h MTTR.'}
                        </p>
                      </div>

                      <div
                        onClick={() => handleInverterTechChange('mv_turnkey')}
                        className={`p-3.5 rounded-lg border cursor-pointer transition ${
                          inverterTech === 'mv_turnkey'
                            ? 'border-purple-400 bg-purple-950/30 ring-1 ring-purple-400'
                            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-white text-xs">
                            {lang === 'fa' ? '۲. پست‌های یکپارچه کانتینری (MV Turnkey Skid Station)' : '2. Integrated MV Turnkey Skid Stations'}
                          </strong>
                          {inverterTech === 'mv_turnkey' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {lang === 'fa'
                            ? 'بلوک‌های متمرکز ۲.۵ تا ۶ مگاواتی یکپارچه (مانند Sungrow 3.125MW Skid یا Huawei STS 6MW). شامل اینورتر سنترال + ترانسفورماتور MV + دژنکتور RMU در یک پکیج آماده.'
                            : 'Centralized 2.5MW to 6.25MW outdoor power stations (e.g. Sungrow 4.4MW, Huawei STS 6MW). Integrates central inverter, MV oil transformer, and SF6 RMU.'}
                        </p>
                      </div>
                    </div>

                    {/* Capacity & Bay Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          {lang === 'fa' ? 'ظرفیت هدف نیروگاه (kW AC):' : 'Target Plant Capacity (kW AC):'}
                        </label>
                        <input
                          type="number"
                          step="500"
                          value={targetPowerplantCapacityKw}
                          onChange={(e) => setTargetPowerplantCapacityKw(Math.max(100, Number(e.target.value)))}
                          className="studio-input w-full font-mono font-bold text-amber-300"
                        />
                        <span className="text-[10px] text-slate-400">
                          {lang === 'fa'
                            ? `معادل ${(targetPowerplantCapacityKw / 1000).toFixed(2)} مگاوات AC`
                            : `Equivalent to ${(targetPowerplantCapacityKw / 1000).toFixed(2)} MW AC`}
                        </span>
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          {lang === 'fa' ? 'تعداد بی‌های خروجی MV (بهینه‌سازی نرم‌افزار):' : 'MV Output Bays Count (Optimized):'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={customBaysCount}
                          onChange={(e) => setCustomBaysCount(Math.max(1, Number(e.target.value)))}
                          className="studio-input w-full font-mono font-bold text-sky-300"
                        />
                        <span className="text-[10px] text-slate-400">
                          {lang === 'fa'
                            ? `پیشنهاد بهینه: ${bayArchitecture?.optimalBaysCount || 2} بی`
                            : `Optimal recommendation: ${bayArchitecture?.optimalBaysCount || 2} Bays`}
                        </span>
                      </div>

                      <div>
                        <label className="text-slate-300 font-bold block mb-1">
                          {lang === 'fa' ? 'سطح ولتاژ باسبار جمع‌آوری (MV Busbar):' : 'MV Collector Busbar Voltage Level:'}
                        </label>
                        <select
                          value={mvVoltageKv}
                          onChange={(e) => setMvVoltageKv(Number(e.target.value))}
                          className="studio-input w-full font-mono font-bold text-emerald-300"
                        >
                          <option value="20">{lang === 'fa' ? '۲۰ کیلوولت (استاندارد شبکه توزیع ایران)' : '20 kV (Standard Iran Distribution)'}</option>
                          <option value="33">{lang === 'fa' ? '۳۳ کیلوولت (فشار متوسط مزارع بزرگ)' : '33 kV (Utility Scale Large Farms)'}</option>
                          <option value="11">11 kV</option>
                        </select>
                      </div>
                    </div>

                    {/* MV Bays Layout Diagram Cards */}
                    {bayArchitecture && (
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <strong className="text-sky-300 font-bold">
                            {lang === 'fa'
                              ? `آرایش بی‌های فشار متوسط تولید شده (${bayArchitecture.actualBaysCount} Bay):`
                              : `Engineered MV Collector Bays Architecture (${bayArchitecture.actualBaysCount} Bays):`}
                          </strong>
                          <span className="font-mono text-slate-400">
                            {lang === 'fa' ? 'باسبار اصلی:' : 'Main Busbar:'} {bayArchitecture.mainCollectorBusbar.recommendedBusbarRatingAmps}A Cu @ {bayArchitecture.mainCollectorBusbar.voltageKv}kV
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {bayArchitecture.bays.map((bay) => (
                            <div key={bay.bayIndex} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-300">{lang === 'fa' ? bay.bayNameFa : bay.bayNameEn}</span>
                                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[11px] font-bold">
                                  {bay.allocatedAcCapacityMw} MW AC
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                                <div>{lang === 'fa' ? 'اینورترها:' : 'Inverters:'} <strong className="text-white">{bay.inverterCount} × ({bay.inverterUnitRatingKw} kW)</strong></div>
                                <div>{lang === 'fa' ? 'ترانسفورماتور:' : 'Transformer:'} <strong className="text-purple-300">{bay.transformerRatingMva} MVA ({bay.transformerVoltageRatio})</strong></div>
                                <div>{lang === 'fa' ? 'جریان نامی MV:' : 'Rated MV Amps:'} <strong className="text-emerald-300">{bay.mvRatedCurrentAmps} A</strong></div>
                                <div>{lang === 'fa' ? 'حفاظت دژنکتور:' : 'Breaker Rating:'} <strong className="text-slate-200">VCB 630A / 25kA</strong></div>
                              </div>
                              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                                {lang === 'fa' ? 'کابل فیدر:' : 'Feeder Cable:'} <span className="font-mono text-slate-300">{bay.collectorCableSpec}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Parameter Config for On-Grid / Off-Grid */}
                {systemMode === 'ongrid' && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-sky-300 block">
                      {lang === 'fa'
                        ? 'مدت زمان انتظار خاموشی و قطعی شبکه (ساعت در روز / Blackout Hours):'
                        : 'Grid Blackout & Outage Hours Per Day:'}
                    </label>
                    <input
                      type="number"
                      value={outageHours}
                      onChange={(e) => setOutageHours(Math.max(1, Math.min(24, Number(e.target.value))))}
                      className="studio-input w-64"
                    />
                    <p className="text-[11px] text-slate-400">
                      {lang === 'fa'
                        ? 'سایزینگ باتری برای تأمین انرژی بار در طی ساعات خاموشی شبکه محاسبه خواهد شد.'
                        : 'Battery BESS capacity will be sized to supply critical loads during scheduled grid blackout hours.'}
                    </p>
                  </div>
                )}

                {systemMode === 'offgrid' && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-emerald-300 block">
                      {lang === 'fa'
                        ? 'روزهای خودکفایی و پشتیبانی ابری (Autonomy Days):'
                        : 'Autonomy Days (Days without Sunshine):'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={autonomyDays}
                      onChange={(e) => setAutonomyDays(Math.max(0.5, Number(e.target.value)))}
                      className="studio-input w-64"
                    />
                    <p className="text-[11px] text-slate-400">
                      {lang === 'fa'
                        ? 'تعداد روزهایی که سیستم باید بدون تابش آفتاب بار را کلاً از باتری تغذیه نماید.'
                        : 'Number of consecutive cloudy/rainy days during which BESS maintains uninterrupted load support.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SITE & CLIMATE MAP TAB */}
          {activeTab === 'climate' && (
            <ClimateTab selectedCity={city} onCityChange={setCity} lang={lang} />
          )}

          {/* ELECTRICAL LOADS TAB (Hidden in Powerplant mode) */}
          {activeTab === 'loads' && systemMode !== 'powerplant' && (
            <LoadProfilingTab
              loads={loads}
              onLoadsChange={setLoads}
              analysisResult={loadAnalysis}
              lang={lang}
            />
          )}

          {/* PV ARRAY ENGINEERING TAB */}
          {activeTab === 'array' && (
            <PvArrayEngineeringTab
              selectedModule={selectedModule}
              onModuleChange={setSelectedModule}
              selectedInverter={selectedInverter}
              onInverterChange={setSelectedInverter}
              arrayDesign={arrayDesign}
              inverterClustering={inverterClustering}
              city={city}
              systemMode={systemMode}
              lang={lang}
            />
          )}

          {/* BESS BATTERY STORAGE TAB (Only shown for On-Grid / Off-Grid) */}
          {activeTab === 'bess' && systemMode !== 'powerplant' && (
            <BessTab
              selectedChemistry={selectedChemistry}
              onChemistryChange={setSelectedChemistry}
              autonomyDays={autonomyDays}
              onAutonomyDaysChange={setAutonomyDays}
              batterySizing={batterySizing}
              systemTopology={systemMode === 'ongrid' ? 'hybrid' : 'off_grid'}
              onTopologyChange={(top) => setSystemMode(top === 'hybrid' ? 'ongrid' : 'offgrid')}
              lang={lang}
            />
          )}

          {/* HARMONICS & UPSTREAM GRID TAB */}
          {activeTab === 'harmonics_grid' && (
            <HarmonicsGridTab
              plantCapacityMw={
                systemMode === 'powerplant'
                  ? (targetPowerplantCapacityKw || 1000) / 1000.0
                  : inverterClustering.totalInverterCapacityKw / 1000.0
              }
              lang={lang}
            />
          )}

          {/* MV SUBSTATION TAB (Only shown for Powerplant mode) */}
          {activeTab === 'mv_substation' && systemMode === 'powerplant' && (
            <MvSubstationTab
              plantCapacityAcMw={(targetPowerplantCapacityKw || 1000) / 1000.0}
              lang={lang}
            />
          )}

          {/* CABLES, EARTHING & LIGHTNING TAB */}
          {activeTab === 'cables_bom' && (
            <ProtectionBomTab
              systemCapacityKw={
                systemMode === 'powerplant'
                  ? targetPowerplantCapacityKw
                  : inverterClustering.totalInverterCapacityKw
              }
              isUtilityPowerplant={systemMode === 'powerplant'}
              stringVocMaxVolts={arrayDesign.stringVocMaxColdVolts}
              stringIscAmps={selectedModule.iscAmps}
              parallelStringsCount={arrayDesign.parallelStringsCount}
              inverterDcContinuousCurrentAmps={inverterClustering.inverterDcContinuousCurrentAmps}
              systemDcVoltage={inverterClustering.recommendedDcVoltageVdc || 48}
              isThreePhase={selectedInverter.isThreePhase}
              lang={lang}
            />
          )}

          {/* STRUCTURAL & FOUNDATION TAB */}
          {activeTab === 'structural' && (
            <StructuralFoundationTab
              totalModulesCount={arrayDesign.totalModulesCount}
              arrayTiltDeg={city.optimalTiltAnnualDeg}
              city={city}
              siteOverrides={siteOverrides}
              onUpdateSiteOverrides={(overrides) => setSiteOverrides((prev) => ({ ...prev, ...overrides }))}
              lang={lang}
            />
          )}

          {/* 24-HOUR BALANCE SIMULATION */}
          {activeTab === 'sim24h' && (
            <Simulation24hTab
              simulationResult={simulationResult}
              generatorSizing={generatorSizing}
              outageHours={outageHours}
              onOutageHoursChange={setOutageHours}
              enableDieselGenerator={enableDieselGenerator}
              onToggleDieselGenerator={setEnableDieselGenerator}
              systemMode={systemMode}
              lang={lang}
            />
          )}

          {/* WATERFALL LOSS TAB */}
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
              lang={lang}
            />
          )}

          {/* I-V CURVE TRACER */}
          {activeTab === 'iv_curve' && <IvCurveTracerTab lang={lang} />}

          {/* FINANCIAL ANALYSIS TAB */}
          {activeTab === 'financial' && (
            <FinancialTab
              financial={financialResult}
              pricing={userPricing}
              onPricingChange={setUserPricing}
              lang={lang}
            />
          )}

          {/* SINGLE LINE DIAGRAM */}
          {activeTab === 'sld' && (
            <SingleLineDiagram
              pvCapacityKwp={
                systemMode === 'powerplant'
                  ? targetPowerplantCapacityKw
                  : arrayDesign.totalPvCapacityKwp
              }
              panelCount={arrayDesign.totalModulesCount}
              modulesPerString={arrayDesign.modulesPerString}
              parallelStrings={arrayDesign.parallelStringsCount}
              stringVocVolts={arrayDesign.stringVocMaxColdVolts}
              stringVmpVolts={arrayDesign.stringVmpMinHotVolts}
              stringIscAmps={selectedModule.iscAmps}
              inverterKw={inverterClustering.totalInverterCapacityKw}
              inverterCount={inverterClustering.parallelUnitsCount}
              isThreePhase={inverterClustering.acPhaseType === 'three_phase_400v'}
              batteryKwh={batterySizing.grossCapacityKwh}
              batteryVoltageVdc={batterySizing.systemVoltageVdc}
              batteryAh={batterySizing.totalCapacityAh}
              batteryFuseAmps={Math.ceil(batterySizing.continuousDischargeCurrentAmps * 1.25)}
              acCurrentAmps={
                inverterClustering.acPhaseType === 'three_phase_400v'
                  ? (inverterClustering.totalInverterCapacityKw * 1000) / (1.732 * 400 * 0.95)
                  : (inverterClustering.totalInverterCapacityKw * 1000) / 230
              }
              dcCableMm2={protectionSystem.cableRuns[0]?.totalEffectiveCrossSectionMm2 || 6}
              batCableMm2={protectionSystem.cableRuns[1]?.totalEffectiveCrossSectionMm2 || 35}
              acCableMm2={protectionSystem.cableRuns[2]?.totalEffectiveCrossSectionMm2 || 50}
              lang={lang}
            />
          )}

          {/* CAD LAYOUT TAB */}
          {activeTab === 'cad_layout' && <PowerplantCadLayoutTab lang={lang} />}

          {/* 3D VIEWER TAB */}
          {activeTab === '3d_viewer' && <ThreeJsViewer lang={lang} />}

          {/* SCENARIOS COMPARISON TAB (Only for Battery modes) */}
          {activeTab === 'scenarios' && systemMode !== 'powerplant' && (
            <ScenarioComparisonTab scenarios={scenarios} lang={lang} />
          )}

          {/* SOLAR WATER PUMPING TAB */}
          {activeTab === 'solar_pumping' && (
            <SolarPumpingTab peakSunHours={city.peakSunHours} lang={lang} />
          )}

          {/* IRANIAN PPA REGULATIONS TAB */}
          {activeTab === 'iran_regulations' && (
            <IranianRegulationsTab
              capacityKwp={
                systemMode === 'powerplant'
                  ? targetPowerplantCapacityKw
                  : arrayDesign.totalPvCapacityKwp
              }
              annualGenerationMwh={(simulationResult.totalGeneration24hKwh * 365) / 1000}
              lang={lang}
            />
          )}

          {/* EQUIPMENT CATALOG TAB */}
          {activeTab === 'catalog' && <CatalogTab lang={lang} />}
        </main>
      </div>

      {/* OFFICIAL EPC REPORT MODAL */}
      {showReportModal && (
        <OfficialReportModal
          projectName={projectName}
          systemMode={systemMode}
          city={city}
          loadAnalysis={loadAnalysis}
          module={selectedModule}
          inverter={selectedInverter}
          arrayDesign={arrayDesign}
          batterySizing={batterySizing}
          protection={protectionSystem}
          simulation={simulationResult}
          generator={generatorSizing}
          financial={financialResult}
          bayArchitecture={bayArchitecture}
          siteOverrides={siteOverrides}
          onClose={() => setShowReportModal(false)}
          onImportProject={handleImportProject}
          lang={lang}
        />
      )}

      {/* ADVANCED ENGINEERING & COMPLIANCE MODAL */}
      <AdvancedFeaturesModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        lang={lang}
      />
    </div>
  );
};

export default App;
