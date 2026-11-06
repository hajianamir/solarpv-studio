/**
 * Numerical Probe for 3D Rooftop Scene Synthesis, Multi-Obstacle Ray-Tracing & Geodesy
 *
 * Verifies:
 * 1. Geodetic roundtrip accuracy: WGS84 -> local ENU -> WGS84 roundtrip error < 1e-6 degrees.
 * 2. Dynamic 3D Scene Synthesis:
 *    - 1,100 kWp project array (Tehran, 35.6892°N, 51.3890°E).
 *    - 25° tilt, 6.0m inter-row spacing.
 *    - Multi-obstacle setup: adjacent 5m building at 15m distance + rooftop equipment.
 * 3. 3D Ray-Traced Shading Engine:
 *    - Converts obstacles and PV tables into 3D triangles.
 *    - Executes calculateShadingFactor using real daylight sun vectors.
 *    - Verifies optical occlusion: unshadedRatio < 1.0 and averageShadingLossPct > 0.
 * 4. Lifecycle provenance & design metadata alignment.
 */

import {
  buildSceneFromProjectDesign,
  calculateRayTracedShadingFactor,
  wgs84ToEnu,
  enuToWgs84,
  generateDaylightSunDirections,
  type GeodeticAnchor,
  type LatLngPoint,
} from '../src/engine/roof3dShadingEngine';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failures++;
  }
}

