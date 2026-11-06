/**
 * PR-2a-6 REPAIR — Ambiguity A integration script
 * ===============================================
 * Foundation engine fixed-output check:
 * 5 real coordinates × live climate inputs × recommendFoundation → every input and
 * the resulting outputs must vary across sites. No hard-coded defaults may be used
 * when full inputs are supplied.
 *
 * Prints each site's inputs, outputs, and trace_id. Fails if fewer than 3 input
 * parameters or fewer than 2 outputs differ across the 5 sites.
 */

import { generateTraceId } from '../src/engine/core/modelRegistry';
import { getClimateData } from '../src/engine/climaticData';
import { recommendFoundation } from '../src/engine/structureRecommendationEngine';

const SITES = [
  { name: 'Tehran, IR', lat: 35.6892, lng: 51.3890 },
  { name: 'Boulder, CO, US', lat: 40.0150, lng: -105.2705 },
  { name: 'Munich, DE', lat: 48.1351, lng: 11.5820 },
  { name: 'Phoenix, AZ, US', lat: 33.4484, lng: -112.0740 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
] as const;

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`  [PASS] ${message}`);
  else { console.error(`  [FAIL] ${message}`); failures++; }
}

function distinct<T>(values: T[]): number {
  return new Set(values).size;
}

async function main() {
  console.log('================================================================================');
  console.log(' PR-2a-6 REPAIR — Foundation engine per-coordinate variance (Ambiguity A)');
  console.log('================================================================================\n');

  const rows: Array<{
    name: string; lat: number; lng: number; traceId: string;
    windKmh: number; snowKgM2: number; bearingKpa: number; phiDeg: number; frostCm: number;
    embedmentM: number; fosLateral: number; primary: string; lateralShearKn: number;
  }> = [];

  for (const site of SITES) {
    // Inputs come from the live climate model for the exact coordinates — no defaults.
    const climate = getClimateData(site.lat, site.lng);
    const traceId = generateTraceId('TRC-STR');

    const result = recommendFoundation({
      siteName: site.name,
      latitude: site.lat,
      longitude: site.lng,
      soilClassification: climate.soilType as any,
      soilBearingCapacityKpa: climate.soilBearingCapacityKpa,
      soilInternalFrictionAngleDeg: climate.soilInternalFrictionAngleDeg,
      soilCohesionKpa: climate.soilCohesionKpa,
      soilDensityKnM3: climate.soilDensityKnM3,
      frostDepthCm: climate.frostDepthCm,
      basicWindSpeedKmh: climate.basicWindSpeedKmh,
      groundSnowLoadKgM2: climate.groundSnowLoadKgM2,
      tableAreaM2: 52.0,
      arrayTiltDeg: climate.optimalTiltAnnualDeg,
      postsPerTable: 4,
      clearanceHeightM: 1.2,
      slopeDeg: 0,
    });

    console.log(`\n--- ${site.name} (${site.lat.toFixed(4)}°, ${site.lng.toFixed(4)}°) | trace ${traceId.slice(0, 13)}... ---`);
    console.log(`  INPUTS : wind=${climate.basicWindSpeedKmh} km/h | snow=${climate.groundSnowLoadKgM2} kg/m² | ` +
      `bearing=${climate.soilBearingCapacityKpa} kPa | phi=${climate.soilInternalFrictionAngleDeg}° | ` +
      `c=${climate.soilCohesionKpa} kPa | frost=${climate.frostDepthCm} cm | tilt=${climate.optimalTiltAnnualDeg}°`);
    console.log(`  OUTPUT : primary=${result.primaryRecommendation} | embedment=${result.recommendedPileSizing.embedmentDepthM} m | ` +
      `FoS_lateral=${result.recommendedPileSizing.fosLateral} | FoS_moment=${result.recommendedPileSizing.fosMoment} | ` +
      `lateralShear=${result.lateralShearPerPostKn} kN | uplift=${result.upliftPerPostKn} kN | compression=${result.compressionPerPostKn} kN`);

    rows.push({
      name: site.name, lat: site.lat, lng: site.lng, traceId,
      windKmh: climate.basicWindSpeedKmh, snowKgM2: climate.groundSnowLoadKgM2,
      bearingKpa: climate.soilBearingCapacityKpa, phiDeg: climate.soilInternalFrictionAngleDeg, frostCm: climate.frostDepthCm,
      embedmentM: result.recommendedPileSizing.embedmentDepthM,
      fosLateral: result.recommendedPileSizing.fosLateral,
      primary: result.primaryRecommendation,
      lateralShearKn: result.lateralShearPerPostKn,
    });
  }

  console.log('\n================================================================================');
  console.log(' ASSERTIONS');
  console.log('================================================================================\n');

  const inputDistinct = {
    wind: distinct(rows.map(r => r.windKmh)),
    snow: distinct(rows.map(r => r.snowKgM2)),
    bearing: distinct(rows.map(r => r.bearingKpa)),
    phi: distinct(rows.map(r => r.phiDeg)),
    frost: distinct(rows.map(r => r.frostCm)),
  };
  console.log('  Distinct input values across 5 sites:', inputDistinct);
  const inputVaried = Object.values(inputDistinct).filter(v => v >= 3).length;
  assert(inputVaried >= 3, `>= 3 input parameters vary across sites (got ${inputVaried}): ${JSON.stringify(inputDistinct)}`);

  const outputDistinct = {
    embedment: distinct(rows.map(r => r.embedmentM)),
    fos: distinct(rows.map(r => r.fosLateral)),
    shear: distinct(rows.map(r => r.lateralShearKn)),
    primary: distinct(rows.map(r => r.primary)),
  };
  console.log('  Distinct output values across 5 sites:', outputDistinct);
  const outputVaried = Object.values(outputDistinct).filter(v => v >= 2).length;
  assert(outputVaried >= 2, `>= 2 outputs vary across sites (got ${outputVaried}): ${JSON.stringify(outputDistinct)}`);

  // Every site must carry a trace_id
  for (const r of rows) {
    assert(typeof r.traceId === 'string' && r.traceId.length > 0, `${r.name}: trace_id present`);
  }

  console.log(`\n${failures === 0 ? 'ALL FOUNDATION VARIANCE ASSERTIONS PASSED' : failures + ' ASSERTION(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(2);
});
