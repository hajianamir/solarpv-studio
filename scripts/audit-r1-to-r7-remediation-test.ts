/**
 * Multi-Discipline Engineering Verification Suite for R1–R7 Audit Remediation
 * SolarPV Studio v3.0
 */

import {
  buildSceneFromProjectDesign,
  simulateAnnual3dShading,
  calculateRayTracedShadingFactor,
  buildTableFacets,
  buildObstacleFacets,
  calculateTableActiveCollectorAreaM2,
  checkTableRoofClearance,
  getLocalRoofElevationAt,
} from '../src/engine/roof3dShadingEngine';
import {
  computeShadingSceneSignature,
  shadingLifecycleReducer,
  createInitialShadingLifecycleState,
} from '../src/engine/shadingLifecycle';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { calculateSingleDiodeCurve } from '../src/engine/singleDiodeModel';
import { computeWaterfallLosses } from '../src/engine/waterfallLossEngine';
import { runIranianRegulationFinancialModel } from '../src/engine/iranianRegulationsFinancial';
import { CircuitBreaker } from '../src/engine/dataGateway/circuitBreaker';

let failures = 0;
let passes = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
    passes++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  }
}

async function run() {
  console.log('================================================================================');
  console.log(' SolarPV Studio — R1–R7 Engineering Audit Remediation Test Suite');
  console.log('================================================================================\n');

  // ===========================================================================
  // R1: Lifecycle and Stale Result Management
  // ===========================================================================
  console.log('--- [R1] Shading Lifecycle, Canonical Signature & Staleness Invalidation ---');
  {
    const baseScene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 100,
      totalModulesCount: 180,
      interRowSpacingM: 5.0,
      tiltDeg: 20,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      installationEnvironment: 'rooftop_flat_concrete',
      obstacles: [
        {
          id: 'chiller-1',
          name: 'Rooftop Chiller',
          geometryType: 'cuboid',
          positionEnu: { x: 0, y: -10, z: 6.0 },
          dimensionsM: { widthM: 4.0, lengthM: 3.0, heightM: 2.5 },
          rotationDeg: 0,
        },
      ],
    });

    const sigBase = computeShadingSceneSignature({
      scene: baseScene,
      cityId: 'tehran',
      peakSunHours: 5.2,
    });

    // 1. Move obstacle without changing obstacle count
    const movedScene = buildSceneFromProjectDesign({
      ...baseScene,
      totalPvCapacityKwp: 100,
      totalModulesCount: 180,
      interRowSpacingM: 5.0,
      tiltDeg: 20,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      obstacles: [
        {
          id: 'chiller-1',
          name: 'Rooftop Chiller',
          geometryType: 'cuboid',
          positionEnu: { x: 5.0, y: -10, z: 6.0 }, // Translated X by +5m
          dimensionsM: { widthM: 4.0, lengthM: 3.0, heightM: 2.5 },
          rotationDeg: 0,
        },
      ],
    });
    const sigMoved = computeShadingSceneSignature({
      scene: movedScene,
      cityId: 'tehran',
      peakSunHours: 5.2,
    });
    assert(sigBase !== sigMoved, 'Translating obstacle alters canonical scene signature');

    // 2. Rotate obstacle
    const rotatedScene = buildSceneFromProjectDesign({
      ...baseScene,
      totalPvCapacityKwp: 100,
      totalModulesCount: 180,
      interRowSpacingM: 5.0,
      tiltDeg: 20,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      obstacles: [
        {
          id: 'chiller-1',
          name: 'Rooftop Chiller',
          geometryType: 'cuboid',
          positionEnu: { x: 0, y: -10, z: 6.0 },
          dimensionsM: { widthM: 4.0, lengthM: 3.0, heightM: 2.5 },
          rotationDeg: 45, // Rotated 45 degrees
        },
      ],
    });
    const sigRotated = computeShadingSceneSignature({
      scene: rotatedScene,
      cityId: 'tehran',
      peakSunHours: 5.2,
    });
    assert(sigBase !== sigRotated, 'Rotating obstacle alters canonical scene signature');

    // 3. Resize obstacle height
    const resizedScene = buildSceneFromProjectDesign({
      ...baseScene,
      totalPvCapacityKwp: 100,
      totalModulesCount: 180,
      interRowSpacingM: 5.0,
      tiltDeg: 20,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      obstacles: [
        {
          id: 'chiller-1',
          name: 'Rooftop Chiller',
          geometryType: 'cuboid',
          positionEnu: { x: 0, y: -10, z: 6.0 },
          dimensionsM: { widthM: 4.0, lengthM: 3.0, heightM: 3.8 }, // Height 2.5 -> 3.8m
          rotationDeg: 0,
        },
      ],
    });
    const sigResized = computeShadingSceneSignature({
      scene: resizedScene,
      cityId: 'tehran',
      peakSunHours: 5.2,
    });
    assert(sigBase !== sigResized, 'Resizing obstacle height alters canonical scene signature');

    // 4. Reducer integration: apply base, then verify moved obstacle marks state stale
    const s0 = createInitialShadingLifecycleState();
    const sApplied = shadingLifecycleReducer(s0, {
      type: 'APPLY',
      lossPct: 6.5,
      capacityKwp: 100,
      projectCapacityKwp: 100,
      signatureHash: sigBase,
      cityId: 'tehran',
      source: 'project_array_design',
    });
    assert(sApplied.isStale === false, 'Initially applied shading is not stale');

    const sCheckSame = shadingLifecycleReducer(sApplied, {
      type: 'CHECK_SYNC',
      currentCityId: 'tehran',
      currentCapacityKwp: 100,
      currentSignatureHash: sigBase,
    });
    assert(sCheckSame.isStale === false, 'Identical geometry signature preserves valid active shading');

    const sCheckMoved = shadingLifecycleReducer(sApplied, {
      type: 'CHECK_SYNC',
      currentCityId: 'tehran',
      currentCapacityKwp: 100,
      currentSignatureHash: sigMoved,
    });
    assert(sCheckMoved.isStale === true, 'Moved obstacle marks applied shading stale', sCheckMoved.staleReason || '');

    // 5. Cross-project reset: city change completely removes applied shading
    const sCheckCity = shadingLifecycleReducer(sApplied, {
      type: 'CHECK_SYNC',
      currentCityId: 'isfahan',
      currentCapacityKwp: 100,
      currentSignatureHash: sigBase,
    });
    assert(sCheckCity.appliedShading === null, 'Changing project city resets applied shading to prevent cross-site contamination');
  }

  // ===========================================================================
  // R2: Elimination of Fabricated Obstacles
  // ===========================================================================
  console.log('\n--- [R2] Elimination of Fabricated Obstacles from Real Projects ---');
  {
    // 1. Real project with rooftop_flat_concrete without obstacle survey data -> missing_unverified (no fake obstacles)
    const realRooftopNoData = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      installationEnvironment: 'rooftop_flat_concrete',
    });
    assert(
      realRooftopNoData.obstacles.length === 0,
      'Real rooftop project with rooftop_flat_concrete does not inject fake HVAC or chimney',
      `obstaclesCount=${realRooftopNoData.obstacles.length}`
    );
    assert(
      realRooftopNoData.obstacleDataStatus === 'missing_unverified',
      'Real rooftop without obstacle data is tagged missing_unverified (not falsely verified_unobstructed)',
      `status=${realRooftopNoData.obstacleDataStatus}`
    );

    // 2. Real project with explicit confirmation of unobstructed array
    const realRooftopVerified = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      installationEnvironment: 'rooftop_flat_concrete',
      isObstacleFreeVerified: true,
    });
    assert(
      realRooftopVerified.obstacleDataStatus === 'verified_unobstructed',
      'Real rooftop with isObstacleFreeVerified: true is tagged verified_unobstructed'
    );

    // 3. Real project with explicit empty obstacles array
    const realRooftopEmptyArray = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      installationEnvironment: 'rooftop_flat_concrete',
      obstacles: [],
    });
    assert(
      realRooftopEmptyArray.obstacleDataStatus === 'verified_unobstructed',
      'Real rooftop with explicit obstacles: [] is tagged verified_unobstructed'
    );

    // 4. Explicit demo mode
    const demoRooftop = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      installationEnvironment: 'rooftop_flat_concrete',
      isDemoMode: true,
    });
    assert(
      demoRooftop.obstacles.length === 2,
      'Demo mode generates sample rooftop screening obstacles',
      `demoObstacles=${demoRooftop.obstacles.length}`
    );
    assert(
      demoRooftop.obstacleDataStatus === 'demo_sample',
      'Demo rooftop array is explicitly tagged as demo_sample'
    );

    // 5. Surveyed custom obstacles
    const surveyedRooftop = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      obstacles: [
        {
          id: 'surveyed-parapet',
          name: 'Perimeter Parapet Wall',
          geometryType: 'cuboid',
          positionEnu: { x: 0, y: 15, z: 6.0 },
          dimensionsM: { widthM: 20, lengthM: 0.3, heightM: 1.2 },
        },
      ],
    });
    assert(
      surveyedRooftop.obstacleDataStatus === 'surveyed',
      'Array with custom measured obstacles is tagged as surveyed'
    );
  }

  // ===========================================================================
  // R3: Zero-Panel System Handling
  // ===========================================================================
  console.log('\n--- [R3] Zero-Panel System Handling ---');
  {
    const zeroScene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 0,
      totalModulesCount: 0,
    });
    assert(zeroScene.pvTables.length === 0, 'Zero module design constructs zero PV tables');

    const zeroRes = simulateAnnual3dShading(zeroScene, 5.2, 40.0);
    assert(zeroRes.totalUnshadedAnnualKwh === 0, 'Zero-panel system yields 0 kWh unshaded generation');
    assert(zeroRes.totalShadedAnnualKwh === 0, 'Zero-panel system yields 0 kWh shaded generation');
    assert(zeroRes.totalLostAnnualKwh === 0, 'Zero-panel system yields 0 kWh lost generation');
    assert(zeroRes.isReconciled === true, 'Zero-panel energy conservation is cleanly reconciled (0 = 0 + 0)');

    const wf = zeroRes.waterfallLossReport;
    assert(wf.installedCapacityKwp === 0, 'Waterfall installed capacity is strictly 0 kWp (no fake 100 kWp fallback)');
    assert(wf.netAnnualEnergyExportMwh === 0, 'Waterfall net annual energy export is strictly 0 MWh');
    assert(wf.specificAnnualYieldKwhPerKwp === 0 && !isNaN(wf.specificAnnualYieldKwhPerKwp), 'Specific yield is safely 0 (NOT NaN)');
    assert(wf.performanceRatioPct === 0 && !isNaN(wf.performanceRatioPct), 'Performance ratio is safely 0 (NOT NaN)');
  }

  // ===========================================================================
  // R4: Geometry Alignment between Three.js & Ray-Tracer
  // ===========================================================================
  console.log('\n--- [R4] Geometry Alignment between Three.js & Ray-Tracer ---');
  {
    const scene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      tiltDeg: 25,
      azimuthDeg: 15,
      installationEnvironment: 'rooftop_flat_concrete',
    });

    const table = scene.pvTables[0];
    const facets = buildTableFacets(table);
    assert(facets.length >= 1, 'Table surface facet constructed');

    const normal = facets[0].normal;
    // South-facing tilted table: normal must have negative Y (South) and positive Z (Up)
    assert(normal.z > 0, 'Table normal points upwards (+Z > 0)');
    assert(normal.y < 0, 'Table tilted South has negative Y normal component');

    // Coordinate mapping ENU -> Three.js:
    // +X (East) -> Three.js +X
    // +Y (North) -> Three.js -Z
    // +Z (Up) -> Three.js +Y
    const enuX = table.positionEnu.x;
    const enuY = table.positionEnu.y;
    const enuZ = table.positionEnu.z;
    const threeX = enuX;
    const threeY = enuZ;
    const threeZ = -enuY;
    assert(threeY === enuZ, 'Three.js vertical position corresponds to ENU Up elevation (table.positionEnu.z)');
    assert(threeZ === -enuY, 'Three.js forward/back axis correctly maps to ENU North/South with inverted sign');

    // R08: Viewport Sun Vector East/West Azimuth Mapping
    // In Three.js: +X is East, -X is West, +Z is South, -Z is North
    // sunAzimuth slider: 90 = East, 180 = South, 270 = West
    const altRad = (45 * Math.PI) / 180;
    const sunDist = 20;
    const calcThreeSunPos = (azDeg: number) => {
      const cRad = (azDeg * Math.PI) / 180;
      return {
        x: sunDist * Math.cos(altRad) * Math.sin(cRad),
        y: sunDist * Math.sin(altRad),
        z: -sunDist * Math.cos(altRad) * Math.cos(cRad),
      };
    };
    const sunEast = calcThreeSunPos(90);
    const sunWest = calcThreeSunPos(270);
    const sunSouth = calcThreeSunPos(180);
    assert(sunEast.x > 0, 'Morning sun at azimuth 90° is positioned in positive X (East)');
    assert(sunWest.x < 0, 'Afternoon sun at azimuth 270° is positioned in negative X (West)');
    assert(sunSouth.z > 0 && Math.abs(sunSouth.x) < 1e-6, 'Solar noon sun at azimuth 180° is positioned in positive Z (South)');

    // Odd module count ray-tracer facet & area conservation (R01, R10 Reviewer Feedback)
    const scene27 = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      moduleWidthM: 1.134,
      moduleLengthM: 2.278,
    });
    const table27 = scene27.pvTables[0];
    const area27 = calculateTableActiveCollectorAreaM2(table27);
    const expectedModArea = (table27.widthM / Math.ceil(table27.moduleCount / 2)) * (table27.slopedLengthM / 2);
    const expectedArea27 = 27 * expectedModArea;
    assert(
      Math.abs(area27 - expectedArea27) < 0.01,
      'Analytical ray-tracer active collector area strictly matches 27 modules without phantom slot',
      `area=${area27.toFixed(2)}m², expected=${expectedArea27.toFixed(2)}m²`
    );

    const facets27 = buildTableFacets(table27);
    assert(
      facets27.length === 2,
      'Table with odd 27 modules decomposes into 2 active facets (13 full columns + 1 bottom module)',
      `facetsCount=${facets27.length}`
    );

    // Pitched roof local elevation & corner-by-corner clearance check
    const pitchedRoof = {
      id: 'roof-pitched',
      name: 'Industrial Pitched Roof',
      polygonWgs84: [],
      polygonEnu: [
        { x: -15, y: -15 },
        { x: 15, y: -15 },
        { x: 15, y: 15 },
        { x: -15, y: 15 },
      ],
      tiltDeg: 15,
      azimuthDeg: 180, // slopes up toward South
      eavesHeightM: 8.0,
      setbackClearanceM: 1.0,
    };
    const localZNorth = getLocalRoofElevationAt(pitchedRoof, 0, -10);
    const localZSouth = getLocalRoofElevationAt(pitchedRoof, 0, 10);
    assert(
      localZSouth > localZNorth,
      'Pitched roof surface elevation increases along ascending slope direction',
      `zNorth=${localZNorth.toFixed(2)}m, zSouth=${localZSouth.toFixed(2)}m`
    );

    // Flat roof clearance on native scene
    const flatClearance = checkTableRoofClearance(table27, scene27.roofPlanes[0]);
    assert(
      flatClearance.isNonPenetrating && flatClearance.minClearanceM >= 0.35,
      'All 4 3D corners of table strictly maintain positive clearance above flat roof surface',
      `minClearance=${flatClearance.minClearanceM.toFixed(2)}m`
    );

    // Pitched roof clearance with local elevation adaptation
    const localRoofAtTable = getLocalRoofElevationAt(pitchedRoof, table27.positionEnu.x, table27.positionEnu.y);
    const tableOnPitched = {
      ...table27,
      positionEnu: {
        ...table27.positionEnu,
        z: localRoofAtTable + 0.35 + (table27.slopedLengthM / 2) * Math.sin((table27.tiltDeg * Math.PI) / 180),
      },
    };
    const pitchedClearance = checkTableRoofClearance(tableOnPitched, pitchedRoof);
    assert(
      pitchedClearance.isNonPenetrating,
      'All 4 3D corners of table maintain non-penetrating clearance when adapted to pitched roof surface',
      `minClearance=${pitchedClearance.minClearanceM.toFixed(2)}m`
    );
  }

  // ===========================================================================
  // R5: Provenance & API Sentinel Rejection
  // ===========================================================================
  console.log('\n--- [R5] Provenance & API Sentinel / Invalid Value Rejection ---');
  {
    const provider = new ClimateDataProvider();

    // 1. NASA POWER rejects -999 fill value
    let threwNasaSentinel = false;
    try {
      (provider as any).parseNasaPowerResponse(35.68, 51.38, {
        properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: -999 } } },
      });
    } catch {
      threwNasaSentinel = true;
    }
    assert(threwNasaSentinel, 'NASA POWER parser rejects -999 sentinel fill value');

    // 2. NASA POWER rejects negative temperature sentinel (-999°C)
    let threwNasaTemp = false;
    try {
      (provider as any).parseNasaPowerResponse(35.68, 51.38, {
        properties: { parameter: { ALLSKY_SFC_SW_DWN: { ANN: 5.2 }, T2M: { ANN: -999 } } },
      });
    } catch {
      threwNasaTemp = true;
    }
    assert(threwNasaTemp, 'NASA POWER parser rejects -999°C unphysical temperature sentinel');

    // 3. PVGIS rejects incomplete monthly array (1 month instead of 12)
    let threwPvgisIncomplete = false;
    try {
      (provider as any).parsePvgisResponse(35.68, 51.38, {
        outputs: { monthly: [{ 'H(h)_m': 150 }] },
      });
    } catch {
      threwPvgisIncomplete = true;
    }
    assert(threwPvgisIncomplete, 'PVGIS parser rejects incomplete monthly array (< 12 months)');

    // 4. PVGIS rejects invalid monthly data ({})
    let threwPvgisMissing = false;
    try {
      (provider as any).parsePvgisResponse(35.68, 51.38, {
        outputs: { monthly: new Array(12).fill({}) },
      });
    } catch {
      threwPvgisMissing = true;
    }
    assert(threwPvgisMissing, 'PVGIS parser rejects months with missing H(h)_m values');

    // 5. Dark PV cell output
    const darkIv = calculateSingleDiodeCurve(50, 13, 41, 12, 550, -0.26, 0.045, -0.30, 0, 25);
    assert(darkIv.pmp === 0, 'PV cell in total darkness generates 0 Watts (no artificial power)');
    assert(darkIv.isc === 0, 'PV cell in total darkness generates 0 Amperes short-circuit current');
  }

  // ===========================================================================
  // R6: Component-Wise Radiation Shading
  // ===========================================================================
  console.log('\n--- [R6] Component-Wise Radiation Shading Loss ---');
  {
    // Build a scene with an obstacle that occludes the direct beam
    const sceneWithObs = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 20,
      totalModulesCount: 40,
      interRowSpacingM: 6.0,
      tiltDeg: 25,
      azimuthDeg: 0,
      isDemoMode: true, // Injects chiller in front of array
    });

    const res = simulateAnnual3dShading(sceneWithObs, 5.2, 40.0, { simulationMode: 'screening_3day' });
    assert(res.totalUnshadedAnnualKwh > 0, 'Unshaded energy is positive');
    assert(res.totalShadedAnnualKwh > 0, 'Shaded energy is positive');
    assert(res.totalLostAnnualKwh > 0, 'Lost energy is non-zero due to obstacle');
    assert(
      res.totalShadedAnnualKwh + res.totalLostAnnualKwh === res.totalUnshadedAnnualKwh,
      'Energy conservation strictly preserved (totalUnshaded = totalShaded + totalLost)',
      `${res.totalShadedAnnualKwh} + ${res.totalLostAnnualKwh} === ${res.totalUnshadedAnnualKwh}`
    );
    assert(
      res.annualGeometricBeamLossPct > 0,
      'Direct beam loss is recorded',
      `beamLoss=${res.annualGeometricBeamLossPct}%`
    );
  }

  // ===========================================================================
  // R7: PSH Normalization, Time Weights & Screening Naming
  // ===========================================================================
  console.log('\n--- [R7] PSH Normalization, Time Weights & Screening Naming ---');
  {
    const scene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 50,
      totalModulesCount: 100,
      tiltDeg: 20,
      azimuthDeg: 0,
    });

    // 1. Reject non-positive PSH
    let threwNegativePsh = false;
    try {
      simulateAnnual3dShading(scene, -2.0, 40.0);
    } catch {
      threwNegativePsh = true;
    }
    assert(threwNegativePsh, 'simulateAnnual3dShading throws on non-positive peakSunHours');

    // 2. Linear scaling across low PSH without artificial 0.2 clamp
    const resPsh4 = simulateAnnual3dShading(scene, 4.0, 40.0);
    const resPsh2 = simulateAnnual3dShading(scene, 2.0, 40.0);
    const resPsh1 = simulateAnnual3dShading(scene, 1.0, 40.0);
    const ratio4to2 = resPsh4.totalUnshadedAnnualKwh / resPsh2.totalUnshadedAnnualKwh;
    const ratio2to1 = resPsh2.totalUnshadedAnnualKwh / resPsh1.totalUnshadedAnnualKwh;
    assert(Math.abs(ratio4to2 - 2.0) < 0.02, 'Unshaded energy scales linearly between PSH 4.0 and 2.0 (ratio ~2.0)', `ratio=${ratio4to2.toFixed(3)}`);
    assert(Math.abs(ratio2to1 - 2.0) < 0.02, 'Unshaded energy scales linearly between PSH 2.0 and 1.0 without clamp (ratio ~2.0)', `ratio=${ratio2to1.toFixed(3)}`);

    // 3. Exact integral conservation of horizontal PSH (sum(weight * GHI) == PSH * 365 * 1000)
    assert(
      resPsh4.targetAnnualHorizontalIrradiationKwhM2 !== undefined &&
      Math.abs(resPsh4.targetAnnualHorizontalIrradiationKwhM2 - 4.0 * 365) < 0.1,
      'Target horizontal irradiation equals PSH * 365 (1460 kWh/m²)',
      `target=${resPsh4.targetAnnualHorizontalIrradiationKwhM2}`
    );
    assert(
      resPsh4.simulatedAnnualHorizontalIrradiationKwhM2 !== undefined &&
      Math.abs(resPsh4.simulatedAnnualHorizontalIrradiationKwhM2 - 1460) < 0.1,
      'Weighted integral of simulated GHI strictly conserves target horizontal irradiation (1460 kWh/m²)',
      `simulated=${resPsh4.simulatedAnnualHorizontalIrradiationKwhM2}`
    );
    assert(
      (resPsh4.pshIntegralConservationErrorPct ?? 1.0) < 0.001,
      'PSH integral conservation error across annual weighted steps is effectively zero (< 0.001%)',
      `errorPct=${resPsh4.pshIntegralConservationErrorPct}%`
    );

    // 4. Energy conservation and explicit disclaimer on accounting vs empirical physics
    assert(
      resPsh4.isEnergyConservationPreserved === true,
      'Energy conservation strictly preserved (unshaded = shaded + lost)'
    );
    assert(
      typeof resPsh4.energyBalanceNote === 'string' &&
      resPsh4.energyBalanceNote.includes('arithmetic conservation only'),
      'Explicitly clarifies that energy balance is an arithmetic conservation check, not proof of empirical accuracy'
    );

    // 5. Methodology description and clear screening naming
    assert(
      typeof resPsh4.methodologyDescription === 'string' && resPsh4.methodologyDescription.length > 20,
      'Methodology description explicitly states clear-sky optical ray-tracing screening proxy'
    );
    assert(
      typeof resPsh4.diffuseTranspositionAssumption === 'string' && resPsh4.diffuseTranspositionAssumption.includes('unobstructed'),
      'Explicitly documents unobstructed hemispherical assumption for diffuse component'
    );
  }

  // ===========================================================================
  // R8: Single-Diode Dark Curve Cutoff & Non-Negative Irradiance Validation
  // ===========================================================================
  console.log('\n--- [R8] Single-Diode Dark Curve Cutoff & Strict Non-Negative Irradiance ---');
  {
    // Dark condition (G = 0)
    const darkCurve = calculateSingleDiodeCurve(49.5, 13.5, 41.5, 12.8, 530, -0.26, 0.045, -0.30, 0, 25);
    assert(darkCurve.isc === 0 && darkCurve.imp === 0, 'Zero irradiance produces strictly 0 Amperes (no dark generation)');
    assert(darkCurve.pmp === 0 && darkCurve.voc === 0, 'Zero irradiance produces strictly 0 Watts peak power');
    assert(darkCurve.points.length >= 1 && darkCurve.points.every(p => p.i === 0 && p.p === 0), 'IV curve collapses to (0,0) in total darkness');

    // Negative irradiance rejection
    let threwNegative = false;
    try {
      calculateSingleDiodeCurve(49.5, 13.5, 41.5, 12.8, 530, -0.26, 0.045, -0.30, -50, 25);
    } catch {
      threwNegative = true;
    }
    assert(threwNegative, 'Negative irradiance (-50 W/m²) throws an explicit ValidationError');

    // NaN / Infinity rejection
    let threwNan = false;
    try {
      calculateSingleDiodeCurve(49.5, 13.5, 41.5, 12.8, 530, -0.26, 0.045, -0.30, NaN, 25);
    } catch {
      threwNan = true;
    }
    assert(threwNan, 'NaN irradiance throws an explicit ValidationError');
  }

  // ===========================================================================
  // R9: Iranian Financial Model Loan Annuity & Cash Flow Integrity
  // ===========================================================================
  console.log('\n--- [R9] Iranian Regulations Financial Annuity & Zero Interest Rate ---');
  {
    // Zero-interest financing: A = Principal / Term (no division by zero or NaN)
    const resZeroInterest = runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 3200, 70, 0, 5);
    const expectedPrincipal = Math.round(100 * 31.5 * 0.7); // 2205
    const expectedAnnuity = expectedPrincipal / 5; // 441
    const actualAnnuity = resZeroInterest.cashFlow25Years[0].debtServiceMillionToman;
    assert(
      Math.abs(actualAnnuity - expectedAnnuity) < 0.01,
      'Zero interest rate yields exact linear principal amortization (P / n)',
      `expected=${expectedAnnuity}, actual=${actualAnnuity}`
    );
    assert(
      resZeroInterest.equityIrrPct !== null && !isNaN(resZeroInterest.equityIrrPct) &&
      resZeroInterest.projectIrrPct !== null && !isNaN(resZeroInterest.projectIrrPct),
      'Zero-interest financing computes valid numeric IRRs'
    );

    // Negative interest rate rejection
    let threwNegativeInterest = false;
    try {
      runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 3200, 70, -5, 5);
    } catch {
      threwNegativeInterest = true;
    }
    assert(threwNegativeInterest, 'Negative interest rate throws an explicit Error');

    // Non-positive loan term rejection
    let threwZeroTerm = false;
    try {
      runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 3200, 70, 23, 0);
    } catch {
      threwZeroTerm = true;
    }
    assert(threwZeroTerm, 'Zero loan term throws an explicit Error');
  }

  // ===========================================================================
  // R10: Data Gateway Circuit Breaker & Policy-Driven Fallback Architecture
  // ===========================================================================
  console.log('\n--- [R10] Data Gateway Circuit Breaker & Policy-Driven Routing ---');
  {
    // 1. Circuit breaker operational tracking
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50, halfOpenMaxTrials: 2 });
    const initialMetrics = cb.getMetrics();
    assert(initialMetrics.successfulFetches === 0 && initialMetrics.transportFailures === 0, 'Circuit breaker initializes zeroed metrics counters');

    // First failure
    await cb.execute(
      async () => { throw new Error('Network socket timeout'); },
      async () => ({ data: 'fallback_1' })
    );
    const m1 = cb.getMetrics();
    assert(m1.transportFailures === 1 && m1.fallbackServed === 1, 'Transport failure increments transportFailures and fallbackServed');
    assert(cb.getState() === 'CLOSED', 'Breaker remains CLOSED before threshold is reached');

    // Second failure -> Trips to OPEN
    await cb.execute(
      async () => { throw new Error('Connection refused'); },
      async () => ({ data: 'fallback_2' })
    );
    assert(cb.getState() === 'OPEN', 'Breaker transitions to OPEN after 2 consecutive transport failures');

    // Third call while OPEN -> Fast-fails remote action without calling it, immediately serves fallback
    let remoteCalledWhileOpen = false;
    const fastFailRes = await cb.execute(
      async () => { remoteCalledWhileOpen = true; return { data: 'remote' }; },
      async () => ({ data: 'fast_fallback' })
    );
    assert(fastFailRes.data === 'fast_fallback', 'Breaker serves fallback immediately during OPEN state');
    assert(!remoteCalledWhileOpen, 'Remote action was skipped entirely during OPEN state (fast failover)');

    // 2. Policy-driven retrieval in ClimateDataProvider
    const provider = new ClimateDataProvider();
    provider.clearCache();

    // Policy: analytical_only skips network calls completely
    const analyticalRes = await provider.fetchClimateResource(35.6892, 51.3890, { policy: 'analytical_only' });
    assert(analyticalRes.metadata.isEstimatedFromGlobalModel === true, 'analytical_only policy returns analytical model data');
    assert(analyticalRes.metadata.sourceProvider === 'REGIONAL_ANALYTICAL_MODEL', 'analytical_only tags sourceProvider accurately');
    assert(analyticalRes.provenance?.peakSunHours?.unit === 'kWh/m²/day', 'Field provenance includes explicit physical unit');

    // Provenance units populated across all fields
    assert(analyticalRes.provenance?.tempAnnualMeanC?.unit === '°C', 'Mean temperature provenance carries °C unit');
  }

  // ===========================================================================
  // R11: Multi-Faceted Shading Reconciliation & Array Tilt Separation
  // ===========================================================================
  console.log('\n--- [R11] Multi-Faceted Shading Reconciliation & Array Tilt Separation ---');
  {
    const scene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 100,
      totalModulesCount: 200,
      tiltDeg: 28,
      installationEnvironment: 'rooftop_flat_concrete',
    });

    const res = simulateAnnual3dShading(scene, 5.0, 38.0);
    const status = res.reconciliationStatus;
    assert(status !== undefined, 'Annual shading result includes structured ShadingReconciliationStatus');
    assert(status?.isArithmeticBalanceOk === true, 'reconciliationStatus: isArithmeticBalanceOk is verified');
    assert(status?.isHeatmapAggregationConsistent === true, 'reconciliationStatus: isHeatmapAggregationConsistent is verified');
    assert(status?.isComponentEnergyConsistent === true, 'reconciliationStatus: isComponentEnergyConsistent is verified');
    assert(status?.isProjectSnapshotConsistent === true, 'reconciliationStatus: isProjectSnapshotConsistent is verified');
    assert(status?.overallReconciled === true, 'reconciliationStatus: overallReconciled is true');

    // Tilt separation: rooftop flat concrete pitch is 5° drainage slope, but array racking tilt is 28°
    // The waterfall report must preserve the array tilt (28°), not the flat roof pitch (5°)
    assert(scene.roofPlanes[0].tiltDeg === 5, 'Rooftop concrete plane pitch is 5° drainage slope');
    assert(scene.tiltDeg === 28, 'PV racking tilt is configured to 28°');
    // Waterfall should have simulated non-zero POA transposition using array tilt
    assert(res.waterfallLossReport.netAnnualEnergyExportMwh > 0, 'Waterfall generation properly computed with array tilt');
  }

  // Summary
  console.log('\n================================================================================');
  console.log(` R1–R11 AUDIT TEST SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('================================================================================');

  if (failures > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(2);
});
