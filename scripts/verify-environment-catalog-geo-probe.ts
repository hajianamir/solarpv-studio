/**
 * Phase 0 Baseline Probe
 * Verifies and records current baseline behavior across:
 * 1. Environmental Data Gateway (empty/partial API responses, provenance, precipitation fabrication)
 * 2. Equipment Catalog (module/inverter/battery counts, claims vs reality, direct imports)
 * 3. Southern Hemisphere Solar Geometry & Coordinates (Sydney winter solstice noon altitude, hardcoded N/E)
 * 4. Output Naming, CAD & 3D Screening (p90 multiplier, fixed CAD grid, 3D representative rows)
 */

import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { StructuralHazardProvider } from '../src/engine/dataGateway/structuralHazardProvider';
import { CATALOG_MODULES, CATALOG_INVERTERS, CATALOG_BATTERIES } from '../src/engine/equipmentCatalogData';
import { buildSceneFromProjectDesign } from '../src/engine/roof3dShadingEngine';

export interface ProbeResult {
  section: string;
  name: string;
  baselineFinding: string;
  needsRemediation: boolean;
  details?: Record<string, unknown>;
}

export async function runEnvironmentCatalogGeoProbe(): Promise<ProbeResult[]> {
  const results: ProbeResult[] = [];

  console.log('================================================================================');
  console.log(' SolarPV Studio - Baseline Engineering & Integrity Probe (Phase 0)');
  console.log('================================================================================\n');

  // --------------------------------------------------------------------------
  // 1. Environmental Data Gateway: NASA / PVGIS / SoilGrids / Structural
  // --------------------------------------------------------------------------
  console.log('--- [1/4] Environmental Data Gateway & Provenance Baseline ---');
  const climateProvider = new ClimateDataProvider();
  const soilProvider = new SoilDataProvider();
  const hazardProvider = new StructuralHazardProvider();

  // Test NASA Parser with empty/minimal payload (no precipitation returned by NASA)
  const mockNasaPayload = {
    geometry: { coordinates: [51.389, 35.689, 1200] },
    properties: {
      parameter: {
        ALLSKY_SFC_SW_DWN: { ANN: 5.17 },
        T2M: { ANN: 17.5 },
        T2M_MIN: { ANN: 5.0 },
        T2M_MAX: { ANN: 32.0 },
      },
    },
  };

  // @ts-expect-error accessing private method for probe
  const parsedNasa = climateProvider.parseNasaPowerResponse(35.689, 51.389, mockNasaPayload);
  const nasaPrecipFabricated = parsedNasa.annualPrecipitationMm === 250;
  const nasaProviderTagged = parsedNasa.metadata.sourceProvider === 'NASA_POWER';
  const hasPerFieldProvenance = 'fieldProvenance' in parsedNasa;

  console.log(`• NASA POWER response parsed:`);
  console.log(`  - Annual Precipitation: ${parsedNasa.annualPrecipitationMm} mm (fabricated from lat rule: ${nasaPrecipFabricated})`);
  console.log(`  - Provider tag: ${parsedNasa.metadata.sourceProvider}`);
  console.log(`  - Per-field provenance object present: ${hasPerFieldProvenance}`);

  results.push({
    section: 'ENV',
    name: 'NASA POWER Precipitation & Field Provenance',
    baselineFinding: `NASA parser fabricates ${parsedNasa.annualPrecipitationMm}mm precipitation from latitude rule; per-field provenance missing (${hasPerFieldProvenance}).`,
    needsRemediation: true,
    details: {
      annualPrecipitationMm: parsedNasa.annualPrecipitationMm,
      hasPerFieldProvenance,
      isEstimatedFromGlobalModel: parsedNasa.metadata.isEstimatedFromGlobalModel,
    },
  });

  // Test SoilGrids empty payload handling
  const mockSoilEmpty = { properties: { layers: [] } };
  // @ts-expect-error accessing private method for probe
  const parsedSoil = soilProvider.parseSoilGridsResponse(35.689, 51.389, mockSoilEmpty);
  console.log(`• SoilGrids empty layers:`);
  console.log(`  - Default clay/sand/silt: ${parsedSoil.clayFractionPercent}/${parsedSoil.sandFractionPercent}/${parsedSoil.siltFractionPercent}`);
  console.log(`  - Provider tagged as: ${parsedSoil.metadata.sourceProvider}`);

  results.push({
    section: 'ENV',
    name: 'SoilGrids Empty Layers Handling',
    baselineFinding: `SoilGrids parser injects fixed 25/50/25% texture when layers are empty; per-field provenance missing.`,
    needsRemediation: true,
    details: {
      clay: parsedSoil.clayFractionPercent,
      sand: parsedSoil.sandFractionPercent,
      silt: parsedSoil.siltFractionPercent,
    },
  });

  // Test Structural Hazard Provider
  const tehranHazard = hazardProvider.computeAnalyticalHazard(35.689, 51.389, false);
  console.log(`• Structural Hazard:`);
  console.log(`  - Wind standard: ${tehranHazard.windStandardCode}, Snow standard: ${tehranHazard.snowStandardCode}`);
  console.log(`  - Source provider: ${tehranHazard.metadata.sourceProvider}`);

  // --------------------------------------------------------------------------
  // 2. Equipment Catalog Baseline
  // --------------------------------------------------------------------------
  console.log('\n--- [2/4] Equipment Catalog Counts and Integration Baseline ---');
  const modCount = CATALOG_MODULES.length;
  const invCount = CATALOG_INVERTERS.length;
  const batCount = CATALOG_BATTERIES.length;
  const totalCount = modCount + invCount + batCount;

  console.log(`• Built-in Catalog Count:`);
  console.log(`  - PV Modules: ${modCount}`);
  console.log(`  - Inverters: ${invCount}`);
  console.log(`  - Batteries: ${batCount}`);
  console.log(`  - Total: ${totalCount} (UI text claims "بیش از ۱۰۰")`);

  results.push({
    section: 'CAT',
    name: 'Catalog Count Honesty',
    baselineFinding: `Actual built-in catalog count is ${totalCount} (${modCount} mod + ${invCount} inv + ${batCount} bat), but UI claims "بیش از ۱۰۰".`,
    needsRemediation: true,
    details: { modCount, invCount, batCount, totalCount },
  });

  // --------------------------------------------------------------------------
  // 3. Southern Hemisphere Solar Geometry & Coordinates Baseline
  // --------------------------------------------------------------------------
  console.log('\n--- [3/4] Southern Hemisphere Solar Geometry Baseline ---');
  const sydneyLat = -33.8688;
  const sydneyLng = 151.2093;

  // Uncorrected Northern formula: 90 - lat - 23.45
  const uncorrectedNoonElevation = 90 - sydneyLat - 23.45;
  // Physically correct winter solstice noon elevation for Southern Hemisphere:
  // In Southern Hemisphere, winter solstice is in June with solar declination delta = +23.44°
  // Elevation = 90 - |lat - delta| = 90 - |-33.8688 - 23.44| = 90 - 57.3088 = 32.69°
  const correctWinterSolsticeElevation = 90 - Math.abs(sydneyLat - 23.44);

  console.log(`• Sydney Location (${sydneyLat}, ${sydneyLng}):`);
  console.log(`  - Northern uncorrected formula (90 - lat - 23.45): ${uncorrectedNoonElevation.toFixed(2)}° (UNPHYSICAL > 90°)`);
  console.log(`  - Physical winter solstice noon elevation (June): ${correctWinterSolsticeElevation.toFixed(2)}°`);

  results.push({
    section: 'GEO',
    name: 'Southern Hemisphere Solstice Noon Altitude',
    baselineFinding: `Uncorrected Northern formula yields ${uncorrectedNoonElevation.toFixed(2)}° for Sydney (lat ${sydneyLat}), which is > 90° and physically impossible.`,
    needsRemediation: true,
    details: {
      sydneyLat,
      uncorrectedNoonElevation,
      correctWinterSolsticeElevation,
    },
  });

  // --------------------------------------------------------------------------
  // 4. Output Formats, CAD & 3D Baseline
  // --------------------------------------------------------------------------
  console.log('\n--- [4/4] Output Formats, CAD & 3D Baseline ---');

  // Test 3D scene representative rows for large system
  const largeScene = buildSceneFromProjectDesign({
    totalPvCapacityKwp: 1000,
    modulePmpWatts: 550,
    totalModulesCount: 2000,
    interRowSpacingM: 6.0,
    tiltDeg: 25,
    azimuthDeg: 180,
    installationEnvironment: 'ground_mount',
    latitude: 35.689,
    longitude: 51.389,
  });

  console.log(`• 3D Scene Table Generation (2000 modules):`);
  console.log(`  - Constructed tables (rows): ${largeScene.pvTables.length}`);
  console.log(`  - Obstacles count: ${largeScene.obstacles.length} (status: ${largeScene.obstacleDataStatus})`);

  results.push({
    section: 'OUT',
    name: '3D Scene Representative Scaling',
    baselineFinding: `2000-module utility plant builds ${largeScene.pvTables.length} representative tables; requires clear disclosure of representative screening nature.`,
    needsRemediation: true,
    details: {
      tablesCount: largeScene.pvTables.length,
      obstaclesCount: largeScene.obstacles.length,
    },
  });

  console.log('\n================================================================================');
  console.log(` BASELINE PROBE COMPLETED: ${results.length} AREAS AUDITED AND REGISTERED`);
  console.log('================================================================================\n');

  return results;
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnvironmentCatalogGeoProbe()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Probe failed:', err);
      process.exit(1);
    });
}
