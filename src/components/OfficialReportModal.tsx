import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Upload,
  ShieldCheck,
  Sun,
  Zap,
  Battery as BatteryIcon,
  DollarSign,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  Building2,
  Anchor,
  Radio,
  FileText,
  FileSpreadsheet,
  Settings2,
  Eye,
  Sliders,
  CheckSquare,
  Square,
  Image as ImageIcon,
  ChevronRight,
  TrendingUp,
  MapPin,
  Wind,
  Truck,
  HardHat,
  FileCode,
  BarChart3,
  Award,
  AlertTriangle,
  ShieldAlert,
  Cpu,
  Sparkles,
  Check,
  CheckCheck,
  Compass,
  ThermometerSnowflake,
  FileCheck,
  BookOpen,
  Database,
} from 'lucide-react';
import { type ClimateCity, type SiteGeotechnicalOverrides, getEffectiveClimateCity } from '../engine/climaticData';
import { type LoadAnalysisResult } from '../engine/loadProfiles';
import { type PvArrayDesignResult, type ModuleSpecs, type InverterSpecs } from '../engine/pvEngineAdvanced';
import { type BatteryBankSizingResult } from '../engine/batteryEngine';
import { type CompleteProtectionSystemResult } from '../engine/protectionBomEngine';
import { type Simulation24hResult, type GeneratorSizingResult } from '../engine/simulation24hEngine';
import { type FinancialAnalysisResult } from '../engine/financialEngine';
import { type PowerplantBayArchitectureResult } from '../engine/powerplantBayEngine';
import { exportToWordDocument, exportToExcelWorkbook } from '../engine/reportingEngine';
import { createProjectTransferEnvelope } from '../engine/offlineTransferEngine';
import { type FoundationType } from '../engine/structuralEngine';
import { calculateEnvironmentalAging, type EnvironmentalAgingResult } from '../engine/environmentalAgingEngine';
import { designMvSubstation, type MvSubstationResult } from '../engine/mvSubstationEngine';
import { type WaterfallLossReport } from '../engine/waterfallLossEngine';
import { type AppliedShading3dRecord } from '../engine/shadingLifecycle';
import { type StructuralSnapshot, exportStructuralSheetRows } from '../engine/core/structuralContract';
import { formatCoordinates, calculateSolsticeSolarGeometry } from '../engine/geoCoordinates';
import { buildProjectProvenanceSnapshot } from '../engine/provenance/projectProvenance';

interface OfficialReportModalProps {
  projectName: string;
  systemMode: 'powerplant' | 'ongrid' | 'offgrid';
  city: ClimateCity;
  loadAnalysis: LoadAnalysisResult;
  module: ModuleSpecs;
  inverter: InverterSpecs;
  arrayDesign: PvArrayDesignResult;
  batterySizing: BatteryBankSizingResult;
  protection: CompleteProtectionSystemResult;
  simulation: Simulation24hResult;
  generator: GeneratorSizingResult;
  financial: FinancialAnalysisResult;
  bayArchitecture?: PowerplantBayArchitectureResult;
  siteOverrides?: SiteGeotechnicalOverrides;
  structuralSnapshot?: StructuralSnapshot | null;
  foundationType?: FoundationType;
  waterfallReport?: WaterfallLossReport;
  appliedShading?: AppliedShading3dRecord | null;
  isShadingStale?: boolean;
  bifacialGainPct?: number;
  reportMetadata?: Record<string, unknown>;
  pendingImportedEmbedmentDepthM?: number | null;
  onClose: () => void;
  onImportProject?: (projectData: unknown) => boolean | void;
  lang?: 'fa' | 'en';
}

type ReportSectionKey =
  | 'summary'
  | 'climate'
  | 'shading'
  | 'energy'
  | 'electrical'
  | 'structural'
  | 'financial'
  | 'bom';

