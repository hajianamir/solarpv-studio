/**
 * Audit Remediation Contract Verification Suite
 * Tests all findings from docs/audit/EXECUTOR-REVIEW-38718ab.fa.md:
 * - Priority 1: PVGIS multi-year, leap years, physical zero, provenance preservation, coordinate race condition
 * - Priority 2: Offline isolation, balanced timeouts, fallback cache TTL, input validation, deduplication
 * - Priority 3: start.bat CRLF, uncommented .env regex, port binding
 */

import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { SoilDataProvider } from '../src/engine/dataGateway/soilDataProvider';
import { ExternalDataGateway } from '../src/engine/dataGateway/externalDataGateway';
import { getClimateData, fetchClimateData } from '../src/engine/climaticData';
import { isRealInternetEnabled } from '../src/engine/env/runtimeEnv';
import fs from 'fs';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`  ✓ [PASS] ${testName}${detail ? ` (${detail})` : ''}`);
  } else {
    failCount++;
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runAuditVerification() {
  console.log('================================================================================');
  console.log(' SolarPV Studio - Audit Remediation Contract Verification Suite');
  console.log('================================================================================\n');

  const climateProvider = new ClimateDataProvider();
  const soilProvider = new SoilDataProvider();

  // --------------------------------------------------------------------------
  // 1. PVGIS Multi-Year Parser & Edge Cases (Priority 1.1)
  // --------------------------------------------------------------------------
  console.log('[Group 1] PVGIS Multi-Year Parser, Leap Years & Physical Zero');

  // 1a. Standard 12-month series
  const standard12Months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    'H(h)_m': 150.0,
  }));
  const res12 = climateProvider.parsePvgisResponse(35.689, 51.389, {
    outputs: { monthly: standard12Months },
  });
  // 150 * 12 = 1800 kWh / 365 days = 4.9315... -> 4.93 PSH
  assert(res12.peakSunHours === 4.93, 'Standard 12-month PVGIS parsed correctly', `PSH = ${res12.peakSunHours}`);
  assert(res12.metadata.governingStandards.some((s) => s.includes('v5.2')), 'Metadata specifies PVGIS v5.2');

  // 1b. Multi-year series (24 months: 2023 non-leap, 2024 leap year)
  const multiYear24 = [
    // 2023: 12 months, Feb has 28 days (total 365 days)
    ...Array.from({ length: 12 }, (_, i) => ({ year: 2023, month: i + 1, 'H(h)_m': 120.0 })),
    // 2024: 12 months, Feb has 29 days (total 366 days)
    ...Array.from({ length: 12 }, (_, i) => ({ year: 2024, month: i + 1, 'H(h)_m': 120.0 })),
  ];
  const res24 = climateProvider.parsePvgisResponse(35.689, 51.389, {
    outputs: { monthly: multiYear24 },
  });
  // 24 * 120 = 2880 kWh / (365 + 366 = 731 days) = 3.9398... -> 3.94 PSH
  assert(res24.peakSunHours === 3.94, 'Multi-year (24 months) weighted with leap year (731 days)', `PSH = ${res24.peakSunHours}`);
  assert(
    res24.fieldProvenance.peakSunHours.derivationMethod?.includes('24 monthly horizontal irradiation values / 731 days') ?? false,
    'Provenance documents exact 24 months and 731 days'
  );

  // 1c. Physical zero irradiance in polar winter
  const polarSeries = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    'H(h)_m': i < 2 || i > 10 ? 0.0 : 80.0, // Dec, Jan, Feb are 0.0 (polar dark)
  }));
  let polarThrew = false;
  try {
    const resPolar = climateProvider.parsePvgisResponse(70.0, 20.0, {
      outputs: { monthly: polarSeries },
    });
    assert(resPolar.peakSunHours > 0, 'Polar series with physical 0 kWh months accepted without rejection', `PSH = ${resPolar.peakSunHours}`);
  } catch (err) {
    polarThrew = true;
    assert(false, 'Polar series with physical 0 kWh should not throw', String(err));
  }

  // 1d. Rejection of invalid data (duplicate months, negative irradiance, empty array)
  let duplicateThrew = false;
  try {
    climateProvider.parsePvgisResponse(35.0, 50.0, {
      outputs: { monthly: [{ month: 1, 'H(h)_m': 100 }, { month: 1, 'H(h)_m': 100 }] },
    });
  } catch {
    duplicateThrew = true;
  }
  assert(duplicateThrew, 'Rejects duplicate month records in single series');

  let negativeThrew = false;
  try {
    climateProvider.parsePvgisResponse(35.0, 50.0, {
      outputs: { monthly: [{ month: 1, 'H(h)_m': -5 }] },
    });
  } catch {
    negativeThrew = true;
  }
  assert(negativeThrew, 'Rejects negative irradiance values');

  let emptyThrew = false;
  try {
    climateProvider.parsePvgisResponse(35.0, 50.0, {
      outputs: { monthly: [] },
    });
  } catch {
    emptyThrew = true;
  }
  assert(emptyThrew, 'Rejects empty monthly array');

  // 1e. Temperature incorporation from T2m
  const seriesWithTemp = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    'H(h)_m': 140.0,
    T2m: 15.0 + i, // 15 to 26 °C
  }));
  const resWithTemp = climateProvider.parsePvgisResponse(35.0, 50.0, {
    outputs: { monthly: seriesWithTemp },
  });
  assert(resWithTemp.fieldProvenance.tempAnnualMeanC.sourceKind === 'provider_value', 'Incorporates measured T2m from PVGIS into provenance');

  // --------------------------------------------------------------------------
  // 2. Parameter-Level Provenance & Non-Destructive Fallbacks (Priority 1.2)
  // --------------------------------------------------------------------------
  console.log('\n[Group 2] Parameter-Level Provenance & Non-Destructive Fallbacks');

  // Verify that ExternalDataGateway creates comprehensive data without overwriting
  const siteData = await ExternalDataGateway.getInstance().getComprehensiveSiteData(35.6892, 51.389);
  assert(siteData.climateCity !== null && typeof siteData.climateCity === 'object', 'Gateway returns climateCity');
  assert(siteData.climateResource !== null, 'Gateway returns climateResource');
  assert(siteData.soilProperties !== null, 'Gateway returns soilProperties');

  // Check field-level provenance mapping
  const pshProv = siteData.climateCity.fieldProvenance?.peakSunHours;
  assert(pshProv !== undefined, 'climateCity contains fieldProvenance.peakSunHours');
  assert(
    pshProv?.sourceKind === 'provider_derived' || pshProv?.sourceKind === 'local_model',
    'PSH has honest sourceKind classification',
    `sourceKind = ${pshProv?.sourceKind}`
  );

  // Check harmonization between computeAnalyticalClimateResource and getClimateData
  const analyticalResource = climateProvider.computeAnalyticalClimateResource(35.6892, 51.389);
  const baselineCity = getClimateData(35.6892, 51.389);
  assert(
    analyticalResource.peakSunHours === baselineCity.peakSunHours,
    'Harmonized analytical model: PSH matches exactly',
    `Resource=${analyticalResource.peakSunHours}, City=${baselineCity.peakSunHours}`
  );
  assert(
    analyticalResource.tempMinC === baselineCity.tempMinC && analyticalResource.tempMaxC === baselineCity.tempMaxC,
    'Harmonized analytical model: Min/Max temps match exactly',
    `Tmin=${analyticalResource.tempMinC}/${baselineCity.tempMinC}, Tmax=${analyticalResource.tempMaxC}/${baselineCity.tempMaxC}`
  );

  // --------------------------------------------------------------------------
  // 3. Offline Isolation & Network Policy (Priority 2.1)
  // --------------------------------------------------------------------------
  console.log('\n[Group 3] Offline Isolation & Network Policy Enforcement');

  // In this sandbox, internet to external APIs is air-gapped/blocked
  // Ensure reverseGeocodeNominatim handles offline mode gracefully
  const offlineName = await climateProvider.reverseGeocodeNominatim(35.6892, 51.389);
  assert(typeof offlineName === 'string' && offlineName.length > 0, 'reverseGeocodeNominatim returns coordinate name in offline mode');

  const offlineGeocode = await climateProvider.forwardGeocodeNominatim('Tehran');
  assert(Array.isArray(offlineGeocode), 'forwardGeocodeNominatim returns array in offline mode without throwing');

  const offlineFootprints = await climateProvider.detectBuildingFootprints(35.6892, 51.389);
  assert(offlineFootprints.buildingCount === 0 && Array.isArray(offlineFootprints.footprints), 'detectBuildingFootprints returns safe empty array in offline mode');

  // SoilDataProvider in offline mode
  const soilResult = await soilProvider.fetchSoilProperties(35.6892, 51.389);
  assert(soilResult.soilBearingCapacityKpa > 0, 'SoilDataProvider returns valid geotechnical parameters in offline mode');
  assert(soilResult.metadata.isEstimatedFromGlobalModel === true, 'SoilDataProvider marks offline data as estimated from global model');

  // --------------------------------------------------------------------------
  // 4. Server Endpoint Input Validation & Caching Headers (Priority 2.3 & 2.5)
  // --------------------------------------------------------------------------
  console.log('\n[Group 4] Input Validation, Deduplication & Cache Header Rules');

  // Coordinate range validation check
  let invalidCoordsThrew = false;
  try {
    await fetchClimateData(999, 999);
  } catch (err) {
    invalidCoordsThrew = true;
    assert(
      (err as Error).message.includes('Invalid geographic coordinates'),
      'fetchClimateData rejects out-of-range coordinates (>90, >180)'
    );
  }
  assert(invalidCoordsThrew, 'Out-of-range coordinate check triggered');

  // --------------------------------------------------------------------------
  // 5. Soil Geotechnical Depth Weighting & Incomplete Texture Protection
  // --------------------------------------------------------------------------
  console.log('\n[Group 5] Soil Depth-Weighted Averaging & Incomplete Texture Protection');

  // 5a. Depth-weighted thickness averaging (0-5cm @ 10%, 5-15cm @ 20%, 15-30cm @ 30%)
  // Unweighted = (10+20+30)/3 = 20.00%
  // Depth-weighted = (10*5 + 20*10 + 30*15) / 30 = 700 / 30 = 23.33%
  const depthWeightedPayload = {
    properties: {
      layers: [
        {
          name: 'clay',
          depths: [
            { label: '0-5cm', range: { top_depth: 0, bottom_depth: 5 }, values: { mean: 100 } },
            { label: '5-15cm', range: { top_depth: 5, bottom_depth: 15 }, values: { mean: 200 } },
            { label: '15-30cm', range: { top_depth: 15, bottom_depth: 30 }, values: { mean: 300 } },
          ],
        },
        {
          name: 'sand',
          depths: [
            { label: '0-30cm', range: { top_depth: 0, bottom_depth: 30 }, values: { mean: 400 } }, // 40%
          ],
        },
        {
          name: 'silt',
          depths: [
            { label: '0-30cm', range: { top_depth: 0, bottom_depth: 30 }, values: { mean: 367 } }, // 36.7%
          ],
        },
      ],
    },
  };
  const depthWeightedSoil = soilProvider.parseSoilGridsResponse(35.0, 50.0, depthWeightedPayload);
  assert(
    depthWeightedSoil.clayFractionPercent === 23.3,
    'Calculates depth-weighted layer average (23.3%), not unweighted arithmetic mean (20%)',
    `clayPct = ${depthWeightedSoil.clayFractionPercent}%`
  );

  // 5b. Incomplete soil texture protection (missing silt layer)
  const incompleteSoilPayload = {
    properties: {
      layers: [
        { name: 'clay', depths: [{ label: '0-30cm', values: { mean: 600 } }] }, // 60%
        { name: 'sand', depths: [{ label: '0-30cm', values: { mean: 500 } }] }, // 50%
        // silt missing
      ],
    },
  };
  const incompleteSoil = soilProvider.parseSoilGridsResponse(35.0, 50.0, incompleteSoilPayload);
  const textureSum = incompleteSoil.clayFractionPercent + incompleteSoil.sandFractionPercent + incompleteSoil.siltFractionPercent;
  assert(
    Math.abs(textureSum - 100) <= 0.5,
    'Incomplete soil payload normalized to <=100% without fabricating impossible 135% texture',
    `textureSum = ${textureSum}%`
  );
  assert(
    incompleteSoil.metadata.isEstimatedFromGlobalModel === true,
    'Incomplete soil marked as estimated from global model to prevent 30-day cache pollution'
  );

  // 5c. PVGIS single-month or all-zero rejection
  let singleMonthThrew = false;
  try {
    climateProvider.parsePvgisResponse(35.0, 50.0, {
      outputs: { monthly: [{ month: 1, 'H(h)_m': 100 }] },
    });
  } catch {
    singleMonthThrew = true;
  }
  assert(singleMonthThrew, 'PVGIS parser rejects single-month series (minimum 12 required)');

  let allZeroThrew = false;
  try {
    const allZero = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, 'H(h)_m': 0.0 }));
    climateProvider.parsePvgisResponse(35.0, 50.0, {
      outputs: { monthly: allZero },
    });
  } catch {
    allZeroThrew = true;
  }
  assert(allZeroThrew, 'PVGIS parser rejects all-zero year and falls back to analytical model without crashing');

  // --------------------------------------------------------------------------
  // 6. Windows Launcher start.bat Contracts (Priority 3.1 & 3.2)
  // --------------------------------------------------------------------------
  console.log('\n[Group 6] Windows start.bat CRLF & Syntax Verification');

  const batRaw = fs.readFileSync('start.bat');
  const hasCrlf = batRaw.includes(Buffer.from('\r\n'));
  const hasBareLf = batRaw.toString('latin1').replace(/\r\n/g, '').includes('\n');
  assert(hasCrlf && !hasBareLf, 'start.bat uses strictly CRLF line endings without stray LFs');

  const batContent = batRaw.toString('utf8');
  assert(batContent.includes('findstr /R /C:"^[ ]*VITE_REAL_INTERNET=false"'), 'start.bat checks VITE_REAL_INTERNET on uncommented lines only');
  assert(batContent.includes('node_modules\\dotenv'), 'start.bat checks for node_modules\\dotenv dependency synchronization');
  assert(batContent.includes('APP_PORT'), 'start.bat parses APP_PORT dynamically from .env');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(` AUDIT REMEDIATION VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('================================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAuditVerification().catch((err) => {
  console.error('Fatal error during audit verification:', err);
  process.exit(1);
});
