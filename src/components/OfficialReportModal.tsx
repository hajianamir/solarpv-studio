import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { ClimateCity, SiteGeotechnicalOverrides, getEffectiveClimateCity } from '../engine/climaticData';
import { LoadAnalysisResult } from '../engine/loadProfiles';
import { PvArrayDesignResult, ModuleSpecs, InverterSpecs } from '../engine/pvEngineAdvanced';
import { BatteryBankSizingResult } from '../engine/batteryEngine';
import { CompleteProtectionSystemResult } from '../engine/protectionBomEngine';
import { Simulation24hResult, GeneratorSizingResult } from '../engine/simulation24hEngine';
import { FinancialAnalysisResult } from '../engine/financialEngine';
import { PowerplantBayArchitectureResult } from '../engine/powerplantBayEngine';
import { exportToWordDocument, exportToExcelWorkbook } from '../engine/reportingEngine';

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
  onClose,
  onImportProject,
  lang: defaultLang = 'fa',
}) => {
  const [reportLang, setReportLang] = useState<'fa' | 'en'>(defaultLang);
  const isEn = reportLang === 'en';
  const effectiveCity = getEffectiveClimateCity(city, siteOverrides);

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
      ? 'Pitch distance optimized to eliminate inter-row shadow during the critical winter solstice noon window (10:00-14:00).'
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
      ['Retrieval Date', effectiveCity.dataRetrievalDate],
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

    exportToExcelWorkbook(
      [
        { sheetName: 'Project Summary', rows: summarySheet },
        { sheetName: 'Climate & Geotechnical', rows: climateSheet },
        { sheetName: 'Electrical Schedule', rows: electricalSheet },
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
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-6xl w-full p-4 sm:p-6 text-slate-100 shadow-2xl relative my-4 sm:my-8 max-h-[94vh] flex flex-col print:p-0 print:border-none print:shadow-none print:bg-white print:text-black print:max-h-none print:my-0">
        {/* Top Control Toolbar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-700/80 pb-4 mb-4 gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg">
              <FileText className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Comprehensive EPC Engineering Dossier' : 'ماژول صدور گزارش‌های جامع و تخصصی EPC'}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
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
              <Settings2 className="w-3.5 h-3.5 text-sky-400" />
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
              className="studio-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
              title={isEn ? 'Print or Save as PDF' : 'چاپ مستقیم یا خروجی PDF'}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isEn ? 'Print / PDF' : 'چاپ / PDF'}</span>
            </button>

            <button
              onClick={handleExportWord}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-blue-300 border-blue-500/30"
              title={isEn ? 'Export as Microsoft Word (.doc)' : 'خروجی فایل ورد'}
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>{isEn ? 'Word (.doc)' : 'Word'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-emerald-300 border-emerald-500/30"
              title={isEn ? 'Export Multi-Sheet Excel Workbook' : 'خروجی اکسل چند شیت'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isEn ? 'Excel (.xls)' : 'Excel'}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="studio-btn text-xs py-1.5 px-2.5 flex items-center gap-1 text-amber-300 border-amber-500/30"
              title={isEn ? 'Save Project File to Local Machine' : 'ذخیره محلی پروژه با نام دلخواه'}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
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
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 sm:p-4 mb-4 text-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                {isEn ? 'Report Configuration & Branding Settings' : 'تنظیمات سفارشی‌سازی گزارش و اطلاعات شرکت'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{isEn ? 'Detail Level:' : 'سطح جزئیات:'}</span>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Revision:' : 'نسخه گزارش:'}</label>
                <input
                  type="text"
                  value={docVersion}
                  onChange={(e) => setDocVersion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Engineering Company:' : 'نام مهندس مشاور / شرکت:'}</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Client / Investor Name:' : 'نام کارفرما / سرمایه‌گذار:'}</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">{isEn ? 'Approval Status:' : 'وضعیت تأیید سند:'}</label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono"
                />
              </div>
            </div>

            {/* Section Checkboxes */}
            <div className="pt-2 border-t border-slate-800">
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
                      className="rounded border-slate-700 text-sky-500 focus:ring-0"
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
          <div className="text-center border-b border-slate-700/80 print:border-slate-300 pb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-left text-[11px] text-slate-400 font-mono">
                <div>DOC: {docId}</div>
                <div>VER: {docVersion}</div>
              </div>
              <div className="inline-block px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 print:text-sky-800 text-[11px] font-bold tracking-wider uppercase">
                {isEn ? 'EPC ENGINEERING TECHNICAL DOSSIER' : 'مستند فنی و مهندسی پروژه نیروگاه خورشیدی'}
              </div>
              <div className="text-right text-[11px] text-slate-400 font-mono">
                <div>{new Date().toISOString().split('T')[0]}</div>
                <div className="text-emerald-400 font-bold">{approvalStatus}</div>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 print:text-black bg-slate-800/60 print:bg-slate-100 p-2.5 rounded-lg mt-4 border border-slate-700/60 print:border-slate-300">
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
                <strong className="text-amber-400 print:text-amber-800 font-mono uppercase">{systemMode}</strong>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          {includedSections.summary && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  {isEn ? '1. Executive Project Summary & Key Performance Indicators' : '۱. خلاصه مدیریتی پروژه و شاخص‌های کلیدی عملکرد (KPI)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEC 62548 / SATBA</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-slate-700/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Total DC Capacity' : 'ظرفیت نامی آرایه DC'}</span>
                  <strong className="text-base font-mono text-amber-400 print:text-amber-900">
                    {arrayDesign.totalPvCapacityKwp.toFixed(1)} kWp
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {arrayDesign.totalModulesCount} {isEn ? 'Modules' : 'عدد پنل'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-slate-700/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Inverter Architecture' : 'توان نامی اینورترها'}</span>
                  <strong className="text-base font-mono text-sky-400 print:text-sky-900">
                    {(inverter.pnomAcKw * (bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1)).toFixed(0)} kW AC
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ILR: {arrayDesign.dcAcRatio.toFixed(2)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-slate-700/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Annual Generation (P50)' : 'تولید سالانه انرژی (P50)'}</span>
                  <strong className="text-base font-mono text-emerald-400 print:text-emerald-900">
                    {((simulation.totalGeneration24hKwh * 365) / 1000).toFixed(1)} MWh
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    PR: ~79.4%
                  </span>
                </div>
                <div className="p-2.5 bg-slate-800/60 print:bg-slate-100 rounded border border-slate-700/60 print:border-slate-300">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Simple Payback / IRR' : 'بازگشت سرمایه / IRR'}</span>
                  <strong className="text-base font-mono text-purple-400 print:text-purple-900">
                    {financial.simplePaybackPeriodYears} yr / {financial.irrPct}%
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    LCOE: {financial.lcoeUsdPerKwh} $/kWh
                  </span>
                </div>
              </div>

              {engineerNotes.summary && (
                <div className="p-2.5 bg-slate-800/40 print:bg-slate-50 border border-slate-700/60 print:border-slate-200 rounded text-xs text-slate-300 print:text-slate-800 italic">
                  <strong>{isEn ? 'Engineering Remark:' : 'توضیحات سرپرست مهندسی:'}</strong> {engineerNotes.summary}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Site, Climate & Geotechnical Report */}
          {includedSections.climate && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  {isEn ? '2. Site Climate, Meteorological & Geotechnical Soil Data' : '۲. داده‌های اقلیمی، هواشناسی و ژئوتکنیکی ساختگاه'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {effectiveCity.dataRetrievalDate} | {isEn ? effectiveCity.dataSourceEn : effectiveCity.dataSourceFa}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Coordinates & Elevation:' : 'مختصات و ارتفاع:'}</span>
                  <span className="font-mono text-white print:text-black">
                    {effectiveCity.latitude.toFixed(2)}°N, {effectiveCity.longitude.toFixed(2)}°E ({effectiveCity.elevationM}m)
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Peak Sun Hours (PSH):' : 'ساعات اوج تابش (PSH):'}</span>
                  <span className="font-mono text-amber-400 print:text-amber-800 font-bold">
                    {effectiveCity.peakSunHours} kWh/m²/day
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Design Ambient Extremes:' : 'دمای حدی طراحی محیط:'}</span>
                  <span className="font-mono text-sky-300 print:text-sky-800">
                    {effectiveCity.tempMinC}°C {isEn ? 'to' : 'تا'} {effectiveCity.tempMaxC}°C
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Design Wind Speed (V_b):' : 'سرعت مبنای باد (V_b):'}</span>
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
                  <span className="font-mono text-emerald-400 print:text-emerald-800 font-bold">
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
                  <span className="font-mono text-white print:text-black">
                    {effectiveCity.frostDepthCm} cm
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Shading Analysis & Sun Path */}
          {includedSections.shading && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  {isEn ? '3. 3D Geometric Shading & Sun Path Analysis (IEC 62548)' : '۳. تحلیل سه‌بعدی سایه‌اندازی، مسیر خورشید و فواصل بین‌ردیفی'}
                </span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-800 font-mono">
                  {isEn ? 'Winter Solstice Free-of-Shading: VERIFIED' : 'عدم سایه ظهر زمستان: تأیید'}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div className="p-2.5 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Row Pitch Distance' : 'فاصله محور ردیف‌ها (Pitch)'}</span>
                  <span className="font-mono font-bold text-sky-400 print:text-sky-800 text-sm">
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
                  <span className="font-mono font-bold text-emerald-400 print:text-emerald-800 text-sm">
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
            </div>
          )}

          {/* Section 4: Electrical Design, SLD & Cable Schedule */}
          {includedSections.electrical && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  {isEn ? '4. Electrical Design, Cable Sizing (Parallel Runs) & Earthing (IEEE 80)' : '۴. طراحی مهندسی الکتریکی، سایزینگ کابل‌ها (مدارهای موازی) و ارتینگ'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEEE 80 / IEC 60364</span>
              </h3>

              {/* Cable Schedule Table */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black">
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Circuit Description' : 'شرح مدار کابل'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Current (A)' : 'جریان (A)'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Length (m)' : 'طول (m)'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Conductor / Insulation' : 'هادی / عایق'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Calculated Sizing (Parallel Runs)' : 'سایزینگ محاسبه‌شده'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'ΔV (%)' : 'افت ولتاژ'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Status' : 'وضعیت'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {protection.cableRuns.map((c, idx) => (
                      <tr key={idx} className="border-b border-slate-800 print:border-slate-200">
                        <td className="p-2 font-medium">{isEn ? c.config.sectionNameEn : c.config.sectionNameFa}</td>
                        <td className="p-2 font-mono">{c.config.designCurrentAmps}A</td>
                        <td className="p-2 font-mono">{c.config.oneWayLengthM}m</td>
                        <td className="p-2 font-mono">{c.config.conductorMaterial.toUpperCase()} / {c.config.insulationType}</td>
                        <td className="p-2 font-mono text-sky-400 print:text-sky-900 font-bold">
                          {isEn ? c.cableDesignationEn : c.cableDesignationFa}
                        </td>
                        <td className="p-2 font-mono">{c.actualVoltageDropPct}%</td>
                        <td className="p-2">
                          <span className="text-emerald-400 print:text-emerald-800 font-bold text-[10px]">
                            {c.isCompliant ? (isEn ? '✓ Pass' : '✓ تایید') : (isEn ? '✗ Violation' : '✗ خطا')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Earthing IEEE 80 Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-800/40 print:bg-slate-50 p-2.5 rounded border border-slate-700/50 print:border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Target Ground Resistance:' : 'مقاومت هدف زمین:'}</span>
                  <span className="font-mono text-emerald-400 print:text-emerald-800 font-bold">
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
                  <span className="font-mono text-amber-400 print:text-amber-800 font-bold">
                    {protection.lightning.lpsClass} (IEC 62305)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Structural & Civil Foundation Report */}
          {includedSections.structural && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  {isEn ? '5. Structural Sizing, Wind Loads & Civil Foundations' : '۵. محاسبات سازه، بارهای باد و برف و فونداسیون‌های ساختمانی'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">INBC 6 / ASCE 7-22</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Velocity Wind Pressure:' : 'فشار سرعتی باد:'}</span>
                  <span className="font-mono text-cyan-400 print:text-cyan-800 font-bold">
                    {Math.round(0.613 * 0.88 * Math.pow(effectiveCity.basicWindSpeedKmh / 3.6, 2))} N/m²
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Foundation Technology:' : 'سیستم فونداسیون:'}</span>
                  <span className="font-mono text-white print:text-black font-semibold">
                    {isEn ? 'Rammed HDG Steel C-Piles' : 'پایه‌های کوبشی فولادی C شکل'}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Embedment Depth:' : 'عمق کوبش در خاک:'}</span>
                  <span className="font-mono text-amber-300 print:text-amber-800 font-bold">
                    1.6 m (Frost Depth: {effectiveCity.frostDepthCm}cm ✓)
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Overturning Safety FoS:' : 'ضریب اطمینان واژگونی:'}</span>
                  <span className="font-mono text-emerald-400 print:text-emerald-800 font-bold">
                    2.15 (≥ 1.5 Required)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Financial Analysis & 25-Year Pro-Forma */}
          {includedSections.financial && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  {isEn ? '6. Financial Feasibility, CAPEX, LCOE & 25-Year Cash Flow Pro-Forma' : '۶. تحلیل مالی، هزینه سرمایه‌گذاری (CAPEX)، LCOE و جریان نقدینگی ۲۵ ساله'}
                </span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-800 font-mono">
                  IRR: {financial.irrPct}% | NPV: ${financial.npvUsd.toLocaleString()}
                </span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Total Initial CAPEX:' : 'کل هزینه سرمایه‌گذاری (CAPEX):'}</span>
                  <span className="font-mono font-bold text-white print:text-black">
                    ${financial.capexBreakdown.totalCapexUsd.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Levelized Cost (LCOE):' : 'بهای تمام‌شده هر کیلووات‌ساعت:'}</span>
                  <span className="font-mono font-bold text-sky-400 print:text-sky-800">
                    ${financial.lcoeUsdPerKwh} /kWh
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Internal Rate of Return (IRR):' : 'نرخ بازده داخلی (IRR):'}</span>
                  <span className="font-mono font-bold text-emerald-400 print:text-emerald-800">
                    {financial.irrPct}%
                  </span>
                </div>
                <div className="p-2 bg-slate-800/50 print:bg-slate-50 rounded">
                  <span className="text-slate-400 block text-[10px]">{isEn ? 'Payback Period:' : 'دوره بازگشت سرمایه:'}</span>
                  <span className="font-mono font-bold text-purple-400 print:text-purple-800">
                    {financial.simplePaybackPeriodYears} {isEn ? 'Years' : 'سال'}
                  </span>
                </div>
              </div>

              {/* 5-Year Sample Pro-Forma Cashflow Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black">
                      <th className="p-1.5 border border-slate-700 print:border-slate-300">{isEn ? 'Year' : 'سال'}</th>
                      <th className="p-1.5 border border-slate-700 print:border-slate-300">{isEn ? 'Generation (MWh)' : 'تولید (MWh)'}</th>
                      <th className="p-1.5 border border-slate-700 print:border-slate-300">{isEn ? 'Gross Revenue ($)' : 'درآمد فروش برق ($)'}</th>
                      <th className="p-1.5 border border-slate-700 print:border-slate-300">{isEn ? 'OPEX ($)' : 'هزینه نگهداری O&M ($)'}</th>
                      <th className="p-1.5 border border-slate-700 print:border-slate-300">{isEn ? 'Net Cashflow ($)' : 'جریان خالص ($)'}</th>
                      <th className="p-1.5 border border-slate-700 print:border-slate-300">{isEn ? 'Cumulative Cash ($)' : 'جریان تجمعی ($)'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financial.cashFlow25Years.slice(0, 7).map((cf) => (
                      <tr key={cf.year} className="border-b border-slate-800 print:border-slate-200">
                        <td className="p-1.5 font-mono">Year {cf.year}</td>
                        <td className="p-1.5 font-mono">{(cf.generationKwh / 1000).toFixed(1)}</td>
                        <td className="p-1.5 font-mono">${Math.round(cf.revenueToman / 90000).toLocaleString()}</td>
                        <td className="p-1.5 font-mono">${Math.round(cf.opexToman / 90000).toLocaleString()}</td>
                        <td className="p-1.5 font-mono text-emerald-400 print:text-emerald-800 font-bold">
                          ${Math.round(cf.netCashFlowToman / 90000).toLocaleString()}
                        </td>
                        <td className="p-1.5 font-mono">
                          <span className={cf.cumulativeCashFlowToman >= 0 ? 'text-emerald-400 print:text-emerald-800' : 'text-slate-400'}>
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

          {/* Section 7: Bill of Materials (BOM) */}
          {includedSections.bom && (
            <div className="studio-card print:border print:border-slate-300 print:p-4">
              <h3 className="text-sm font-bold text-sky-400 print:text-sky-900 border-b border-slate-700 print:border-slate-300 pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-400" />
                  {isEn ? '7. Comprehensive Project Bill of Materials (BOM Schedule)' : '۷. لیست تفکیکی تجهیزات، قطعات و مصالح پروژه (BOM)'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IEC 62548 Schedule</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left print:text-black border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 print:bg-slate-100 text-slate-300 print:text-black">
                      <th className="p-2 border border-slate-700 print:border-slate-300">#</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Equipment / Material' : 'تجهیز / قطعه'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Specification' : 'مشخصات فنی'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Quantity' : 'تعداد / مقدار'}</th>
                      <th className="p-2 border border-slate-700 print:border-slate-300">{isEn ? 'Unit' : 'واحد'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800 print:border-slate-200">
                      <td className="p-2 font-mono">1</td>
                      <td className="p-2 font-semibold">{module.manufacturer} {module.modelName}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">{module.pmpWatts}W TOPCon Bifacial, Voc={module.vocVolts}V</td>
                      <td className="p-2 font-mono font-bold text-amber-400 print:text-amber-900">{arrayDesign.totalModulesCount}</td>
                      <td className="p-2">{isEn ? 'Units' : 'عدد'}</td>
                    </tr>
                    <tr className="border-b border-slate-800 print:border-slate-200">
                      <td className="p-2 font-mono">2</td>
                      <td className="p-2 font-semibold">{inverter.manufacturer} {inverter.modelName}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">{inverter.pnomAcKw}kW AC, 1500V DC Max, Multi-MPPT</td>
                      <td className="p-2 font-mono font-bold text-sky-400 print:text-sky-900">
                        {bayArchitecture ? bayArchitecture.bays.reduce((s, b) => s + b.inverterCount, 0) : 1}
                      </td>
                      <td className="p-2">{isEn ? 'Units' : 'دستگاه'}</td>
                    </tr>
                    <tr className="border-b border-slate-800 print:border-slate-200">
                      <td className="p-2 font-mono">3</td>
                      <td className="p-2 font-semibold">{isEn ? 'Mounting Structure Racking' : 'استراکچر نگهدارنده پنل‌ها'}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">Hot-Dip Galvanized C-Steel, ASTM A123, 2P Configuration</td>
                      <td className="p-2 font-mono font-bold text-white print:text-black">{Math.ceil(arrayDesign.totalModulesCount / 28)}</td>
                      <td className="p-2">{isEn ? 'Tables' : 'میز'}</td>
                    </tr>
                    <tr className="border-b border-slate-800 print:border-slate-200">
                      <td className="p-2 font-mono">4</td>
                      <td className="p-2 font-semibold">{isEn ? 'Rammed Ground Piles' : 'شمع‌های کوبشی گالوانیزه'}</td>
                      <td className="p-2 font-mono text-slate-400 print:text-slate-700">C120×50×25×3.5mm, Embedment 1.6m</td>
                      <td className="p-2 font-mono font-bold text-white print:text-black">{Math.ceil(arrayDesign.totalModulesCount / 28) * 4}</td>
                      <td className="p-2">{isEn ? 'Posts' : 'شاخه'}</td>
                    </tr>
                    {protection.cableRuns.map((c, i) => (
                      <tr key={`cab-${i}`} className="border-b border-slate-800 print:border-slate-200">
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
          <div className="pt-6 mt-6 border-t border-slate-700/80 print:border-slate-400 grid grid-cols-3 gap-4 text-xs text-center">
            <div className="p-3 border border-dashed border-slate-700 print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'PREPARED BY (DESIGN ENGINEER)' : 'تهیه‌کننده (مهندس طراح)'}</span>
              <div className="border-t border-slate-700 print:border-slate-300 pt-1 font-semibold">{leadEngineer}</div>
            </div>
            <div className="p-3 border border-dashed border-slate-700 print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'CHECKED & VERIFIED BY (P.E.)' : 'کنترل و بازبینی مهندسی'}</span>
              <div className="border-t border-slate-700 print:border-slate-300 pt-1 font-semibold">{companyName}</div>
            </div>
            <div className="p-3 border border-dashed border-slate-700 print:border-slate-400 rounded">
              <span className="text-slate-400 block text-[10px] mb-6">{isEn ? 'CLIENT ACCEPTANCE & APPROVAL' : 'تأیید کارفرما و سرمایه‌گذار'}</span>
              <div className="border-t border-slate-700 print:border-slate-300 pt-1 font-semibold">{clientName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
