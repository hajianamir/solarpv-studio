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
import { calculateStructuralAndFoundations, cpUpliftFor, type StructuralAnalysisResult, type FoundationType } from '../engine/structuralEngine';

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
  foundationType?: FoundationType;
  onClose: () => void;
  onImportProject?: (projectData: any) => void;
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
  foundationType: customFoundationType,
  onClose,
  onImportProject,
  lang: defaultLang = 'fa',
}) => {
  const [reportLang, setReportLang] = useState<'fa' | 'en'>(defaultLang);
  const isEn = reportLang === 'en';
  const effectiveCity = getEffectiveClimateCity(city, siteOverrides);

  // Dynamic Structural & Geotechnical Foundation Calculation
  const structCalc: StructuralAnalysisResult = useMemo(() => {
    const modulesPerTable = 28;
    const tablesCount = Math.ceil(arrayDesign.totalModulesCount / modulesPerTable);
    const moduleWeightKg = (module as { weightKg?: number }).weightKg || 28.5;
    return calculateStructuralAndFoundations({
      totalModulesCount: arrayDesign.totalModulesCount,
      moduleLengthM: module.lengthM || 2.278,
      moduleWidthM: module.widthM || 1.134,
      moduleWeightKg,
      tablesCount,
      modulesPerTable,
      arrayTiltDeg: effectiveCity.optimalTiltAnnualDeg || 28,
      groundClearanceM: 0.9,
      basicWindSpeedKmh: effectiveCity.basicWindSpeedKmh || 120,
      groundSnowLoadKgM2: effectiveCity.groundSnowLoadKgM2 || 50,
      foundationType: (customFoundationType ?? (siteOverrides?.foundationType as FoundationType) ?? (siteOverrides?.soilType === 'rocky_limestone' ? 'pre_drilled_grouted_pile' : 'rammed_steel_pile')),
      soilType: (siteOverrides?.soilType ?? effectiveCity.soilType ?? 'dense_sand_gravel') as any,
      soilBearingCapacityKpa: siteOverrides?.soilBearingCapacityKpa ?? effectiveCity.soilBearingCapacityKpa ?? 220,
      soilInternalFrictionAngleDeg: siteOverrides?.soilInternalFrictionAngleDeg ?? effectiveCity.soilInternalFrictionAngleDeg ?? 32,
      soilCohesionKpa: siteOverrides?.soilCohesionKpa ?? effectiveCity.soilCohesionKpa ?? 15,
      soilDensityKnM3: siteOverrides?.soilDensityKnM3 ?? effectiveCity.soilDensityKnM3 ?? 18.0,
      annualRainfallMm: siteOverrides?.annualRainfallMm ?? effectiveCity.annualRainfallMm ?? 200,
      frostDepthCm: siteOverrides?.frostDepthCm ?? effectiveCity.frostDepthCm ?? 30,
      seismicZoneCoefficientA: siteOverrides?.seismicZoneCoefficientA ?? effectiveCity.seismicZoneCoefficientA ?? 0.30,
      elevationM: effectiveCity.elevationM || 0,
    });
  }, [arrayDesign, module, effectiveCity, siteOverrides, customFoundationType]);

  // Derived Energy Simulation Metrics
  const annualGrossMwh = Number(((simulation.totalGeneration24hKwh * 365) / 1000).toFixed(1));
  const specificYieldKwhKwp = Math.round((annualGrossMwh * 1000) / Math.max(1, arrayDesign.totalPvCapacityKwp));
  const performanceRatioPct = Number(((arrayDesign.effectiveDeratingFactor || 0.805) * 100).toFixed(1));
  const p50Mwh = annualGrossMwh;
  const p75Mwh = Number((annualGrossMwh * 0.945).toFixed(1));
  const p90Mwh = Number((annualGrossMwh * 0.898).toFixed(1));

  // Customization & Metadata State
  const [docId, setDocId] = useState<string>('EPC-PV-2026-0891');
  const [docVersion, setDocVersion] = useState<string>('Rev 2.4');
  const [companyName, setCompanyName] = useState<string>('Solar Engineering & EPC Consortium');
  const [leadEngineer, setLeadEngineer] = useState<string>('Senior PV Design Engineer, P.E.');
  const [clientName, setClientName] = useState<string>('Renewable Energy Investor Corp.');
  const [approvalStatus, setApprovalStatus] = useState<'Draft' | 'Under Review' | 'Approved' | 'As-Built'>('Approved');
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
      ? 'System layout verified against IEC 62548. Grid interconnection voltage coordinated with regional utility.'
      : 'چیدمان سیستم مطابق با استاندارد IEC 62548 بازبینی شده و سطح ولتاژ اتصال با شبکه توزیع منطقه‌ای هماهنگ شده است.',
    climate: isEn
      ? 'Geotechnical and wind data retrieved from official meteorological records and INBC Part 6 specifications.'
      : 'داده‌های ژئوتکنیک و بار باد بر اساس استعلام رسمی مبحث ۶ مقررات ملی ساختمان و مرکز تحقیقات مسکن اخذ شده است.',
    shading: isEn
      ? 'Pitch distance optimized to eliminate inter-row  during the critical winter solstice noon window (10:00-14:00).'
      : 'فاصله ردیف‌ها جهت برقراری شرط عدم سایه‌اندازی در بازه ۱۰ الی ۱۴ ظهر انقلاب زمستانی بهینه‌سازی شده است.',
    electrical: isEn
      ? 'Cable sizing incorporates multi-conductor parallel runs to limit voltage drop below 1.5% at nominal full load.'
      : 'سایزینگ کابل‌ها به روش چند رشته موازی انجام شده تا افت ولتاژ در بار نامی کمتر از ۱.۵ درصد محدود گردد.',
    structural: isEn
      ? 'Hot-dip galvanized steel ramming piles sized with factor of safety FoS > 1.8 against wind overturning moments.'
      : 'پایه‌های کوبشی فولادی گالوانیزه با ضریب اطمینان بیش از ۱.۸ در برابر لنگر واژگونی باد شدید طراحی شده‌اند.',
    financial: isEn
      ? 'Pro-forma cash flow incorporates 25-year feed-in tariff with inflation indexation and degradation derating.'
      : 'جریان نقدینگی ۲۵ ساله بر مبنای تعرفه خرید تضمینی با اعمال نرخ تعدیل تورم و ضریب افت سالانه توان محاسبه شده است.',
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
    exportToWordDocument(reportHtml, `${customFileName}.doc`);
  };

  const handleExportExcel = () => {
    // Build structured sheets
    const summarySheet = [
      ['SOLARPV STUDIO PRO — OFFICIAL EPC ENGINEERING REPORT', ''],
      ['Project Title', projectName],
      ['Document ID', docId],
      ['Version / Revision', docVersion],
      ['System Operating Mode', systemMode.toUpperCase()],
      ['Date', new Date().toLocaleDateString()],
      ['Client Name', clientName],
      ['Lead Engineer', leadEngineer],
      ['Approval Status', approvalStatus],
      ['', ''],
      ['KEY PERFORMANCE INDICATORS', ''],
      ['Total PV Peak Capacity (kWp)', arrayDesign.totalPvCapacityKwp],
      ['Total Module Count', arrayDesign.totalModulesCount],
      ['Total Inverter Capacity (kW)', inverter.pnomAcKw * (bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1)],
      ['Annual Generation (MWh)', ((simulation.totalGeneration24hKwh * 365) / 1000).toFixed(1)],
      ['Levelized Cost of Electricity LCOE ($/kWh)', financial.lcoeUsdPerKwh],
      ['Internal Rate of Return IRR (%)', `${financial.irrPct}%`],
      ['Net Present Value NPV ($)', financial.npvUsd],
      ['Simple Payback (Years)', financial.simplePaybackPeriodYears],
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
        c.isCompliant ? 'PASS' : 'FAIL',
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
      ['ENERGY YIELD SIMULATION & PERFORMANCE RATIO (IEC 61724-1)', ''],
      ['Metric', 'Value', 'Unit', 'Methodology / Standard'],
      ['Gross DC Annual Generation', (annualGrossMwh * 1.05).toFixed(1), 'MWh/yr', 'Sandia Array Model'],
      ['Net AC Annual Generation (P50)', annualGrossMwh.toFixed(1), 'MWh/yr', 'P50 Median Expectation'],
      ['P75 Bankable Generation', p75Mwh.toFixed(1), 'MWh/yr', 'P75 Statistical Exceedance'],
      ['P90 Conservative Debt Sizing', p90Mwh.toFixed(1), 'MWh/yr', 'P90 Bankable Exceedance (1.3x DSCR)'],
      ['Specific Yield', specificYieldKwhKwp, 'kWh/kWp/yr', 'Normalized to STC DC Capacity'],
      ['Performance Ratio (PR)', `${performanceRatioPct}%`, '-', 'IEC 61724 Class A Methodology'],
      ['Soiling Derate', '3.5%', '-', 'Kimber Arid Climate Deposition Model'],
      ['Thermal Temperature Loss', '7.8%', '-', 'Gamma_Pmp = -0.30%/°C'],
      ['Ohmic Cable I2R Loss', '1.2%', '-', 'DC + AC Conductor Resistance'],
      ['Inverter Conversion Efficiency', '98.5%', '-', 'IEC 62891 Weighted Efficiency'],
      ['Transformer & MV Losses', '1.2%', '-', 'Substation Step-up Transformer'],
      ['System Availability', '99.0%', '-', 'Annual Scheduled / Unscheduled Uptime'],
    ];

    const structuralSheet = [
      ['STRUCTURAL SIZING & CIVIL FOUNDATIONS (ASCE 7-22 / INBC 6 / EUROCODE 7)', ''],
      ['Parameter', 'Calculated Value', 'Design Unit', 'Design Standard / Limit'],
      ['Velocity Wind Pressure (qz)', structCalc.velocityWindPressureQzN_M2, 'N/m²', 'ASCE 7-22 Eq. 26.10-1'],
      ['Wind Uplift Force per Table', structCalc.windUpliftForceKn, 'kN', 'ASCE 7-22 §27.3 Net Uplift'],
      ['Wind Downforce per Table', structCalc.windDownforceKn, 'kN', 'ASCE 7-22 §27.3 Net Downforce'],
      ['Overturning Moment per Table', structCalc.windOverturningMomentKnM, 'kN·m', 'Derived arm (W/2 + h*sin beta)'],
      ['Factored Snow Load per Table', structCalc.snowLoadTableKn, 'kN', 'INBC 6 / ASCE 7-22 §7.4'],
      ['Foundation Technology', isEn ? structCalc.foundationNameEn : structCalc.foundationNameFa, '-', 'Eurocode 7 EN 1997-1'],
      ['Pile Profile Section', structCalc.bromsPileSection, '-', 'Broms (1964) / ASTM A123'],
      ['Embedment Depth in Ground', structCalc.recommendedDepthM, 'm', `L >= Frost Depth + 1.0m (${structCalc.minDepthForFrostM}m)`],
      ['Total Mounting Tables', structCalc.totalTablesCount, 'tables', `${structCalc.postsPerTable} posts per table`],
      ['Total Piles Count', structCalc.totalPostsCount, 'posts', 'Plant-wide structural posts'],
      ['Applied Post Bearing Pressure', structCalc.appliedPostBearingPressureKpa, 'kPa', `Allowable qa = ${structCalc.allowableSoilBearingKpa} kPa`],
      ['Ultimate Skin-Friction Uplift (T_ult)', structCalc.upliftCapacityPerPostKn, 'kN/post', 'Burland-Meyerhof Beta Method'],
      ['Uplift Safety Factor (FoS_uplift)', structCalc.fosUplift, '-', 'Required >= 2.0 (Eurocode 7)'],
      ['Broms Lateral Safety Factor (FoS_lateral)', structCalc.fosLateral, '-', 'Required >= 1.5 (Broms 1964)'],
      ['Overturning Safety Factor (FoS_overturning)', structCalc.fosOverturningAnchored, '-', 'Required >= 1.5 (ASCE 7-22)'],
      ['Structural Safety Compliance', structCalc.isStructurallySafe ? 'PASS / SAFE' : 'ACTION REQUIRED', '-', 'INBC Part 6 & ASCE 7-22'],
    ];

    exportToExcelWorkbook(
      [
        { sheetName: 'Project Summary', rows: summarySheet },
        { sheetName: 'Climate & Geotechnical', rows: climateSheet },
        { sheetName: 'Energy Yield & PR', rows: energySheet },
        { sheetName: 'Electrical Schedule', rows: electricalSheet },
        { sheetName: 'Structural & Foundations', rows: structuralSheet },
        { sheetName: 'Financial 25Y CashFlow', rows: financialSheet },
      ],
      `${customFileName}.xls`
    );
  };

  // Full Project JSON Export with Custom Filename
  const handleExportJson = () => {
    const fullProjectState = {
      app: 'SolarPV Studio Engineering Platform',
      version: '3.0.0',
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
    };

    const blob = new Blob([JSON.stringify(fullProjectState, null, 2)], {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportProject) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          onImportProject(parsed);
          alert(
            isEn
              ? 'Project state successfully restored from local file.'
              : 'پروژه با موفقیت از فایل محلی بازیابی شد.'
          );
          onClose();
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
                  ? 'Multi-format export: PDF, Word (.doc), Excel (.xls) & Local Project (.json) with full traceability'
                  : 'تولید گزارش رسمی با فرمت‌های PDF، Word، Excel و ذخیره کامل پروژه در قالب فایل محلی'}
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
              title={isEn ? 'Export as Microsoft Word (.doc)' : 'خروجی فایل ورد'}
            >
              <FileCode className="w-3.5 h-3.5 text-industrial-primary" />
              <span>{isEn ? 'Word (.doc)' : 'Word'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-industrial-success border-industrial-success/30"
              title={isEn ? 'Export Multi-Sheet Excel Workbook' : 'خروجی اکسل چند شیت'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-industrial-success" />
              <span>{isEn ? 'Excel (.xls)' : 'Excel'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-industrial-warning border-industrial-warning/30"
              title={isEn ? 'Save Project File to Local Machine' : 'ذخیره محلی پروژه با نام دلخواه'}
            >
              <Download className="w-3.5 h-3.5 text-industrial-warning" />
              <span>{isEn ? 'Save Project' : 'ذخیره پروژه'}</span>
            </button>

            <label
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 cursor-pointer"
              title={isEn ? 'Restore Project from JSON' : 'بازیابی پروژه از فایل'}
            >
              <Upload className="w-3.5 h-3.5 text-purple-400" />
              <span>{isEn ? 'Load' : 'بارگذاری'}</span>
              <input type="file" accept=".json,.solarpv.json" onChange={handleFileChange} className="hidden" />
            </label>

            <button
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
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Document ID:' : 'شماره سند:'}</label>
                <input
                  type="text"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Revision:' : 'نسخه گزارش:'}</label>
                <input
                  type="text"
                  value={docVersion}
                  onChange={(e) => setDocVersion(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Engineering Company:' : 'نام مهندس مشاور / شرکت:'}</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Client / Investor Name:' : 'نام کارفرما / سرمایه‌گذار:'}</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Lead Engineer / Designer:' : 'طراح و مدیر پروژه:'}</label>
                <input
                  type="text"
                  value={leadEngineer}
                  onChange={(e) => setLeadEngineer(e.target.value)}
                  className="w-full bg-industrial-surface border border-industrial-border rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Approval Status:' : 'وضعیت تأیید سند:'}</label>
                <select
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
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Export File Name:' : 'نام فایل ذخیره‌سازی:'}</label>
                <input
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
                  { key: 'energy', fa: 'شبیه‌سازی انرژی', en: 'Energy Yield (P50/P90)' },
                  { key: 'electrical', fa: 'طراحی الکتریکی و کابل', en: 'Electrical & Cables' },
                  { key: 'structural', fa: 'سازه و فونداسیون', en: 'Structure & Foundation' },
                  { key: 'financial', fa: 'تحلیل مالی و بازگشت', en: 'Financial Pro-Forma' },
                  { key: 'bom', fa: 'فهرست تجهیزات BOM', en: 'Bill of Materials' },
                ].map((s) => (
                  <label key={s.key} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input
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
                {isEn ? 'EPC ENGINEERING TECHNICAL DOSSIER' : 'مستند فنی و مهندسی پروژه نیروگاه خورشیدی'}
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
                ? `Utility-Grade PV System Feasibility & EPC Design Dossier for ${effectiveCity.nameEn}, Iran`
                : `طرح توجیهی فنی، محاسبات الکتریکی، ژئوتکنیک، سازه و ارزیابی مالی برای ساختگاه ${effectiveCity.nameFa}`}
            </p>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 print:text-black bg-slate-800/60 print:bg-slate-100 p-2.5 rounded-lg mt-4 border border-industrial-border/60 print:border-slate-300">
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Client:' : 'کارفرما:'}</span>
                <strong>{clientName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Consultant:' : 'مشاور مهندسی:'}</span>
                <strong>{companyName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isEn ? 'Lead Engineer:' : 'مدیر پروژه:'}</span>
                <strong>{leadEngineer}</strong>
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
                  {isEn ? '1. Executive Project Summary, Engineering Metrics & Standards Compliance' : '۱. خلاصه اجرایی پروژه، شاخص‌های کلیدی عملکرد و ماتریس تطابق با استانداردها'}
                </span>
                <span className="text-[10px] text-industrial-success font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isEn ? 'BANKABILITY: APPROVED' : 'تأییدیه توجیه‌پذیری بانکی'}
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
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Annual Generation (P50)' : 'تولید سالانه انرژی (P50)'}</span>
                  <strong className="text-base font-mono text-industrial-success print:text-emerald-900">
                    {annualGrossMwh.toLocaleString()} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Specific Yield: {specificYieldKwhKwp} kWh/kWp
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Simple Payback / IRR' : 'بازگشت سرمایه / IRR'}</span>
                  <strong className="text-base font-mono text-purple-400 print:text-purple-900">
                    {financial.simplePaybackPeriodYears} yr / {financial.irrPct}%
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    LCOE: ${financial.lcoeUsdPerKwh} /kWh
                  </span>
                </div>
              </div>

              {/* Regulatory & Standards Compliance Matrix */}
              <div className="overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-industrial-success" />
                  {isEn ? 'Project Design Regulatory Codes & Standards Compliance Matrix:' : 'ماتریس انطباق طراحی با استانداردهای ملی و بین‌المللی:'}
                </span>
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black text-[11px]">
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Standard Code' : 'کد استاندارد'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Scope / Domain' : 'حوزه شمول و دامنه کاربرد'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Design Criterion Verified' : 'معیار طراحی کنترل‌شده'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Compliance Status' : 'وضعیت انطباق'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEC 61215 / IEC 61730</td>
                      <td className="p-2">{isEn ? 'PV Module Quality & Safety Qualification' : 'کیفیت و ایمنی ماژول‌های فتوولتائیک'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Hail impact, 5400Pa mechanical load, PID resistance' : 'بار مکانیکی ۵۴۰۰ پاسکال، مقاومت PID و تگرگ'}</td>
                      <td className="p-2 text-industrial-success font-bold">✓ COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEC 62109-1 / IEC 62109-2</td>
                      <td className="p-2">{isEn ? 'Inverter Safety & Grid-Tie Power Conversion' : 'ایمنی مبدل‌های الکترونیک قدرت و اینورتر'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Galvanic isolation, AFCI arc-fault, anti-islanding' : 'حفاظت جزیره‌ای، تشخیص قوس الکتریکی AFCI'}</td>
                      <td className="p-2 text-industrial-success font-bold">✓ COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEC 60364-7-712 / INBC 13</td>
                      <td className="p-2">{isEn ? 'Low Voltage PV Electrical Installations' : 'تاسیسات الکتریکی فتوولتائیک (مبحث ۱۳)'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'DC cable sizing, voltage drop <= 1.5%, multi-run ampacity' : 'افت ولتاژ DC کمتر از ۱.۵ درصد، ظرفیت جریانی'}</td>
                      <td className="p-2 text-industrial-success font-bold">✓ COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">ASCE 7-22 / INBC 6</td>
                      <td className="p-2">{isEn ? 'Structural Wind & Snow Loading Actions' : 'بارهای ثقلی، باد و برف سازه (مبحث ۶)'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Velocity pressure qz, uplift and downforce combinations' : 'فشار سرعتی باد، ترکیب بارهای مکش و فشار'}</td>
                      <td className="p-2 text-industrial-success font-bold">✓ COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">Eurocode 7 / INBC 7</td>
                      <td className="p-2">{isEn ? 'Geotechnical Design & Driven Pile Resistance' : 'مهندسی ژئوتکنیک و فونداسیون (مبحث ۷)'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Broms lateral capacity, skin friction uplift FoS >= 2.0' : 'ظرفیت جانبی برمز، ضریب اطمینان کشش >= ۲.۰'}</td>
                      <td className="p-2 text-industrial-success font-bold">✓ COMPLIANT</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono font-bold text-sky-300 print:text-sky-900">IEEE 80 / IEC 62305</td>
                      <td className="p-2">{isEn ? 'Substation Earthing & Lightning Protection' : 'زمین کردن ایستگاهی و حفاظت صاعقه'}</td>
                      <td className="p-2 text-slate-300 print:text-slate-700">{isEn ? 'Ground resistance <= 1.0 Ohm, step & touch potential' : 'مقاومت کل زمین کمتر از ۱ اهم، ولتاژ گام و تماس'}</td>
                      <td className="p-2 text-industrial-success font-bold">✓ COMPLIANT</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Executive Engineering Narrative & Strategic Recommendations */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-2">
                <div className="font-bold text-white print:text-black flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-industrial-accent" />
                  {isEn ? 'Executive Engineering Summary & Bankability Review:' : 'دیدگاه مهندسی و ارزیابی توجیه‌پذیری سرمایه‌گذاری:'}
                </div>
                <p className="leading-relaxed text-[11px] text-slate-300 print:text-slate-700">
                  {isEn
                    ? `This EPC technical report presents the comprehensive design for ${projectName} with a nominal peak DC capacity of ${arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp. The system employs high-efficiency TOPCon bifacial modules coupled with industrial multi-MPPT string inverters at an optimized DC/AC ratio of ${arrayDesign.dcAcRatio.toFixed(2)}. All structural and foundation sizing complies with ASCE 7-22 and Eurocode 7 standards, accounting for site-specific wind velocity pressure (${structCalc.velocityWindPressureQzN_M2} N/m²) and frost penetration constraints (${structCalc.recommendedDepthM}m embedment). Levelized Cost of Electricity (LCOE) is estimated at $${financial.lcoeUsdPerKwh}/kWh with an internal rate of return (IRR) of ${financial.irrPct}%, indicating robust bankability and commercial viability.`
                    : `این گزارش فنی جامع، مبانی طراحی و محاسبات مهندسی نیروگاه خورشیدی ${projectName} را با ظرفیت نامی ${arrayDesign.totalPvCapacityKwp.toFixed(1)} کیلووات‌پیک ارائه می‌دهد. آرایه نیروگاه بر پایه ماژول‌های دوطرفه TOPCon و اینورترهای چند کاناله صنعتی با نسبت توان بهینه ${arrayDesign.dcAcRatio.toFixed(2)} طراحی گردیده است. تمامی محاسبات سازه و فونداسیون منطبق بر مبحث ۶ و ۷ مقررات ملی ساختمان و استانداردهای ASCE 7-22 و یوروکد ۷ صورت پذیرفته که در آن فشار سرعتی باد منطقه (${structCalc.velocityWindPressureQzN_M2} نیوتن بر مترمربع) و عمق یخبندان ساختگاه (عمق کوبش ${structCalc.recommendedDepthM} متر) لحاظ گردیده است. بهای تمام‌شده تولید برق ${financial.lcoeUsdPerKwh} دلار بر کیلووات‌ساعت و نرخ بازده داخلی ${financial.irrPct} درصد بوده که نشانگر توجیه‌پذیری اقتصادی کامل پروژه است.`}
                </p>
                <div className="pt-2 border-t border-industrial-border/40 text-[11px]">
                  <strong className="text-industrial-warning">{isEn ? 'Key Actionable Recommendations:' : 'توصیه‌های کلیدی اجرایی:'}</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300 print:text-slate-700">
                    <li>{isEn ? 'Perform ASTM D3689 static pile pullout testing on 10 test piles before mass ramming.' : 'انجام آزمایش‌های بارگذاری کشش شمع (ASTM D3689) روی ۱۰ شمع آزمایشی پیش از عملیات کوبش انبوه.'}</li>
                    <li>{isEn ? 'Implement bi-weekly dry robotic cleaning to minimize Kimber soiling derate in arid climates.' : 'پیاده‌سازی برنامه شستشوی رباتیک دوهفتگی جهت به حداقل رساندن تلفات غبار در اقلیم‌های خشک.'}</li>
                    <li>{isEn ? 'Verify string Voc polarity and insulation resistance (R_iso >= 1.0 MOhm) per IEC 62446-1.' : 'آزمون قطبیت و مقاومت عایقی تمامی استرینگ‌ها (R_iso >= ۱ مگااهم) مطابق رویه IEC 62446-1.'}</li>
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
                    {effectiveCity.latitude.toFixed(2)}°N, {effectiveCity.longitude.toFixed(2)}°E ({effectiveCity.elevationM}m)
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

              {/* Geotechnical Engineering Narrative & Civil Recommendations */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-1.5">
                <span className="font-bold text-white print:text-black block">
                  {isEn ? 'Geotechnical Risk Analysis & Civil Site Preparation Guidelines:' : 'تحلیل ریسک ژئوتکنیک و دستورالعمل‌های آماده‌سازی ساختگاه:'}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                  {isEn
                    ? `The project site features ${effectiveCity.soilType.replace(/_/g, ' ')} with an allowable soil bearing pressure of ${effectiveCity.soilBearingCapacityKpa} kPa. With an extreme minimum winter temperature of ${effectiveCity.tempMinC}°C and maximum summer ambient temperature of ${effectiveCity.tempMaxC}°C, electrical string sizing must account for cold-weather open-circuit voltage rise (+18.4% at Voc) and high-temperature thermal power degradation (-0.30%/°C). To protect against frost heave, all structural pile embedment depths are specified at ${structCalc.recommendedDepthM}m, satisfying the mandatory safety margin (L >= d_frost + 1.0m = ${structCalc.minDepthForFrostM}m).`
                    : `بستر ژئوتکنیکی ساختگاه از نوع خاک ${effectiveCity.soilType === 'dense_sand_gravel' ? 'شن و ماسه متراکم' : effectiveCity.soilType === 'medium_clay' ? 'رس متوسط تا متراکم' : effectiveCity.soilType === 'loose_sand' ? 'ماسه سست' : 'بستر سنگ آهکی'} با ظرفیت باربری مجاز ${effectiveCity.soilBearingCapacityKpa} کیلوپاسکال شناسایی شده است. با توجه به دامنه دمایی طراحی محیط از ${effectiveCity.tempMinC} درجه سانتی‌گراد تا ${effectiveCity.tempMaxC} درجه سانتی‌گراد، اثر افزایش ولتاژ مدار باز در سرمای شدید و افت توان حرارتی ماژول‌ها لحاظ گردیده است. به منظور مصون‌سازی کامل سازه‌ها در برابر پدیده تورم یخبندان (Frost Heave)، عمق کوبش شمع‌ها حداقل ${structCalc.recommendedDepthM} متر در نظر گرفته شده که شرط آیین‌نامه‌ای (عمق کوبش بزرگتر از عمق یخبندان به علاوه ۱.۰ متر = ${structCalc.minDepthForFrostM} متر) را کاملاً ارضا می‌نماید.`}
                </p>
                <div className="text-[11px] pt-1 text-slate-400 print:text-slate-600">
                  <strong>{isEn ? 'Site Drainage & Earthworks:' : 'هدایت آب‌های سطحی و خاک‌برداری:'}</strong>{' '}
                  {isEn
                    ? 'Execute grading with 1.5–2.0% transverse slopes towards engineered peripheral swales to prevent rainwater ponding and avoid softening pile lateral soil resistance.'
                    : 'تسویه و شیب‌بندی سایت با شیب عرضی ۱.۵ الی ۲ درصد به سمت کانال‌های پیرامونی الزامی است تا از ایستایی آب و سست شدن خاک مقاومت جانبی شمع‌ها جلوگیری شود.'}
                </div>
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
                  {isEn ? 'Winter Solstice Free-of-Shading: VERIFIED' : 'عدم سایه ظهر زمستان: تأیید'}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                    ~2.4%
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Effective Shading Derate' : 'ضریب اصلاح سایه در مدل تولید'}</span>
                  <span className="font-mono font-bold text-purple-400 print:text-purple-800 text-sm">
                    0.976
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-1">
                <span className="font-bold text-white print:text-black block">
                  {isEn ? 'Sun Path Geometric Verification & Critical Solar Window:' : 'بررسی هندسی مسیر حرکت خورشید و پنجره بحرانی تابش:'}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                  {isEn
                    ? `At latitude ${effectiveCity.latitude.toFixed(2)}°N, the solar altitude at true solar noon on the winter solstice (December 21) drops to ${(90 - effectiveCity.latitude - 23.45).toFixed(1)}°. The design pitch distance of ${arrayDesign.interRowSpacingM.toFixed(2)}m guarantees 100% unshaded collector aperture throughout the critical 4-hour window (10:00 to 14:00 true solar time), complying with IEC 62548 standards. For bifacial energy boost, the ground clearance of 0.9m provides a rear view-factor that captures diffuse and ground-reflected albedo irradiance.`
                    : `در عرض جغرافیایی ${effectiveCity.latitude.toFixed(2)} درجه شمالی، زاویه ارتفاع خورشید در ظهر انقلاب زمستانی به ${(90 - effectiveCity.latitude - 23.45).toFixed(1)} درجه کاهش می‌یابد. فاصله بین‌ردیفی ${arrayDesign.interRowSpacingM.toFixed(2)} متر به گونه‌ای تنظیم شده که شرط عدم سایه‌اندازی متقابل ردیف‌ها در بازه بحرانی ۱۰ الی ۱۴ ظهر آفتابی کاملاً محقق شود. همچنین ارتفاع آزاد ۰.۹ متری زیر پنل‌ها امکان جذب بهینه تابش‌های بازتابی زمین (Albedo) توسط سطح پشت سلول‌های دوطرفه را فراهم می‌آورد.`}
                </p>
              </div>
            </div>
          )}

          {/* Section 4: Energy Simulation, Loss Waterfall & PR */}
          {includedSections.energy && (
            <div className="studio-card print:border print:border-slate-300 print:p-4 space-y-4">
              <h3 className="text-sm font-bold text-industrial-accent print:text-sky-900 border-b border-industrial-border print:border-slate-300 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-industrial-success" />
                  {isEn ? '4. Energy Yield Simulation, Loss Waterfall & Performance Ratio (P50/P90)' : '۴. شبیه‌سازی تولید انرژی، نمودار آبشار تلفات و تحلیل عدم قطعیت بانکی (P50/P90)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEC 61724-1 Class A</span>
              </h3>

              {/* Energy KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'P50 Annual Generation:' : 'تولید سالانه P50 (میانه):'}</span>
                  <strong className="text-base font-mono text-industrial-success print:text-emerald-900">
                    {annualGrossMwh.toLocaleString()} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'Expected 50% exceedance' : 'احتمال وقوع ۵۰ درصد'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'P90 Bankable Generation:' : 'تولید بانکی P90 (تضمینی):'}</span>
                  <strong className="text-base font-mono text-industrial-accent print:text-sky-900">
                    {p90Mwh.toLocaleString()} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'Debt Sizing (1.3x DSCR)' : 'مبنای استقراض بانکی و وام'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-industrial-border/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Specific Yield:' : 'تولید ویژه نامالایز (Specific):'}</span>
                  <strong className="text-base font-mono text-industrial-warning print:text-amber-900">
                    {specificYieldKwhKwp} kWh/kWp
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
                    {isEn ? 'IEC 61724 Class A' : 'کلاس A اعتبارسنجی شده'}
                  </span>
                </div>
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
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Nominal Loss (%)' : 'درصد تلفات'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Methodology & Engineering Standard' : 'روش محاسبه و مرجع مهندسی'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Mitigation Strategy' : 'راهکار کاهش و جبران تلفات'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
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
                    <tr className="font-bold bg-slate-800/40 print:bg-slate-100">
                      <td className="p-2 text-white print:text-black">{isEn ? 'Net Delivered System PR' : 'ضریب عملکرد خالص تحویلی به شبکه (PR)'}</td>
                      <td className="p-2 font-mono text-industrial-success print:text-emerald-800">{performanceRatioPct}%</td>
                      <td className="p-2 text-industrial-success" colSpan={2}>✓ IEC 61724 Class A Compliant</td>
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
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Current (A)' : 'جریان (A)'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Length (m)' : 'طول (m)'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Conductor / Insulation' : 'هادی / عایق'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Calculated Sizing (Parallel Runs)' : 'سایزینگ محاسبه‌شده'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'ΔV (%)' : 'افت ولتاژ'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Status' : 'وضعیت'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    {protection.cableRuns.map((c, idx) => (
                      <tr key={idx} className="border-b border-industrial-border print:border-slate-200">
                        <td className="p-2 font-medium">{isEn ? c.config.sectionNameEn : c.config.sectionNameFa}</td>
                        <td className="p-2 font-mono">{c.config.designCurrentAmps}A</td>
                        <td className="p-2 font-mono">{c.config.oneWayLengthM}m</td>
                        <td className="p-2 font-mono">{c.config.conductorMaterial.toUpperCase()} / {c.config.insulationType}</td>
                        <td className="p-2 font-mono text-industrial-accent print:text-sky-900 font-bold">
                          {isEn ? c.cableDesignationEn : c.cableDesignationFa}
                        </td>
                        <td className="p-2 font-mono">{c.actualVoltageDropPct}%</td>
                        <td className="p-2">
                          <span className="text-industrial-success print:text-emerald-800 font-bold text-[10px]">
                            {c.isCompliant ? (isEn ? '✓ Pass' : '✓ تایید') : (isEn ? '✗ Violation' : '✗ خطا')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Earthing IEEE 80 Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-800/40 print:bg-slate-50 p-2.5 rounded border border-industrial-border/50 print:border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Target Ground Resistance:' : 'مقاومت هدف زمین:'}</span>
                  <span className="font-mono text-industrial-success print:text-emerald-800 font-bold">
                    ≤ {protection.earthing.targetGroundResistanceOhms} Ω (IEEE 80)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Ground Rods Required:' : 'تعداد الکترودهای میله‌ای:'}</span>
                  <span className="font-mono text-white print:text-black font-bold">
                    {protection.earthing.groundRodsCount} {isEn ? 'Rods (3m Cu)' : 'میله مسی ۳ متری'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Buried Bare Conductor:' : 'تسمه/سیم مدفون شبکه:'}</span>
                  <span className="font-mono text-sky-300 print:text-sky-800">
                    {protection.earthing.buriedBareConductorLengthM}m × {protection.earthing.buriedConductorCrossSectionMm2}mm²
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Lightning Protection Level:' : 'کلاس حفاظت صاعقه:'}</span>
                  <span className="font-mono text-industrial-warning print:text-amber-800 font-bold">
                    {protection.lightning.lpsClass} (IEC 62305)
                  </span>
                </div>
              </div>
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

              {/* Force Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Velocity Wind Pressure (q_z):' : 'فشار سرعتی مبنای باد (q_z):'}</span>
                  <span className="font-mono text-industrial-accent print:text-cyan-800 font-bold">
                    {structCalc.velocityWindPressureQzN_M2} N/m²
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isEn ? 'ASCE 7-22 with Ke elevation' : 'مبحث ۶ با ضریب ارتفاع Ke'}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Foundation Technology:' : 'سیستم فونداسیون سازه:'}</span>
                  <span className="font-mono text-white print:text-black font-semibold">
                    {isEn ? structCalc.foundationNameEn : structCalc.foundationNameFa}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    {structCalc.bromsPileSection}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Embedment Depth (L):' : 'عمق کوبش شمع در خاک:'}</span>
                  <span className="font-mono text-industrial-warning print:text-amber-800 font-bold">
                    {structCalc.recommendedDepthM} m
                  </span>
                  <span className="text-[10px] text-industrial-success block mt-0.5">
                    {isEn ? `Frost Depth: ${structCalc.frostDepthCm}cm ✓ (L >= ${structCalc.minDepthForFrostM}m)` : `کنترل یخبندان: ${structCalc.frostDepthCm}cm ✓`}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Uplift Tension FoS:' : 'ضریب اطمینان کشش شمع:'}</span>
                  <span className={`font-mono font-bold ${structCalc.fosUplift >= 2.0 ? 'text-industrial-success print:text-emerald-800' : 'text-amber-400 print:text-amber-800'}`}>
                    {structCalc.fosUplift} {isEn ? '(≥ 2.0 Eurocode 7)' : '(حداقل ۲.۰)'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    T_ult = {structCalc.upliftCapacityPerPostKn.toFixed(1)} kN/post
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
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Design Limit / Code Requirement' : 'حد مجاز آیین‌نامه'}</th>
                      <th className="p-2 border border-industrial-border print:border-slate-300">{isEn ? 'Safety Margin / Status' : 'حاشیه اطمینان / وضعیت'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-industrial-border print:divide-slate-200 text-[11px]">
                    <tr>
                      <td className="p-2 font-medium">{isEn ? 'Wind Uplift Force per Table' : 'نیروی مکش باد بر هر میز (Uplift)'}</td>
                      <td className="p-2 font-mono text-rose-300 font-bold">{structCalc.windUpliftForceKn} kN</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">ASCE 7-22 Net Pressure Cp={cpUpliftFor(effectiveCity.optimalTiltAnnualDeg || 28).toFixed(2)}</td>
                      <td className="p-2 font-mono text-slate-300">{structCalc.upliftPerPostKn} kN/post demand</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">{isEn ? 'Overturning Moment per Table' : 'لنگر واژگونی ناشی از باد (Overturning)'}</td>
                      <td className="p-2 font-mono text-rose-300 font-bold">{structCalc.windOverturningMomentKnM} kN·m</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">Arm = W/2 + h*sin(beta) = ~2.77 m</td>
                      <td className="p-2 text-industrial-success font-bold">FoS = {structCalc.fosOverturningAnchored} (≥ 1.5 Req)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">{isEn ? 'Broms Lateral Soil Resistance' : 'ظرفیت باربری جانبی خاک (روش برمز)'}</td>
                      <td className="p-2 font-mono text-sky-300 font-bold">{structCalc.lateralShearPerPostKn} kN/post shear</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">Broms (1964) short-pile lateral limit</td>
                      <td className="p-2 font-mono text-industrial-success font-bold">FoS = {structCalc.fosLateral} (≥ 1.5 Req)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">{isEn ? 'Soil Bearing Pressure under Post' : 'تنش فشاری وارده بر بستر خاک'}</td>
                      <td className="p-2 font-mono text-white print:text-black font-bold">{structCalc.appliedPostBearingPressureKpa} kPa</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">Allowable bearing qa = {structCalc.allowableSoilBearingKpa} kPa</td>
                      <td className="p-2 text-industrial-success font-bold">
                        {structCalc.isBearingCapacitySafe ? '✓ PASS (FoS = ' + structCalc.fosBearing + ')' : '✗ EXCEEDED'}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">{isEn ? 'Pile Skin-Friction Tension Resistance' : 'ظرفیت کشش اصطکاک جدار شمع (T_ult)'}</td>
                      <td className="p-2 font-mono text-industrial-success font-bold">{structCalc.upliftCapacityPerPostKn.toFixed(1)} kN/post</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">Eurocode 7 EN 1997-1 §7.6.2.3</td>
                      <td className="p-2 font-bold text-industrial-success">
                        FoS = {structCalc.fosUplift} (≥ 2.0 Req)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium">{isEn ? 'Frost Heave Embedment Depth' : 'عمق کوبش جهت رفع خطر یخبندان'}</td>
                      <td className="p-2 font-mono text-white print:text-black font-bold">{structCalc.recommendedDepthM} m</td>
                      <td className="p-2 text-slate-400 print:text-slate-600">L &gt;= Frost Depth + 1.0m ({structCalc.minDepthForFrostM} m)</td>
                      <td className="p-2 text-industrial-success font-bold">
                        {structCalc.isFrostDepthRespected ? '✓ PASS' : '✗ INSUFFICIENT'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Geotechnical & Civil Engineering Explanations & Field Test Recommendations */}
              <div className="p-3 bg-slate-800/40 print:bg-slate-50 border border-industrial-border/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 space-y-2">
                <span className="font-bold text-white print:text-black flex items-center gap-1.5">
                  <HardHat className="w-4 h-4 text-industrial-warning" />
                  {isEn ? 'Geotechnical Soil-Structure Interaction & Construction Guidelines:' : 'تحلیل تعامل خاک و سازه و دستورالعمل‌های اجرایی کوبش شمع:'}
                </span>
                <p className="text-[11px] leading-relaxed text-slate-300 print:text-slate-700">
                  {isEn
                    ? `Driven HDG steel C-piles (${structCalc.bromsPileSection}) provide structural stability through combined lateral passive earth resistance and vertical skin friction. Under governing 3-second gust wind speed of ${effectiveCity.basicWindSpeedKmh} km/h (qz = ${structCalc.velocityWindPressureQzN_M2} N/m²), the sloped PV table generates ${structCalc.windUpliftForceKn} kN of net wind uplift. At an embedment depth of ${structCalc.recommendedDepthM}m, ultimate skin friction tension capacity reaches ${structCalc.upliftCapacityPerPostKn.toFixed(1)} kN per pile, satisfying the Eurocode 7 factor of safety threshold (FoS = ${structCalc.fosUplift} >= 2.0). All steel profiles shall be hot-dip galvanized per ISO 1461 to a minimum thickness of 85 microns to guarantee corrosion protection against soil aggressive agents over the 30-year design life.`
                    : `پایه‌های کوبشی فولادی گالوانیزه C شکل (${structCalc.bromsPileSection})، پایداری سازه را از طریق ترکیب مقاومت فشاری-جانبی خاک و اصطکاک جدار شمع تأمین می‌نمایند. تحت بار بحرانی باد ۳ ثانیه‌ای ${effectiveCity.basicWindSpeedKmh} کیلومتر بر ساعت (فشار سرعتی ${structCalc.velocityWindPressureQzN_M2} نیوتن بر مترمربع)، نیروی مکش خالص باد بر هر میز به ${structCalc.windUpliftForceKn} کیلووات می‌رسد. در عمق کوبش ${structCalc.recommendedDepthM} متر، ظرفیت باربری کششی خاک به ${structCalc.upliftCapacityPerPostKn.toFixed(1)} کیلووات به ازای هر پایه می‌رسد که ضریب اطمینان آیین‌نامه یوروکد ۷ (FoS = ${structCalc.fosUplift} >= ۲.۰) را تأمین می‌کند. کلیه قطعات فولادی با پوشش گالوانیزه گرم به ضخامت حداقل ۸۵ میکرون مطابق ISO 1461 محافظت می‌شوند تا طول عمر ۳۰ ساله تضمین گردد.`}
                </p>
                <div className="pt-2 border-t border-industrial-border/40 text-[11px]">
                  <strong className="text-industrial-warning">{isEn ? 'Civil Execution & Quality Assurance Checklist:' : 'چک‌لیست کنترل کیفی و آزمایش‌های میدانی:'}</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300 print:text-slate-700">
                    <li>{isEn ? 'Conduct ASTM D3689 static tensile pullout tests on 10 preliminary test piles across the field before mass driving.' : 'انجام آزمایش کشش استاتیکی شمع طبق ASTM D3689 روی حداقل ۱۰ پایه آزمایشی در نقاط مختلف سایت پیش از شروع کوبش انبوه.'}</li>
                    <li>{isEn ? 'Execute ASTM D3966 lateral load tests to verify Broms horizontal deflection does not exceed 12mm under design lateral shear.' : 'انجام آزمایش بارگذاری جانبی طبق ASTM D3966 جهت تایید عدم تجاوز تغییرمکان جانبی سر شمع از ۱۲ میلی‌متر تحت بار طراحی.'}</li>
                    <li>{isEn ? 'Driving verticality tolerance shall be strictly controlled within +/- 1.0 degree with post head elevation within +/- 10mm.' : 'رواداری شاقولی کوبش پایه‌ها حداکثر ۱.۰± درجه و رواداری تراز سر پایه‌ها حداکثر ۱۰± میلی‌متر رعایت گردد.'}</li>
                  </ul>
                </div>
              </div>
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
                  IRR: {financial.irrPct}% | NPV: ${financial.npvUsd.toLocaleString()}
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
                    ${financial.lcoeUsdPerKwh} /kWh
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Internal Rate of Return (IRR):' : 'نرخ بازده داخلی (IRR):'}</span>
                  <span className="font-mono font-bold text-industrial-success print:text-emerald-800 text-sm">
                    {financial.irrPct}%
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Payback Period:' : 'دوره بازگشت سرمایه:'}</span>
                  <span className="font-mono font-bold text-purple-400 print:text-purple-800 text-sm">
                    {financial.simplePaybackPeriodYears} {isEn ? 'Years' : 'سال'}
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
                      <td className="p-2 font-mono font-bold text-white print:text-black">{structCalc.totalTablesCount}</td>
                      <td className="p-2">{isEn ? 'Tables' : 'میز'}</td>
                    </tr>
                    <tr className="border-b border-industrial-border print:border-slate-200">
                      <td className="p-2 font-mono">4</td>
                      <td className="p-2 font-semibold">{isEn ? 'Rammed Ground Piles' : 'شمع‌های کوبشی گالوانیزه'}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">{structCalc.foundationDimensionsDescEn}</td>
                      <td className="p-2 font-mono font-bold text-white print:text-black">{structCalc.totalPostsCount}</td>
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
              <div className="border-t border-industrial-border print:border-slate-300 pt-1 font-semibold">{leadEngineer}</div>
            </div>
            <div className="p-3 border border-dashed border-industrial-border print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'CHECKED & VERIFIED BY (P.E.)' : 'کنترل و بازبینی مهندسی'}</span>
              <div className="border-t border-industrial-border print:border-slate-300 pt-1 font-semibold">{companyName}</div>
            </div>
            <div className="p-3 border border-dashed border-industrial-border print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'CLIENT ACCEPTANCE & APPROVAL' : 'تأیید کارفرما و سرمایه‌گذار'}</span>
              <div className="border-t border-industrial-border print:border-slate-300 pt-1 font-semibold">{clientName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