async function run() {
  console.log('================================================================================');
  console.log(' SolarPV Studio — 3D Rooftop, Multi-Obstacle Ray-Tracing & Geodesy Probe');
  console.log('================================================================================\n');

  // 1. Geodetic Roundtrip Verification (WGS84 <-> Local ENU)
  console.log('--- 1. Geodetic Roundtrip (WGS84 -> ENU -> WGS84) ---');
  const anchor: GeodeticAnchor = {
    latitude: 35.6892,
    longitude: 51.3890,
    elevationM: 1200,
  };
  const targetPoint: LatLngPoint = {
    latitude: 35.6945,
    longitude: 51.3960,
    altitudeM: 1225,
  };

  const enu = wgs84ToEnu(targetPoint, anchor);
  console.log(`  Target point:  (${targetPoint.latitude.toFixed(6)}°N, ${targetPoint.longitude.toFixed(6)}°E, ${targetPoint.altitudeM}m)`);
  console.log(`  Projected ENU: (${enu.xEastM.toFixed(3)}m E, ${enu.yNorthM.toFixed(3)}m N, ${enu.zUpM.toFixed(3)}m U)`);

  const roundtrip = enuToWgs84(enu, anchor);
  console.log(`  Roundtrip:     (${roundtrip.latitude.toFixed(6)}°N, ${roundtrip.longitude.toFixed(6)}°E, ${roundtrip.altitudeM}m)`);

  const latError = Math.abs(roundtrip.latitude - targetPoint.latitude);
  const lngError = Math.abs(roundtrip.longitude - targetPoint.longitude);
  const maxGeodeticError = Math.max(latError, lngError);
  console.log(`  Max Coordinate Error: ${maxGeodeticError.toExponential(4)} degrees`);

  assert(
    maxGeodeticError < 1e-6,
    `WGS84 <-> ENU roundtrip error (${maxGeodeticError.toExponential(4)}°) is strictly < 1e-6 degrees`
  );

  // 2. Dynamic 3D Scene Synthesis (1,100 kWp Tehran Array with Adjacent 5m Building)
  console.log('\n--- 2. Dynamic 3D Scene Synthesis from Active Project Design ---');
  const scene = buildSceneFromProjectDesign({
    totalPvCapacityKwp: 1100,
    totalModulesCount: 2000,
    interRowSpacingM: 6.0,
    tiltDeg: 25,
    azimuthDeg: 0,
    latitude: 35.6892,
    longitude: 51.3890,
    elevationM: 1200,
    installationEnvironment: 'rooftop',
    obstacles: [
      {
        id: 'obs-adj-bldg',
        name: 'Adjacent 5m Commercial Building (15m South)',
        geometryType: 'cuboid',
        positionEnu: { x: 0, y: -15, z: 8.0 },
        dimensionsM: { widthM: 30.0, lengthM: 10.0, heightM: 5.0 },
      },
      {
        id: 'obs-chiller-central',
        name: 'Rooftop Central Chiller Equipment',
        geometryType: 'cuboid',
        positionEnu: { x: -8, y: 0, z: 8.0 },
        dimensionsM: { widthM: 4.0, lengthM: 3.5, heightM: 2.5 },
      },
    ],
  });

  console.log(`  Total PV Capacity: ${scene.totalPvCapacityKwp} kWp`);
  console.log(`  Total PV Tables:   ${scene.pvTables.length} tables`);
  console.log(`  Row Pitch Spacing: ${scene.interRowSpacingM} m`);
  console.log(`  Obstacles Count:   ${scene.obstacles.length} (${scene.obstacles.map((o) => o.name).join(', ')})`);

  assert(scene.pvTables.length > 0, 'PV tables generated based on project module count');
  assert(scene.totalPvCapacityKwp === 1100, 'Design metadata capacity preserved at 1100 kWp');
  assert(scene.tiltDeg === 25, 'Design tilt preserved at 25°');
  assert(scene.interRowSpacingM === 6.0, 'Row pitch preserved at 6.0m');
  assert(scene.obstacles.length === 2, 'Both custom adjacent obstacles loaded into scene');

  // 3. Multi-Obstacle 3D Ray-Traced Shading Factor
  console.log('\n--- 3. Multi-Obstacle 3D Ray-Traced Shading Factor ---');
  const sunDirs = generateDaylightSunDirections(35.6892, 12);
  console.log(`  Sun directions evaluated: ${sunDirs.length} daylight vectors`);

  const rayTraceResult = calculateRayTracedShadingFactor(scene, sunDirs, {
    includeInterRow: true,
  });

  console.log(`  Total 3D Triangles:      ${rayTraceResult.trianglesCount} (obstacles + PV tables)`);
  console.log(`  Sample Target Points:    ${rayTraceResult.samplePointsCount} surface points`);
  console.log(`  Average Unshaded Ratio:  ${rayTraceResult.averageUnshadedRatio.toFixed(4)}`);
  console.log(`  Average Shading Loss:    ${rayTraceResult.averageShadingLossPct}%`);

  assert(
    rayTraceResult.trianglesCount > 0,
    `Triangulation produced ${rayTraceResult.trianglesCount} facets`
  );
  assert(
    rayTraceResult.samplePointsCount > 0,
    `Generated ${rayTraceResult.samplePointsCount} target points across array`
  );
  assert(
    rayTraceResult.averageUnshadedRatio < 1.0,
    `Unshaded ratio (${rayTraceResult.averageUnshadedRatio.toFixed(4)}) is strictly < 1.0 due to obstacle & inter-row occlusion`
  );
  assert(
    rayTraceResult.averageShadingLossPct > 0.0,
    `Average ray-traced shading loss (${rayTraceResult.averageShadingLossPct}%) is positive and non-zero`
  );

  // 4. Verification without obstacles (inter-row only)
  console.log('\n--- 4. Differential Verification (Inter-Row Only Baseline) ---');
  const cleanScene = buildSceneFromProjectDesign({
    totalPvCapacityKwp: 1100,
    totalModulesCount: 2000,
    interRowSpacingM: 6.0,
    tiltDeg: 25,
    azimuthDeg: 0,
    latitude: 35.6892,
    longitude: 51.3890,
    elevationM: 1200,
    installationEnvironment: 'rooftop',
    obstacles: [], // No obstacles
  });

  const baseRayResult = calculateRayTracedShadingFactor(cleanScene, sunDirs, {
    includeInterRow: false,
  });

  console.log(`  Unobstructed average unshaded ratio: ${baseRayResult.averageUnshadedRatio}`);
  console.log(`  Unobstructed average shading loss:   ${baseRayResult.averageShadingLossPct}%`);
  assert(
    baseRayResult.averageUnshadedRatio === 1.0 && baseRayResult.averageShadingLossPct === 0.0,
    'Unobstructed array with no inter-row tracing has 100% optical access (0% loss)'
  );

  // Final summary
  console.log('\n================================================================================');
  console.log(` ${failures === 0 ? 'ALL NUMERICAL PROBE ASSERTIONS PASSED (100%)' : `${failures} ASSERTION(S) FAILED`}`);
  console.log('================================================================================');

  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal probe failure:', err);
  process.exit(2);
});
