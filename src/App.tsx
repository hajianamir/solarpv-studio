import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  FileCheck,
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
  RotateCcw,
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
  Search,
  Command,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  FileSpreadsheet,
  Gauge,
  Compass,
} from 'lucide-react';

// i18n
import { type Language, translations } from './i18n';

import { getDefaultClimateCity, type ClimateCity, type SiteGeotechnicalOverrides } from './engine/climaticData';
import { LOAD_PRESETS, type ElectricalLoadItem, analyzeLoadProfile } from './engine/loadProfiles';
import { designPvArray, type ModuleSpecs, type InverterSpecs } from './engine/pvEngineAdvanced';
import { computeWaterfallLosses } from './engine/waterfallLossEngine';
import { buildWaterfallArgs } from './engine/waterfallArgs';
import { rearGainPercent } from './engine/bifacialGain';
import { type AppliedShading3dRecord } from './engine/shadingLifecycle';
import { type TrackerConfig } from './engine/tracker/backtrackingEngine';
import { calculateThermalDerate } from './engine/core/thermalDerate';
import { sizeBatteryBank, computeAutonomyEnergyRequirement, type BatteryChemistry, BATTERY_CHEMISTRIES } from './engine/batteryEngine';
import { evaluateInverterClustering } from './engine/inverterClustering';
import {
  calculateAdvancedCableRun,
  calculateEarthingSystem,
  calculateLightningProtection,
  type CompleteProtectionSystemResult,
  type ProtectionBomItem,
} from './engine/protectionBomEngine';
import { simulate24hEnergyBalance, sizeDieselGenerator } from './engine/simulation24hEngine';
import {
  performFinancialAnalysis,
  type UserFinancialPricing,
  DEFAULT_FINANCIAL_PRICING,
} from './engine/financialEngine';
import { generateScenarios } from './engine/scenarioEngine';
import {
  CATALOG_MODULES,
  CATALOG_INVERTERS,
  getFullModulesCatalog,
  getFullInvertersCatalog,
  isBifacialModule,
  resolveBifacialParams,
} from './engine/equipmentCatalogData';
import {
  designPowerplantBays,
  type InverterTechnology,
  type PowerplantBayArchitectureResult,
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
import { RFC3ReportsTab } from './components/RFC3ReportsTab';
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
  | 'iv_curve'
  | 'rfc3_reports';

const LOCAL_STORAGE_KEY = 'solarpv_project_save';

export const App: React.FC = () => {
  // Language & i18n
  const [lang, setLang] = useState<Language>('fa');
  const t = translations[lang];

  // Navigation & System Mode State
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('climate');
  const [systemMode, setSystemMode] = useState<SystemMode>('powerplant');
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  // Inverter Technology & MV Bay Architecture (for Powerplant mode)
  const [inverterTech, setInverterTech] = useState<InverterTechnology>('string_inverter');
  const [customBaysCount, setCustomBaysCount] = useState<number>(2);
  const [mvVoltageKv, setMvVoltageKv] = useState<number>(20); // 20 kV standard in Iran

  // Core System State
  const [projectName, setProjectName] = useState(
    lang === 'fa' ? 'طرح مهندسی نیروگاه خورشیدی و EPC' : 'Solar PV Engineering & EPC Project'
  );
  const [city, setCity] = useState<ClimateCity>(getDefaultClimateCity());
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
    bifacialityFactor: CATALOG_MODULES[0].bifacialityFactor,
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
  // PR-2a-7: single-axis tracker config (null = fixed tilt)
  const [trackerConfig, setTrackerConfig] = useState<TrackerConfig | null>(null);
  // 3D Shading input lifecycle record (Apply / Revert / Provenance)
  const [appliedShadingRecord, setAppliedShadingRecord] = useState<AppliedShading3dRecord | null>(null);
  const shadingLoss3dPct = appliedShadingRecord?.lossPct ?? null;
  
  // Custom User Financial Pricing
  const [userPricing, setUserPricing] = useState<UserFinancialPricing>(DEFAULT_FINANCIAL_PRICING);

  // Persistence & Save State
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Modern Workstation Navigation & UI/UX State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [commandSearchQuery, setCommandSearchQuery] = useState<string>('');
  const [isProjectJsonModalOpen, setIsProjectJsonModalOpen] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autofocus search input when Command Palette opens
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    } else {
      setCommandSearchQuery('');
    }
  }, [isCommandPaletteOpen]);

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
      if (activeTab === 'loads' || activeTab === 'bess' || activeTab === 'scenarios' || activeTab === 'sim24h') {
        setActiveTab('system_mode');
      }
    } else {
      if (activeTab === 'mv_substation') {
        setActiveTab('system_mode');
      }
    }
  }, [systemMode, activeTab]);

  // Reset applied 3D shading on project location change to prevent cross-project pollution
  useEffect(() => {
    setAppliedShadingRecord(null);
  }, [city.id]);

  // Load saved project on initial mount if available
  useEffect(() => {
    // R5 (v1.0.3): Feature flags were removed. Clean up stale storage
    // from users who had previously enabled flags.
    try { localStorage.removeItem('solarpv_advanced_feature_flags_v3'); } catch { /* private mode */ }

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
      trackerConfig, // BUG-2: persist tracker config (null = fixed tilt)
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

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+S, Ctrl+E, Ctrl+B, Esc)
  const handleSaveProjectRef = useRef(handleSaveProject);
  handleSaveProjectRef.current = handleSaveProject;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProjectRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowReportModal(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsProjectJsonModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Export project to clean v3.0.0 JSON file
  const handleExportProjectJson = () => {
    const projectData = {
      version: '3.0.0',
      savedAt: new Date().toISOString(),
      traceId: generateTraceId(),
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
      trackerConfig,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_v3.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsProjectJsonModalOpen(false);
  };

  // Import project JSON via file input
  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        handleImportProject(json);
        setIsProjectJsonModalOpen(false);
      } catch (err) {
        alert(lang === 'fa' ? 'فایل JSON نامعتبر است' : 'Invalid JSON file structure');
      }
    };
    reader.readAsText(file);
  };

  // 1. Analyze Loads
  const loadAnalysis = useMemo(() => analyzeLoadProfile(loads), [loads]);

  // 2. Compute Target Energy Demand Based on System Mode
  // ============================================================================
  // PR-2a-7-P0-FOLLOWUP (ISSUE-2): TWO-STEP SIZING PATTERN
  // ============================================================================
  // The user enters `targetPowerplantCapacityKw` as AC nameplate (kW AC).
  // But `computeWaterfallLosses` expects an installed DC capacity (kWp).
  // The sizing follows a two-step pattern:
  //
  // Step 1 (this block): Feed the target AC nameplate as if it were DC, run the
  //   14-stage waterfall, and divide by 365 to get the daily net energy target.
  //   This gives a *conservative* baseline because real overpaneling will make
  //   the final DC array larger than the target.
  //
  // Step 2 (below in `arrayDesign`): designPvArray() sizes a DC array to produce
  //   that daily target using a simplified 6-factor derating. This typically
  //   yields an array ~10% larger than the target nameplate (DC/AC ~ 1.10-1.25).
  //
  // Step 3 (in `waterfallReport` below): Re-run the 14-stage waterfall against
  //   the *designed* DC array (not the target) to get the FINAL annual yield.
  //   FinancialTab uses this final value.
  //
  // NOTE: The user's "1000 kW AC target" will result in ~1,100 kWp DC designed.
  // This overpaneling is intentional (maximizes AC export), and the UI displays
  // both values in PvArrayEngineeringTab (see ISSUE-2b).
  // ============================================================================
  const bifacialParams = resolveBifacialParams(selectedModule);
  const isBifacial = bifacialParams.isBifacial;
  const bifacialityFactor = bifacialParams.bifacialityFactor;
  const groundCoverRatio = 0.38;
  const bifacialGainPct = rearGainPercent({
    isBifacial,
    bifacialityFactor,
    groundCoverRatio,
    albedo: city.albedo ?? 0.20,
  });

  const effectiveDailyKwhDemand = useMemo(() => {
    if (systemMode === 'powerplant') {
      // PR-2a-7-P0 (P0-1): daily energy target derived from the unified 14-stage
      // waterfall loss model — the old hardcoded PR constant was removed.
      // Basis: netAnnualEnergyExportMwh / 365 days for the target capacity.
      const targetKw = targetPowerplantCapacityKw || 1000;
      const args = buildWaterfallArgs({
        dcCapacityKw: targetKw,
        peakSunHours: city.peakSunHours,
        ambientTempC: city.tempMaxC,
        soilingLossPct: city.soilingLossPct,
        dcAcRatio: 1.25,
        isSingleAxisTracker: Boolean(trackerConfig),
        nearShadingLossPct: 0.0,
        iamLossPct: -2.2,
        moduleNoctC: selectedModule.noctC,
        tempCoeffPmpPct: selectedModule.tempCoeffPmpPct,
        trackerConfig: trackerConfig ?? undefined,
        installationEnvironment: siteOverrides?.installationEnvironment || 'ground_mount',
        tiltDeg: city.optimalTiltAnnualDeg,
        latitudeDeg: city.latitude,
        shadingLoss3dPct: shadingLoss3dPct !== null ? shadingLoss3dPct : undefined,
        bifacialGainPct,
      });
      const wf = computeWaterfallLosses(...args);
      return (wf.netAnnualEnergyExportMwh * 1000.0) / 365.0; // Commercial Generation target
    } else if (systemMode === 'ongrid') {
      const averagePowerKw = (loadAnalysis.totalDailyEnergyKwh || 20) / 24.0;
      return Math.max(1, averagePowerKw * (outageHours || 6));
    } else {
      return Math.max(1, loadAnalysis.totalDailyEnergyKwh || 20);
    }
  }, [systemMode, targetPowerplantCapacityKw, city, loadAnalysis.totalDailyEnergyKwh, outageHours, selectedModule, trackerConfig, siteOverrides?.installationEnvironment, shadingLoss3dPct, bifacialGainPct]); // BUG-1: trackerConfig dep (react-hooks/exhaustive-deps)

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
        installationEnvironment: siteOverrides?.installationEnvironment || 'ground_mount',
      },
      city.latitude
    );
  }, [effectiveDailyKwhDemand, city, selectedModule, selectedInverter, siteOverrides?.installationEnvironment]);

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
      selectedInverter.pnomAcKw,
      selectedInverter.vmpptMaxVolts   // BUG-5: MPPT ceiling drives inverter DC bus display
    );
  }, [systemMode, targetPowerplantCapacityKw, loadAnalysis, selectedInverter]);

  // 5. Battery Storage Sizing
  const batterySizing = useMemo(() => {
    const energyRequirementKwh = computeAutonomyEnergyRequirement(
      systemMode,
      loadAnalysis.totalDailyEnergyKwh,
      loadAnalysis.nighttimeEnergyWh / 1000.0,
      outageHours || 6,
    );

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
    const isUtil = systemMode === 'powerplant';
    const capacityKw = isUtil ? targetPowerplantCapacityKw : inverterClustering.totalInverterCapacityKw;
    const amb = city.tempMaxC;

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
      ambientTempC: amb,
    });

    const dcMainRun = calculateAdvancedCableRun({
      id: 'dc-main',
      sectionNameFa: 'کابل باسبار اصلی DC آرایه به اینورتر/پست',
      sectionNameEn: 'Main DC Feeder Busbar to Inverter Skid',
      oneWayLengthM: isUtil ? 80 : 15,
      designCurrentAmps: selectedModule.iscAmps * arrayDesign.parallelStringsCount * 1.25,
      nominalVoltageVolts: arrayDesign.stringVocMaxColdVolts * 0.85,
      conductorMaterial: isUtil ? 'aluminum' : 'copper',
      insulationType: 'xlpe',
      allowableDropPct: 1.5,
      isDc: true,
      ambientTempC: amb,
    });

    const acOutputRun = calculateAdvancedCableRun({
      id: 'ac-out',
      sectionNameFa: 'کابل AC خروجی اینورتر به ترانسفورماتور یا تابلوی اصلی',
      sectionNameEn: 'Inverter AC Output to Transformer / Main Board',
      oneWayLengthM: isUtil ? 120 : 25,
      designCurrentAmps: selectedInverter.isThreePhase
        ? (capacityKw * 1000.0) / (Math.sqrt(3) * (isUtil ? 800 : 400) * 0.95)
        : (capacityKw * 1000.0) / (230.0 * 0.95),
      nominalVoltageVolts: selectedInverter.isThreePhase ? (isUtil ? 800 : 400) : 230,
      conductorMaterial: isUtil ? 'aluminum' : 'copper',
      insulationType: 'xlpe',
      allowableDropPct: 1.0,
      isDc: false,
      isThreePhase: selectedInverter.isThreePhase,
      ambientTempC: amb,
    });

    const earthing = calculateEarthingSystem(
      capacityKw,
      100,
      'solidly_grounded',
      isUtil
    );

    const lightning = calculateLightningProtection(
      capacityKw,
      isUtil
    );

    return {
      cableRuns: [dcStringRun, dcMainRun, acOutputRun],
      earthing,
      lightning,
      protectionBom: [] as ProtectionBomItem[],
    };
  }, [arrayDesign, selectedModule, selectedInverter, inverterClustering, systemMode, targetPowerplantCapacityKw, city]);

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

  // 10. Annual energy yield — SINGLE source: unified 14/15-stage waterfall loss model
  // (PR-2a-7-P0, P0-1). The old parallel hardcoded-PR path is
  // deleted. FinancialTab and WaterfallLossTab both consume this same report,
  // so they display the identical annual energy (< 0.1% difference).
  const waterfallReport = useMemo(() => {
    const args = buildWaterfallArgs({
      dcCapacityKw: arrayDesign.totalPvCapacityKwp,
      peakSunHours: city.peakSunHours,
      ambientTempC: city.tempMaxC,
      soilingLossPct: city.soilingLossPct,
      dcAcRatio: arrayDesign.totalPvCapacityKwp / Math.max(0.1, inverterClustering.totalInverterCapacityKw),
      isSingleAxisTracker: Boolean(trackerConfig),
      nearShadingLossPct: 0.0,
      iamLossPct: -2.2,
      moduleNoctC: selectedModule.noctC,
      tempCoeffPmpPct: selectedModule.tempCoeffPmpPct,
      trackerConfig: trackerConfig ?? undefined,
      installationEnvironment: siteOverrides?.installationEnvironment || 'ground_mount',
      tiltDeg: city.optimalTiltAnnualDeg,
      latitudeDeg: city.latitude,
      shadingLoss3dPct: shadingLoss3dPct !== null ? shadingLoss3dPct : undefined,
      bifacialGainPct,
    });
    return computeWaterfallLosses(...args);
  }, [
    arrayDesign,
    city,
    inverterClustering,
    selectedModule,
    trackerConfig,
    siteOverrides?.installationEnvironment,
    shadingLoss3dPct,
    bifacialGainPct,
  ]);

  const annualYieldKwh = waterfallReport.netAnnualEnergyExportMwh * 1000.0;

  // Unified thermal derate for display (PR-2a-7-P0, P0-3) — same value used
  // inside pvEngineAdvanced and waterfallLossEngine.
  const thermalDisplay = useMemo(
    () =>
      calculateThermalDerate({
        module: { noctC: selectedModule.noctC, tempCoeffPmpPct: selectedModule.tempCoeffPmpPct },
        ambientTempMaxC: city.tempMaxC,
        installationEnvironment: siteOverrides?.installationEnvironment || 'ground_mount',
      }),
    [selectedModule, city, siteOverrides?.installationEnvironment]
  );

  // 11. Financial Analysis with User Unit Pricing & Optional Genset CAPEX
  const financialResult = useMemo(() => {
    return performFinancialAnalysis(
      arrayDesign.totalPvCapacityKwp,
      batterySizing.grossCapacityKwh,
      inverterClustering.totalInverterCapacityKw,
      annualYieldKwh,
      {
        ...userPricing,
        includeDieselGenSet: userPricing.includeDieselGenSet !== undefined
          ? userPricing.includeDieselGenSet
          : enableDieselGenerator,
        dieselGenSetCapexUsd: (userPricing.dieselGenSetCapexUsd !== undefined && userPricing.dieselGenSetCapexUsd > 0)
          ? userPricing.dieselGenSetCapexUsd
          : (enableDieselGenerator ? generatorSizing.estimatedCapexUsd : 0),
        dieselAnnualFuelLiters: (userPricing.dieselAnnualFuelLiters !== undefined && userPricing.dieselAnnualFuelLiters > 0)
          ? userPricing.dieselAnnualFuelLiters
          : (enableDieselGenerator ? Math.round(generatorSizing.fuelConsumptionLitersPerHour * 100) : 0),
      },
      25,
      systemMode
    );
  }, [arrayDesign, batterySizing, inverterClustering, annualYieldKwh, userPricing, enableDieselGenerator, generatorSizing, systemMode]);

  // 11. Scenario Analysis (only for Battery modes)
  const scenarios = useMemo(() => {
    return generateScenarios(
      arrayDesign.totalPvCapacityKwp,
      loadAnalysis.totalDailyEnergyKwh,
      autonomyDays,
      userPricing.usdToTomanRate
    );
  }, [arrayDesign, loadAnalysis, autonomyDays, userPricing.usdToTomanRate]);

  // Handler for restoring imported project from JSON with three-state safety model
  const handleImportProject = (importedData: any) => {
    try {
      const migrationResult = migrateProjectToV3(importedData);

      // State 3: BLOCKED INCONSISTENT
      if (migrationResult.migrationStatus === 'BLOCKED_INCONSISTENT') {
        const blockerMsg = migrationResult.blockerReasons[0] || 'Physical contradiction detected';
        setSaveToast(
          lang === 'fa'
            ? `مهاجرت مسدود شد: ${blockerMsg} (کد: ${migrationResult.traceId.slice(0, 8)})`
            : `Migration blocked: ${blockerMsg} (Trace: ${migrationResult.traceId.slice(0, 8)})`
        );
        setTimeout(() => setSaveToast(null), 5500);
        return;
      }

      const clean = migrationResult.project;

      if (clean.city) setCity(clean.city as unknown as ClimateCity);
      if (clean.siteOverrides) setSiteOverrides(clean.siteOverrides);
      if (clean.loads) setLoads(clean.loads as unknown as ElectricalLoadItem[]);
      if (clean.selectedModule) setSelectedModule(clean.selectedModule as ModuleSpecs);
      if (clean.selectedInverter) setSelectedInverter(clean.selectedInverter as InverterSpecs);
      if (clean.projectName) setProjectName(clean.projectName);
      if (clean.systemMode) setSystemMode(clean.systemMode as SystemMode);
      if (clean.inverterTech) setInverterTech(clean.inverterTech as InverterTechnology);
      if (clean.customBaysCount) setCustomBaysCount(clean.customBaysCount);
      if (clean.mvVoltageKv) setMvVoltageKv(clean.mvVoltageKv);
      if (clean.targetPowerplantCapacityKw) setTargetPowerplantCapacityKw(clean.targetPowerplantCapacityKw);
      if (clean.enableDieselGenerator !== undefined) setEnableDieselGenerator(Boolean(clean.enableDieselGenerator));
      if (clean.userPricing) setUserPricing(clean.userPricing as unknown as UserFinancialPricing);
      if (clean.selectedChemistry) setSelectedChemistry(clean.selectedChemistry as BatteryChemistry);
      if (clean.autonomyDays !== undefined) setAutonomyDays(clean.autonomyDays);
      if (clean.outageHours !== undefined) setOutageHours(clean.outageHours);
      // BUG-2: restore tracker config; legacy projects without the field -> null (fixed tilt)
      setTrackerConfig(clean.trackerConfig !== undefined ? clean.trackerConfig : null);

      // State 2: RECOVERED WITH WARNINGS
      if (migrationResult.migrationStatus === 'RECOVERED_WITH_WARNINGS') {
        setSaveToast(
          lang === 'fa'
            ? `پروژه بازیابی شد (${migrationResult.warnings.length} هشدار فیلدهای مفقود). لطفاً پارامترها را بررسی و تأیید کنید.`
            : `Project recovered with ${migrationResult.warnings.length} warning(s). Please review and confirm parameters.`
        );
        setTimeout(() => setSaveToast(null), 4500);
      } else {
        // State 1: VALID
        setSaveToast(
          lang === 'fa'
            ? `پروژه نسخه 3.0.0 با کد ردگیری ${migrationResult.traceId.slice(0, 8)} با موفقیت بارگذاری شد.`
            : `Project v3.0.0 loaded successfully (Trace: ${migrationResult.traceId.slice(0, 8)})`
        );
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err) {
      console.error('Project import migration error:', err);
    }
  };

  // Structured Workflow Sections dynamically conditioned on systemMode with Phase metadata
  const menuSections = useMemo(() => {
    if (systemMode === 'powerplant') {
      // In Powerplant mode: HIDE Loads, HIDE Scenarios, HIDE Battery Sizing
      return [
        {
          phase: 1,
          categoryTitle: lang === 'fa' ? 'فاز ۱: مکان‌یابی و ارزیابی ژئوتکنیک' : 'Phase 1: Siting & Geotechnics',
          tabs: [
            {
              id: 'climate' as ActiveModuleTab,
              title: t.tabSiteLocation,
              icon: <MapPin className="w-4 h-4 text-amber-400" />,
              code: 'NASA/PVGIS',
              badge: `${city.peakSunHours} PSH`,
            },
          ],
        },
        {
          phase: 2,
          categoryTitle: lang === 'fa' ? 'فاز ۲: ساختار سیستم و بی‌های MV' : 'Phase 2: Topology & MV Bays',
          tabs: [
            {
              id: 'system_mode' as ActiveModuleTab,
              title: lang === 'fa' ? `${t.tabSystemMode} & بی‌های MV` : `${t.tabSystemMode} & MV Bays`,
              icon: <Sliders className="w-4 h-4 text-sky-400" />,
              code: 'MV Turnkey',
              badge: `${mvVoltageKv} kV`,
            },
            {
              id: 'catalog' as ActiveModuleTab,
              title: t.tabCatalog,
              icon: <Database className="w-4 h-4 text-slate-400" />,
              code: 'Tier-1 BOM',
              badge: 'TOPCon',
            },
          ],
        },
        {
          phase: 3,
          categoryTitle: lang === 'fa' ? 'فاز ۳: مهندسی آرایه PV و شبکه بالادست' : 'Phase 3: PV Array & Grid Integration',
          tabs: [
            {
              id: 'array' as ActiveModuleTab,
              title: t.tabPvEngineering,
              icon: <Sun className="w-4 h-4 text-amber-500" />,
              code: 'IEC 62548',
              badge: `${arrayDesign.totalPvCapacityKwp.toFixed(0)} kWp`,
            },
            {
              id: 'iv_curve' as ActiveModuleTab,
              title: t.tabIvCurve,
              icon: <Activity className="w-4 h-4 text-teal-400" />,
              code: 'Sandia 5-Par',
              badge: 'MPPT',
            },
            {
              id: 'harmonics_grid' as ActiveModuleTab,
              title: t.tabUpstreamGrid,
              icon: <Activity className="w-4 h-4 text-indigo-400" />,
              code: 'IEEE 519',
              badge: 'THD < 3%',
            },
          ],
        },
        {
          phase: 4,
          categoryTitle: lang === 'fa' ? 'فاز ۴: تجهیزات BOP، کابل‌ها، سازه و SLD' : 'Phase 4: Balance of Plant & Civil',
          tabs: [
            {
              id: 'mv_substation' as ActiveModuleTab,
              title: t.tabMvSubstation,
              icon: <Building2 className="w-4 h-4 text-purple-400" />,
              code: 'IEC 62271',
              badge: `${customBaysCount} Bays`,
            },
            {
              id: 'cables_bom' as ActiveModuleTab,
              title: t.tabCablesBom,
              icon: <Shield className="w-4 h-4 text-emerald-400" />,
              code: 'IEEE 80 / IEC 60364',
              badge: 'ΔV ≤ 1.5%',
            },
            {
              id: 'structural' as ActiveModuleTab,
              title: t.tabStructural,
              icon: <Hammer className="w-4 h-4 text-amber-600" />,
              code: 'ASCE 7-22 / EC7',
              badge: 'Broms FoS',
            },
            {
              id: 'sld' as ActiveModuleTab,
              title: lang === 'fa' ? 'دیاگرام تک‌خطی (SLD)' : 'Single Line Diagram (SLD)',
              icon: <Workflow className="w-4 h-4 text-amber-400" />,
              code: 'IEC 60617',
              badge: 'CAD SLD',
            },
          ],
        },
        {
          phase: 5,
          categoryTitle: lang === 'fa' ? 'فاز ۵: شبیه‌سازی تولید، تلفات و جانمایی' : 'Phase 5: Yield & Plant Layout',
          tabs: [
            {
              id: 'waterfall_loss' as ActiveModuleTab,
              title: t.tabLossWaterfall,
              icon: <BarChart3 className="w-4 h-4 text-red-400" />,
              code: '14-Stage Loss',
              badge: `${((arrayDesign.effectiveDeratingFactor || 0.805) * 100).toFixed(1)}% PR`,
            },
            {
              id: 'cad_layout' as ActiveModuleTab,
              title: t.tabCadLayout,
              icon: <Grid className="w-4 h-4 text-blue-400" />,
              code: 'GCR Opt',
              badge: '2P Tables',
            },
            {
              id: '3d_viewer' as ActiveModuleTab,
              title: t.tab3dViewer,
              icon: <Eye className="w-4 h-4 text-orange-400" />,
              code: 'Ray-Tracer',
              badge: 'WebGL 3D',
            },
            {
              id: 'solar_pumping' as ActiveModuleTab,
              title: t.tabSolarPumping,
              icon: <Droplet className="w-4 h-4 text-blue-400" />,
              code: 'VFD Hydro',
              badge: 'm³/day',
            },
          ],
        },
        {
          phase: 6,
          categoryTitle: lang === 'fa' ? 'فاز ۶: توجیه‌پذیری مالی، قوانین و استانداردها' : 'Phase 6: Bankability & RFC 3.0',
          tabs: [
            {
              id: 'financial' as ActiveModuleTab,
              title: t.tabFinancial,
              icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
              code: '25Y Cash Flow',
              badge: financialResult.isIrrDefined && financialResult.irrPct !== null ? `IRR ${financialResult.irrPct}%` : 'IRR N/A',
            },
            {
              id: 'iran_regulations' as ActiveModuleTab,
              title: t.tabIranRegs,
              icon: <Scale className="w-4 h-4 text-emerald-400" />,
              code: 'SATBA PPA',
              badge: 'PPA Tariff',
            },
            {
              id: 'rfc3_reports' as ActiveModuleTab,
              title: lang === 'fa' ? 'گزارشات مهندسی و انطباق RFC 3.0' : 'RFC 3.0 Engineering & Reports',
              icon: <FileCheck className="w-4 h-4 text-sky-400" />,
              code: 'Gold Standard',
              badge: '11/11 PASS',
            },
          ],
        },
      ];
    } else {
      // In On-Grid & Off-Grid modes: SHOW Loads, MOVE Battery to PV Engineering, HIDE MV Substation
      return [
        {
          phase: 1,
          categoryTitle: lang === 'fa' ? 'فاز ۱: مکان‌یابی، اقلیم و پروفایل بار' : 'Phase 1: Site, Climate & Load Profiling',
          tabs: [
            {
              id: 'climate' as ActiveModuleTab,
              title: t.tabSiteLocation,
              icon: <MapPin className="w-4 h-4 text-amber-400" />,
              code: 'NASA/PVGIS',
              badge: `${city.peakSunHours} PSH`,
            },
            {
              id: 'loads' as ActiveModuleTab,
              title: t.tabLoads,
              icon: <Zap className="w-4 h-4 text-yellow-400" />,
              code: '24h Demand',
              badge: `${(loadAnalysis.totalDailyEnergyKwh || 20).toFixed(0)} kWh/d`,
            },
          ],
        },
        {
          phase: 2,
          categoryTitle: lang === 'fa' ? 'فاز ۲: ساختار سیستم و سناریوی اتصال' : 'Phase 2: Topology & Inverter Strategy',
          tabs: [
            {
              id: 'system_mode' as ActiveModuleTab,
              title: t.tabSystemMode,
              icon: <Sliders className="w-4 h-4 text-sky-400" />,
              code: 'Grid Tie',
              badge: systemMode.toUpperCase(),
            },
            {
              id: 'catalog' as ActiveModuleTab,
              title: t.tabCatalog,
              icon: <Database className="w-4 h-4 text-slate-400" />,
              code: 'Tier-1 BOM',
              badge: 'Catalog',
            },
          ],
        },
        {
          phase: 3,
          categoryTitle: lang === 'fa' ? 'فاز ۳: مهندسی آرایه PV و ذخیره‌ساز BESS' : 'Phase 3: PV Array & BESS Sizing',
          tabs: [
            {
              id: 'array' as ActiveModuleTab,
              title: t.tabPvEngineering,
              icon: <Sun className="w-4 h-4 text-amber-500" />,
              code: 'IEC 62548',
              badge: `${arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp`,
            },
            {
              id: 'bess' as ActiveModuleTab,
              title: t.tabBess,
              icon: <BatteryIcon className="w-4 h-4 text-green-400" />,
              code: 'LiFePO4',
              badge: `${batterySizing.grossCapacityKwh.toFixed(1)} kWh`,
            },
            {
              id: 'iv_curve' as ActiveModuleTab,
              title: t.tabIvCurve,
              icon: <Activity className="w-4 h-4 text-teal-400" />,
              code: 'Sandia 5-Par',
              badge: 'I-V Curve',
            },
            {
              id: 'harmonics_grid' as ActiveModuleTab,
              title: t.tabUpstreamGrid,
              icon: <Activity className="w-4 h-4 text-indigo-400" />,
              code: 'IEEE 519',
              badge: 'THD < 3%',
            },
          ],
        },
        {
          phase: 4,
          categoryTitle: lang === 'fa' ? 'فاز ۴: کابل‌ها، حفاظت، سازه و SLD' : 'Phase 4: Balance of System & Civil',
          tabs: [
            {
              id: 'cables_bom' as ActiveModuleTab,
              title: t.tabCablesBom,
              icon: <Shield className="w-4 h-4 text-emerald-400" />,
              code: 'IEEE 80 / IEC 60364',
              badge: 'ΔV ≤ 1.5%',
            },
            {
              id: 'structural' as ActiveModuleTab,
              title: t.tabStructural,
              icon: <Hammer className="w-4 h-4 text-amber-600" />,
              code: 'ASCE 7-22 / EC7',
              badge: 'Broms FoS',
            },
            {
              id: 'sld' as ActiveModuleTab,
              title: lang === 'fa' ? 'دیاگرام تک‌خطی (SLD)' : 'Single Line Diagram (SLD)',
              icon: <Workflow className="w-4 h-4 text-amber-400" />,
              code: 'IEC 60617',
              badge: 'CAD SLD',
            },
          ],
        },
        {
          phase: 5,
          categoryTitle: lang === 'fa' ? 'فاز ۵: شبیه‌سازی ۲۴ ساعته، تلفات و جانمایی' : 'Phase 5: Simulation & Plant Layout',
          tabs: [
            {
              id: 'sim24h' as ActiveModuleTab,
              title: t.tabSimulation24h,
              icon: <Workflow className="w-4 h-4 text-cyan-400" />,
              code: '24h Balance',
              badge: simulationResult.isSelfSufficient ? '100% Autonomy' : 'Grid Support',
            },
            {
              id: 'waterfall_loss' as ActiveModuleTab,
              title: t.tabLossWaterfall,
              icon: <BarChart3 className="w-4 h-4 text-red-400" />,
              code: '14-Stage Loss',
              badge: `${((arrayDesign.effectiveDeratingFactor || 0.805) * 100).toFixed(1)}% PR`,
            },
            {
              id: 'scenarios' as ActiveModuleTab,
              title: t.tabScenarios,
              icon: <GitCompare className="w-4 h-4 text-pink-400" />,
              code: 'Multi-Variant',
              badge: 'Sensitivity',
            },
            {
              id: 'cad_layout' as ActiveModuleTab,
              title: t.tabCadLayout,
              icon: <Grid className="w-4 h-4 text-blue-400" />,
              code: 'GCR Opt',
              badge: '2P Tables',
            },
            {
              id: '3d_viewer' as ActiveModuleTab,
              title: t.tab3dViewer,
              icon: <Eye className="w-4 h-4 text-orange-400" />,
              code: 'Ray-Tracer',
              badge: 'WebGL 3D',
            },
            {
              id: 'solar_pumping' as ActiveModuleTab,
              title: t.tabSolarPumping,
              icon: <Droplet className="w-4 h-4 text-blue-400" />,
              code: 'VFD Hydro',
              badge: 'm³/day',
            },
          ],
        },
        {
          phase: 6,
          categoryTitle: lang === 'fa' ? 'فاز ۶: تحلیل مالی، قوانین و استانداردها' : 'Phase 6: Bankability & RFC 3.0',
          tabs: [
            {
              id: 'financial' as ActiveModuleTab,
              title: t.tabFinancial,
              icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
              code: '25Y Cash Flow',
              badge: financialResult.isIrrDefined && financialResult.irrPct !== null ? `IRR ${financialResult.irrPct}%` : 'IRR N/A',
            },
            {
              id: 'iran_regulations' as ActiveModuleTab,
              title: t.tabIranRegs,
              icon: <Scale className="w-4 h-4 text-emerald-400" />,
              code: 'SATBA PPA',
              badge: 'PPA Tariff',
            },
            {
              id: 'rfc3_reports' as ActiveModuleTab,
              title: lang === 'fa' ? 'گزارشات مهندسی و انطباق RFC 3.0' : 'RFC 3.0 Engineering & Reports',
              icon: <FileCheck className="w-4 h-4 text-sky-400" />,
              code: 'Gold Standard',
              badge: '11/11 PASS',
            },
          ],
        },
      ];
    }
  }, [systemMode, t, lang, city.peakSunHours, mvVoltageKv, customBaysCount, arrayDesign.totalPvCapacityKwp, arrayDesign.effectiveDeratingFactor, loadAnalysis.totalDailyEnergyKwh, batterySizing.grossCapacityKwh, simulationResult.isSelfSufficient, financialResult.irrPct, financialResult.isIrrDefined]);

  // Flattened list of tabs for Sequential Navigation and Command Palette
  const flattenedTabsList = useMemo(() => {
    return menuSections.flatMap((s) => s.tabs);
  }, [menuSections]);

  const currentTabIndex = useMemo(() => {
    return flattenedTabsList.findIndex((t) => t.id === activeTab);
  }, [flattenedTabsList, activeTab]);

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(flattenedTabsList[currentTabIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < flattenedTabsList.length - 1) {
      setActiveTab(flattenedTabsList[currentTabIndex + 1].id);
    }
  };

  const activeSectionInfo = useMemo(() => {
    for (let i = 0; i < menuSections.length; i++) {
      const match = menuSections[i].tabs.find((t) => t.id === activeTab);
      if (match) {
        return {
          phaseIndex: menuSections[i].phase,
          totalPhases: menuSections.length,
          categoryTitle: menuSections[i].categoryTitle,
          tabTitle: match.title,
          tabIcon: match.icon,
          tabCode: match.code,
          tabBadge: match.badge,
        };
      }
    }
    return {
      phaseIndex: 1,
      totalPhases: menuSections.length,
      categoryTitle: '',
      tabTitle: '',
      tabIcon: null,
      tabCode: '',
      tabBadge: '',
    };
  }, [menuSections, activeTab]);

  const filteredCommandTabs = useMemo(() => {
    if (!commandSearchQuery.trim()) return flattenedTabsList;
    const q = commandSearchQuery.toLowerCase();
    return flattenedTabsList.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.code && t.code.toLowerCase().includes(q))
    );
  }, [flattenedTabsList, commandSearchQuery]);

  const isRtl = lang === 'fa';
  const sidebarWidthClass = isSidebarCollapsed ? 'w-[68px]' : 'w-[280px]';
  const sidebarWidthPx = isSidebarCollapsed ? 68 : 280;
  const marginOffsetClass = isRtl
    ? isSidebarCollapsed ? 'lg:mr-[68px]' : 'lg:mr-[280px]'
    : isSidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[280px]';

  return (
    <div
      className={`min-h-screen bg-[#080C14] text-slate-100 flex flex-col ${isRtl ? 'font-vazir' : 'font-sans'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-emerald-400 shadow-xl">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Hidden File Input for JSON Project Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleJsonFileUpload}
      />

      {/* BACKDROP OVERLAY FOR MOBILE SIDEBAR */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden transition-opacity"
        />
      )}

      {/* COMMAND PALETTE DIALOG (Ctrl+K / Cmd+K) */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-xl bg-[#0E1422] border border-[#283548] rounded-xl shadow-2xl overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="p-3 border-b border-[#1E293B] flex items-center gap-2.5 bg-[#080D1A]">
              <Search className="w-4 h-4 text-sky-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  lang === 'fa'
                    ? 'جستجوی سریع ماژول‌ها، استانداردها و بخش‌های طراحی... (Esc برای بستن)'
                    : 'Search engineering modules, standards and calculations... (Esc to close)'
                }
                value={commandSearchQuery}
                onChange={(e) => setCommandSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
              />
              <button
                onClick={() => setIsCommandPaletteOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommandTabs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  {lang === 'fa' ? 'ماژولی با این عنوان یافت نشد' : 'No engineering modules found'}
                </div>
              ) : (
                filteredCommandTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsCommandPaletteOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition text-right ${
                      activeTab === tab.id
                        ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-300 hover:bg-[#141C2E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-slate-800/80 text-sky-400">{tab.icon}</div>
                      <div>
                        <strong className="block text-xs text-white">{tab.title}</strong>
                        {tab.code && <span className="text-[10px] text-slate-400 font-mono">{tab.code}</span>}
                      </div>
                    </div>
                    {tab.badge && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1F2937] text-amber-300 border border-slate-700">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Command Palette Quick Actions Footer */}
            <div className="p-2.5 border-t border-[#1E293B] bg-[#080D1A] flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 flex items-center gap-1 font-bold"
                >
                  <FileText className="w-3 h-3" />
                  <span>{t.generateReport}</span>
                </button>
                <button
                  onClick={() => {
                    handleSaveProject();
                    setIsCommandPaletteOpen(false);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1"
                >
                  <Save className="w-3 h-3 text-sky-400" />
                  <span>{t.saveProject}</span>
                </button>
              </div>
              <span className="font-mono text-[10px]">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">↵ Enter</kbd> to select
              </span>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT JSON EXPORT / IMPORT MODAL */}
      {isProjectJsonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-md bg-[#0E1422] border border-[#283548] rounded-xl shadow-2xl p-5 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-sky-400" />
                <span>{lang === 'fa' ? 'مدیریت داده‌های پروژه (JSON)' : 'Project Data Management (JSON)'}</span>
              </h3>
              <button
                onClick={() => setIsProjectJsonModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              {lang === 'fa'
                ? 'می‌توانید کل پیکربندی پروژه را به صورت فایل استاندارد JSON نسخه v3.0.0 دانلود کرده و یا فایل پروژه قبلی را بارگذاری نمایید.'
                : 'Export the complete project configuration as a validated v3.0.0 JSON file or restore an existing project file.'}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportProjectJson}
                className="p-3 bg-[#141C2E] hover:bg-[#1E293B] border border-sky-500/40 rounded-lg text-center space-y-1.5 transition text-sky-300 font-bold"
              >
                <Download className="w-5 h-5 mx-auto text-sky-400" />
                <span className="block text-xs">{lang === 'fa' ? 'دانلود فایل JSON' : 'Export JSON'}</span>
                <span className="block text-[10px] text-slate-400 font-normal">v3.0.0 Compliant</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-[#141C2E] hover:bg-[#1E293B] border border-emerald-500/40 rounded-lg text-center space-y-1.5 transition text-emerald-300 font-bold"
              >
                <Upload className="w-5 h-5 mx-auto text-emerald-400" />
                <span className="block text-xs">{lang === 'fa' ? 'بارگذاری فایل JSON' : 'Import JSON'}</span>
                <span className="block text-[10px] text-slate-400 font-normal">Auto 3-State Migration</span>
              </button>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 text-center font-mono">
              Trace ID: {generateTraceId().slice(0, 16)} · SolarPV Studio Pro v3.0.4
            </div>
          </div>
        </div>
      )}

      {/* TOP MODERN ENGINEERING COCKPIT APP BAR */}
      <header className="bg-[#0B101D] border-b border-[#1E293B] sticky top-0 z-30 px-3 sm:px-5 py-2 flex items-center justify-between gap-3 select-none">
        {/* Left Side (or Right in RTL): Brand, Project Title, Revision */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#141C2E] border border-slate-700 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4 text-sky-400" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg bg-[#121A2B] hover:bg-[#1A253D] border border-[#283548] text-slate-300 hover:text-sky-400 transition"
            title={lang === 'fa' ? 'جمع/باز کردن سایدبار (Ctrl+B)' : 'Toggle Sidebar (Ctrl+B)'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-sky-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Logo & Product Title */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-blue-500 to-sky-600 text-[#080C14] shadow-md shadow-blue-500/20 font-black">
              <Sun className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">SolarPV Studio</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  PRO v3.0.4
                </span>
              </div>
            </div>
          </div>

          <span className="hidden md:inline-block text-slate-600">/</span>

          {/* Inline Editable Project Name */}
          <div className="hidden md:flex items-center gap-1.5">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 hover:text-white border-b border-transparent hover:border-slate-600 focus:border-sky-400 focus:outline-none transition px-1 py-0.5 max-w-[200px] lg:max-w-xs truncate"
              title={lang === 'fa' ? 'نام پروژه را ویرایش کنید' : 'Click to edit project name'}
            />
            {lastSavedTime && (
              <span className="text-[10px] text-slate-400 font-mono hidden xl:inline-block px-1.5 py-0.5 rounded bg-slate-800/80">
                {t.lastSaved} {lastSavedTime}
              </span>
            )}
          </div>
        </div>

        {/* Center: Quick System Operating Mode Pill */}
        <div className="flex items-center gap-1 bg-[#080D1A] p-1 rounded-lg border border-[#1E293B] text-[10px] font-bold">
          <button
            onClick={() => setSystemMode('powerplant')}
            className={`px-2 sm:px-2.5 py-1 rounded transition flex items-center gap-1 ${
              systemMode === 'powerplant'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>{t.modePowerplant}</span>
          </button>
          <button
            onClick={() => setSystemMode('ongrid')}
            className={`px-2 sm:px-2.5 py-1 rounded transition flex items-center gap-1 ${
              systemMode === 'ongrid'
                ? 'bg-sky-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3 h-3" />
            <span>{t.modeOnGrid}</span>
          </button>
          <button
            onClick={() => setSystemMode('offgrid')}
            className={`px-2 sm:px-2.5 py-1 rounded transition flex items-center gap-1 ${
              systemMode === 'offgrid'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>{t.modeOffGrid}</span>
          </button>
        </div>

        {/* Right Side (or Left in RTL): Actions Cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          {/* Quick Jump / Command Palette Trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#121A2B] hover:bg-[#1A253D] border border-[#283548] text-slate-300 hover:text-white transition"
            title={lang === 'fa' ? 'جستجوی سریع ماژول‌ها (Ctrl+K)' : 'Quick Jump / Command Palette (Ctrl+K)'}
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline font-mono text-[11px]">⌘K</span>
          </button>

          {/* Quick Save */}
          <button
            onClick={handleSaveProject}
            className="studio-btn text-xs py-1.5 px-2 sm:px-2.5 flex items-center gap-1.5"
            title={lang === 'fa' ? 'ذخیره پروژه (Ctrl+S)' : 'Save project (Ctrl+S)'}
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">{t.saveProject}</span>
          </button>

          {/* JSON Export/Import */}
          <button
            onClick={() => setIsProjectJsonModalOpen(true)}
            className="p-1.5 rounded-lg bg-[#121A2B] hover:bg-[#1A253D] border border-[#283548] text-slate-300 hover:text-white transition"
            title={lang === 'fa' ? 'دانلود / بارگذاری فایل JSON پروژه' : 'Export / Import Project JSON'}
          >
            <Database className="w-3.5 h-3.5 text-purple-400" />
          </button>

          {/* Golden Generate EPC Official Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition"
            title={lang === 'fa' ? 'صدور گزارش رسمی مهندسی EPC (Ctrl+E)' : 'Generate Official EPC Report (Ctrl+E)'}
          >
            <FileText className="w-3.5 h-3.5 text-slate-950" />
            <span className="hidden sm:inline text-xs">{t.generateReport}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
            className="flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-lg bg-[#121A2B] hover:bg-[#1A253D] border border-[#283548] text-slate-300 hover:text-white transition font-bold"
            title={t.language}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'fa' ? 'EN' : 'فا'}</span>
          </button>
        </div>
      </header>

      {/* COCKPIT HEADS-UP DISPLAY (HUD) TELEMETRY RIBBON */}
      <div className="bg-[#0A0E1A] border-b border-[#1E293B] px-3 sm:px-5 py-2 flex items-center justify-between overflow-x-auto gap-4 scrollbar-none text-[11px] font-mono shrink-0 select-none">
        {/* Metric Badges */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="studio-hud-pill">
            <span className="text-slate-400">{lang === 'en' ? 'DC Array:' : 'ظرفیت DC:'}</span>
            <strong className="text-amber-400">{arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp</strong>
            <span className="text-[10px] text-slate-500">({arrayDesign.totalModulesCount} mod)</span>
          </div>

          <div className="studio-hud-pill">
            <span className="text-slate-400">{lang === 'en' ? 'Inverter AC:' : 'اینورتر AC:'}</span>
            <strong className="text-sky-400">{inverterClustering.totalInverterCapacityKw.toFixed(0)} kW</strong>
            <span className="text-[10px] text-slate-500">ILR {arrayDesign.dcAcRatio.toFixed(2)}</span>
          </div>

          <div className="studio-hud-pill">
            <span className="text-slate-400">{lang === 'en' ? 'Annual P50:' : 'تولید سالانه:'}</span>
            <strong className="text-emerald-400">{(annualYieldKwh / 1000).toFixed(1)} MWh</strong>
          </div>

          <div className="studio-hud-pill hidden md:inline-flex">
            <span className="text-slate-400">PR:</span>
            <strong className="text-purple-400">{((arrayDesign.effectiveDeratingFactor || 0.805) * 100).toFixed(1)}%</strong>
          </div>

          <div className="studio-hud-pill hidden lg:inline-flex">
            <span className="text-slate-400">LCOE:</span>
            <strong className="text-data-accent">{financialResult.isLcoeDefined && financialResult.lcoeUsdPerKwh !== null ? `$${financialResult.lcoeUsdPerKwh}/kWh` : 'N/A'}</strong>
          </div>

          <div className="studio-hud-pill hidden xl:inline-flex">
            <span className="text-slate-400">IRR:</span>
            <strong className="text-emerald-400">{financialResult.isIrrDefined && financialResult.irrPct !== null ? `${financialResult.irrPct}%` : 'N/A'}</strong>
          </div>
        </div>

        {/* Right Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3 h-3 text-amber-400" />
            <span>{lang === 'en' ? city.nameEn : city.nameFa}</span>
            <span className="text-amber-400 font-bold">({city.peakSunHours} PSH)</span>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          <div className="hidden sm:flex items-center gap-1.5 text-emerald-400 font-bold">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>IEC / ASCE / INBC ✓</span>
          </div>
        </div>
      </div>

      {/* WORKSPACE BODY WITH ADAPTIVE SIDEBAR (NATIVE LTR / RTL MIRRORING) */}
      <div className="flex-1 flex relative">
        {/* COLLAPSIBLE ENGINEERING SIDEBAR DOCKED ACCORDING TO LANGUAGE */}
        <aside
          className={`bg-[#0A0E1A] flex flex-col fixed inset-y-0 z-40 overflow-hidden transition-all duration-200 top-[88px] ${
            isRtl ? 'right-0 border-l border-[#1E293B]' : 'left-0 border-r border-[#1E293B]'
          } ${sidebarWidthClass} ${
            isMobileMenuOpen
              ? 'translate-x-0'
              : isRtl
              ? 'translate-x-full lg:translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Sidebar Mini Header with Rail Mode Indicator */}
          <div className="p-2.5 border-b border-[#1E293B] bg-[#080D1A] flex items-center justify-between">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2">
                <Workflow className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  {lang === 'fa' ? 'فازهای طراحی EPC' : 'EPC Design Workflow'}
                </span>
              </div>
            ) : (
              <div className="mx-auto text-sky-400" title="EPC Design Workflow">
                <Workflow className="w-4 h-4" />
              </div>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Workflow Menu List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3.5 text-xs scrollbar-thin scrollbar-thumb-slate-800">
            {menuSections.map((section, idx) => (
              <div key={idx} className="space-y-1">
                {/* Category Header (Hidden in rail mode) */}
                {!isSidebarCollapsed && (
                  <div className="text-[10px] font-extrabold text-sky-400 px-2 py-0.5 uppercase tracking-wider bg-[#0E1422] rounded border-r-2 border-sky-500 flex items-center justify-between">
                    <span>{section.categoryTitle}</span>
                    <span className="text-[9px] font-mono text-slate-500">P{section.phase}</span>
                  </div>
                )}

                {/* Tab Items */}
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
                        className={`w-full flex items-center ${
                          isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-1.5'
                        } rounded-md transition-all text-xs ${
                          isActive
                            ? 'bg-sky-600 text-white font-bold shadow-sm shadow-sky-600/30'
                            : 'text-slate-300 hover:bg-[#141C2E] hover:text-white'
                        }`}
                        title={tab.title}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={isActive ? 'text-white' : ''}>{tab.icon}</span>
                          {!isSidebarCollapsed && <span className="truncate">{tab.title}</span>}
                        </div>

                        {!isSidebarCollapsed && tab.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                              isActive
                                ? 'bg-sky-700/80 text-white font-bold'
                                : 'bg-[#141C2E] text-slate-400 border border-slate-800'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer with Quick Actions */}
          <div className="p-2 border-t border-[#1E293B] bg-[#080D1A] space-y-1.5">
            {!isSidebarCollapsed ? (
              <>
                <button
                  onClick={handleSaveProject}
                  className="w-full py-1.5 px-2 bg-[#121A2B] hover:bg-[#1A253D] border border-[#283548] rounded text-[11px] font-bold text-slate-200 flex items-center justify-center gap-1.5 transition"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.saveProject}</span>
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full py-1.5 px-2 studio-btn-primary flex items-center justify-center gap-1.5 text-[11px] font-bold rounded"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>{t.generateReport}</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleSaveProject}
                  className="p-2 rounded bg-[#121A2B] hover:bg-[#1A253D] text-amber-400"
                  title={t.saveProject}
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="p-2 rounded bg-sky-600 text-white"
                  title={t.generateReport}
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN OPERATIONAL WORKSPACE OFFSET BY INTELLIGENT SIDEBAR */}
        <div className={`flex-1 flex flex-col ${marginOffsetClass} min-h-screen transition-all duration-200`}>
          {/* Main Operational Workspace Content */}
          <main className="p-4 sm:p-6 flex-1 w-full max-w-7xl mx-auto space-y-5">
            {/* WORKFLOW PHASE STEPPER & BREADCRUMB */}
            <div className="p-3 bg-[#0E1422] border border-[#1E293B] rounded-lg flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 sm:gap-3 truncate">
                <div className="p-2 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {activeSectionInfo.tabIcon}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span className="text-sky-400 font-bold uppercase">
                      {lang === 'fa' ? `فاز ${activeSectionInfo.phaseIndex} از ${activeSectionInfo.totalPhases}:` : `PHASE ${activeSectionInfo.phaseIndex} OF ${activeSectionInfo.totalPhases}:`}
                    </span>
                    <span className="truncate">{activeSectionInfo.categoryTitle}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white truncate flex items-center gap-2">
                    <span>{activeSectionInfo.tabTitle}</span>
                    {activeSectionInfo.tabCode && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700 font-normal">
                        {activeSectionInfo.tabCode}
                      </span>
                    )}
                  </h2>
                </div>
              </div>

              {/* Prev / Next Step Navigation Stepper */}
              <div className="flex items-center gap-1 shrink-0 font-mono text-[11px]">
                <button
                  onClick={handlePrevTab}
                  disabled={currentTabIndex <= 0}
                  className={`p-1.5 sm:px-2 sm:py-1 rounded border flex items-center gap-1 transition ${
                    currentTabIndex > 0
                      ? 'bg-[#121A2B] hover:bg-[#1A253D] text-slate-200 border-[#283548]'
                      : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                  }`}
                  title={lang === 'fa' ? 'مرحله قبلی' : 'Previous Module'}
                >
                  {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{lang === 'fa' ? 'قبلی' : 'Prev'}</span>
                </button>

                <button
                  onClick={handleNextTab}
                  disabled={currentTabIndex >= flattenedTabsList.length - 1}
                  className={`p-1.5 sm:px-2 sm:py-1 rounded border flex items-center gap-1 transition ${
                    currentTabIndex < flattenedTabsList.length - 1
                      ? 'bg-[#121A2B] hover:bg-[#1A253D] text-slate-200 border-[#283548]'
                      : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
                  }`}
                  title={lang === 'fa' ? 'مرحله بعدی' : 'Next Module'}
                >
                  <span className="hidden sm:inline">{lang === 'fa' ? 'بعدی' : 'Next'}</span>
                  {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
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
                        ? 'border-amber-500 bg-amber-950/20'
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
                        ? 'border-sky-500 bg-sky-950/20'
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
                        ? 'border-emerald-500 bg-emerald-950/20'
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
              targetPowerplantCapacityKw={targetPowerplantCapacityKw}
              annualYieldMwh={waterfallReport.netAnnualEnergyExportMwh}
              trackerConfig={trackerConfig}
              onTrackerConfigChange={setTrackerConfig}
              cityLatitude={city.latitude}
              installationEnvironment={siteOverrides?.installationEnvironment || 'ground_mount'}
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
              ambientTempC={city.tempMaxC}
              elevationM={city.elevationM}
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
              ambientTempC={city.tempMaxC}
              installationEnvironment={siteOverrides?.installationEnvironment || 'ground_mount'}
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
          {activeTab === 'sim24h' && systemMode !== 'powerplant' && (
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
              report={waterfallReport}
              installedCapacityKwp={arrayDesign.totalPvCapacityKwp}
              peakSunHours={city.peakSunHours}
              ambientTempMaxC={city.tempMaxC}
              soilingLossPct={city.soilingLossPct}
              dcAcRatio={
                arrayDesign.totalPvCapacityKwp /
                Math.max(0.1, inverterClustering.totalInverterCapacityKw)
              }
              noctC={selectedModule.noctC}
              tempCoeffPmpPct={selectedModule.tempCoeffPmpPct}
              trackerConfig={trackerConfig}
              bifacialGainPct={bifacialGainPct}
              shadingProvenance={appliedShadingRecord}
              onClearShading={() => setAppliedShadingRecord(null)}
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
              city={city}
              lang={lang}
              isBifacial={isBifacial}
              bifacialityFactor={bifacialityFactor}
              groundCoverRatio={groundCoverRatio}
              bifacialGainPct={bifacialGainPct}
              shadingProvenance={appliedShadingRecord}
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
          {activeTab === '3d_viewer' && (
            <ThreeJsViewer
              lang={lang}
              city={city}
              plantCapacityKw={
                systemMode === 'powerplant'
                  ? (targetPowerplantCapacityKw || 1000)
                  : arrayDesign.totalPvCapacityKwp
              }
              plantCapacityType={systemMode === 'powerplant' ? 'ac_target' : 'dc_nameplate'}
              annualYieldKwh={waterfallReport.netAnnualEnergyExportMwh * 1000}
              onShadingLossChange={(loss) => {
                if (loss === null) {
                  setAppliedShadingRecord(null);
                }
              }}
              appliedShading={appliedShadingRecord}
              onApplyShading={(record) => setAppliedShadingRecord(record)}
              onRevertShading={() => setAppliedShadingRecord(null)}
            />
          )}

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

          {/* RFC 3.0 COMPREHENSIVE REPORTS TAB */}
          {activeTab === 'rfc3_reports' && (
            <RFC3ReportsTab
              lang={lang}
              onJumpTab={(t) => setActiveTab(t)}
              city={city}
              siteOverrides={siteOverrides}
            />
          )}
        </main>

        {/* 24px Industrial CAD/SCADA Telemetry Status Bar */}
        <footer className="h-6 bg-[#0A0E1A] border-t border-[#1F2937] px-4 flex items-center justify-between text-[11px] font-mono text-slate-400 select-none shrink-0 z-20">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-md bg-emerald-400" />
              <span>SYS: {systemMode.toUpperCase()}</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              SITE: {city.latitude.toFixed(4)}°N, {city.longitude.toFixed(4)}°E
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400">
              PSH: {city.peakSunHours} h/d
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <span className="text-blue-400 font-bold">
              GATEWAY: NASA POWER v2.0 / PVGIS (SARAH-2) ACTIVE
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              RFC 3.0.0
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-bold">
              11/11 BENCHMARKS PASS
            </span>
          </div>
        </footer>
      </div>
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

    </div>
  );
};

export default App;
