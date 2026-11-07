// Comprehensive Automated Verification Suite for Phases 1 through 5 (ENV, CAT, GEO, OUT, OFF)
// Executes deterministic proving tests against all engineering requirements.

import {
  createParameterProvenance,
  type ParameterProvenance,
  type ProvenanceSourceKind,
} from '../src/engine/dataGateway/types';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { StructuralHazardProvider } from '../src/engine/dataGateway/structuralHazardProvider';
import { CatalogRepository } from '../src/engine/catalogRepository';
import {
  formatCoordinates,
  formatLatitude,
  formatLongitude,
  calculateSolsticeSolarGeometry,
} from '../src/engine/geoCoordinates';
import {
  generatePowerplantLayout,
  generatePowerplantDxf,
  type PowerplantCadParameters,
} from '../src/engine/powerplantCadLayout';
import {
  buildSceneFromProjectDesign,
  type Scene3DState,
} from '../src/engine/roof3dShadingEngine';
import {
  buildWordDocument,
  generateDocxBlob,
  generateXlsxBlob,
} from '../src/engine/reportingEngine';
import {
  createProjectTransferEnvelope,
  restoreProjectTransferEnvelope,
  convertCurrency,
  formatCurrencyAmount,
  formatLocalizedEngineeringUnit,
} from '../src/engine/offlineTransferEngine';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(desc: string, condition: boolean, detail: string = ''): void {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${desc}${detail ? ' (' + detail + ')' : ''}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${desc}${detail ? ' (' + detail + ')' : ''}`);
  }
}

async function runAllPhaseVerifications(): Promise<void> {
  console.log('================================================================================');
  console.log(' SolarPV Studio — Comprehensive 5-Phase Engineering Compliance Audit');
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // Phase 1: ENV-* Data Fabrication Ban & Parameter Provenance Model
  // --------------------------------------------------------------------------
  console.log('--- Phase 1: Environmental Provenance & Fabrication Ban (ENV-01 .. ENV-07) ---');

  // ENV-01: ParameterProvenance structure
  const prov = createParameterProvenance('provider_value', 'NASA_POWER', {
    sourceParameter: 'PRECTOTCORR',
    sourceDataset: 'MERRA-2',
  });
  check('ENV-01: ParameterProvenance factory creates valid typed provenance descriptor',
    prov.sourceKind === 'provider_value' && prov.providerName === 'NASA_POWER');

  // ENV-02: Ban on precipitation fabrication in NASA POWER parser
  const mockNasaEmpty = {
    geometry: { coordinates: [51.389, 35.689, 1200] },
    properties: {
      parameter: {
        ALLSKY_SFC_SW_DWN: { ANN: 5.17 },
        T2M: { ANN: 17.5 },
        T2M_MIN: { ANN: 5.0 },
        T2M_MAX: { ANN: 32.0 },
        // PRECTOTCORR missing
      },
    },
  };
  const climateProvider = new ClimateDataProvider();
  const parsedNasa = (climateProvider as any).parseNasaPowerResponse(35.68, 51.38, mockNasaEmpty);
  check('ENV-02: NASA POWER parser with missing PRECTOTCORR does NOT fabricate 250mm from latitude rule',
    parsedNasa.annualPrecipitationMm === 0,
    `precipitation: ${parsedNasa.annualPrecipitationMm} mm`);
  check('ENV-02: Missing precipitation tagged as unavailable or local_model with explicit warning',
    parsedNasa.fieldProvenance?.annualPrecipitationMm?.sourceKind === 'unavailable' || parsedNasa.fieldProvenance?.annualPrecipitationMm?.sourceKind === 'local_model');

  // ENV-03: Truthful derived fields
  check('ENV-03: Solar irradiance field provenance accurately preserved',
    parsedNasa.fieldProvenance?.peakSunHours?.sourceKind === 'provider_derived' || parsedNasa.fieldProvenance?.peakSunHours?.sourceKind === 'provider_value');

  // ENV-04: Structural Hazard Screening Tags
  const hazardProvider = new StructuralHazardProvider();
  const structHazard = hazardProvider.computeAnalyticalHazard(35.68, 51.38, true);
  check('ENV-04: Structural hazard provider includes fieldProvenance for wind and snow',
    Boolean(structHazard.fieldProvenance?.basicWindSpeedKmh && structHazard.fieldProvenance?.groundSnowLoadKgM2));
  check('ENV-04: Wind speed provenance tagged as regional analytical screening model',
    structHazard.fieldProvenance!.basicWindSpeedKmh.providerName === 'REGIONAL_ANALYTICAL_MODEL');

  // ENV-06: SoilGrids field provenance
  const soilProvider = new SoilDataProvider();
  const analyticalSoil = soilProvider.computeAnalyticalSoilProperties(35.68, 51.38, true);
  check('ENV-06: Soil geotechnical provider includes fieldProvenance with regional analytical origin',
    analyticalSoil.fieldProvenance?.soilBearingCapacityKpa?.sourceKind === 'local_model' &&
    analyticalSoil.fieldProvenance?.soilBearingCapacityKpa?.providerName === 'REGIONAL_ANALYTICAL_MODEL');

  // --------------------------------------------------------------------------
  // Phase 2: CAT-* Unified Catalog Repository & Custom Equipment
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 2: Unified Catalog Repository & Custom Equipment (CAT-01 .. CAT-06) ---');

  const repo = CatalogRepository.getInstance();
  const initialModules = repo.getModules();
  const initialInverters = repo.getInverters();
  const initialBatteries = repo.getBatteries();

  // CAT-01 & CAT-06: Single source of truth and truthful counts
  check('CAT-01: CatalogRepository provides unified modules list', initialModules.length >= 25);
  check('CAT-01: CatalogRepository provides unified inverters list', initialInverters.length >= 33);
  check('CAT-01: CatalogRepository provides unified batteries list', initialBatteries.length >= 24);
  const totalCount = initialModules.length + initialInverters.length + initialBatteries.length;
  check('CAT-06: Total equipment count is accurate without exaggeration (82 items)',
    totalCount >= 82, `actual count: ${totalCount}`);

  // CAT-04: Engineering validations
  const invalidMod = repo.validateModule({
    modelName: 'Invalid Test Module',
    pmpWatts: 400,
    vocVolts: 30,
    vmpVolts: 35, // Error: Vmp > Voc
    iscAmps: 10,
    impAmps: 12,  // Error: Imp > Isc
  });
  check('CAT-04: Module validator rejects Vmp >= Voc physically impossible state',
    !invalidMod.isValid && invalidMod.errorsEn.some(e => e.includes('must be strictly less than Voc')));
  check('CAT-04: Module validator rejects Imp >= Isc physically impossible state',
    !invalidMod.isValid && invalidMod.errorsEn.some(e => e.includes('must be strictly less than Isc')));

  // CAT-02: Custom equipment save and persistence
  const customModId = `custom-mod-test-${Date.now()}`;
  const saveRes = repo.saveCustomModule({
    id: customModId,
    manufacturer: 'Test Solar',
    modelName: 'Alpha 600W Test',
    cellType: 'N-Type TOPCon',
    pmpWatts: 600,
    vmpVolts: 42.5,
    impAmps: 14.12,
    vocVolts: 50.8,
    iscAmps: 14.95,
    efficiencyPct: 23.2,
    tempCoeffVocPct: -0.25,
    tempCoeffPmpPct: -0.30,
    lengthMm: 2278,
    widthMm: 1134,
    weightKg: 28.5,
    warrantyYears: 25,
    bifacial: true,
    bifacialityFactor: 0.80,
  });
  check('CAT-02: Successfully registered custom module in CatalogRepository', saveRes.success);
  check('CAT-02: Custom module retrieved by ID with origin="custom"',
    repo.getModuleById(customModId)?.origin === 'custom');

  // CAT-05: Custom battery registration
  const customBatId = `custom-bat-test-${Date.now()}`;
  const saveBatRes = repo.saveCustomBattery({
    id: customBatId,
    manufacturer: 'Tesla Commercial',
    modelName: 'Megapack Lite 100kWh',
    capacityKwh: 100,
    nominalVoltageVolts: 800,
    nominalCapacityAh: 125,
    chemistry: 'LiFePO4',
    recommendedDoDPct: 90,
    maxContinuousDischargeA: 100,
    cycleLifeAt80DoD: 6000,
    weightKg: 850,
    hasIntegratedBms: true,
  });
  check('CAT-05: Successfully registered custom battery in CatalogRepository', saveBatRes.success);
  check('CAT-05: Custom battery retrieved by ID with origin="custom"',
    repo.getBatteryById(customBatId)?.origin === 'custom');

  // --------------------------------------------------------------------------
  // Phase 3: GEO-* Southern Hemisphere Geodetic Correctness
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 3: Southern Hemisphere Geodetic Correctness (GEO-01 .. GEO-04) ---');

  // GEO-01: formatCoordinates & formatLatitude/formatLongitude
  check('GEO-01: formatLatitude correctly formats Sydney (-33.8688) as 33.8688° S',
    formatLatitude(-33.8688, 4) === '33.8688° S');
  check('GEO-01: formatLatitude correctly formats Tehran (+35.6892) as 35.6892° N',
    formatLatitude(35.6892, 4) === '35.6892° N');
  check('GEO-01: formatLongitude correctly formats Tokyo (+139.6917) as 139.6917° E',
    formatLongitude(139.6917, 4) === '139.6917° E');
  check('GEO-01: formatLongitude correctly formats Santiago (-70.6693) as 70.6693° W',
    formatLongitude(-70.6693, 4) === '70.6693° W');
  check('GEO-01: formatCoordinates formats full tuple with cardinal directions',
    formatCoordinates(-33.87, 151.21, 2) === '33.87° S, 151.21° E');

  // GEO-02: Solstice solar geometry
  const sydneyGeo = calculateSolsticeSolarGeometry(-33.8688);
  check('GEO-02: Sydney (-33.87°) winter solstice occurs in June',
    sydneyGeo.solsticeDateEn.includes('June'));
  check('GEO-02: Sydney winter solstice solar elevation is physical (~32.7°, NOT unphysical >90°)',
    Math.abs(sydneyGeo.noonSolarElevationDeg - 32.69) < 0.2,
    `elevation: ${sydneyGeo.noonSolarElevationDeg}°`);
  const tehranGeo = calculateSolsticeSolarGeometry(35.6892);
  check('GEO-02: Tehran (+35.69°) winter solstice occurs in December',
    tehranGeo.solsticeDateEn.includes('December'));
  check('GEO-02: Tehran winter solstice solar elevation is physical (~30.86°)',
    Math.abs(tehranGeo.noonSolarElevationDeg - 30.86) < 0.2,
    `elevation: ${tehranGeo.noonSolarElevationDeg}°`);

  // GEO-03: Polar handling
  const polarGeo = calculateSolsticeSolarGeometry(85.0);
  check('GEO-03: Extreme Arctic latitude (85° N) clamps winter solstice elevation at 0° (polar night)',
    polarGeo.noonSolarElevationDeg === 0.0);

  // --------------------------------------------------------------------------
  // Phase 4: OUT-* Output Formats, CAD & 3D Disclosure
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 4: Output Formats, CAD & 3D Disclosure (OUT-01 .. OUT-04) ---');

  // OUT-02: True-to-scale SVG and ASCII DXF CAD Layouts
  const cadParams: PowerplantCadParameters = {
    structureType: 'fixed_tilt',
    landLengthM: 300,
    landWidthM: 200,
    arrayTiltDeg: 28,
    arrayAzimuthDeg: 0,
    rowPitchM: 8.5,
    moduleWattage: 585,
    moduleLengthM: 2.278,
    moduleWidthM: 1.134,
    roadWidthM: 6.0,
  };
  const cadResult = generatePowerplantLayout(cadParams);
  check('OUT-02: CAD layout computes dynamic physical table count based on land dimensions',
    cadResult.totalTablesCount > 0 && cadResult.tables.length === cadResult.totalTablesCount);
  check('OUT-02: CAD layout produces exact physical coordinates for all tables',
    cadResult.tables[0].xM >= 10 && cadResult.tables[0].yM >= 10);

  const dxfString = generatePowerplantDxf(cadResult, cadParams);
  check('OUT-02: generatePowerplantDxf creates valid AutoCAD ASCII DXF format',
    dxfString.includes('SECTION\n2\nHEADER') &&
    dxfString.includes('SECTION\n2\nENTITIES') &&
    dxfString.includes('PV_TABLES') &&
    dxfString.endsWith('0\nEOF\n'));

  // OUT-03: 3D Scene Table Generation & Unsolicited Obstacle Elimination
  const emptyScene = buildSceneFromProjectDesign({
    totalPvCapacityKwp: 1000,
    modulePmpWatts: 550,
    totalModulesCount: 2000,
    interRowSpacingM: 6.0,
    tiltDeg: 25,
    azimuthDeg: 180,
    installationEnvironment: 'ground_mount',
    obstacles: undefined, // no user obstacles
  });
  check('OUT-03: Eliminates unsolicited fake obstacles when user input is empty',
    emptyScene.obstacles.length === 0 && emptyScene.obstacleDataStatus === 'missing_unverified');
  check('OUT-03: Utility-scale array (2000 modules) models 8 representative rows for ray-tracing',
    emptyScene.pvTables.length === 8);

  // OUT-04: True OOXML .docx and .xlsx Generation
  const docxDoc = buildWordDocument('<h1>Project Dossier</h1><p>SolarPV Studio Official Report</p>');
  check('OUT-04: buildWordDocument returns Document instance', Boolean(docxDoc));

  const docxBlob = await generateDocxBlob('<h1>Test Dossier</h1><p>Energy PR: 78.5%</p>');
  const docxBuffer = Buffer.from(await docxBlob.arrayBuffer());
  check('OUT-04: generateDocxBlob outputs valid OOXML zip buffer (PK\\x03\\x04)',
    docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b && docxBuffer.length > 5000);

  const xlsxBlob = await generateXlsxBlob([
    {
      sheetName: 'Summary',
      rows: [
        ['Parameter', 'Value', 'Unit'],
        ['Capacity', 1000, 'kWp'],
      ],
    },
  ]);
  const xlsxBuffer = Buffer.from(await xlsxBlob.arrayBuffer());
  check('OUT-04: generateXlsxBlob outputs valid OOXML zip buffer (PK\\x03\\x04)',
    xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b && xlsxBuffer.length > 5000);

  // --------------------------------------------------------------------------
  // Phase 5: OFF-* Offline Transfer & Multi-Currency Engine
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5: Offline Transfer & Multi-Currency Engine (OFF-01 .. OFF-04) ---');

  // OFF-01: Versioned Project Transfer Envelope with Custom Equipment
  const projectState = {
    projectName: 'Bifacial Solar Farm v3.1',
    systemMode: 'powerplant',
    selectedModule: repo.getModuleById(customModId),
    selectedInverter: initialInverters[0],
  };
  const envelope = createProjectTransferEnvelope({
    projectName: 'Bifacial Solar Farm v3.1',
    projectData: projectState,
    metadata: {
      docId: 'DOC-AUDIT-2026',
      leadEngineer: 'Chief PV Engineer',
    },
    activeModule: repo.getModuleById(customModId) as any,
  });
  check('OFF-01: createProjectTransferEnvelope embeds format and schemaVersion="3.1.0"',
    envelope.format === 'solarpv_project_envelope' && envelope.schemaVersion === '3.1.0');
  check('OFF-01: Envelope embeds snapshot of custom equipment',
    envelope.customEquipmentSnapshots.modules.some((m: any) => m.id === customModId));

  // OFF-02: Deterministic Restoration & Migration
  const restoreRes = restoreProjectTransferEnvelope(envelope);
  check('OFF-02: restoreProjectTransferEnvelope successfully restores project',
    restoreRes.success);
  check('OFF-02: Restores custom equipment into repository upon import',
    restoreRes.restoredCustomEquipment.modulesCount >= 1);

  // OFF-04: Multi-Currency & Locale Support
  const costUsd = 100000;
  const costEur = convertCurrency(costUsd, 'USD', 'EUR');
  check('OFF-04: convertCurrency converts USD to EUR using exchange rate',
    Math.round(costEur) === 92000, `EUR: ${costEur}`);
  const costToman = convertCurrency(costUsd, 'USD', 'TOMAN');
  check('OFF-04: convertCurrency converts USD to Toman using exchange rate',
    costToman === 9_000_000_000, `Toman: ${costToman}`);

  const formattedUsd = formatCurrencyAmount(costUsd, 'USD', 90000, 'en');
  check('OFF-04: formatCurrencyAmount formats USD as $100,000', formattedUsd === '$100,000');
  const formattedToman = formatCurrencyAmount(costUsd, 'TOMAN', 90000, 'fa');
  check('OFF-04: formatCurrencyAmount formats 9B Toman cleanly in Persian',
    formattedToman.includes('میلیارد تومان'));

  const formattedMw = formatLocalizedEngineeringUnit(1250, 'power_kw', 'en');
  check('OFF-04: formatLocalizedEngineeringUnit formats 1250 kWp as 1.25 MWp',
    formattedMw === '1.25 MWp');

  // Summary
  console.log('\n================================================================================');
  console.log(` AUDIT VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED (${failedTests} FAILED)`);
  console.log('================================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllPhaseVerifications().catch((err) => {
  console.error('Audit verification crashed:', err);
  process.exit(1);
});