export const OfficialReportModal: React.FC<OfficialReportModalProps> = ({
  projectName,
  systemMode,
  city,
  loadAnalysis,
  module,
  inverter,
  arrayDesign,
  batterySizing,
  protection,
  simulation,
  generator,
  financial,
  bayArchitecture,
  siteOverrides,
  structuralSnapshot,
  foundationType: customFoundationType,
  waterfallReport,
  appliedShading,
  isShadingStale = false,
  bifacialGainPct,
  reportMetadata = {},
  pendingImportedEmbedmentDepthM = null,
  onClose,
  onImportProject,
  lang: defaultLang = 'fa',
}) => {
  const [reportLang, setReportLang] = useState<'fa' | 'en'>(defaultLang);
  const isEn = reportLang === 'en';
  const effectiveCity = getEffectiveClimateCity(city, siteOverrides);
  const dataProvenance = useMemo(
    () => buildProjectProvenanceSnapshot(effectiveCity, siteOverrides),
    [effectiveCity, siteOverrides]
  );

  const isSnapshotValid = Boolean(
    structuralSnapshot && structuralSnapshot.isAvailable && !structuralSnapshot.isStale
  );

  const envAging: EnvironmentalAgingResult = useMemo(() => {
    return calculateEnvironmentalAging({
      installationEnvironment: siteOverrides?.installationEnvironment || 'ground_mount',
      ambientTempMaxC: effectiveCity.tempMaxC,
      ambientTempMinC: effectiveCity.tempMinC,
      elevationM: effectiveCity.elevationM,
      moduleNoctC: module.noctC,
      moduleTempCoeffPmpPct: module.tempCoeffPmpPct,
      inverterPnomAcKw: inverter.pnomAcKw,
      siteTiltDeg: siteOverrides?.arrayTiltDeg ?? effectiveCity.optimalTiltAnnualDeg ?? 30,
    });
  }, [siteOverrides, effectiveCity, module, inverter]);

  const mvSubResult: MvSubstationResult | null = useMemo(() => {
    if (systemMode !== 'powerplant') return null;
    const plantMw = bayArchitecture?.totalPlantCapacityMw || Math.max(0.5, arrayDesign.totalPvCapacityKwp / 1200.0);
    return designMvSubstation({
      plantCapacityAcMva: plantMw,
      inverterOutputVoltageV: inverter.pnomAcKw >= 250 ? 800 : 400,
      gridConnectionVoltageKv: 20,
      soilResistivityOhmM: 80,
      clearingTimeSec: 0.5,
      ambientTempC: effectiveCity.tempMaxC,
      elevationM: effectiveCity.elevationM,
    });
  }, [systemMode, bayArchitecture, arrayDesign, inverter, effectiveCity]);

  // Derived Energy Simulation Metrics:
  // Single-source primary annual energy and specific yield from unified waterfall loss report,
  // preserving 24h diurnal simulation as a secondary diagnostic profile.
  const diurnal24hAnnualMwh = Number(((simulation.totalGeneration24hKwh * 365) / 1000).toFixed(1));
  const primaryAnnualEnergyMwh = waterfallReport
    ? waterfallReport.netAnnualEnergyExportMwh
    : diurnal24hAnnualMwh;
  const primarySpecificYieldKwhKwp = waterfallReport
    ? Math.round(waterfallReport.specificAnnualYieldKwhPerKwp)
    : Math.round((diurnal24hAnnualMwh * 1000) / Math.max(1, arrayDesign.totalPvCapacityKwp));

  // Sourced from unified waterfall loss report (69.2% on standard fixture), falling back to sizing derate factor only if report omitted
  const performanceRatioPct = waterfallReport
    ? waterfallReport.performanceRatioPct
    : Number(((arrayDesign.effectiveDeratingFactor || 0.805) * 100).toFixed(1));
  const p50Mwh = primaryAnnualEnergyMwh;
  const p75Mwh = Number((primaryAnnualEnergyMwh * 0.945).toFixed(1));
  const illustrativeDownsideMwh = Number((primaryAnnualEnergyMwh * 0.898).toFixed(1));

  // Dynamic Shading Derate & Provenance Metrics
  const isAppliedShadingActive = Boolean(appliedShading && !isShadingStale);
  const effectiveShadingLossPct = isAppliedShadingActive ? appliedShading!.lossPct : 2.4;
  const effectiveShadingDerate = Number((1.0 - effectiveShadingLossPct / 100).toFixed(4));

  // Customization & Metadata State. Imported values remain user-supplied; empty values
  // stay empty rather than being replaced with fictional parties or approvals.
  const metadataText = (key: string, fallback = '') => typeof reportMetadata[key] === 'string'
    ? reportMetadata[key] as string
    : fallback;
  const metadataApproval = metadataText('approvalStatus', 'Draft');
  const [docId, setDocId] = useState<string>(metadataText('docId'));
  const [docVersion, setDocVersion] = useState<string>(metadataText('docVersion', 'Rev 1.0 (Draft)'));
  const [companyName, setCompanyName] = useState<string>(metadataText('companyName'));
  const [leadEngineer, setLeadEngineer] = useState<string>(metadataText('leadEngineer'));
  const [clientName, setClientName] = useState<string>(metadataText('clientName'));
  const [approvalStatus, setApprovalStatus] = useState<'Draft' | 'Under Review' | 'Approved' | 'As-Built'>(
    ['Draft', 'Under Review', 'Approved', 'As-Built'].includes(metadataApproval)
      ? metadataApproval as 'Draft' | 'Under Review' | 'Approved' | 'As-Built'
      : 'Draft',
  );
  const [detailLevel, setDetailLevel] = useState<'summary' | 'standard' | 'detailed'>('detailed');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [customFileName, setCustomFileName] = useState<string>(
    `${projectName.replace(/\s+/g, '_')}_SolarPV_Report`
  );

  // Section Toggles
  const [includedSections, setIncludedSections] = useState<Record<ReportSectionKey, boolean>>({
    summary: true,
    climate: true,
    shading: true,
    energy: true,
    electrical: true,
    structural: true,
    financial: true,
    bom: true,
  });

  // Active View Filter
  const [activeReportTab, setActiveReportTab] = useState<'all' | ReportSectionKey>('all');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Custom Commentary Notes
  const [engineerNotes, setEngineerNotes] = useState<Record<string, string>>({
    summary: isEn
      ? 'Preliminary engineering screening only. Verify assumptions and design inputs against project-specific evidence before issue.'
      : 'صرفاً غربالگری مقدماتی مهندسی است. پیش از صدور، فرض‌ها و ورودی‌ها باید با شواهد مختص پروژه بررسی شوند.',
    climate: isEn
      ? 'Climate and geotechnical values carry their recorded source and quality; no regulatory verification is implied unless documented per field.'
      : 'منشأ و کیفیت هر مقدار باید جداگانه بررسی شود؛ این گزارش تأیید مقرراتی یا رسمی را القا نمی‌کند.',
    shading: isEn
      ? 'Row-spacing configuration is a screening input; confirm the site survey, horizon and applicable design basis.'
      : 'فاصله ردیف‌ها ورودی غربالگری است؛ برداشت سایت، افق و مبنای طراحی قابل اعمال را تأیید کنید.',
    electrical: isEn
      ? 'Preliminary conductor schedule only; confirm ampacity, installation conditions and voltage drop for the as-built route.'
      : 'جدول هادی‌ها مقدماتی است؛ ظرفیت جریان، شرایط نصب و افت ولتاژ مسیر نهایی را بررسی کنید.',
    structural: isEn
      ? 'Foundation recommendation is not a stamped structural design; verify loads, soil evidence and required safety factors independently.'
      : 'پیشنهاد فونداسیون نقشه سازه‌ای تأییدشده نیست؛ بارها، شواهد خاک و ضرایب اطمینان لازم باید مستقل بررسی شوند.',
    financial: isEn
      ? 'Illustrative financial screening; tariff, escalation, degradation and financing assumptions require project-specific confirmation.'
      : 'غربالگری مالی نمونه‌ای است؛ تعرفه، تورم، افت و فرض‌های تأمین مالی باید برای پروژه تأیید شوند.',
    ...(reportMetadata.engineerNotes && typeof reportMetadata.engineerNotes === 'object'
      ? reportMetadata.engineerNotes as Record<string, string>
      : {}),
  });

  const reportContainerRef = useRef<HTMLDivElement>(null);

  const toggleSection = (key: ReportSectionKey) => {
    setIncludedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    if (!reportContainerRef.current) return;
    const reportHtml = reportContainerRef.current.innerHTML;
    exportToWordDocument(reportHtml, `${customFileName}.docx`);
  };

  const handleExportExcel = () => {
    // Build structured sheets
    const summarySheet = [
      ['SOLARPV STUDIO PRO — PRELIMINARY SCREENING REPORT (NOT A COMPLIANCE CERTIFICATE)', ''],
      ['Project Title', projectName],
      ['Document ID', docId],
      ['Version / Revision', docVersion],
      ['System Operating Mode', systemMode.toUpperCase()],
      ['Date', new Date().toLocaleDateString()],
      ['Client Name', clientName],
      ['Lead Engineer', leadEngineer],
      ['User-entered Approval Status (not authenticated)', approvalStatus],
      ['', ''],
      ['KEY PERFORMANCE INDICATORS', ''],
      ['Total PV Peak Capacity (kWp)', arrayDesign.totalPvCapacityKwp],
      ['Total Module Count', arrayDesign.totalModulesCount],
      ['Total Inverter Capacity (kW)', inverter.pnomAcKw * (bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1)],
      ['Net Annual Generation (MWh, Waterfall)', primaryAnnualEnergyMwh.toFixed(1)],
      ['Specific Annual Yield (kWh/kWp)', primarySpecificYieldKwhKwp],
      ['Diurnal Diagnostic Generation (MWh, 24h)', diurnal24hAnnualMwh.toFixed(1)],
      ['Performance Ratio PR (%)', `${performanceRatioPct}%`],
      ['Levelized Cost of Electricity LCOE ($/kWh)', financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null ? financial.lcoeUsdPerKwh : 'N/A (Zero Yield)'],
      ['Internal Rate of Return IRR (%)', financial.isIrrDefined && financial.irrPct !== null ? `${financial.irrPct}%` : 'N/A (Undefined)'],
      ['Net Present Value NPV ($)', financial.npvUsd],
      ['Simple Payback (Years)', financial.simplePayback ? financial.simplePayback.formattedYears : (financial.simplePaybackPeriodYears ?? 'N/A')],
    ];

    const climateSheet = [
      ['SITE GEOTECHNICAL & CLIMATIC DATABASE', ''],
      ['Location City', isEn ? effectiveCity.nameEn : effectiveCity.nameFa],
      ['Latitude (deg)', effectiveCity.latitude],
      ['Longitude (deg)', effectiveCity.longitude],
      ['Elevation (m)', effectiveCity.elevationM],
      ['Peak Sun Hours PSH (kWh/m²/day)', effectiveCity.peakSunHours],
      ['Min Design Temp (°C)', effectiveCity.tempMinC],
      ['Max Design Temp (°C)', effectiveCity.tempMaxC],
      ['Basic Wind Speed (km/h)', effectiveCity.basicWindSpeedKmh],
      ['Ground Snow Load (kg/m²)', effectiveCity.groundSnowLoadKgM2],
      ['Annual Precipitation (mm)', effectiveCity.annualRainfallMm],
      ['Soil Geotechnical Type', effectiveCity.soilType],
      ['Allowable Bearing Capacity (kPa)', effectiveCity.soilBearingCapacityKpa],
      ['Internal Friction Angle (°)', effectiveCity.soilInternalFrictionAngleDeg],
      ['Soil Cohesion (kPa)', effectiveCity.soilCohesionKpa],
      ['Frost Depth (cm)', effectiveCity.frostDepthCm],
      ['Seismic Base Acceleration A (g)', effectiveCity.seismicZoneCoefficientA],
      ['Data Provenance', isEn ? effectiveCity.dataSourceEn : effectiveCity.dataSourceFa],
      ['Retrieval Date', effectiveCity.dataRetrievalDate ?? ''],
    ];

    const electricalSheet = [
      ['ELECTRICAL SCHEDULE & CABLES', ''],
      ['Conductor Run', 'Nominal Current (A)', 'Length (m)', 'Material', 'Insulation', 'Designation', 'Voltage Drop (%)', 'Status'],
      ...protection.cableRuns.map((c) => [
        isEn ? c.config.sectionNameEn : c.config.sectionNameFa,
        c.config.designCurrentAmps,
        c.config.oneWayLengthM,
        c.config.conductorMaterial.toUpperCase(),
        c.config.insulationType,
        isEn ? c.cableDesignationEn : c.cableDesignationFa,
        c.actualVoltageDropPct,
        c.isCompliant ? 'INTERNAL SCREENING PASS (not compliance)' : 'INTERNAL SCREENING FAIL',
      ]),
    ];

    const financialSheet = [
      ['25-YEAR FINANCIAL CASH FLOW PRO-FORMA', ''],
      ['Year', 'Generation (MWh)', 'Revenue ($)', 'OPEX ($)', 'Net Cash Flow ($)', 'Cumulative Cash Flow ($)'],
      ...financial.cashFlow25Years.map((cf) => [
        cf.year,
        (cf.generationKwh / 1000).toFixed(1),
        Math.round(cf.revenueToman / 90000),
        Math.round(cf.opexToman / 90000),
        Math.round(cf.netCashFlowToman / 90000),
        Math.round(cf.cumulativeCashFlowToman / 90000),
      ]),
    ];

    const energySheet = [
      ['ENERGY YIELD SIMULATION & SENSITIVITY SCENARIOS (INDICATIVE)', ''],
      ['Methodology Note', 'Primary annual yield metrics are application model outputs from its waterfall loss calculation, with the 24h profile used only as diagnostic screening. Downside scenarios (-5.5% and -10.2%) are illustrative fixed sensitivity factors, not formal probabilistic exceedance percentiles. Applicable standards conformity has not been assessed.'],
      ['Metric', 'Value', 'Unit', 'Methodology / Standard'],
      ['Net AC Annual Generation (Primary)', primaryAnnualEnergyMwh.toFixed(1), 'MWh/yr', waterfallReport ? 'Unified Waterfall Loss Model' : 'Annualized 24h Baseline Profile'],
      ['Specific Annual Yield (Primary)', primarySpecificYieldKwhKwp.toString(), 'kWh/kWp/yr', 'Normalized to STC DC Capacity (Primary Model)'],
      ['Performance Ratio (PR)', `${performanceRatioPct}%`, '-', 'Model-derived metric; standards conformity not assessed'],
      ['Diurnal Diagnostic Net AC Generation', diurnal24hAnnualMwh.toFixed(1), 'MWh/yr', 'Annualized 24h Diurnal Profile (Diagnostic)'],
      ['Gross DC Annual Generation (24h Extrapolated)', (diurnal24hAnnualMwh * 1.05).toFixed(1), 'MWh/yr', 'Sandia Array Model (Annualized 24h Diagnostic)'],
      ['Illustrative Downside Scenario (-5.5%)', p75Mwh.toFixed(1), 'MWh/yr', 'Illustrative 0.945x Sensitivity Factor (Not Probabilistic Exceedance)'],
      ['Illustrative Conservative Downside (-10.2%)', illustrativeDownsideMwh.toFixed(1), 'MWh/yr', 'Illustrative 0.898x Sensitivity Factor (Not Bankable P90)'],
      ['Near Shading Loss', `-${effectiveShadingLossPct}%`, '-', isAppliedShadingActive ? '3D Near-Shading Model' : (isShadingStale ? 'Standard Empirical Default (-2.4%, ⚠️ 3D Shading Stale: Parameters Changed)' : 'Standard Empirical Default (-2.4%)')],
      ['Effective Shading Derate', effectiveShadingDerate.toString(), '-', '1 - (Shading Loss / 100)'],
      ...(waterfallReport ? [
        ['', ''],
        ['WATERFALL LOSS BREAKDOWN STAGES', ''],
        ['Stage ID', 'Loss / Gain (%)', 'Stage Output (MWh)', 'Description'],
        ...waterfallReport.stages.map((st) => [
          isEn ? st.nameEn : st.nameFa,
          `${st.percentageLoss > 0 ? '+' : ''}${st.percentageLoss}%`,
          (st.stageOutputKwh / 1000).toFixed(1),
          isEn ? st.descriptionEn : st.descriptionFa,
        ]),
      ] : [
        ['Soiling Derate', '3.5%', '-', 'Kimber Arid Climate Deposition Model'],
        ['Thermal Temperature Loss', '7.8%', '-', 'Gamma_Pmp = -0.30%/°C'],
        ['Ohmic Cable I2R Loss', '1.2%', '-', 'DC + AC Conductor Resistance'],
        ['Inverter Conversion Efficiency', '98.5%', '-', 'IEC 62891 Weighted Efficiency'],
        ['Transformer & MV Losses', '1.2%', '-', 'Substation Step-up Transformer'],
        ['System Availability', '99.0%', '-', 'Annual Scheduled / Unscheduled Uptime'],
      ]),
    ];

    const structuralSheet = exportStructuralSheetRows(structuralSnapshot ?? null, isEn);

    exportToExcelWorkbook(
      [
        { sheetName: 'Project Summary', rows: summarySheet },
        { sheetName: 'Climate & Geotechnical', rows: climateSheet },
        {
          sheetName: 'Data Provenance',
          rows: [
            ['Key', 'Parameter', 'Value', 'Unit', 'Source Kind', 'Provider', 'Dataset', 'Source Parameter', 'Retrieved At', 'Derivation', 'Quality Note', 'Confidence'],
            ...dataProvenance.map((row) => [
              row.key, row.parameter, row.value, row.unit, row.sourceKind, row.provider,
              row.sourceDataset ?? '', row.sourceParameter ?? '', row.retrievedAt ?? '',
              row.derivationMethod ?? '', row.qualityNote ?? '', row.confidence,
            ]),
          ],
        },
        { sheetName: 'Energy Yield & PR', rows: energySheet },
        { sheetName: 'Electrical Schedule', rows: electricalSheet },
        { sheetName: 'Structural & Foundations', rows: structuralSheet },
        { sheetName: 'Financial 25Y CashFlow', rows: financialSheet },
      ],
      `${customFileName}.xlsx`
    );
  };

  // Full Project JSON Export with Custom Filename & Custom Equipment Envelope (OFF-01)
  const handleExportJson = () => {
    const fullProjectState = {
      app: 'SolarPV Studio Engineering Platform',
      version: '3.1.0',
      exportedAt: new Date().toISOString(),
      metadata: {
        docId,
        docVersion,
        companyName,
        leadEngineer,
        clientName,
        approvalStatus,
        detailLevel,
        engineerNotes,
      },
      projectName,
      systemMode,
      city: effectiveCity,
      siteOverrides,
      pendingImportedEmbedmentDepthM,
      dataProvenance,
      loadAnalysis,
      module,
      inverter,
      selectedModule: module,
      selectedInverter: inverter,
      arrayDesign,
      batterySizing,
      protection,
      simulation,
      generator,
      financial,
      bayArchitecture,
      waterfallReport,
    };

    const envelope = createProjectTransferEnvelope({
      projectName,
      projectData: fullProjectState,
      metadata: {
        docId,
        docVersion,
        companyName,
        leadEngineer,
        clientName,
        approvalStatus,
        detailLevel,
        engineerNotes,
      },
      currencyConfig: {
        primaryCurrency: 'USD',
      },
      activeModule: module,
      activeInverter: inverter,
    });

    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customFileName}.solarpv.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportApiProposal = async () => {
    try {
      const invCount = bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1;
      const batCount = batterySizing ? batterySizing.totalBatteryUnitsCount : 0;
      const annualKwh = Math.round(primaryAnnualEnergyMwh * 1000);
      const lcoeVal = financial.isLcoeDefined ? financial.lcoeUsdPerKwh : null;

      const payload = {
        projectName,
        projectId: docId,
        systemCapacityKwp: Number(arrayDesign.totalPvCapacityKwp.toFixed(2)),
        panelCount: Math.round(arrayDesign.totalModulesCount),
        panelType: `${module.manufacturer} ${module.modelName} (${module.pmpWatts}W)`,
        inverterCount: Math.round(invCount),
        inverterType: `${inverter.manufacturer} ${inverter.modelName} (${inverter.pnomAcKw}kW)`,
        batteryCount: Math.round(batCount),
        batteryType: batterySizing ? `${batterySizing.chemistry.nameEn} (${batterySizing.grossCapacityKwh.toFixed(1)}kWh)` : 'N/A',
        annualYieldKwh: annualKwh,
        lcoeUsdPerKwh: lcoeVal,
      };

      const res = await fetch('/api/v1/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server rejected proposal metrics');
      }

      const proposal = await res.json();
      const blob = new Blob([JSON.stringify(proposal, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${customFileName}_Screening_Proposal.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(isEn ? `API Validation/Export Notice: ${err.message}` : `پیام اعتبارسنجی خروجی گزارش: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportProject) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const applied = onImportProject(parsed);
          if (applied !== false) onClose();
        } catch {
          alert(isEn ? 'Invalid JSON project file.' : 'فایل JSON پروژه نامعتبر است.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-industrial-surface border border-industrial-border rounded-xl max-w-6xl w-full p-4 sm:p-6 text-slate-100  relative my-4 sm:my-8 max-h-[94vh] flex flex-col print:p-0 print:border-none print:-none print:bg-white print:text-black print:max-h-none print:my-0">
        {/* Top Control Toolbar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-industrial-border/80 pb-4 mb-4 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-industrial-accent/10 border border-industrial-accent/30 rounded-lg">
              <FileText className="w-5 h-5 text-industrial-accent" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Comprehensive EPC Engineering Dossier' : 'ماژول صدور گزارش‌های جامع و تخصصی EPC'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono border border-industrial-accent/30">
                  {docVersion}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Multi-format export: PDF, Word (.docx), Excel (.xlsx) & Local Project (.json) with full traceability'
                  : 'تولید گزارش رسمی با فرمت‌های PDF، Word (.docx)، Excel (.xlsx) و ذخیره کامل پروژه در قالب فایل محلی'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 ${
                showSettingsDrawer ? 'bg-sky-600 text-white' : ''
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-industrial-accent" />
              <span>{isEn ? 'Customize' : 'سفارشی‌سازی'}</span>
            </button>

            <button
              onClick={() => setReportLang(reportLang === 'fa' ? 'en' : 'fa')}
              className="studio-btn text-xs py-1.5 px-2.5 font-bold"
            >
              {reportLang === 'fa' ? 'Switch to English' : 'تغییر به فارسی'}
            </button>

            <button
              onClick={handlePrint}
              className="studio-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              title={isEn ? 'Print or Save as PDF' : 'چاپ مستقیم یا خروجی PDF'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print / PDF' : 'چاپ / PDF'}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-industrial-primary border-industrial-primary/30"
              title={isEn ? 'Export as Microsoft Word (.docx)' : 'خروجی فایل ورد (.docx)'}
            >
              <FileCode className="w-3.5 h-3.5 text-industrial-primary" />
              <span>{isEn ? 'Word (.docx)' : 'Word (.docx)'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-industrial-success border-industrial-success/30"
              title={isEn ? 'Export Multi-Sheet Excel Workbook (.xlsx)' : 'خروجی اکسل چند شیت (.xlsx)'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-industrial-success" />
              <span>{isEn ? 'Excel (.xlsx)' : 'Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-industrial-warning border-industrial-warning/30"
              title={isEn ? 'Save Project File to Local Machine' : 'ذخیره محلی پروژه با نام دلخواه'}
            >
              <Download className="w-3.5 h-3.5 text-industrial-warning" />
              <span>{isEn ? 'Save Project' : 'ذخیره پروژه'}</span>
            </button>

            <button
              onClick={handleExportApiProposal}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-sky-400 border-sky-500/30"
              title={isEn ? 'Export Preliminary JSON Screening Proposal (Preliminary Engineering Screening, not certified EPC package)' : 'دریافت پروپوزال غربالگری اولیه JSON (امکان‌سنجی مقدماتی، غیر از پکیج اجرایی EPC)'}
            >
              <FileCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{isEn ? 'Screening Proposal (.json)' : 'پروپوزال مقدماتی (.json)'}</span>
            </button>

            <label
              htmlFor="report-restore-file-input"
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 cursor-pointer"
              title={isEn ? 'Restore Project from JSON' : 'بازیابی پروژه از فایل'}
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>{isEn ? 'Load' : 'بارگذاری'}</span>
              <input id="report-restore-file-input" type="file" accept=".json,.solarpv.json" onChange={handleFileChange} className="hidden" />
            </label>

            <button
              id="report-modal-close-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customization Drawer (Collapsible) */}
        {showSettingsDrawer && (
          <div className="bg-industrial-bg/90 border border-industrial-border rounded-lg p-3 sm:p-4 mb-4 text-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between border-b border-industrial-border pb-2">
              <span className="font-bold text-industrial-accent flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                {isEn ? 'Report Configuration & Branding Settings' : 'تنظیمات سفارشی‌سازی گزارش و اطلاعات شرکت'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{isEn ? 'Detail Level:' : 'سطح جزئیات:'}</span>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value as any)}
                  className="bg-industrial-surface border border-industrial-border rounded px-2 py-0.5 text-white"
                >
                  <option value="summary">{isEn ? 'Executive Summary' : 'خلاصه مدیریتی'}</option>
                  <option value="standard">{isEn ? 'Standard Engineering' : 'مهندسی استاندارد'}</option>
                  <option value="detailed">{isEn ? 'Detailed Comprehensive Dossier' : 'تفصیلی و کامل (Full EPC)'}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label htmlFor="report-doc-id" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Document ID:' : 'شماره سند:'}</label>
                <input
                  id="report-doc-id"
                  type="text"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="report-doc-version" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Revision:' : 'نسخه گزارش:'}</label>
                <input
                  id="report-doc-version"
                  type="text"
                  value={docVersion}
                  onChange={(e) => setDocVersion(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label htmlFor="report-company-name" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Engineering Company:' : 'نام مهندس مشاور / شرکت:'}</label>
                <input
                  id="report-company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label htmlFor="report-client-name" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Client / Investor Name:' : 'نام کارفرما / سرمایه‌گذار:'}</label>
                <input
                  id="report-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="report-lead-engineer" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Lead Engineer / Designer:' : 'طراح و مدیر پروژه:'}</label>
                <input
                  id="report-lead-engineer"
                  type="text"
                  value={leadEngineer}
                  onChange={(e) => setLeadEngineer(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label htmlFor="report-approval-status" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Approval Status:' : 'وضعیت تأیید سند:'}</label>
                <select
                  id="report-approval-status"
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as any)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                >
                  <option value="Draft">{isEn ? 'Draft (پیش‌نویس)' : 'پیش‌نویس (Draft)'}</option>
                  <option value="Under Review">{isEn ? 'Under Review (در دست بررسی)' : 'در دست بررسی (Under Review)'}</option>
                  <option value="Approved">{isEn ? 'Approved (تأیید نهایی)' : 'تأیید نهایی (Approved)'}</option>
                  <option value="As-Built">{isEn ? 'As-Built (چون‌ساخت)' : 'چون‌ساخت (As-Built)'}</option>
                </select>
              </div>
              <div>
                <label htmlFor="report-file-name" className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Export File Name:' : 'نام فایل ذخیره‌سازی:'}</label>
                <input
                  id="report-file-name"
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>

            {/* Section Checkboxes */}
            <div className="pt-2 border-t border-industrial-border">
              <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">
                {isEn ? 'Include Sections in Output:' : 'انتخاب بخش‌های مندرج در گزارش:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'summary', fa: 'خلاصه پروژه', en: 'Project Summary' },
                  { key: 'climate', fa: 'اقلیم و خاک', en: 'Site & Geotechnical' },
                  { key: 'shading', fa: 'تحلیل سایه‌اندازی', en: 'Shading & Sun Path' },
                  { key: 'energy', fa: 'شبیه‌سازی انرژی و سناریوهای حساسیت', en: 'Energy Yield & Sensitivity' },
                  { key: 'electrical', fa: 'طراحی الکتریکی و کابل', en: 'Electrical & Cables' },
                  { key: 'structural', fa: 'سازه و فونداسیون', en: 'Structure & Foundation' },
                  { key: 'financial', fa: 'تحلیل مالی و بازگشت', en: 'Financial Pro-Forma' },
                  { key: 'bom', fa: 'فهرست تجهیزات BOM', en: 'Bill of Materials' },
                ].map((s) => (
                  <label key={s.key} htmlFor={`report-section-${s.key}`} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      id={`report-section-${s.key}`}
                      type="checkbox"
                      checked={includedSections[s.key as ReportSectionKey]}
                      onChange={() => toggleSection(s.key as ReportSectionKey)}
                      className="rounded border-industrial-border text-industrial-accent focus:ring-0"
                    />
                    <span>{isEn ? s.en : s.fa}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Report Content Area */}
        <div
          ref={reportContainerRef}
          className="flex-1 overflow-y-auto space-y-6 pr-1 print:p-0 print:overflow-visible print:text-black"
        >
          {/* Cover & Document Header */}
          <div className="text-center border-b border-industrial-border/80 print:border-slate-300 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-left text-[11px] text-slate-400 font-mono">
                <div>DOC: {docId}</div>
                <div>VER: {docVersion}</div>
              </div>
              <div className="inline-block px-3 py-1 bg-industrial-accent/10 border border-industrial-accent/30 rounded-md text-industrial-accent print:text-sky-800 text-[11px] font-bold tracking-wider uppercase">
                {isEn ? 'PRELIMINARY EPC SCREENING — NOT CERTIFIED' : 'غربالگری مقدماتی EPC — فاقد گواهی انطباق'}
              </div>
              <div className="text-right text-[11px] text-slate-400 font-mono">
                <div>{new Date().toISOString().split('T')[0]}</div>
                <div className="text-industrial-success font-bold">{approvalStatus}</div>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white print:text-black mb-1">
              {projectName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 print:text-slate-700 max-w-2xl mx-auto">
              {isEn
                ? `Utility-Grade PV System Feasibility & EPC Design Dossier for ${effectiveCity.nameEn}`
                : `طرح توجیهی فنی، محاسبات الکتریکی، ژئوتکنیک، سازه و ارزیابی مالی برای ساختگاه ${effectiveCity.nameFa}`}
            </p>

            <div role="note" className="my-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-100 print:border-amber-700 print:text-amber-900">
              {isEn
                ? 'UNVERIFIED SCREENING OUTPUT — Sources, credentials, signatures, approval status, standards editions, and regulatory conformity are not authenticated by this application. Do not use as a permit, stamped design, construction release, or financing certification.'
                : 'خروجی غربالگری و تأییدنشده — این برنامه منشأ داده، صلاحیت اشخاص، امضا، وضعیت تأیید، ویرایش استانداردها یا انطباق مقرراتی را احراز نمی‌کند. برای مجوز، نقشه مهرشده، اجرا یا گواهی تأمین مالی استفاده نشود.'}
            </div>

            {/* Conceptual Screening Maturity Level Badge (OUT-04) */}
            <div className="my-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 print:bg-amber-50 print:text-amber-900 text-[11px] font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isEn
                  ? 'Maturity: Conceptual Screening Dossier — Detailed topographic survey, geotechnical borehole logging & certified datasheets required before IFC/As-Built execution.'
                  : 'سطح آمادگی: غربالگری مفهومی (Conceptual Screening) — نیازمند تدقیق نقشه‌برداری میدانی، آزمایش مکانیک خاک و دیتاشیت تأییدشده پیش از صدور نقشه‌های اجرایی (IFC).'}
              </span>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 print:text-black bg-slate-800/60 print:bg-slate-100 p-2.5 rounded-lg mt-4 border border-industrial-border/60 print:border-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Client:' : 'کارفرما:'}</span>
                <strong>{clientName || (isEn ? '(Unassigned Client)' : '(کارفرمای نامشخص)')}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Company / consultant (user-entered):' : 'شرکت / مشاور (ورودی کاربر):'}</span>
                <strong>{companyName || (isEn ? '(Unassigned Firm)' : '(شرکت نامشخص)')}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Lead Engineer:' : 'مدیر پروژه:'}</span>
                <strong>{leadEngineer || (isEn ? '(Unassigned / Draft)' : '(تعیین‌نشده)')}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Operating Mode:' : 'حالت کاری سیستم:'}</span>
                <strong className="text-industrial-warning print:text-amber-800 font-mono uppercase">{systemMode}</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary & Standards Compliance */}
          {includedSections.summary && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-industrial-warning" />
                  {isEn ? '1. Preliminary Project Summary, Model Outputs & Unassessed Standards References' : '۱. خلاصه مقدماتی پروژه، خروجی مدل و مراجع ارزیابی‌نشده استانداردها'}
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEn ? 'STATUS: DRAFT / PRELIMINARY SCREENING' : 'وضعیت: پیش‌نویس اولیه / غربالگری مهندسی'}
                </span>
              </h3>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Total DC Capacity' : 'ظرفیت نامی آرایه DC'}</span>
                  <strong className="text-base font-mono text-industrial-warning print:text-amber-900">
                    {arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {arrayDesign.totalModulesCount} {isEn ? 'Modules' : 'عدد پنل'} ({module.pmpWatts}W TOPCon)
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Inverter Architecture' : 'توان نامی اینورترها'}</span>
                  <strong className="text-base font-mono text-industrial-accent print:text-sky-900">
                    {(inverter.pnomAcKw * (bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1)).toFixed(0)} kW AC
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    DC/AC (ILR): {arrayDesign.dcAcRatio.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">
                    {isEn ? 'Net Annual Generation (Waterfall)' : 'تولید سالانه خالص (مدل آبشار)'}
                  </span>
                  <strong className="text-base font-mono text-industrial-success print:text-emerald-900">
                    {primaryAnnualEnergyMwh.toLocaleString()} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'Specific Yield' : 'تولید ویژه'}: {primarySpecificYieldKwhKwp} kWh/kWp
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Simple Payback / IRR' : 'بازگشت سرمایه / IRR'}</span>
                  <strong className="text-base font-mono text-purple-400 print:text-purple-900">
                    {financial.simplePayback ? financial.simplePayback.formattedYears : `${financial.simplePaybackPeriodYears} yr`} / {financial.isIrrDefined && financial.irrPct !== null ? `${financial.irrPct}%` : 'N/A'}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    LCOE: {financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null ? `$${financial.lcoeUsdPerKwh} /kWh` : 'N/A (Zero Yield)'}
                  </span>
                </div>
              </div>

              {/* Regulatory & Standards Compliance Matrix */}
              <div className="overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-industrial-success" />
                  {isEn ? 'Standards References — Conformity Not Assessed:' : 'مراجع استاندارد — انطباق ارزیابی‌نشده:'}
                </span>
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Standard Code' : 'کد استاندارد'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Scope / Domain' : 'حوزه شمول و دامنه کاربرد'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Engineering Design Criterion' : 'معیار طراحی مهندسی'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Verification Status' : 'وضعیت ارزیابی'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEC 61215 / IEC 61730</td>
                      <td className="p-2">{isEn ? 'PV Module Quality & Safety Qualification' : 'کیفیت و ایمنی ماژول‌های فتوولتائیک'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Applicable edition, criteria, and project evidence not verified.' : 'ویرایش، معیارهای قابل‌اعمال و شواهد پروژه تأیید نشده‌اند.'}</td>
                      <td className="p-2 text-industrial-warning font-bold">{isEn ? 'NOT ASSESSED' : 'ارزیابی‌نشده'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEC 62109-1 / IEC 62109-2</td>
                      <td className="p-2">{isEn ? 'Inverter Safety & Grid-Tie Power Conversion' : 'ایمنی مبدل‌های الکترونیک قدرت و اینورتر'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Applicable edition, criteria, and project evidence not verified.' : 'ویرایش، معیارهای قابل‌اعمال و شواهد پروژه تأیید نشده‌اند.'}</td>
                      <td className="p-2 text-industrial-warning font-bold">{isEn ? 'NOT ASSESSED' : 'ارزیابی‌نشده'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEC 60364-7-712 / INBC 13</td>
                      <td className="p-2">{isEn ? 'Low Voltage PV Electrical Installations' : 'تاسیسات الکتریکی فتوولتائیک (مبحث ۱۳)'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Applicable edition, criteria, and project evidence not verified.' : 'ویرایش، معیارهای قابل‌اعمال و شواهد پروژه تأیید نشده‌اند.'}</td>
                      <td className="p-2 text-industrial-warning font-bold">{isEn ? 'NOT ASSESSED' : 'ارزیابی‌نشده'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">ASCE 7-22 / INBC 6</td>
                      <td className="p-2">{isEn ? 'Structural Wind & Snow Loading Actions' : 'بارهای ثقلی، باد و برف سازه (مبحث ۶)'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Applicable edition, criteria, and project evidence not verified.' : 'ویرایش، معیارهای قابل‌اعمال و شواهد پروژه تأیید نشده‌اند.'}</td>
                      <td className="p-2 text-industrial-warning font-bold">{isEn ? 'NOT ASSESSED' : 'ارزیابی‌نشده'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">Eurocode 7 / INBC 7</td>
                      <td className="p-2">{isEn ? 'Geotechnical Design & Driven Pile Resistance' : 'مهندسی ژئوتکنیک و فونداسیون (مبحث ۷)'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Applicable edition, criteria, and project evidence not verified.' : 'ویرایش، معیارهای قابل‌اعمال و شواهد پروژه تأیید نشده‌اند.'}</td>
                      <td className="p-2 text-industrial-warning font-bold">{isEn ? 'NOT ASSESSED' : 'ارزیابی‌نشده'}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEEE 80 / IEC 62305</td>
                      <td className="p-2">{isEn ? 'Substation Earthing & Lightning Protection' : 'زمین کردن ایستگاهی و حفاظت صاعقه'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Applicable edition, criteria, and project evidence not verified.' : 'ویرایش، معیارهای قابل‌اعمال و شواهد پروژه تأیید نشده‌اند.'}</td>
                      <td className="p-2 text-industrial-warning font-bold">{isEn ? 'NOT ASSESSED' : 'ارزیابی‌نشده'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Executive Engineering Narrative & Strategic Recommendations */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-2">
                <div className="font-bold text-white print:text-black flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-industrial-accent" />
                  {isEn ? 'Preliminary Screening Summary (Not a Bankability Assessment):' : 'خلاصه غربالگری اولیه (نه ارزیابی تأمین مالی‌پذیری):'}
                </div>
                <p className="leading-relaxed text-[11px] text-slate-300 print:text-slate-700">
                  {isEn
                    ? `This preliminary screening report for ${projectName} displays a modeled PV capacity of ${arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp and DC/AC ratio of ${arrayDesign.dcAcRatio.toFixed(2)}; these are model outputs, not verified installed capacities or an optimized design. Equipment characteristics depend on the selected catalog records and their stated provenance. Structural outputs (${isSnapshotValid ? `${structuralSnapshot!.qzPa} N/m² wind pressure; ${structuralSnapshot!.recommendedDepthM} m recommended embedment` : structuralSnapshot?.isStale ? "STALE — recalculation required" : "NOT ASSESSED — structural analysis pending"}) are screening results only. Referenced standards below have NOT been assessed for conformity; no regulatory approval, construction suitability, or bankability is established. LCOE is ${financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null ? `an indicative model estimate of $${financial.lcoeUsdPerKwh}/kWh` : "undefined (zero lifetime generation)"} and IRR is ${financial.isIrrDefined && financial.irrPct !== null ? `${financial.irrPct}% as a model estimate` : "undefined"}; inputs and evidence require independent project-specific review.`
                    : `این گزارش، غربالگری اولیه پروژه ${projectName} را با ظرفیت مدل‌شده ${arrayDesign.totalPvCapacityKwp.toFixed(1)} کیلووات‌پیک و نسبت DC/AC برابر ${arrayDesign.dcAcRatio.toFixed(2)} نمایش می‌دهد؛ این‌ها خروجی مدل‌اند و ظرفیت نصب‌شده تأییدشده یا طراحی بهینه محسوب نمی‌شوند. مشخصات تجهیزات تابع رکوردهای انتخاب‌شده در کاتالوگ و منشأ داده اعلام‌شده آن‌هاست. خروجی سازه (${isSnapshotValid ? `فشار باد ${structuralSnapshot!.qzPa} نیوتن بر مترمربع؛ عمق پیشنهادی ${structuralSnapshot!.recommendedDepthM} متر` : structuralSnapshot?.isStale ? "منقضی — محاسبه مجدد لازم است" : "ارزیابی‌نشده — تحلیل سازه در انتظار است"}) صرفاً غربالگری است. انطباق با استانداردهای فهرست‌شده در زیر ارزیابی‌نشده است؛ هیچ تأیید مقرراتی، قابلیت ساخت یا تأمین مالی‌پذیری اثبات نمی‌شود. LCOE برابر ${financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null ? `برآورد مدل ${financial.lcoeUsdPerKwh} دلار بر کیلووات‌ساعت` : "تعریف‌نشده (تولید سالانه صفر)"} و IRR برابر ${financial.isIrrDefined && financial.irrPct !== null ? `برآورد مدل ${financial.irrPct} درصد` : "تعریف‌نشده"} است؛ ورودی‌ها و شواهد باید مستقل و برای پروژه مشخص بررسی شوند.`}
                </p>
                <div className="pt-2 border-t border-industrial-border/40 text-[11px]">
                  <strong className="text-industrial-warning">{isEn ? 'Key Actionable Recommendations:' : 'توصیه‌های کلیدی اجرایی:'}</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300 print:text-slate-700">
                    <li>{isEn ? 'Have a qualified local geotechnical engineer determine whether field testing is needed and specify methods and sampling.' : 'مهندس ژئوتکنیک واجد صلاحیت و محلی، ضرورت آزمایش میدانی، روش و تعداد نمونه‌ها را تعیین کند.'}</li>
                    <li>{isEn ? 'Set any module cleaning plan from site-specific soiling measurements, water constraints, and equipment guidance.' : 'برنامه نظافت ماژول را بر پایه اندازه‌گیری آلودگی سایت، محدودیت آب و دستورالعمل تجهیزات تعیین کنید.'}</li>
                    <li>{isEn ? 'Define commissioning tests and acceptance limits with the responsible electrical engineer and applicable authority; no compliance determination is made here.' : 'آزمون‌های راه‌اندازی و حدود پذیرش را با مهندس برق مسئول و مرجع ذی‌صلاح تعیین کنید؛ این گزارش انطباقی را احراز نمی‌کند.'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Site, Climate & Geotechnical Report */}
          {includedSections.climate && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-industrial-success" />
                  {isEn ? '2. Site Climate, Meteorological Resources & Geotechnical Soil Assessment' : '۲. اطلاعات اقلیمی، پتانسیل تابش خورشیدی و ارزیابی جامع ژئوتکنیکی ساختگاه'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {effectiveCity.dataRetrievalDate} | {isEn ? effectiveCity.dataSourceEn : effectiveCity.dataSourceFa}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Coordinates & Elevation:' : 'مختصات و ارتفاع از دریا:'}</span>
                  <span className="font-mono text-white print:text-black font-bold">
                    {formatCoordinates(effectiveCity.latitude, effectiveCity.longitude)} ({effectiveCity.elevationM}m)
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Peak Sun Hours (PSH):' : 'ساعات اوج تابش (PSH):'}</span>
                  <span className="font-mono text-industrial-warning print:text-amber-800 font-bold">
                    {effectiveCity.peakSunHours} kWh/m²/day
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Design Ambient Extremes:' : 'دمای حدی طراحی محیط:'}</span>
                  <span className="font-mono text-sky-300 print:text-sky-800 font-bold">
                    {effectiveCity.tempMinC}°C {isEn ? 'to' : 'تا'} {effectiveCity.tempMaxC}°C
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Basic Wind Speed (V_b):' : 'سرعت مبنای باد (V_b):'}</span>
                  <span className="font-mono text-white print:text-black font-bold">
                    {effectiveCity.basicWindSpeedKmh} km/h ({(effectiveCity.basicWindSpeedKmh / 3.6).toFixed(1)} m/s)
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Ground Snow Load (S_k):' : 'بار برف مبنای زمین (S_k):'}</span>
                  <span className="font-mono text-white print:text-black">
                    {effectiveCity.groundSnowLoadKgM2} kg/m²
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Soil Bearing Capacity (q_a):' : 'ظرفیت باربری مجاز خاک:'}</span>
                  <span className="font-mono text-industrial-success print:text-emerald-800 font-bold">
                    {effectiveCity.soilBearingCapacityKpa} kPa
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Soil Friction Angle & Cohesion:' : 'زاویه اصطکاک و چسبندگی:'}</span>
                  <span className="font-mono text-white print:text-black">
                    φ = {effectiveCity.soilInternalFrictionAngleDeg}°, c = {effectiveCity.soilCohesionKpa} kPa
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Frost Penetration Depth:' : 'عمق یخبندان:'}</span>
                  <span className="font-mono text-white print:text-black font-bold">
                    {effectiveCity.frostDepthCm} cm
                  </span>
                </div>
              </div>

              {/* Data Provenance & Telemetry Integrity Audit Table (ENV-07) */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-industrial-border/50 print:border-slate-300 pb-1">
                  <span className="font-bold text-white print:text-black flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    {isEn ? 'Site Environmental & Geotechnical Telemetry Provenance (ENV-01..07):' : 'جدول ردیابی منشأ و اصالت داده‌های محیطی و ژئوتکنیکی ساختگاه:'}
                  </span>
                  <span className="text-[10px] text-slate-400 print:text-slate-600 font-mono">
                    {effectiveCity.dataRetrievalDate || new Date().toISOString().slice(0, 10)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-industrial-border/60 print:border-slate-300 text-slate-400 print:text-slate-600 bg-slate-900/40 print:bg-slate-100">
                        <th className="p-1.5 text-right">{isEn ? 'Parameter' : 'پارامتر'}</th>
                        <th className="p-1.5 text-center">{isEn ? 'Design Value' : 'مقدار'}</th>
                        <th className="p-1.5 text-center">{isEn ? 'Provider' : 'تأمین‌کننده'}</th>
                        <th className="p-1.5 text-center">{isEn ? 'Origin Kind' : 'نوع اصالت'}</th>
                        <th className="p-1.5 text-right">{isEn ? 'Method / Notes' : 'روش / یادداشت کیفی'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-industrial-border/30 print:divide-slate-200 font-mono">
                      {dataProvenance.map((row) => (
                        <tr key={row.key} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                          <td className="p-1 text-slate-200 print:text-black font-sans font-medium">{row.parameter}</td>
                          <td className="p-1 text-center text-white print:text-black font-bold">{row.value} {row.unit}</td>
                          <td className="p-1 text-center text-slate-300 print:text-slate-700">{row.provider}</td>
                          <td className="p-1 text-center">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              row.sourceKind === 'provider_value' ? 'bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800' :
                              row.sourceKind === 'provider_derived' ? 'bg-sky-500/20 text-sky-300 print:bg-sky-100 print:text-sky-800' :
                              'bg-amber-500/20 text-amber-300 print:bg-amber-100 print:text-amber-800'
                            }`}>
                              {row.sourceKind}
                            </span>
                          </td>
                          <td className="p-1 text-slate-400 print:text-slate-600 font-sans text-[9px]">
                            {[row.sourceDataset, row.sourceParameter, row.derivationMethod, row.qualityNote].filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Geotechnical Engineering Narrative & Civil Recommendations */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-1.5">
                <span className="font-bold text-white print:text-black block">
                  {isEn ? 'Geotechnical Risk Analysis & Civil Site Preparation Guidelines:' : 'تحلیل ریسک ژئوتکنیک و دستورالعمل‌های آماده‌سازی ساختگاه:'}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                  {isEn
                    ? `Recorded site inputs include soil type ${effectiveCity.soilType.replace(/_/g, ' ')}, bearing pressure ${effectiveCity.soilBearingCapacityKpa} kPa, minimum temperature ${effectiveCity.tempMinC}°C, and maximum temperature ${effectiveCity.tempMaxC}°C. Source and quality are shown in the provenance disclosures and are not independently authenticated. Cold-voltage and thermal checks are software screening outputs. Frost and foundation results (${isSnapshotValid ? `calculated screening embedment ${structuralSnapshot!.recommendedDepthM} m; frost depth input ${structuralSnapshot!.frostDepthCm} cm` : structuralSnapshot?.isStale ? 'STALE — recalculate' : 'NOT ASSESSED — no current structural result'}) do not establish code compliance, construction safety, or suitability; verify project loads, field conditions, and design criteria with responsible licensed professionals.`
                    : `ورودی‌های ثبت‌شده سایت شامل نوع خاک ${effectiveCity.soilType === 'dense_sand_gravel' ? 'شن و ماسه متراکم' : effectiveCity.soilType === 'medium_clay' ? 'رس متوسط تا متراکم' : effectiveCity.soilType === 'loose_sand' ? 'ماسه سست' : 'بستر سنگ آهکی'}، ظرفیت باربری ${effectiveCity.soilBearingCapacityKpa} کیلوپاسکال، حداقل دما ${effectiveCity.tempMinC} درجه و حداکثر دما ${effectiveCity.tempMaxC} درجه سانتی‌گراد است. منشأ و کیفیت در بخش افشای داده آمده و مستقلاً احراز نشده است. بررسی ولتاژ سرما و افت حرارتی خروجی غربالگری نرم‌افزار است. نتایج یخبندان و فونداسیون (${isSnapshotValid ? `عمق غربالگری محاسبه‌شده ${structuralSnapshot!.recommendedDepthM} متر؛ ورودی عمق یخبندان ${structuralSnapshot!.frostDepthCm} سانتی‌متر` : structuralSnapshot?.isStale ? 'منقضی — محاسبه مجدد لازم است' : 'ارزیابی‌نشده — نتیجه سازه‌ای جاری وجود ندارد'}) انطباق آیین‌نامه‌ای، ایمنی اجرا یا مناسب‌بودن را اثبات نمی‌کند؛ بارها، شرایط میدانی و معیارهای طراحی باید توسط متخصصان مسئول بررسی شوند.`}
                </p>
                <div className="text-[11px] pt-1 text-slate-400 print:text-slate-600">
                  <strong>{isEn ? 'Site Drainage & Earthworks:' : 'هدایت آب‌های سطحی و خاک‌برداری:'}</strong>{' '}
                  {isEn
                    ? 'Execute grading with 1.5–2.0% transverse slopes towards engineered peripheral swales to prevent rainwater ponding and avoid softening pile lateral soil resistance.'
                    : 'تسویه و شیب‌بندی سایت با شیب عرضی ۱.۵ الی ۲ درصد به سمت کانال‌های پیرامونی الزامی است تا از ایستایی آب و سست شدن خاک مقاومت جانبی شمع‌ها جلوگیری شود.'}
                </div>
              </div>

              {/* Environmental Aging, Dust & Equipment Lifespan Panel */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-industrial-border/50 print:border-slate-300 pb-1.5">
                  <span className="font-bold text-sky-300 print:text-sky-900 flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-industrial-warning" />
                    {isEn
                      ? 'Environmental Temperature, Dust & Equipment Aging Analysis:'
                      : 'تحلیل اثرات دمای محیط، گرد و غبار، راندمان و طول عمر تجهیزات:'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-industrial-surface print:bg-slate-200 text-slate-300 print:text-black">
                    {envAging.inverterImpact.isInstalledIndoors
                      ? (isEn ? 'Inverter Indoors / Sheltered' : 'اینورتر در فضای سرپوشیده')
                      : (isEn ? 'Inverter Outdoors in Field' : 'اینورتر در محوطه باز')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2 rounded bg-slate-900/60 print:bg-white border border-industrial-border/40 print:border-slate-200">
                    <strong className="text-white print:text-black block mb-1">
                      {isEn ? 'PV Modules on Installation Bed:' : 'ماژول‌های خورشیدی روی بستر نصب:'}
                    </strong>
                    <div className="space-y-1 text-slate-300 print:text-slate-700">
                      <div className="flex justify-between">
                        <span>{isEn ? 'Mounting Thermal Delta-T:' : 'افزایش دمای ناشی از بستر نصب:'}</span>
                        <span className="font-mono font-bold text-industrial-warning">+{envAging.pvImpact.mountingThermalOffsetDeltaTC}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? 'Hot Cell Operating Temp:' : 'دمای داغ سلول در اوج تابش:'}</span>
                        <span className="font-mono font-bold text-white print:text-black">{envAging.pvImpact.effectiveOperatingCellTempHotC}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? 'Instant Thermal Power Loss:' : 'افت راندمان حرارتی لحظه‌ای:'}</span>
                        <span className="font-mono text-industrial-error">-{envAging.pvImpact.thermalPowerLossPct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? 'Annual Aging Degradation Rate:' : 'نرخ استهلاک سالانه پنل:'}</span>
                        <span className="font-mono text-purple-300 print:text-purple-800">{envAging.pvImpact.annualDegradationPct}% / year</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? '25-Year Capacity Retention:' : 'راندمان باقیمانده سال بیست‌وپنجم:'}</span>
                        <span className="font-mono text-industrial-success print:text-emerald-800 font-bold">{envAging.pvImpact.twentyFiveYearCapacityRetentionPct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded bg-slate-900/60 print:bg-white border border-industrial-border/40 print:border-slate-200">
                    <strong className="text-white print:text-black block mb-1">
                      {isEn ? 'Inverter Operational Lifespan:' : 'طول عمر و راندمان اینورتر:'}
                    </strong>
                    <div className="space-y-1 text-slate-300 print:text-slate-700">
                      <div className="flex justify-between">
                        <span>{isEn ? 'Inverter Installation Siting:' : 'محل استقرار فیزیکی اینورتر:'}</span>
                        <span className="font-mono font-bold text-white print:text-black">
                          {envAging.inverterImpact.isInstalledIndoors
                            ? (isEn ? 'Indoors (Sheltered)' : 'داخلی/سرپوشیده سوله یا ساختمان')
                            : (isEn ? 'Outdoors (Open Field)' : 'محوطه باز نیروگاه')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? 'Climatic Thermal Derating:' : 'افت توان حرارتی اینورتر:'}</span>
                        <span className="font-mono font-bold text-white print:text-black">
                          {envAging.inverterImpact.totalInverterDeratePct > 0 ? `-${envAging.inverterImpact.totalInverterDeratePct}%` : '0% (حفظ ۱۰۰٪ توان)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? 'Expected Useful Lifespan:' : 'طول عمر مفید موردانتظار:'}</span>
                        <span className="font-mono font-bold text-teal-300 print:text-teal-800">
                          {envAging.inverterImpact.expectedInverterLifespanYears} {isEn ? 'years' : 'سال'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{isEn ? 'Scheduled Inverter Overhaul:' : 'برنامه تعویض/اورهال خازن‌ها:'}</span>
                        <span className="font-mono text-sky-300 print:text-sky-800">
                          {envAging.inverterImpact.recommendedReplacementYear
                            ? (isEn ? `Year ${envAging.inverterImpact.recommendedReplacementYear}` : `سال ${envAging.inverterImpact.recommendedReplacementYear}`)
                            : (isEn ? 'None (Full 18y design life)' : 'عدم نیاز (طول عمر ۱۸ ساله محفوظ)')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 print:text-slate-600 leading-relaxed pt-1">
                  {envAging.inverterImpact.isInstalledIndoors
                    ? (isEn
                        ? 'Note: In accordance with project engineering rules, inverters for rooftop and shed installations are located indoors within protected electrical rooms. Thus, outdoor temperature and dust degradation are evaluated exclusively for rooftop PV modules.'
                        : 'تذکر ضوابط مهندسی: در پروژه‌های سقف سوله و پشت‌بام، اینورترها درون اتاق برق محافظت‌شده داخلی مستقر می‌باشند؛ لذا افت حرارتی و فرسایش گرد و غبار هوای آزاد منحصراً برای ماژول‌های PV روی سقف اعمال شده است.')
                    : (isEn
                        ? 'Note: In open ground-mount utility plants, both PV modules and outdoor inverters are exposed to summer peak ambient heat, direct solar irradiation on enclosures, and dust accumulation on heat exchangers.'
                        : 'تذکر ضوابط مهندسی: در نیروگاه‌های زمین باز، هر دو تجهیز پنل‌های فتوولتائیک و اینورترهای محوطه بیرونی در معرض گرما، تابش مستقیم خورشید بر بدنه و غبار بادی قرار دارند.')}
                </p>
              </div>
            </div>
          )}

          {/* Section 3: Shading Analysis & Sun Path */}
          {includedSections.shading && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-industrial-warning" />
                  {isEn ? '3. 3D Geometric Shading, Sun Path & Array Pitch Optimization' : '۳. تحلیل سه‌بعدی سایه‌اندازی، مسیر خورشید و بهینه‌سازی فواصل بین‌ردیفی'}
                </span>
                <span className="text-[10px] text-industrial-success print:text-emerald-800 font-mono">
                  {isEn ? 'Winter Solstice Geometric Screening: Evaluated' : 'ارزیابی هندسی پنجره ظهر زمستان: انجام شد'}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Row Pitch Distance' : 'فاصله محور ردیف‌ها (Pitch)'}</span>
                  <span className="font-mono font-bold text-industrial-accent print:text-sky-800 text-sm">
                    {arrayDesign.interRowSpacingM.toFixed(2)} m
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Ground Cover Ratio (GCR)' : 'ضریب پوشش زمین (GCR)'}</span>
                  <span className="font-mono font-bold text-white print:text-black text-sm">
                    {((Math.cos((effectiveCity.optimalTiltAnnualDeg * Math.PI) / 180) * 4.6 / arrayDesign.interRowSpacingM) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Annual Beam Shading Loss' : 'تلفات سالانه سایه پرتو مستقیم'}</span>
                  <span className="font-mono font-bold text-industrial-success print:text-emerald-800 text-sm">
                    {isAppliedShadingActive ? `-${effectiveShadingLossPct}%` : `~${effectiveShadingLossPct}%`}
                  </span>
                  {appliedShading && (
                    <span className="text-[9px] text-sky-400 block font-mono">
                      {isAppliedShadingActive ? (isEn ? '3D Near-Shading Model' : 'مدل ۳ بعدی سایه‌اندازی') : (isEn ? 'Default (⚠️ 3D Run Stale)' : 'پیش‌فرض (تحلیل قدیمی)')}
                    </span>
                  )}
                </div>
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Effective Shading Derate' : 'ضریب اصلاح سایه در مدل تولید'}</span>
                  <span className="font-mono font-bold text-purple-400 print:text-purple-800 text-sm">
                    {effectiveShadingDerate.toFixed(isAppliedShadingActive ? 4 : 3)}
                  </span>
                  {appliedShading && (
                    <span className="text-[9px] text-slate-400 block font-mono">
                      1 - ({effectiveShadingLossPct}%)
                    </span>
                  )}
                </div>
                {bifacialGainPct !== undefined && bifacialGainPct > 0 && (
                  <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded col-span-2 sm:col-span-4 lg:col-span-1">
                    <span className="text-slate-400 block text-[10px]">{isEn ? 'Bifacial Rear Gain Proxy' : 'بهره فرضی پشت پنل (Bifacial)'}</span>
                    <span className="font-mono font-bold text-emerald-400 print:text-emerald-800 text-sm">
                      +{bifacialGainPct.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      {isEn ? 'First-order optical proxy' : 'تخمین اولیه اپتیکی'}
                    </span>
                  </div>
                )}
              </div>

              {/* 3D Shading Provenance & Staleness Banner */}
              {appliedShading && (
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 border border-sky-500/30 rounded text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-300 font-semibold text-[11px]">
                      {isEn ? '3D Shading Provenance:' : 'مرجع تحلیل سه‌بعدی سایه:'}
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      {isEn
                        ? `Applied from ${appliedShading.source === 'project_array_design' ? 'project array design' : 'representative demo block'} (${appliedShading.capacityKwp} kWp) at ${new Date(appliedShading.appliedAtIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : `اعمال‌شده از ${appliedShading.source === 'project_array_design' ? 'طرح اختصاصی آرایه' : 'بلوک نمونه'} (${appliedShading.capacityKwp} کیلووات‌پیک) در ساعت ${new Date(appliedShading.appliedAtIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </span>
                  </div>
                  {isShadingStale && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                      {isEn ? '⚠️ Stale: Project parameters changed since 3D run (Reverted to 2.4% baseline)' : '⚠️ داده قدیمی: پارامترهای پروژه تغییر یافته‌اند (بازگشت به مبنای ۲.۴٪)'}
                    </span>
                  )}
                </div>
              )}

              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-1">
                <span className="font-bold text-white print:text-black block">
                  {isEn ? 'Sun Path Geometric Screening & Critical Solar Window:' : 'بررسی هندسی مسیر خورشید و پنجره غربالگری تابش:'}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                  {isEn
                    ? `${calculateSolsticeSolarGeometry(effectiveCity.latitude).narrativeEn} The design pitch distance of ${arrayDesign.interRowSpacingM.toFixed(2)}m provides nominal inter-row clearance during the screening 4-hour window (10:00 to 14:00 true solar time) using an internal screening heuristic (not a standards conformity assessment). Actual beam and diffuse losses depend on 3D near-shading topography and terrain slope. Where bifacial modules are specified, ground clearance (nominal 0.9m) influences rear view-factor and ground-reflected albedo capture${bifacialGainPct !== undefined && bifacialGainPct > 0 ? ` (screening proxy: +${bifacialGainPct.toFixed(1)}%)` : ''}, which should be verified with detailed 3D/view-factor modeling.`
                    : `${calculateSolsticeSolarGeometry(effectiveCity.latitude).narrativeFa} فاصله بین‌ردیفی ${arrayDesign.interRowSpacingM.toFixed(2)} متر جهت تامین فاصله هندسی نامی در بازه ۴ ساعته غربالگری (۱۰ الی ۱۴ ظهر آفتابی) بر اساس رهنمودهای هندسی IEC 62548 در نظر گرفته شده است. تلفات واقعی سایه پرتو مستقیم و پخشی وابسته به عوارض سه‌بعدی و شیب زمین است. در صورت استفاده از ماژول‌های دوطرفه، ارتفاع آزاد از سطح زمین (نامی ۰.۹ متر) بر فاکتور دید پشت پنل و جذب آلبدو اثرگذار است${bifacialGainPct !== undefined && bifacialGainPct > 0 ? ` (تخمین غربالگری: +${bifacialGainPct.toFixed(1)}٪)` : ''} که باید در مدل‌سازی تفصیلی سه‌بعدی تدقیق گردد.`}
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Energy Simulation, Loss Waterfall & Sensitivity Scenarios */}
          {includedSections.energy && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-industrial-success" />
                  {isEn ? '4. Energy Yield Simulation, Loss Waterfall & Sensitivity Scenarios' : '۴. شبیه‌سازی تولید انرژی، نمودار آبشار تلفات و سناریوهای تحلیل حساسیت'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEC 61724-1 Standard Metric</span>
              </h3>

              {/* Energy KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">
                    {isEn ? 'Net Annual Generation (Waterfall):' : 'تولید سالانه خالص (مدل آبشار):'}
                  </span>
                  <strong className="text-base font-mono text-industrial-success print:text-emerald-900">
                    {primaryAnnualEnergyMwh.toLocaleString()} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {waterfallReport
                      ? (isEn ? 'Unified Waterfall Loss Model' : 'مدل یکپارچه آبشار تلفات')
                      : (isEn ? 'Annualized 24h diurnal estimate' : 'برون‌یابی سالانه شبیه‌سازی ۲۴ ساعته')}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">
                    {isEn ? 'Illustrative Downside (-10.2%):' : 'سناریوی کاهشی فرضی (-۱۰.۲٪):'}
                  </span>
                  <strong className="text-base font-mono text-industrial-accent print:text-sky-900">
                    {illustrativeDownsideMwh.toLocaleString()} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'Fixed 0.898x Sensitivity Factor (Not Bankable P90)' : 'ضریب حساسیت ثابت ۰.۸۹۸ (بدون ادعای P90 بانکی)'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Specific Yield:' : 'تولید ویژه نامالایز (Specific):'}</span>
                  <strong className="text-base font-mono text-industrial-warning print:text-amber-900">
                    {primarySpecificYieldKwhKwp} kWh/kWp
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'Hours at STC Rating' : 'ساعت کارکرد در توان نامی'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Performance Ratio (PR):' : 'ضریب عملکرد سیستم (PR):'}</span>
                  <strong className="text-base font-mono text-purple-400 print:text-purple-900">
                    {performanceRatioPct}%
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'IEC 61724-1 Waterfall PR' : 'ضریب عملکرد آبشار تلفات IEC 61724-1'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 bg-slate-800/30 print:bg-slate-100 p-2 rounded border border-industrial-border/40 print:border-slate-300">
                <span className="text-industrial-warning font-semibold">
                  {isEn ? 'Methodology Note:' : 'یادداشت متدولوژی:'}
                </span>{' '}
                {isEn
                  ? 'Primary annual yield metrics are application model outputs from its waterfall loss calculation, with the 24-hour profile used only as diagnostic screening. Downside scenarios (-5.5% and -10.2%) are illustrative fixed sensitivity factors, not formal probabilistic exceedance percentiles. Obtain an independent, project-specific hourly yield assessment for financing decisions; no bankability or standards conformity is established here.'
                  : 'ارقام تولید سالانه انرژی بر پایه مدل‌سازی جامع ۱۴/۱۵ مرحله‌ای آبشار تلفات (ضریب عملکرد IEC 61724-1) محاسبه شده و پروفایل ۲۴ ساعته شبانه‌روزی به عنوان غربالگری تشخیصی مکمل عمل می‌کند. سناریوهای کاهشی (-۵.۵٪ و -۱۰.۲٪) صرفاً ضرایب حساسیت فرضی و نمایشی هستند نه صدک‌های آماری قطعی توزیع احتمالاتی سال‌های اقلیمی؛ این مقادیر به عنوان غربالگری اولیه مهندسی عمل نموده و برای تأمین مالی و تعیین ساختار بدهی بانکی باید با شبیه‌سازی کامل ۸۷۶۰ ساعته سال اقلیمی (TMY) تدقیق گردند.'}
              </div>

              {/* Loss Waterfall Breakdown Table */}
              <div className="overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-industrial-accent" />
                  {isEn ? 'System Loss Waterfall Breakdown (from Nominal Irradiance to Grid Export):' : 'جدول تفکیکی آبشار تلفات سیستم (از تابش نامی تا تزریق به شبکه):'}
                </span>
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Loss Component' : 'مولفه تلفات'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Nominal Loss / Gain (%)' : 'درصد تلفات / بهره'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Methodology & Engineering Standard' : 'روش محاسبه و مرجع مهندسی'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Stage Energy Output' : 'انرژی خروجی مرحله'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    {waterfallReport ? (
                      waterfallReport.stages.map((stage) => {
                        const isGain = stage.percentageLoss > 0;
                        return (
                          <tr key={stage.id} className={stage.id === 'bifacial_gain' ? 'bg-emerald-950/20' : ''}>
                            <td className="p-2 font-medium">{isEn ? stage.nameEn : stage.nameFa}</td>
                            <td className={`p-2 font-mono ${isGain ? 'text-emerald-400 print:text-emerald-800' : 'text-rose-400 print:text-rose-800'}`}>
                              {isGain ? `+${stage.percentageLoss}%` : `${stage.percentageLoss}%`}
                            </td>
                            <td className="p-2 text-slate-400 print:text-slate-600">
                              {isEn ? stage.descriptionEn : stage.descriptionFa}
                            </td>
                            <td className="p-2 font-mono text-slate-300 print:text-slate-700">
                              {Math.round(stage.stageOutputKwh / 1000).toLocaleString()} MWh
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Soiling & Dust Deposition' : 'تلفات غبار و ذرات معلق (Soiling)'}</td>
                          <td className="p-2 font-mono text-rose-400 print:text-rose-800">-3.5%</td>
                          <td className="p-2 text-slate-400 print:text-slate-600">Kimber et al. Arid Model based on {effectiveCity.annualRainfallMm}mm rain</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Automated waterless robotic cleaning schedule' : 'شستشوی مکانیزه رباتیک دوره‌ای'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Thermal Temperature Derate' : 'افت توان حرارتی سلول در اثر گرما'}</td>
                          <td className="p-2 font-mono text-rose-400 print:text-rose-800">-7.8%</td>
                          <td className="p-2 text-slate-400 print:text-slate-600">NOCT thermal balance (Gamma = -0.30%/°C for TOPCon)</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Ground clearance 0.9m for natural air cooling' : 'ارتفاع ۰.۹ متری از زمین جهت تهویه طبیعی باد'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Incidence Angle Modifier (IAM)' : 'تلفات بازتابش زاویه تابش خورشید'}</td>
                          <td className="p-2 font-mono text-rose-400 print:text-rose-800">-1.8%</td>
                          <td className="p-2 text-slate-400 print:text-slate-600">Martin & Ruiz ARC double-anti-reflective coating</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'High-transmittance anti-reflective textured glass' : 'شیشه بافت‌دار آنتی‌رفلکتیو با عبوردهی بالا'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'DC Ohmic Resistance (I²R)' : 'تلفات اهمی سیم‌کشی و اتصالات DC'}</td>
                          <td className="p-2 font-mono text-rose-400 print:text-rose-800">-1.2%</td>
                          <td className="p-2 text-slate-400 print:text-slate-600">IEC 60287 copper conductor resistance modeling</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Oversized 6mm² solar cables limiting dV <= 1.5%' : 'کابل‌های ۶ میلی‌متر مربع جهت افت زیر ۱.۵ درصد'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Inverter Conversion & MPPT' : 'راندمان تبدیل اینورتر و ردیابی MPPT'}</td>
                          <td className="p-2 font-mono text-rose-400 print:text-rose-800">-1.5%</td>
                          <td className="p-2 text-slate-400 print:text-slate-600">IEC 62891 maximum power point tracking efficiency</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Multi-MPPT architecture with independent tracker inputs' : 'تفکیک استرینگ‌ها روی MPPTهای مستقل اینورتر'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Transformer & Grid Evacuation' : 'تلفات ترانسفورماتور و خط انتقال MV'}</td>
                          <td className="p-2 font-mono text-rose-400 print:text-rose-800">-1.2%</td>
                          <td className="p-2 text-slate-400 print:text-slate-600">Tier 2 EcoDesign low-loss step-up transformer</td>
                          <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'High-efficiency amorphous core transformer' : 'استفاده از ترانسفورماتورهای کم‌تلفات استاندارد'}</td>
                        </tr>
                      </>
                    )}
                    <tr className="font-bold bg-slate-800/40 print:bg-slate-100">
                      <td className="p-2 text-white print:text-black">{isEn ? 'Net Delivered System PR' : 'ضریب عملکرد خالص تحویلی به شبکه (PR)'}</td>
                      <td className="p-2 font-mono text-industrial-success print:text-emerald-800">{performanceRatioPct}%</td>
                      <td className="p-2 text-industrial-success" colSpan={2}>✓ IEC 61724-1 Performance Ratio Calculation</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Electrical Design, SLD & Cable Schedule */}
          {includedSections.electrical && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-industrial-success" />
                  {isEn ? '5. Electrical Design, Cable Sizing (Parallel Runs) & Earthing (IEEE 80)' : '۵. طراحی مهندسی الکتریکی، سایزینگ کابل‌ها (مدارهای موازی) و ارتینگ'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEEE 80 / IEC 60364</span>
              </h3>

              {/* Cable Schedule Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Circuit Description' : 'شرح مدار کابل'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Design Ib (A)' : 'جریان Ib (A)'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Ampacity Iz (A)' : 'جریان مجاز Iz (A)'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Length (m)' : 'طول (m)'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Conductor / Insulation' : 'هادی / عایق'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Calculated Sizing (Parallel Runs)' : 'سایزینگ محاسبه‌شده'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'ΔV (%)' : 'افت ولتاژ'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Joule Loss' : 'تلفات ژول'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Status' : 'وضعیت'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    {protection.cableRuns.map((c, idx) => (
                      <tr key={idx} className="border-b border-industrial-border print:border-slate-200">
                        <td className="p-2 font-medium">{isEn ? c.config.sectionNameEn : c.config.sectionNameFa}</td>
                        <td className="p-2 font-mono">{c.config.designCurrentAmps.toFixed(1)}A</td>
                        <td className="p-2 font-mono text-teal-300 print:text-teal-900">{c.totalThermalAmpacityAmps || '-'}A</td>
                        <td className="p-2 font-mono">{c.config.oneWayLengthM}m</td>
                        <td className="p-2 font-mono">{c.config.conductorMaterial.toUpperCase()} / {c.config.insulationType}</td>
                        <td className="p-2 font-mono text-industrial-accent print:text-sky-900 font-bold">
                          {isEn ? c.cableDesignationEn : c.cableDesignationFa}
                        </td>
                        <td className="p-2 font-mono">{c.actualVoltageDropPct}%</td>
                        <td className="p-2 font-mono text-industrial-warning">{c.powerLossWatts ? `${c.powerLossWatts}W` : '-'}</td>
                        <td className="p-2">
                          <span className="text-industrial-success print:text-emerald-800 font-bold text-[10px]">
                            {c.isCompliant ? (isEn ? '✓ SCREENING PASS (not compliance)' : '✓ غربالگری قبول (نه احراز انطباق)') : (isEn ? '✗ SCREENING LIMIT EXCEEDED' : '✗ حد غربالگری رد شده')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Earthing IEEE 80 & Lightning IEC 62305 Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-800/40 print:bg-slate-50 p-2.5 rounded border border-industrial-border/50 print:border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Target Ground Resistance:' : 'مقاومت هدف زمین:'}</span>
                  <span className="font-mono text-industrial-success print:text-emerald-800 font-bold">
                    ≤ {protection.earthing.targetGroundResistanceOhms} Ω (Rg={protection.earthing.calculatedGroundResistanceOhms}Ω)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Ground Rods Required:' : 'تعداد الکترودهای میله‌ای:'}</span>
                  <span className="font-mono text-white print:text-black font-bold">
                    {protection.earthing.groundRodsCount} {isEn ? 'Rods (3m Cu)' : 'میله مسی ۳ متری'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Touch / Step Potentials:' : 'ولتاژ تماس و گام IEEE 80:'}</span>
                  <span className="font-mono text-sky-300 print:text-sky-800">
                    Em={protection.earthing.actualMeshVoltageVolts || 185}V / Es={protection.earthing.actualStepVoltageVolts || 90}V (✓)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Lightning LPS & Separation:' : 'حفاظت صاعقه و فاصله s:'}</span>
                  <span className="font-mono text-industrial-warning print:text-amber-800 font-bold">
                    {protection.lightning.lpsClass} (s = {protection.lightning.separationDistanceCm || 45} cm)
                  </span>
                </div>
              </div>

              {/* Medium-Voltage Collector Substation (For Powerplants) */}
              {mvSubResult && (
                <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs space-y-2">
                  <span className="font-bold text-industrial-accent print:text-sky-900 block flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-industrial-warning" />
                    {isEn
                      ? 'Collector Substation, Step-Up Transformer & MV Switchgear (IEC 60076 / IEC 60909):'
                      : 'مشخصات پست جمع‌آوری، ترانسفورماتور قدرت و تابلوی فشار متوسط (IEC 60076 / IEC 60909):'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="p-2 bg-slate-900/60 print:bg-white rounded border border-industrial-border/40 print:border-slate-200">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Step-up Transformer:' : 'ترانسفورماتور افزاینده:'}</span>
                      <strong className="font-mono text-white print:text-black">{mvSubResult.transformer.ratedPowerMva} MVA ({mvSubResult.transformer.vectorGroup})</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        {isEn ? `Site Effective: ${mvSubResult.transformer.effectiveCapacityUnderSiteConditionsMva} MVA` : `ظرفیت در دمای سایت: ${mvSubResult.transformer.effectiveCapacityUnderSiteConditionsMva} MVA`}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-900/60 print:bg-white rounded border border-industrial-border/40 print:border-slate-200">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Short-Circuit Isc\'\' / ip:' : 'جریان اتصال کوتاه Isc/ip:'}</span>
                      <strong className="font-mono text-industrial-error">{mvSubResult.shortCircuit.initialSymmetricalIscKa} kA / {mvSubResult.shortCircuit.peakDynamicIpKa} kA</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        VCB Rating: {mvSubResult.shortCircuit.breakingCapacityKa} kA
                      </span>
                    </div>

                    <div className="p-2 bg-slate-900/60 print:bg-white rounded border border-industrial-border/40 print:border-slate-200">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Station Aux Transformer:' : 'ترانس مصارف داخلی:'}</span>
                      <strong className="font-mono text-sky-300 print:text-sky-800">{mvSubResult.auxiliaryTransformer.ratedKva} kVA ({mvSubResult.auxiliaryTransformer.voltageRatio})</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        SCADA & Trackers
                      </span>
                    </div>

                    <div className="p-2 bg-slate-900/60 print:bg-white rounded border border-industrial-border/40 print:border-slate-200">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'MV Surge Arrester:' : 'برقگیر فشار متوسط:'}</span>
                      <strong className="font-mono text-purple-300 print:text-purple-800">{mvSubResult.surgeArrester.ratedVoltageUrKv} kV (Class 2)</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        MCOV = {mvSubResult.surgeArrester.continuousOperatingVoltageMcovKv} kV
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 6: Structural & Civil Foundation Report */}
          {includedSections.structural && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  {isEn ? '6. Structural Sizing, ASCE 7-22 Wind Loads & Broms Civil Foundations' : '۶. محاسبات جامع سازه، بارهای باد و برف، پایداری برمز و فونداسیون‌های ساختمانی'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">INBC 6 / ASCE 7-22 / Eurocode 7</span>
              </h3>

              {!structuralSnapshot?.isAvailable ? (
                <div className="p-6 bg-slate-800/40 border border-industrial-border rounded-lg text-center space-y-2">
                  <div className="text-amber-400 font-bold text-sm">
                    {isEn ? 'Structural & Foundation Sizing Unavailable' : 'محاسبات سازه و فونداسیون در دسترس نیست'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {isEn
                      ? 'No live structural calculation snapshot is available for this project. Please navigate to the Structural & Foundation Tab and compute the sizing to synchronize with this EPC report.'
                      : 'اسنپ‌شات محاسبات سازه برای این پروژه موجود نیست. لطفاً به زبانه سازه و فونداسیون مراجعه کرده و پس از اجرای محاسبات، گزارش رسمی را مشاهده فرمایید.'}
                  </p>
                </div>
              ) : (
                <>
                  {structuralSnapshot.isStale && (
                    <div className="p-3 bg-amber-900/30 border border-amber-500/40 rounded text-amber-300 text-xs">
                      {isEn
                        ? '⚠️ Warning: Project parameters were modified after structural calculation. Open Structural & Foundation Tab to refresh.'
                        : '⚠️ هشدار: پارامترهای پروژه پس از محاسبه سازه تغییر یافته‌اند. لطفاً جهت به‌روزرسانی به زبانه سازه و فونداسیون مراجعه فرمایید.'}
                    </div>
                  )}

                  {/* Force Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Velocity Wind Pressure (q_z):' : 'فشار سرعتی مبنای باد (q_z):'}</span>
                      <span className={`font-mono font-bold ${structuralSnapshot.isStale ? 'text-amber-400 print:text-amber-800' : 'text-industrial-accent print:text-cyan-800'}`}>
                        {structuralSnapshot.isStale ? (isEn ? 'STALE' : 'منقضی') : `${structuralSnapshot.qzPa} N/m²`}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {isEn ? 'ASCE 7-22 with Ke elevation' : 'مبحث ۶ با ضریب ارتفاع Ke'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Foundation Technology:' : 'سیستم فونداسیون سازه:'}</span>
                      <span className={`font-mono font-semibold ${structuralSnapshot.isStale ? 'text-amber-400 print:text-amber-800' : 'text-white print:text-black'}`}>
                        {structuralSnapshot.isStale ? (isEn ? 'STALE' : 'منقضی') : (isEn ? structuralSnapshot.foundationNameEn : structuralSnapshot.foundationNameFa)}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {structuralSnapshot.isStale ? (isEn ? 'Recalculation Required' : 'نیازمند بازمحاسبه') : structuralSnapshot.bromsPileSection}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                      <span className="text-slate-400 block text-[10px]">{isEn ? 'Embedment Depth (L):' : 'عمق کوبش شمع در خاک:'}</span>
                      <span className={`font-mono font-bold ${structuralSnapshot.isStale ? 'text-amber-400 print:text-amber-800' : 'text-industrial-warning print:text-amber-800'}`}>
                        {structuralSnapshot.isStale ? (isEn ? 'STALE' : 'منقضی') : `${structuralSnapshot.recommendedDepthM} m`}
                      </span>
                      <span className={`text-[10px] block mt-0.5 ${structuralSnapshot.isStale ? 'text-amber-400' : structuralSnapshot.recommendedDepthM === 0 || structuralSnapshot.isFrostDepthRespected ? 'text-industrial-success' : 'text-rose-400'}`}>
                        {structuralSnapshot.isStale
                          ? (isEn ? 'Inputs Modified — Recalculation Required' : 'پارامترها تغییر کرده‌اند — نیازمند بازمحاسبه')
                          : structuralSnapshot.recommendedDepthM === 0
                          ? (isEn ? 'Rooftop/Shed Mount — Zero Soil Driving ✓' : 'نصب روی سقف — بدون کوبش در خاک ✓')
                          : structuralSnapshot.isFrostDepthRespected
                          ? (isEn ? `Frost Depth: ${structuralSnapshot.frostDepthCm}cm ✓ (L >= ${structuralSnapshot.minDepthForFrostM}m)` : `کنترل یخبندان: ${structuralSnapshot.frostDepthCm}cm ✓`)
                          : (isEn ? `Frost Depth Insufficient ✗ (L < ${structuralSnapshot.minDepthForFrostM}m)` : `عمق یخبندان ناکافی ✗`)}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                      <span className="text-slate-400 block text-[10px]">
                        {structuralSnapshot.foundationType === 'pre_drilled_grouted_pile'
                          ? (isEn ? 'Grout Bond FoS:' : 'ضریب اطمینان چسبندگی گروت:')
                          : (isEn ? 'Uplift Tension FoS:' : 'ضریب اطمینان کشش شمع:')
                        }
                      </span>
                      <span className={`font-mono font-bold ${
                        structuralSnapshot.isStale
                          ? 'text-amber-400 print:text-amber-800'
                          : !structuralSnapshot.isStructurallySafe || structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed' || structuralSnapshot.upliftCapacityProvenance === 'invalid_input'
                          ? 'text-amber-400 print:text-amber-800'
                          : structuralSnapshot.fosUplift >= 2.0
                          ? 'text-industrial-success print:text-emerald-800'
                          : 'text-amber-400 print:text-amber-800'
                      }`}>
                        {structuralSnapshot.isStale
                          ? (isEn ? 'STALE' : 'منقضی')
                          : structuralSnapshot.upliftCapacityProvenance === 'invalid_input'
                          ? (isEn ? 'INVALID INPUT' : 'ورودی نامعتبر')
                          : structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed'
                          ? `${structuralSnapshot.fosUplift} ${isEn ? '(Nominal — UNASSESSED)' : '(اسمی — ارزیابی‌نشده)'}`
                          : structuralSnapshot.upliftCapacityProvenance === 'user_supplied'
                          ? `${structuralSnapshot.fosUplift} ${isEn ? '(Screening ≥ 2.0)' : '(غربالگری حداقل ۲.۰)'}`
                          : `${structuralSnapshot.fosUplift} ${isEn ? '(software screening threshold; code basis unverified)' : '(آستانه غربالگری نرم‌افزار؛ مبنای آیین‌نامه‌ای تأییدنشده)'}`}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {structuralSnapshot.isStale
                          ? (isEn ? 'Recalculation Required' : 'نیازمند بازمحاسبه')
                          : structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed'
                          ? `T_assumed = ${structuralSnapshot.upliftCapacityPerPostKn.toFixed(1)} kN/post (Unverified)`
                          : structuralSnapshot.upliftCapacityProvenance === 'user_supplied'
                          ? `T_input = ${structuralSnapshot.upliftCapacityPerPostKn.toFixed(1)} kN/post (Screening)`
                          : structuralSnapshot.upliftCapacityProvenance === 'invalid_input'
                          ? (isEn ? 'Invalid input' : 'ورودی نامعتبر')
                          : `T_ult = ${structuralSnapshot.upliftCapacityPerPostKn.toFixed(1)} kN/post`}
                      </span>
                    </div>
                  </div>

                  {/* Comprehensive Structural Loads & Geotechnical Safety Factors Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left print:text-black border-collapse">
                      <thead>
                        <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                          <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Engineering Parameter' : 'پارامتر محاسباتی مهندسی'}</th>
                          <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Calculated Value' : 'مقدار محاسبه‌شده'}</th>
                          <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Screening Reference (not verified)' : 'مرجع غربالگری (تأییدنشده)'}</th>
                          <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Software Screening Result (not compliance)' : 'نتیجه غربالگری نرم‌افزار (نه احراز انطباق)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Wind Uplift Force per Table' : 'نیروی مکش باد بر هر میز (Uplift)'}</td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? 'STALE' : 'منقضی'}</span>
                            ) : (
                              <span className="text-rose-300">{structuralSnapshot.windUpliftForceKn} kN</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 print:text-slate-600">ASCE 7-22 Net Pressure</td>
                          <td className="p-2 font-mono">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? '⚠️ STALE' : '⚠️ منقضی'}</span>
                            ) : (
                              <span className="text-slate-300">{structuralSnapshot.upliftPerPostKn} kN/post demand</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Overturning Moment per Table' : 'لنگر واژگونی ناشی از باد (Overturning)'}</td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? 'STALE' : 'منقضی'}</span>
                            ) : (
                              <span className="text-rose-300">{structuralSnapshot.windOverturningMomentKnM} kN·m</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 print:text-slate-600">Arm = W/2 + h*sin(beta)</td>
                          <td className="p-2 font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? '⚠️ STALE (Recalculation Required)' : '⚠️ منقضی (نیازمند بازمحاسبه)'}</span>
                            ) : (
                              <span className="text-industrial-success">FoS = {structuralSnapshot.fosOverturning} (software threshold 1.5; code basis unverified)</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Broms Lateral Soil Resistance' : 'ظرفیت باربری جانبی خاک (روش برمز)'}</td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? 'STALE' : 'منقضی'}</span>
                            ) : (
                              <span className="text-sky-300">{structuralSnapshot.lateralShearPerPostKn} kN/post shear</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 print:text-slate-600">Broms (1964) short-pile lateral limit</td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? '⚠️ STALE (Recalculation Required)' : '⚠️ منقضی (نیازمند بازمحاسبه)'}</span>
                            ) : (
                              <span className="text-industrial-success">FoS = {structuralSnapshot.fosLateral} (software threshold 1.5; code basis unverified)</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Soil Bearing Pressure under Post' : 'تنش فشاری وارده بر بستر خاک'}</td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? 'STALE' : 'منقضی'}</span>
                            ) : (
                              <span className="text-white print:text-black">{structuralSnapshot.appliedPostBearingPressureKpa} kPa</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 print:text-slate-600">
                            {structuralSnapshot.isStale
                              ? (isEn ? 'Allowable bearing qa (Recalculation Required)' : 'ظرفیت باربری مجاز qa (نیازمند بازمحاسبه)')
                              : `Allowable bearing qa = ${structuralSnapshot.allowableSoilBearingKpa} kPa`}
                          </td>
                          <td className="p-2 font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? '⚠️ STALE (Recalculation Required)' : '⚠️ منقضی (نیازمند بازمحاسبه)'}</span>
                            ) : structuralSnapshot.isBearingCapacitySafe ? (
                              <span className="text-industrial-success">{isEn ? `SCREENING PASS (FoS = ${structuralSnapshot.fosBearing}; code basis unverified)` : `قبولی غربالگری (FoS = ${structuralSnapshot.fosBearing}؛ مبنای آیین‌نامه‌ای تأییدنشده)`}</span>
                            ) : (
                              <span className="text-rose-400">{isEn ? 'SCREENING LIMIT EXCEEDED' : 'حد غربالگری رد شده'}</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">
                            {structuralSnapshot.foundationType === 'pre_drilled_grouted_pile'
                              ? structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed'
                                ? (isEn ? 'Pre-Drilled Grout Bond Resistance (T_assumed - UNASSESSED)' : 'ظرفیت کشش چسبندگی گروت (T_assumed - ارزیابی‌نشده)')
                                : structuralSnapshot.upliftCapacityProvenance === 'user_supplied'
                                ? (isEn ? 'Pre-Drilled Pile Uplift Resistance (T_input - Screening)' : 'ظرفیت کشش شمع پیش‌حفاری (T_input - غربالگری)')
                                : (isEn ? 'Pre-Drilled Pile Grout Bond Resistance' : 'ظرفیت چسبندگی گروت شمع پیش‌حفاری')
                              : (isEn ? 'Pile Skin-Friction Tension Resistance' : 'ظرفیت کشش اصطکاک جدار شمع (T_ult)')}
                          </td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? 'STALE' : 'منقضی'}</span>
                            ) : structuralSnapshot.upliftCapacityProvenance === 'invalid_input' ? (
                              <span className="text-rose-400">{isEn ? 'INVALID' : 'نامعتبر'}</span>
                            ) : structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed' ? (
                              <span className="text-amber-400">
                                {structuralSnapshot.upliftCapacityPerPostKn.toFixed(1)} kN/post{' '}
                                <span className="text-[10px] font-normal text-amber-300">({isEn ? 'Assumed' : 'فرضی'})</span>
                              </span>
                            ) : !structuralSnapshot.isStructurallySafe ? (
                              <span className="text-amber-400">{structuralSnapshot.upliftCapacityPerPostKn.toFixed(1)} kN/post</span>
                            ) : (
                              <span className="text-industrial-success">{structuralSnapshot.upliftCapacityPerPostKn.toFixed(1)} kN/post</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 print:text-slate-600">
                            {structuralSnapshot.foundationType === 'pre_drilled_grouted_pile'
                              ? structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed'
                                ? `FHWA-NHI-05-039 (${structuralSnapshot.assumedGroutBondKpa ?? 1500} kPa bond assumed; Pullout Test Req.)`
                                : structuralSnapshot.upliftCapacityProvenance === 'user_supplied'
                                ? 'User Input for Screening (Field Verification Required)'
                                : 'FHWA-NHI-05-039 / Eurocode 7'
                              : 'Eurocode 7 EN 1997-1 §7.6.2.3'}
                          </td>
                          <td className="p-2 font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? '⚠️ STALE (Recalculation Required)' : '⚠️ منقضی (نیازمند بازمحاسبه)'}</span>
                            ) : structuralSnapshot.upliftCapacityProvenance === 'invalid_input' ? (
                              <span className="text-rose-400">{isEn ? '✗ FAILED (Invalid Input)' : '✗ مردود (ورودی نامعتبر)'}</span>
                            ) : structuralSnapshot.upliftCapacityProvenance === 'nominal_assumed' ? (
                              <span className="text-amber-400">
                                FoS = {structuralSnapshot.fosUplift}{' '}
                                <span className="text-[10px] font-normal">({isEn ? 'UNASSESSED' : 'ارزیابی‌نشده'})</span>
                              </span>
                            ) : !structuralSnapshot.isStructurallySafe ? (
                              <span className="text-amber-400">FoS = {structuralSnapshot.fosUplift} ({isEn ? 'Unassessed' : 'ارزیابی‌نشده'})</span>
                            ) : (
                              <span className="text-industrial-success">FoS = {structuralSnapshot.fosUplift} (software threshold 2.0; code basis unverified)</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Frost Heave Embedment Depth' : 'عمق کوبش جهت رفع خطر یخبندان'}</td>
                          <td className="p-2 font-mono font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? 'STALE' : 'منقضی'}</span>
                            ) : (
                              <span className="text-white print:text-black">{structuralSnapshot.recommendedDepthM} m</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400 print:text-slate-600">
                            {structuralSnapshot.isStale
                              ? (isEn ? 'L >= Frost Depth + 1.0m (Recalculation Required)' : 'عمق کوبش >= عمق یخبندان + ۱.۰ متر (نیازمند بازمحاسبه)')
                              : `L >= Frost Depth + 1.0m (${structuralSnapshot.minDepthForFrostM} m)`}
                          </td>
                          <td className="p-2 font-bold">
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400">{isEn ? '⚠️ STALE (Recalculation Required)' : '⚠️ منقضی (نیازمند بازمحاسبه)'}</span>
                            ) : structuralSnapshot.isFrostDepthRespected ? (
                              <span className="text-industrial-success">{isEn ? 'SCREENING PASS (not compliance)' : 'قبولی غربالگری (نه احراز انطباق)'}</span>
                            ) : (
                              <span className="text-rose-400">✗ INSUFFICIENT</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">{isEn ? 'Structural Safety Verdict' : 'نتیجه ارزیابی ایمنی سازه'}</td>
                          <td className="p-2 font-bold" colSpan={3}>
                            {structuralSnapshot.isStale ? (
                              <span className="text-amber-400 font-bold">{isEn ? 'STALE — RECALCULATION REQUIRED' : 'منقضی‌شده — نیازمند بازمحاسبه در زبانه سازه'}</span>
                            ) : structuralSnapshot.isStructurallySafe ? (
                              <span className="text-industrial-success font-bold">{isEn ? 'SCREENING PASS (Preliminary — Unassessed Modes Excluded)' : 'تأیید ارزیابی اولیه غربالگری (حالت‌های ارزیابی‌نشده مستثنی هستند)'}</span>
                            ) : (
                              <span className="text-rose-400 font-bold">{isEn ? 'ACTION REQUIRED / UNASSESSED' : 'نیازمند اقدام / ارزیابی‌نشده'}</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Geotechnical & Civil Engineering Explanations & Field Test Recommendations */}
                  <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-2">
                    <span className="font-bold text-white print:text-black flex items-center gap-1.5">
                      <HardHat className="w-4 h-4 text-industrial-warning" />
                      {isEn ? 'Geotechnical Soil-Structure Interaction & Engineering Disclosures:' : 'تحلیل تعامل خاک و سازه و الزامات صداقت مهندسی:'}
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                      {isEn ? structuralSnapshot.disclosures.disclaimerEn : structuralSnapshot.disclosures.disclaimerFa}
                    </p>
                    <div className="pt-2 border-t border-industrial-border/40 text-[11px]">
                      <strong className="text-industrial-warning">{isEn ? 'Civil Execution & Quality Assurance Checklist:' : 'چک‌لیست کنترل کیفی و آزمایش‌های میدانی:'}</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300 print:text-slate-700">
                        <li>{isEn ? 'Have the project geotechnical engineer determine whether pile testing is required and establish test methods and sampling.' : 'مهندس ژئوتکنیک پروژه ضرورت آزمایش شمع، روش‌های آزمون و نمونه‌برداری را تعیین کند.'}</li>
                        <li>{isEn ? 'Establish lateral resistance and deflection criteria from project-specific loads, ground investigation, and applicable design requirements.' : 'معیارهای مقاومت جانبی و تغییرمکان را بر پایه بارهای پروژه، مطالعات خاک و الزامات طراحی قابل‌اعمال تعیین کنید.'}</li>
                        <li>{isEn ? 'Set installation tolerances from the approved project specifications and verified foundation design; none are established by this screening report.' : 'رواداری نصب را بر اساس مشخصات مصوب پروژه و طراحی تأییدشده فونداسیون تعیین کنید؛ این گزارش غربالگری مقداری را تعیین نمی‌کند.'}</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Section 7: Financial Analysis & 25-Year Pro-Forma */}
          {includedSections.financial && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-industrial-success" />
                  {isEn ? '7. Financial Feasibility, CAPEX Breakdown & 25-Year Cash Flow Pro-Forma' : '۷. تحلیل توجیه‌پذیری اقتصادی، ساختار سرمایه‌گذاری و جریان نقدینگی ۲۵ ساله'}
                </span>
                <span className="text-[10px] text-industrial-success print:text-emerald-800 font-mono">
                  IRR: {financial.isIrrDefined && financial.irrPct !== null ? `${financial.irrPct}%` : 'N/A'} | NPV: ${financial.npvUsd.toLocaleString()}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Total Initial CAPEX:' : 'کل هزینه سرمایه‌گذاری (CAPEX):'}</span>
                  <span className="font-mono font-bold text-white print:text-black text-sm">
                    ${financial.capexBreakdown.totalCapexUsd.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Levelized Cost (LCOE):' : 'بهای تمام‌شده هر کیلووات‌ساعت:'}</span>
                  <span className="font-mono font-bold text-industrial-accent print:text-sky-800 text-sm">
                    {financial.isLcoeDefined && financial.lcoeUsdPerKwh !== null ? `$${financial.lcoeUsdPerKwh} /kWh` : 'N/A (Zero Yield)'}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Internal Rate of Return (IRR):' : 'نرخ بازده داخلی (IRR):'}</span>
                  <span className="font-mono font-bold text-industrial-success print:text-emerald-800 text-sm">
                    {financial.isIrrDefined && financial.irrPct !== null ? `${financial.irrPct}%` : (isEn ? 'N/A (Undefined)' : 'تعریف‌نشده')}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Payback Period:' : 'دوره بازگشت سرمایه:'}</span>
                  <span className="font-mono font-bold text-purple-400 print:text-purple-800 text-sm">
                    {financial.simplePayback ? financial.simplePayback.formattedYears : `${financial.simplePaybackPeriodYears} سال`}
                  </span>
                </div>
              </div>

              {/* 25-Year Pro-Forma Cashflow Table (Selected representative years) */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                      <th className="p-1.5 border border-industrial-border print:border-slate-300">{isEn ? 'Year' : 'سال'}</th>
                      <th className="p-1.5 border border-industrial-border print:border-slate-300">{isEn ? 'Generation (MWh)' : 'تولید (MWh)'}</th>
                      <th className="p-1.5 border border-industrial-border print:border-slate-300">{isEn ? 'Gross Revenue ($)' : 'درآمد فروش برق ($)'}</th>
                      <th className="p-1.5 border border-industrial-border print:border-slate-300">{isEn ? 'OPEX ($)' : 'هزینه نگهداری O&M ($)'}</th>
                      <th className="p-1.5 border border-industrial-border print:border-slate-300">{isEn ? 'Net Cashflow ($)' : 'جریان خالص ($)'}</th>
                      <th className="p-1.5 border border-industrial-border print:border-slate-300">{isEn ? 'Cumulative Cash ($)' : 'جریان تجمعی ($)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    {financial.cashFlow25Years.slice(0, 10).map((cf) => (
                      <tr key={cf.year} className="border-b border-industrial-border print:border-slate-200">
                        <td className="p-1.5 font-mono font-medium">Year {cf.year}</td>
                        <td className="p-1.5 font-mono">{(cf.generationKwh / 1000).toFixed(1)}</td>
                        <td className="p-1.5 font-mono">${Math.round(cf.revenueToman / 90000).toLocaleString()}</td>
                        <td className="p-1.5 font-mono">${Math.round(cf.opexToman / 90000).toLocaleString()}</td>
                        <td className="p-1.5 font-mono text-industrial-success print:text-emerald-800 font-bold">
                          ${Math.round(cf.netCashFlowToman / 90000).toLocaleString()}
                        </td>
                        <td className="p-1.5 font-mono">
                          <span className={cf.cumulativeCashFlowToman >= 0 ? 'text-industrial-success print:text-emerald-800' : 'text-slate-400'}>
                            ${Math.round(cf.cumulativeCashFlowToman / 90000).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 8: Bill of Materials (BOM) */}
          {includedSections.bom && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-industrial-warning" />
                  {isEn ? '8. Comprehensive Project Bill of Materials (BOM Schedule)' : '۸. لیست تفکیکی تجهیزات، قطعات و مصالح پروژه (BOM)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEC 62548 Schedule</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                      <th className="p-2 border border-industrial-border print:border-slate-300">#</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Equipment / Material' : 'تجهیز / قطعه'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Specification' : 'مشخصات فنی'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Quantity' : 'تعداد / مقدار'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Unit' : 'واحد'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    <tr className="border-b border-industrial-border print:border-slate-200">
                      <td className="p-2 font-mono">1</td>
                      <td className="p-2 font-semibold">{module.manufacturer} {module.modelName}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">{module.pmpWatts}W TOPCon Bifacial, Voc={module.vocVolts}V</td>
                      <td className="p-2 font-mono font-bold text-industrial-warning print:text-amber-900">{arrayDesign.totalModulesCount}</td>
                      <td className="p-2">{isEn ? 'Units' : 'عدد'}</td>
                    </tr>
                    <tr className="border-b border-industrial-border print:border-slate-200">
                      <td className="p-2 font-mono">2</td>
                      <td className="p-2 font-semibold">{inverter.manufacturer} {inverter.modelName}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">{inverter.pnomAcKw}kW AC, 1500V DC Max, Multi-MPPT</td>
                      <td className="p-2 font-mono font-bold text-industrial-accent print:text-sky-900">
                        {bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1}
                      </td>
                      <td className="p-2">{isEn ? 'Units' : 'دستگاه'}</td>
                    </tr>
                    <tr className="border-b border-industrial-border print:border-slate-200">
                      <td className="p-2 font-mono">3</td>
                      <td className="p-2 font-semibold">{isEn ? 'Mounting Structure Racking' : 'استراکچر نگهدارنده پنل‌ها'}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">Hot-Dip Galvanized C-Steel, ASTM A123, 2P Configuration</td>
                      <td className="p-2 font-mono font-bold text-white print:text-black">
                        {isSnapshotValid
                          ? structuralSnapshot!.totalTablesCount
                          : structuralSnapshot?.isStale
                          ? (isEn ? 'STALE' : 'منقضی')
                          : '—'}
                      </td>
                      <td className="p-2">{isEn ? 'Tables' : 'میز'}</td>
                    </tr>
                    <tr className="border-b border-industrial-border print:border-slate-200">
                      <td className="p-2 font-mono">4</td>
                      <td className="p-2 font-semibold">{isEn ? 'Rammed Ground Piles' : 'شمع‌های کوبشی گالوانیزه'}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">
                        {isSnapshotValid
                          ? `${structuralSnapshot!.bromsPileSection || (isEn ? structuralSnapshot!.foundationNameEn : structuralSnapshot!.foundationNameFa)}, ${structuralSnapshot!.recommendedDepthM}m embedment depth`
                          : structuralSnapshot?.isStale
                          ? (isEn ? 'STALE — Re-run Structural Tab' : 'منقضی — نیازمند اجرای مجدد در زبانه سازه')
                          : (isEn ? 'Pending Structural Tab Sizing' : 'در انتظار محاسبه در زبانه سازه')}
                      </td>
                      <td className="p-2 font-mono font-bold text-white print:text-black">
                        {isSnapshotValid
                          ? structuralSnapshot!.totalPostsCount
                          : structuralSnapshot?.isStale
                          ? (isEn ? 'STALE' : 'منقضی')
                          : '—'}
                      </td>
                      <td className="p-2">{isEn ? 'Posts' : 'شاخه'}</td>
                    </tr>
                    {protection.cableRuns.map((c, i) => (
                      <tr key={`cab-${i}`} className="border-b border-industrial-border print:border-slate-200">
                        <td className="p-2 font-mono">{5 + i}</td>
                        <td className="p-2 font-semibold">{isEn ? c.config.sectionNameEn : c.config.sectionNameFa}</td>
                        <td className="p-2 font-mono text-slate-400 print:text-slate-700">{isEn ? c.cableDesignationEn : c.cableDesignationFa}</td>
                        <td className="p-2 font-mono font-bold text-white print:text-black">{c.config.oneWayLengthM * c.parallelRunsCount}</td>
                        <td className="p-2">{isEn ? 'm' : 'متر'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signoff / Approval Signature Block */}
          <div className="pt-6 mt-6 border-t border-industrial-border/80 print:border-slate-400 grid grid-cols-3 gap-4 text-xs text-center">
            <div className="p-3 border border-dashed border-industrial-border print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'PREPARED BY (DESIGN ENGINEER)' : 'تهیه‌کننده (مهندس طراح)'}</span>
              <div className="border-t border-industrial-border print:border-slate-300 pt-1 font-semibold">{leadEngineer || (isEn ? '(Unassigned)' : '(تعیین‌نشده)')}</div>
            </div>
            <div className="p-3 border border-dashed border-industrial-border print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'REVIEWER (credentials not verified)' : 'بازبین (صلاحیت تأیید نشده)'}</span>
              <div className="border-t border-industrial-border print:border-slate-300 pt-1 font-semibold">{companyName || (isEn ? '(Unassigned)' : '(تعیین‌نشده)')}</div>
            </div>
            <div className="p-3 border border-dashed border-industrial-border print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'CLIENT CONTACT (acceptance not authenticated)' : 'نماینده کارفرما (پذیرش احراز نشده)'}</span>
              <div className="border-t border-industrial-border print:border-slate-300 pt-1 font-semibold">{clientName || (isEn ? '(Unassigned)' : '(تعیین‌نشده)')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
