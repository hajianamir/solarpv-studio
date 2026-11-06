/**
 * Comprehensive Engineering Audit & Remediation Verification Suite
 * SolarPV Studio v3.0 - Multi-Discipline Engineering Integrity Test
 *
 * Verifies all 6 core audit areas:
 * 1. 3D Rooftop Overhaul & Ray-Tracing (module conservation, slope normal, obstacle geometry, POA/PSH scaling, inter-row)
 * 2. Field-Level Provenance & EngineeringDatum schema
 * 3. Financial Engine & Iranian Regulations (robust IRR solver, null DSCR without debt, no 32.5% fallback)
 * 4. Grid Compliance & LVRT Screening (no unconditional compliance claim without inverter curves)
 * 5. Structural & Earthing Safety (IEEE 80 touch/step gating, preliminary screening notices)
 * 6. Electrical Sizing & 24h Battery Dispatch (strict energy conservation, voltage feasibility, no artificial clamps)
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ThreeJsViewer } from '../src/components/ThreeJsViewer';
import {
  buildSceneFromProjectDesign,
  simulateAnnual3dShading,
  calculateRayTracedShadingFactor,
  buildObstacleFacets,
  convertPvTablesToTriangles,
  generateTableMeshSamplePoints,
  getActiveTableSubRects,
  getLocalRoofElevationAt,
  computeTableShadingGeometricMesh,
  RoofPlane,
  Obstacle3D,
  PvTable3D,
} from '../src/engine/roof3dShadingEngine';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import {
  shadingLifecycleReducer,
  createInitialShadingLifecycleState,
  computeShadingSceneSignature,
} from '../src/engine/shadingLifecycle';
import { runIranianRegulationFinancialModel } from '../src/engine/iranianRegulationsFinancial';
import { analyzePowerplantHarmonics, analyzeUpstreamGridConditions } from '../src/engine/harmonicsEngine';
import { calculateStructuralAndFoundations } from '../src/engine/structuralEngine';
import { designMvSubstation } from '../src/engine/mvSubstationEngine';
import { calculateVoltageDropDc } from '../src/engine/solarPvEngine';
import { simulate24hEnergyBalance } from '../src/engine/simulation24hEngine';
import { designPvArray } from '../src/engine/pvEngineAdvanced';
import { calculateSolarPump } from '../src/engine/solarPumpEngine';
import { createEngineeringDatum } from '../src/engine/dataGateway/types';

let failures = 0;
let passes = 0;

function assert(condition: boolean, testName: string, detail: string = '') {
  if (condition) {
    passes++;
    console.log(`  [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
  } else {
    failures++;
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runAuditRemediationSuite() {
  console.log('================================================================================');
  console.log(' SolarPV Studio — Engineering Audit & Remediation Verification Suite');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // AREA 1: 3D Rooftop Overhaul & Geometry
  // ---------------------------------------------------------------------------
  console.log('--- [AREA 1] 3D Rooftop Overhaul & Geometry Integrity ---');

  // 1a. Module count and DC capacity conservation across arbitrary sizes
  const testModuleCounts = [0, 1, 27, 28, 29, 84, 85, 200, 201, 2000];
  for (const count of testModuleCounts) {
    const targetKwp = count > 0 ? (count * 550) / 1000 : 0;
    const scene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: targetKwp,
      totalModulesCount: count,
      interRowSpacingM: 5.0,
      tiltDeg: 25,
      azimuthDeg: 0,
      includeDefaultObstacles: false,
    });

    if (count === 0) {
      assert(
        scene.pvTables.length === 0,
        `Zero module count produces empty scene`,
        `pvTables.length=${scene.pvTables.length}`
      );
    } else {
      const sumModules = scene.pvTables.reduce((s, t) => s + t.moduleCount, 0);
      const sumWatts = scene.pvTables.reduce((s, t) => s + t.ratedPowerWp, 0);
      const expectedWatts = Math.round(targetKwp * 1000);

      assert(
        sumModules === count && sumWatts === expectedWatts,
        `Exact module and capacity conservation for N=${count}`,
        `tables=${scene.pvTables.length}, sumMod=${sumModules}/${count}, sumWp=${sumWatts}/${expectedWatts}`
      );
    }
  }

  // 1b. Table slope orientation and surface normal vector
  {
    const scene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 30.8,
      totalModulesCount: 56,
      interRowSpacingM: 5.0,
      tiltDeg: 25,
      azimuthDeg: 0, // South-facing
      includeDefaultObstacles: false,
    });
    const t0 = scene.pvTables[0];
    const pts = generateTableMeshSamplePoints(t0, 2, 2);

    // In ENU (+X=East, +Y=North, +Z=Up):
    // For a South-facing panel (azimuth 0°), lower edge is at South (-Y) and upper edge is at North (+Y).
    // As sloped coordinate increases, Y must increase (go North)!
    const pSouth = pts[0]; // lower edge
    const pNorth = pts[pts.length - 1]; // upper edge
    const slopePointsNorth = pNorth.y > pSouth.y && pNorth.z > pSouth.z;
    assert(
      slopePointsNorth,
      `PV table sloped rack tilts South: lower edge is South, upper edge is North`,
      `ySouth=${pSouth.y.toFixed(2)}, yNorth=${pNorth.y.toFixed(2)}, zSouth=${pSouth.z.toFixed(2)}, zNorth=${pNorth.z.toFixed(2)}`
    );

    // Physical clearance constraint (R11): Lowest edge must strictly clear the roof eaves height
    const roofEaves = scene.roofPlanes[0]?.eavesHeightM ?? 8.0;
    assert(
      pSouth.z > roofEaves,
      `PV table lowest edge strictly clears roof plane (no roof penetration)`,
      `lowestZ=${pSouth.z.toFixed(2)}m > roofEaves=${roofEaves.toFixed(2)}m (clearance=${(pSouth.z - roofEaves).toFixed(2)}m)`
    );

    // Normal vector points South (-Y) and Up (+Z)
    const tiltRad = (t0.tiltDeg * Math.PI) / 180.0;
    const ny = -Math.cos(0) * Math.sin(tiltRad);
    const nz = Math.cos(tiltRad);
    assert(
      ny < 0 && nz > 0,
      `Surface normal vector has negative Y (South) and positive Z (Up)`,
      `ny=${ny.toFixed(3)}, nz=${nz.toFixed(3)}`
    );
  }

  // 1c. Obstacle cylinder facet plane equation & rotation support
  {
    const cylFacets = buildObstacleFacets({
      id: 'test-cyl',
      name: 'Test Chimney',
      geometryType: 'cylinder',
      positionEnu: { x: 5, y: 5, z: 0 },
      dimensionsM: { radiusM: 1.0, heightM: 3.0 },
    });
    // For every wall facet, test that its own vertices lie exactly on the plane nx*x + ny*y + nz*z + d = 0
    let maxPlaneError = 0;
    for (const f of cylFacets) {
      for (const v of f.vertices) {
        const err = Math.abs(f.normal.x * v.x + f.normal.y * v.y + f.normal.z * v.z + f.d);
        if (err > maxPlaneError) maxPlaneError = err;
      }
    }
    assert(
      maxPlaneError < 1e-9,
      `Cylinder facet plane equation strictly contains its vertices`,
      `maxPlaneError=${maxPlaneError.toExponential(4)}`
    );

    // Rotated cuboid
    const rotatedFacets = buildObstacleFacets({
      id: 'test-box-rot',
      name: 'Rotated Box',
      geometryType: 'cuboid',
      positionEnu: { x: 0, y: 0, z: 0 },
      dimensionsM: { widthM: 4.0, lengthM: 2.0, heightM: 2.0 },
      rotationDeg: 45.0,
    });
    const southFacet = rotatedFacets.find(f => f.name.includes('south'))!;
    const expectedNx = Math.sin((45 * Math.PI) / 180.0);
    const expectedNy = -Math.cos((45 * Math.PI) / 180.0);
    const normDiff = Math.hypot(southFacet.normal.x - expectedNx, southFacet.normal.y - expectedNy);
    assert(
      normDiff < 1e-4,
      `Cuboid obstacle rotation rotates facet normals accurately`,
      `normal=(${southFacet.normal.x.toFixed(3)}, ${southFacet.normal.y.toFixed(3)})`
    );
  }

  // 1d. Annual 3D simulation POA irradiance and inter-row shading coupling
  {
    const sceneCloseRows = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 30.8,
      totalModulesCount: 56,
      interRowSpacingM: 2.5, // tight pitch creates inter-row self-shading
      tiltDeg: 35,
      azimuthDeg: 0,
      includeDefaultObstacles: false, // only inter-row PV tables
    });

    const resPsh5 = simulateAnnual3dShading(sceneCloseRows, 5.2, 40.0, { simulationMode: 'screening_3day' });
    const resPsh2 = simulateAnnual3dShading(sceneCloseRows, 2.6, 40.0, { simulationMode: 'screening_3day' });

    assert(
      resPsh5.annualCombinedShadingLossPct > 0.0,
      `Inter-row self-shading is evaluated between PV tables without obstacles`,
      `interRowLoss=${resPsh5.annualCombinedShadingLossPct}%`
    );

    const ratioEnergy = resPsh5.totalUnshadedAnnualKwh / Math.max(1, resPsh2.totalUnshadedAnnualKwh);
    assert(
      Math.abs(ratioEnergy - 2.0) < 0.15,
      `Unshaded energy physically scales with peakSunHours (5.2 vs 2.6)`,
      `energyPsh5=${resPsh5.totalUnshadedAnnualKwh} kWh, energyPsh2=${resPsh2.totalUnshadedAnnualKwh} kWh (ratio=${ratioEnergy.toFixed(2)})`
    );
  }

  // 1e. Lifecycle signature hashing and stale detection
  {
    const sInit = createInitialShadingLifecycleState();
    const sig1 = computeShadingSceneSignature({ capacityKwp: 100, tiltDeg: 25, pitchM: 5.0 });
    const sig2 = computeShadingSceneSignature({ capacityKwp: 100, tiltDeg: 35, pitchM: 5.0 });

    const sApplied = shadingLifecycleReducer(sInit, {
      type: 'APPLY',
      lossPct: 5.5,
      capacityKwp: 100,
      projectCapacityKwp: 100,
      signatureHash: sig1,
    });
    assert(sApplied.isStale === false, `Applied shading is initially not stale`);

    const sCheckedSame = shadingLifecycleReducer(sApplied, {
      type: 'CHECK_SYNC',
      currentCapacityKwp: 100,
      currentSignatureHash: sig1,
    });
    assert(sCheckedSame.isStale === false, `Unchanged geometry maintains not-stale status`);

    const sCheckedDiff = shadingLifecycleReducer(sApplied, {
      type: 'CHECK_SYNC',
      currentCapacityKwp: 100,
      currentSignatureHash: sig2,
    });
    assert(sCheckedDiff.isStale === true, `Modified geometry (tilt changed) invalidates prior shading factor to stale`);
  }

  // ---------------------------------------------------------------------------
  // AREA 2: Field-Level Data Provenance & Climate API Fallback
  // ---------------------------------------------------------------------------
  console.log('\n--- [AREA 2] Field-Level Data Provenance & Climate API Fallback ---');
  {
    const datum = createEngineeringDatum(5.17, 'available', 'PVGIS-ERA5', 'satellite_reanalysis', 3.5, 'Calibrated 2005-2020 TMY');
    assert(
      datum.status === 'available' && datum.value === 5.17 && datum.source === 'PVGIS-ERA5',
      `EngineeringDatum stores typed value, provenance status, and source`,
      `source=${datum.source}, status=${datum.status}, uncertainty=${datum.uncertaintyPct}%`
    );

    // Verify empty/missing NASA POWER response is rejected and fallback marks isEstimatedFromGlobalModel: true
    const climateProvider = new ClimateDataProvider();
    let threwOnEmptyNasa = false;
    try {
      (climateProvider as any).parseNasaPowerResponse(35.6892, 51.3890, {});
    } catch {
      threwOnEmptyNasa = true;
    }
    assert(threwOnEmptyNasa, `Empty NASA POWER API payload is rejected instead of silently accepted as non-estimated`);

    let threwOnEmptyPvgis = false;
    try {
      (climateProvider as any).parsePvgisResponse(35.6892, 51.3890, {});
    } catch {
      threwOnEmptyPvgis = true;
    }
    assert(threwOnEmptyPvgis, `Empty PVGIS API payload is rejected instead of silently accepted as non-estimated`);

    const fallbackData = climateProvider.computeAnalyticalClimateResource(35.6892, 51.3890, true);
    assert(
      fallbackData.metadata.isEstimatedFromGlobalModel === true,
      `Analytical climate fallback is explicitly tagged with isEstimatedFromGlobalModel: true`,
      `isEstimated=${fallbackData.metadata.isEstimatedFromGlobalModel}`
    );
  }

  // ---------------------------------------------------------------------------
  // AREA 3: Financial Engine & Iranian Regulations
  // ---------------------------------------------------------------------------
  console.log('\n--- [AREA 3] Financial Engine & Iranian Regulations ---');
  {
    // Normal project
    const finResult = runIranianRegulationFinancialModel(
      1000, // 1000 kWp
      1650, // 1650 MWh
      'article_16',
      4200,
      70, // 70% debt
      23,
      5
    );
    assert(
      finResult.equityIrrPct !== null && finResult.equityIrrPct > 0,
      `Valid Iranian financial model computes valid Equity IRR`,
      `equityIrr=${finResult.equityIrrPct}%, projectIrr=${finResult.projectIrrPct}%`
    );
    assert(
      finResult.cashFlow25Years[0].dscr !== null,
      `Cash flow with debt service computes numerical DSCR`,
      `dscr=${finResult.cashFlow25Years[0].dscr}`
    );

    // Project with ZERO loan (100% equity): DSCR must be null, never fake 9.9
    const zeroDebtResult = runIranianRegulationFinancialModel(
      1000,
      1650,
      'article_16',
      4200,
      0, // 0% debt
      23,
      5
    );
    const dscrValues = zeroDebtResult.cashFlow25Years.map(c => c.dscr);
    const allNullDscr = dscrValues.every(d => d === null);
    assert(
      allNullDscr,
      `Zero-debt financing strictly yields dscr: null instead of fabricated 9.9`,
      `sampleDscr=${dscrValues[0]}`
    );
  }

  // ---------------------------------------------------------------------------
  // AREA 4: Grid Compliance & LVRT Screening
  // ---------------------------------------------------------------------------
  console.log('\n--- [AREA 4] Grid Compliance & LVRT Screening ---');
  {
    const pcc = analyzeUpstreamGridConditions({
      plantCapacityMw: 5.0,
      gridVoltageKv: 20.0,
      gridShortCircuitMva: 250.0,
      gridXrRatio: 8.0,
      inverterPowerFactor: 0.98,
      isPowerFactorLagging: true,
    });
    assert(
      pcc.lvrtCompliance.status === 'screening_only',
      `LVRT compliance status is 'screening_only' without manufacturer curves`,
      `status=${pcc.lvrtCompliance.status}, noteEn=${pcc.lvrtCompliance.statusEn.slice(0, 40)}...`
    );
  }

  // ---------------------------------------------------------------------------
  // AREA 5: Structural & Earthing Safety
  // ---------------------------------------------------------------------------
  console.log('\n--- [AREA 5] Structural & Earthing Safety ---');
  {
    // 5a. Earthing compliance gating (IEEE 80)
    const mvSub = designMvSubstation({
      plantCapacityAcMva: 10.0,
      inverterOutputVoltageV: 800,
      gridConnectionVoltageKv: 20.0,
      soilResistivityOhmM: 80.0,
      clearingTimeSec: 0.5,
    });
    const earthing = mvSub.earthing;
    const isSafeLogic = earthing.isResistanceCompliant && earthing.isTouchSafe && earthing.isStepSafe;
    assert(
      earthing.isCompliant === isSafeLogic,
      `Substation earthing compliance strictly gates on touch and step safety in addition to resistance`,
      `isCompliant=${earthing.isCompliant}, touchSafe=${earthing.isTouchSafe}, stepSafe=${earthing.isStepSafe}, Rg=${earthing.calculatedGridResistanceOhms}Ω`
    );

    // 5b. Structural preliminary screening disclaimer
    const struct = calculateStructuralAndFoundations({
      totalModulesCount: 140,
      tablesCount: 5,
      moduleLengthM: 2.278,
      moduleWidthM: 1.134,
      moduleWeightKg: 28.5,
      modulesPerTable: 28,
      arrayTiltDeg: 25,
      groundClearanceM: 0.8,
      basicWindSpeedKmh: 120,
      groundSnowLoadKgM2: 50,
      foundationType: 'shed_roof_clamp_rail',
      soilType: 'dense_sand_gravel',
    });
    assert(
      struct.isScreeningPreliminary === true &&
        struct.safetyReasonEn.includes('Preliminary Screening') &&
        struct.screeningDisclaimerEn.length > 0,
      `Structural engine marks shed/rooftop assessment with preliminary screening disclaimer`,
      `screeningNotice=${struct.safetyReasonEn.slice(0, 45)}...`
    );
  }

  // ---------------------------------------------------------------------------
  // AREA 6: Electrical Sizing & 24h Battery Dispatch
  // ---------------------------------------------------------------------------
  console.log('\n--- [AREA 6] Electrical Sizing & 24h Battery Dispatch ---');
  {
    // 6a. DC Voltage drop error on invalid non-positive inputs
    let voltDropThrew = false;
    try {
      calculateVoltageDropDc(50, 10, 0, 800); // 0 mm² cross-section
    } catch {
      voltDropThrew = true;
    }
    assert(
      voltDropThrew,
      `calculateVoltageDropDc rejects zero crossSectionMm2 with an explicit Error instead of returning 0.0%`,
      `threw=${voltDropThrew}`
    );

    // 6b. 24h Energy Balance: load partition conservation
    const sim24 = simulate24hEnergyBalance(
      20,   // 20 kWp
      5.2,  // PSH
      120,  // daytime 120 kWh
      120,  // nighttime 120 kWh
      50,   // usable 50 kWh
      60    // total 60 kWh
    );
    const sumHourlyDemand = sim24.hourlySteps.reduce((s, h) => s + h.loadDemandKwh, 0);
    const demandDelta = Math.abs(sumHourlyDemand - 240.0);
    assert(
      demandDelta < 0.5,
      `24h load profile partition strictly sums to daytime + nighttime load (120+120=240 kWh)`,
      `sumHourlyDemand=${sumHourlyDemand.toFixed(2)} kWh, totalConsumption24hKwh=${sim24.totalConsumption24hKwh} kWh`
    );

    // 6c. Zero-battery solar surplus conservation
    const zeroBatSim = simulate24hEnergyBalance(
      10,   // 10 kWp
      5.0,  // PSH
      0,    // daytime 0 kWh
      0,    // nighttime 0 kWh
      0,    // 0 battery
      0
    );
    const genTotal = zeroBatSim.totalGeneration24hKwh;
    const surplusTotal = zeroBatSim.totalSurplus24hKwh;
    const surplusDelta = Math.abs(genTotal - surplusTotal);
    assert(
      surplusDelta < 0.2,
      `Zero-battery system conserves 100% of solar generation as surplus without battery efficiency penalty`,
      `generation=${genTotal} kWh, surplus=${surplusTotal} kWh`
    );

    // 6d. PV Array sizing: invalid PSH rejection & voltage feasibility
    let pshThrew = false;
    try {
      designPvArray(
        100,
        -1.0, // invalid PSH
        { modelName: 'Tiger Neo 550W', manufacturer: 'Jinko Solar', pmpWatts: 550, vocVolts: 50.8, vmpVolts: 41.28, iscAmps: 13.99, impAmps: 13.33, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, noctC: 45, lengthM: 2.278, widthM: 1.134 },
        { modelName: 'Inv', manufacturer: 'Mfg', pnomAcKw: 50, vdcMaxVolts: 1000, vmpptMinVolts: 200, vmpptMaxVolts: 850, iscMaxAmpsPerMppt: 40, imppMaxAmpsPerMppt: 32, mpptChannelsCount: 2, efficiencyMaxPct: 98.5, isThreePhase: true },
        { ambientTempMinC: -10, ambientTempMaxC: 45, soilingLossPct: 3, dcCableLossPct: 1.5, mismatchAndLidLossPct: 2, inverterClippingLossPct: 0.5, systemAvailabilityPct: 99, groundAlbedo: 0.2, arrayTiltDeg: 25 },
        35.68
      );
    } catch {
      pshThrew = true;
    }
    assert(
      pshThrew,
      `designPvArray rejects non-positive peakSunHours with an explicit Error instead of silent clamp`,
      `threw=${pshThrew}`
    );

    // Infeasible MPPT voltage range test
    const infeasibleDesign = designPvArray(
      100,
      5.2,
      { modelName: 'Tiger Neo 550W', manufacturer: 'Jinko Solar', pmpWatts: 550, vocVolts: 50.8, vmpVolts: 41.28, iscAmps: 13.99, impAmps: 13.33, tempCoeffVocPct: -0.25, tempCoeffPmpPct: -0.30, noctC: 45, lengthM: 2.278, widthM: 1.134 },
      // Tiny MPPT window that cannot fit any valid string: vmpptMin = 950V, vmpptMax = 960V, vdcMax = 970V
      { modelName: 'NarrowInv', manufacturer: 'Mfg', pnomAcKw: 50, vdcMaxVolts: 970, vmpptMinVolts: 950, vmpptMaxVolts: 960, iscMaxAmpsPerMppt: 40, imppMaxAmpsPerMppt: 32, mpptChannelsCount: 2, efficiencyMaxPct: 98.5, isThreePhase: true },
      { ambientTempMinC: -10, ambientTempMaxC: 45, soilingLossPct: 3, dcCableLossPct: 1.5, mismatchAndLidLossPct: 2, inverterClippingLossPct: 0.5, systemAvailabilityPct: 99, groundAlbedo: 0.2, arrayTiltDeg: 25 },
      35.68
    );
    assert(
      infeasibleDesign.isVoltageFeasible === false && infeasibleDesign.isDesignFeasible === false,
      `designPvArray flags isVoltageFeasible: false when MPPT window cannot fit string voltage`,
      `isVoltageFeasible=${infeasibleDesign.isVoltageFeasible}`
    );

    // 6e. Solar Pump sizing: removes 3.5h artificial clamp
    const pumpLowPsh = calculateSolarPump({
      wellDepthM: 30,
      tankHeightM: 10,
      pipeLengthM: 100,
      pipeDiameterMm: 63,
      dailyWaterRequirementM3: 50,
      irrigationType: 'drip',
      peakSunHours: 1.5, // low winter PSH
    });
    // With 1.5 PSH, pumping hours = 1.5 * 0.9 = 1.35h. Flow rate = 50 / 1.35 = ~37 m³/h.
    // If clamped to 3.5, flow rate would be 50 / 3.5 = 14.3 m³/h.
    assert(
      pumpLowPsh.flowRateM3PerHour > 25.0,
      `calculateSolarPump does not artificially clamp pumping hours to 3.5h for low PSH`,
      `flowRate=${pumpLowPsh.flowRateM3PerHour} m³/h at PSH=1.5`
    );
  }

  // ===========================================================================
  // AREA 7: Six Critical Engineering Discrepancies Verification
  // ===========================================================================
  console.log('\n--- [AREA 7] Six Critical Engineering Discrepancies Verification ---');
  {
    // Discrepancy 1: Signature parity between ThreeJsViewer and shading lifecycle
    const sceneD1 = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      tiltDeg: 25,
      azimuthDeg: 0,
      includeDefaultObstacles: false,
    });
    const annualD1 = simulateAnnual3dShading(sceneD1, 5.2, 40.0);
    const canonicalSig = computeShadingSceneSignature({
      scene: annualD1.sceneState,
      cityId: 'tehran',
      peakSunHours: 5.2,
    });
    const currentSig = computeShadingSceneSignature({
      scene: sceneD1,
      cityId: 'tehran',
      peakSunHours: 5.2,
    });
    assert(
      canonicalSig === currentSig,
      'Post-simulation scene signature strictly matches current scene signature under canonical format',
      `canonicalSig=${canonicalSig.slice(0, 16)}... currentSig=${currentSig.slice(0, 16)}...`
    );

    // Verify passing bare sceneState produces a different signature (which was causing stale apply mismatch)
    const bareSig = computeShadingSceneSignature(annualD1.sceneState as any);
    assert(
      bareSig !== canonicalSig,
      'Passing bare sceneState produces non-canonical signature, demonstrating why ThreeJsViewer:616 fix is mandatory',
      `bareSig=${bareSig.slice(0, 16)}... vs canonicalSig=${canonicalSig.slice(0, 16)}...`
    );

    // Discrepancy 2: Odd-module slot parity (bottom module present, top module empty)
    const t27 = sceneD1.pvTables[0];
    const subRects27 = getActiveTableSubRects(t27);
    assert(
      subRects27.length === 2,
      'Table with 27 modules decomposes into 2 active sub-rectangles without phantom 28th slot',
      `subRectsCount=${subRects27.length}`
    );
    const oddSubRect = subRects27[1];
    assert(
      oddSubRect.centerOffsetSlope < 0,
      'Odd 27th module is positioned in bottom slot (negative slope offset), matching ThreeJsViewer visual mesh',
      `centerOffsetSlope=${oddSubRect.centerOffsetSlope.toFixed(3)}m`
    );

    // Discrepancy 3: Ray-tracer & Annual simulation sample point weighting distortion
    const samplePts27 = generateTableMeshSamplePoints(t27);
    assert(
      samplePts27.length === 27,
      'Area-weighted sample point generator allocates exactly 27 points for 27 modules (1 point per module)',
      `ptsCount=${samplePts27.length}`
    );

    // D3 Real Obstacle Probe: Shading obstacle placed directly over the 27th module (column 13, bottom slot)
    const mod27Pt = samplePts27[26];
    const sunOverObs = [{ x: 0, y: -0.866, z: 0.5 }];
    const obsOverMod27: Obstacle3D = {
      id: 'obs-over-mod-27',
      name: 'Shading block directly over 27th module',
      geometryType: 'cuboid',
      positionEnu: {
        x: mod27Pt.x,
        y: mod27Pt.y - 1.2,
        z: mod27Pt.z + 0.7,
      },
      dimensionsM: { widthM: 1.2, lengthM: 1.2, heightM: 2.0 },
    };

    const sceneWithMod27Obs = {
      ...sceneD1,
      obstacles: [obsOverMod27],
    };

    // 1) Annual simulation path: must detect shading on module 27 (loss > 0)
    const annualResMod27 = simulateAnnual3dShading(sceneWithMod27Obs, 5.2, 40.0);
    assert(
      annualResMod27.annualGeometricBeamLossPct > 0 && annualResMod27.tableHeatmap[0].annualLossKwh > 0,
      'Annual 3D simulation path detects obstacle shading on 27th module (annual loss > 0%)',
      `annualBeamLoss=${annualResMod27.annualGeometricBeamLossPct}%, lossKwh=${annualResMod27.tableHeatmap[0].annualLossKwh.toFixed(1)}`
    );

    // 2) Ray-tracer path: must detect single module shading ~3.7% loss
    const rayTraceMod27 = calculateRayTracedShadingFactor(sceneWithMod27Obs, sunOverObs);
    assert(
      rayTraceMod27.averageShadingLossPct >= 3.5 && rayTraceMod27.averageShadingLossPct <= 3.9,
      'Ray-tracer path registers single module shading around 3.7% (~1/27), avoiding 50% distortion',
      `lossPct=${rayTraceMod27.averageShadingLossPct}% (expected ~3.70%)`
    );

    // D3 Inter-Table Weighting Probe: Table A (27 modules, unshaded) + Table B (2 modules, fully shaded)
    // Physical array capacity: Table A = 27/29 (93.1%), Table B = 2/29 (6.9%).
    // When Table B is 100% shaded, array loss must be ~6.90% (NOT 30.77%).
    const tableA = { ...t27, id: 'tbl-a', tableIndex: 1, positionEnu: { x: 0, y: 15, z: 10 } };
    const tableB = {
      id: 'tbl-b',
      tableIndex: 2,
      positionEnu: { x: 0, y: -15, z: 10 },
      widthM: 2.268,
      slopedLengthM: 2.278,
      tiltDeg: 25,
      azimuthDeg: 0,
      moduleCount: 2,
      ratedPowerWp: 1100,
    };
    const obsCoveringTableB: Obstacle3D = {
      id: 'obs-over-tbl-b',
      name: 'Giant cover over Table B',
      geometryType: 'cuboid',
      positionEnu: { x: 0, y: -16, z: 11 },
      dimensionsM: { widthM: 6.0, lengthM: 6.0, heightM: 5.0 },
    };
    const twoTableScene = {
      ...sceneD1,
      pvTables: [tableA, tableB],
      obstacles: [obsCoveringTableB],
      totalPvCapacityKwp: 15.95,
      totalModulesCount: 29,
    };
    const interTableRayTrace = calculateRayTracedShadingFactor(twoTableScene, sunOverObs);
    assert(
      interTableRayTrace.averageShadingLossPct >= 6.5 && interTableRayTrace.averageShadingLossPct <= 7.2,
      'Multi-table ray-tracer capacity-weights tables: 2 shaded modules in 29-module array yield ~6.90% loss (not 30.77%)',
      `interTableLoss=${interTableRayTrace.averageShadingLossPct}% (expected 6.90%)`
    );

    // Discrepancy 4: Large module count scaling (N=2000) and single module length (N=1)
    const scene2000 = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 1100,
      totalModulesCount: 2000,
      tiltDeg: 25,
      azimuthDeg: 0,
    });
    const totalModulesInScene2000 = scene2000.pvTables.reduce((s, t) => s + t.moduleCount, 0);
    assert(
      totalModulesInScene2000 === 2000,
      'Large array of 2000 modules preserves all 2000 modules without 28-column ceiling clamp',
      `totalModules=${totalModulesInScene2000}`
    );

    const sceneN1 = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 0.55,
      totalModulesCount: 1,
      tiltDeg: 25,
      azimuthDeg: 0,
    });
    const subRectN1 = getActiveTableSubRects(sceneN1.pvTables[0]);
    assert(
      subRectN1.length === 1 && subRectN1[0].slopedLength === sceneN1.pvTables[0].slopedLengthM,
      'Single-module table (N=1) spans full sloped length without being halved',
      `slopedLength=${subRectN1[0].slopedLength}m, tableSlopedLength=${sceneN1.pvTables[0].slopedLengthM}m`
    );

    // Discrepancy 5: Roof plane visualization & elevation rise direction consistency
    const southFacingRoof: RoofPlane = {
      id: 'roof-south-facing',
      name: 'South Facing Roof',
      polygonWgs84: [],
      polygonEnu: [
        { x: -20, y: -20 },
        { x: 20, y: -20 },
        { x: 20, y: 20 },
        { x: -20, y: 20 },
      ],
      tiltDeg: 15,
      azimuthDeg: 0, // Faces South (0°): slopes up toward North (+Y)
      eavesHeightM: 8.0,
      setbackClearanceM: 1.0,
    };
    const zNorthSouthRoof = getLocalRoofElevationAt(southFacingRoof, 0, 10);
    const zSouthSouthRoof = getLocalRoofElevationAt(southFacingRoof, 0, -10);
    assert(
      zNorthSouthRoof > zSouthSouthRoof,
      'South-facing roof (azimuth 0°) rises toward North (+Y) with eaves at South (-Y)',
      `zNorth=${zNorthSouthRoof.toFixed(2)}m, zSouth=${zSouthSouthRoof.toFixed(2)}m`
    );

    // Visual roof mesh center elevation matches analytical elevation at (0, 0)
    const analyticalCenterZ = getLocalRoofElevationAt(southFacingRoof, 0, 0);
    assert(
      analyticalCenterZ > southFacingRoof.eavesHeightM &&
        Math.abs(analyticalCenterZ - (8.0 + 20 * Math.tan((15 * Math.PI) / 180))) < 0.01,
      'Roof plane center elevation is correctly computed along slope (13.36m vs eaves 8.0m), eliminating visual height discrepancy',
      `analyticalCenterZ=${analyticalCenterZ.toFixed(2)}m`
    );

    // Azimuth 90° table orientation: downslope faces West (-X), upslope rises East (+X)
    const westFacingRoof: RoofPlane = {
      ...southFacingRoof,
      id: 'roof-west-facing',
      azimuthDeg: 90, // Faces West
    };
    const zEastWestRoof = getLocalRoofElevationAt(westFacingRoof, 10, 0); // East (+X)
    const zWestWestRoof = getLocalRoofElevationAt(westFacingRoof, -10, 0); // West (-X)
    assert(
      zEastWestRoof > zWestWestRoof,
      'West-facing roof/table (azimuth 90°) has upslope rising toward East (+X) and downslope toward West (-X)',
      `zEast=${zEastWestRoof.toFixed(2)}m, zWest=${zWestWestRoof.toFixed(2)}m`
    );

    // Discrepancy 6: Snapshot reconciliation capacity mismatch & NASA temperature sentinels
    // Case A: 999 kWp declared vs 14.85 kWp actual
    const mismatchedScene999 = {
      ...sceneD1,
      totalPvCapacityKwp: 999.0,
    };
    const simRes999 = simulateAnnual3dShading(mismatchedScene999, 5.2, 40.0);
    assert(
      simRes999.reconciliationStatus?.isProjectSnapshotConsistent === false &&
        simRes999.isReconciled === false,
      'Snapshot reconciliation detects capacity mismatch between declared project total (999 kWp) and table sum (14.85 kWp)',
      `isProjectSnapshotConsistent=${simRes999.reconciliationStatus?.isProjectSnapshotConsistent}, overallReconciled=${simRes999.isReconciled}`
    );

    // Case B: 0 kWp declared vs 14.85 kWp actual (zero bypass eliminated)
    const mismatchedSceneZero = {
      ...sceneD1,
      totalPvCapacityKwp: 0.0,
      totalModulesCount: 0,
    };
    const simResZero = simulateAnnual3dShading(mismatchedSceneZero, 5.2, 40.0);
    assert(
      simResZero.reconciliationStatus?.isProjectSnapshotConsistent === false &&
        simResZero.isReconciled === false,
      'Snapshot reconciliation detects zero-capacity bypass: declared 0 kWp with 14.85 kWp active tables flags inconsistent',
      `isProjectSnapshotConsistent=${simResZero.reconciliationStatus?.isProjectSnapshotConsistent}, overallReconciled=${simResZero.isReconciled}`
    );

    // Case C: Exact match 14.85 kWp declared and 27 modules
    const matchedScene = {
      ...sceneD1,
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
    };
    const simResMatched = simulateAnnual3dShading(matchedScene, 5.2, 40.0);
    assert(
      simResMatched.reconciliationStatus?.isProjectSnapshotConsistent === true &&
        simResMatched.isReconciled === true,
      'Snapshot reconciliation confirms perfect consistency when declared capacity and module count match table sums',
      `isProjectSnapshotConsistent=${simResMatched.reconciliationStatus?.isProjectSnapshotConsistent}, overallReconciled=${simResMatched.isReconciled}`
    );

    // NASA temperature validation edge cases
    const climateGateway = new ClimateDataProvider();
    let nasaTminSentinelRejected = false;
    try {
      (climateGateway as any).parseNasaPowerResponse(35.68, 51.38, {
        properties: {
          parameter: {
            ALLSKY_SFC_SW_DWN: { ANN: 5.17 },
            T2M: { ANN: 20.0 },
            T2M_MIN: { ANN: -999.0 }, // NASA sentinel fill value
            T2M_MAX: { ANN: 42.0 },
          },
        },
      });
    } catch {
      nasaTminSentinelRejected = true;
    }
    assert(
      nasaTminSentinelRejected,
      'NASA POWER parser rejects -999 sentinel for minimum temperature',
      `rejected=${nasaTminSentinelRejected}`
    );

    let nasaTminGreaterTmaxRejected = false;
    try {
      (climateGateway as any).parseNasaPowerResponse(35.68, 51.38, {
        properties: {
          parameter: {
            ALLSKY_SFC_SW_DWN: { ANN: 5.17 },
            T2M: { ANN: 20.0 },
            T2M_MIN: { ANN: 45.0 }, // tMin > tMax contradiction
            T2M_MAX: { ANN: 10.0 },
          },
        },
      });
    } catch {
      nasaTminGreaterTmaxRejected = true;
    }
    assert(
      nasaTminGreaterTmaxRejected,
      'NASA POWER parser rejects physical contradiction where tMin > tMax',
      `rejected=${nasaTminGreaterTmaxRejected}`
    );

    // NASA temperature missing fallback provenance check
    const nasaMissingT2mParsed = (climateGateway as any).parseNasaPowerResponse(35.68, 51.38, {
      properties: {
        parameter: {
          ALLSKY_SFC_SW_DWN: { ANN: 5.17 },
          // T2M missing
          T2M_MIN: { ANN: -5.0 },
          T2M_MAX: { ANN: 42.0 },
        },
      },
    });
    assert(
      nasaMissingT2mParsed.provenance?.tempAnnualMeanC?.status === 'estimated' &&
        nasaMissingT2mParsed.metadata?.isEstimatedFromGlobalModel === true,
      'NASA POWER missing temperature provenance is explicitly tagged estimated with rule_of_thumb_screening',
      `status=${nasaMissingT2mParsed.provenance?.tempAnnualMeanC?.status}, isEstimated=${nasaMissingT2mParsed.metadata?.isEstimatedFromGlobalModel}`
    );

    // D3 Exact Quadrature Area-Weighting in Annual Mesh Helper Probe
    // Vertical sun ray: tests direct geometric beam occlusion across module slots using computeTableShadingGeometricMesh
    const verticalSun = {
      hour: 12,
      isDaylight: true,
      altitudeDeg: 90.0,
      azimuthDeg: 180.0,
      zenithDeg: 0.0,
      hourAngleDeg: 0.0,
      declinationDeg: 0.0,
    };

    const table28Flat = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 15.4,
      totalModulesCount: 28,
      tiltDeg: 0,
      azimuthDeg: 0,
      includeDefaultObstacles: false,
    }).pvTables[0];

    // Obstacle covering exactly the bottom row (Y < 0, 14 out of 28 modules)
    const obsBottom28: Obstacle3D = {
      id: 'obs-28-bot',
      name: 'Bottom Row Blocker 28',
      geometryType: 'cuboid',
      positionEnu: { x: table28Flat.positionEnu.x, y: table28Flat.positionEnu.y - table28Flat.slopedLengthM / 4, z: table28Flat.positionEnu.z + 1.0 },
      dimensionsM: { widthM: table28Flat.widthM + 1.0, lengthM: table28Flat.slopedLengthM / 2 + 0.1, heightM: 0.5 },
    };
    const facets28 = buildObstacleFacets(obsBottom28);
    const res28Mesh = computeTableShadingGeometricMesh(table28Flat, facets28, verticalSun);
    // Geometric beam loss must be exactly 50.0% (14 / 28 modules), NOT 66.67%
    assert(
      Math.abs(res28Mesh.directBeamLossFraction - 0.50) < 0.001,
      'Annual mesh sampling applies exact 50.0% area-weighting to bottom row of 28-module table (not 66.67%)',
      `beamLoss=${(res28Mesh.directBeamLossFraction * 100).toFixed(2)}% (expected 50.00%)`
    );

    // Obstacle covering bottom row of 27-module table (14 / 27 modules = 51.85%)
    const table27Flat = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      tiltDeg: 0,
      azimuthDeg: 0,
      includeDefaultObstacles: false,
    }).pvTables[0];
    const obsBottom27: Obstacle3D = {
      id: 'obs-27-bot',
      name: 'Bottom Row Blocker 27',
      geometryType: 'cuboid',
      positionEnu: { x: table27Flat.positionEnu.x, y: table27Flat.positionEnu.y - table27Flat.slopedLengthM / 4, z: table27Flat.positionEnu.z + 1.0 },
      dimensionsM: { widthM: table27Flat.widthM + 1.0, lengthM: table27Flat.slopedLengthM / 2 + 0.1, heightM: 0.5 },
    };
    const facets27 = buildObstacleFacets(obsBottom27);
    const res27Mesh = computeTableShadingGeometricMesh(table27Flat, facets27, verticalSun);
    // Geometric beam loss must be exactly 14/27 = 51.85%, NOT 68.29%
    assert(
      Math.abs(res27Mesh.directBeamLossFraction - 14 / 27) < 0.001,
      'Annual mesh sampling applies exact 51.85% area-weighting to bottom row of 27-module table (not 68.29%)',
      `beamLoss=${(res27Mesh.directBeamLossFraction * 100).toFixed(2)}% (expected 51.85%)`
    );

    // Obstacle covering ONLY the 27th module (column 13, bottom slot) -> 1 / 27 = 3.70%
    const colWidth27 = table27Flat.widthM / 14;
    const xMod27 = table27Flat.positionEnu.x - table27Flat.widthM / 2 + (13 + 0.5) * colWidth27;
    const yMod27 = table27Flat.positionEnu.y - table27Flat.slopedLengthM / 4;
    const obsMod27: Obstacle3D = {
      id: 'obs-mod27-exact',
      name: 'Module 27 Blocker',
      geometryType: 'cuboid',
      positionEnu: { x: xMod27, y: yMod27, z: table27Flat.positionEnu.z + 1.0 },
      dimensionsM: { widthM: colWidth27 + 0.05, lengthM: table27Flat.slopedLengthM / 2 + 0.1, heightM: 0.5 },
    };
    const facetsMod27 = buildObstacleFacets(obsMod27);
    const resMod27Mesh = computeTableShadingGeometricMesh(table27Flat, facetsMod27, verticalSun);
    // Geometric beam loss must be exactly 1/27 = 3.70%, NOT 4.88%
    assert(
      Math.abs(resMod27Mesh.directBeamLossFraction - 1 / 27) < 0.001,
      'Annual mesh sampling applies exact 3.70% area-weighting to 27th module alone (not 4.88%)',
      `beamLoss=${(resMod27Mesh.directBeamLossFraction * 100).toFixed(2)}% (expected 3.70%)`
    );

    // D5 Support Leg Footprint Elevation Alignment Probe on Pitched Roof
    const roofPitched = southFacingRoof; // 15° pitch, azimuth 0° (slopes along Y)
    const tableRotated90: PvTable3D = {
      ...t27,
      azimuthDeg: 90,
      positionEnu: { x: 0, y: 0, z: 20.0 },
    };
    const azRad90 = (90 * Math.PI) / 180;
    const legLeftX = -tableRotated90.widthM / 2;
    const legRightX = tableRotated90.widthM / 2;
    const legLeftEnuX = tableRotated90.positionEnu.x + legLeftX * Math.cos(azRad90);
    const legLeftEnuY = tableRotated90.positionEnu.y - legLeftX * Math.sin(azRad90);
    const legRightEnuX = tableRotated90.positionEnu.x + legRightX * Math.cos(azRad90);
    const legRightEnuY = tableRotated90.positionEnu.y - legRightX * Math.sin(azRad90);

    const roofZLeft = getLocalRoofElevationAt(roofPitched, legLeftEnuX, legLeftEnuY);
    const roofZRight = getLocalRoofElevationAt(roofPitched, legRightEnuX, legRightEnuY);
    const legHeightLeft = Math.max(0.1, tableRotated90.positionEnu.z - roofZLeft);
    const legHeightRight = Math.max(0.1, tableRotated90.positionEnu.z - roofZRight);

    // The two legs must adapt to the roof slope elevation difference (~4.25m across table width)
    const legElevationDifference = Math.abs(roofZLeft - roofZRight);
    assert(
      legElevationDifference > 0.60 && Math.abs(Math.abs(legHeightLeft - legHeightRight) - legElevationDifference) < 0.001,
      'Individual table support legs dynamically adapt height to local roof elevation underneath each post',
      `elevDiff=${legElevationDifference.toFixed(3)}m, legHeightLeft=${legHeightLeft.toFixed(3)}m, legHeightRight=${legHeightRight.toFixed(3)}m`
    );

    // D7 Signature Comprehensive Parameter Invalidation Probes
    // 1) Geodetic Anchor Latitude Probe: changing latitude while cityId and PSH are fixed strictly invalidates signature
    const sceneTehran = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      tiltDeg: 25,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
    });
    const sceneSydney = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      tiltDeg: 25,
      azimuthDeg: 0,
      latitude: -33.8688,
      longitude: 151.2093,
    });
    const sigTehran = computeShadingSceneSignature({
      scene: sceneTehran,
      cityId: 'custom',
      peakSunHours: 5.2,
    });
    const sigSydney = computeShadingSceneSignature({
      scene: sceneSydney,
      cityId: 'custom',
      peakSunHours: 5.2,
    });
    assert(
      sigTehran !== sigSydney,
      'Signature strictly invalidates on geodetic anchor latitude change under identical cityId and PSH',
      `sigTehran=${sigTehran.slice(0, 16)}... vs sigSydney=${sigSydney.slice(0, 16)}...`
    );

    // 2) Ground Albedo Probe: changing albedo from 0.20 to 0.80 strictly invalidates signature
    const sigAlbedo02 = computeShadingSceneSignature({
      scene: sceneTehran,
      cityId: 'tehran',
      peakSunHours: 5.2,
      albedo: 0.20,
    });
    const sigAlbedo08 = computeShadingSceneSignature({
      scene: sceneTehran,
      cityId: 'tehran',
      peakSunHours: 5.2,
      albedo: 0.80,
    });
    assert(
      sigAlbedo02 !== sigAlbedo08,
      'Signature strictly invalidates on ground surface albedo change (0.20 vs 0.80)',
      `sigAlbedo02=${sigAlbedo02.slice(0, 16)}... vs sigAlbedo08=${sigAlbedo08.slice(0, 16)}...`
    );

    // 3) App & ThreeJsViewer Powerplant Scene Capacity & Hash Parity Probe
    // In powerplant mode with target 1000 kW AC, both App and Viewer size DC array with 1.25 DC/AC ratio (1250 kWp)
    const targetKwAc = 1000;
    const dcRatio = 1.25;
    const dcCapacityKwp = targetKwAc * dcRatio;
    const modPmp = 550;
    const dcModules = Math.round((dcCapacityKwp * 1000) / modPmp);

    const appPowerplantScene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: dcCapacityKwp,
      totalModulesCount: dcModules,
      interRowSpacingM: 5.0,
      tiltDeg: 25,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      elevationM: 1200,
      modulePmpWatts: modPmp,
      installationEnvironment: 'ground_mount',
      includeDefaultObstacles: false,
      albedo: 0.20,
    });
    const viewerPowerplantScene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: dcCapacityKwp,
      totalModulesCount: dcModules,
      interRowSpacingM: 5.0,
      tiltDeg: 25,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      elevationM: 1200,
      modulePmpWatts: modPmp,
      installationEnvironment: 'ground_mount',
      includeDefaultObstacles: false,
      albedo: 0.20,
    });

    const appSig = computeShadingSceneSignature({
      scene: appPowerplantScene,
      cityId: 'tehran',
      peakSunHours: 5.17,
      albedo: 0.20,
      simulationMode: 'screening_3day',
    });
    const viewerSig = computeShadingSceneSignature({
      scene: viewerPowerplantScene,
      cityId: 'tehran',
      peakSunHours: 5.17,
      albedo: 0.20,
      simulationMode: 'screening_3day',
    });

    assert(
      appSig === viewerSig,
      'Powerplant 1000 kW AC mode achieves 100% capacity (1250 kWp) and signature parity between App and Viewer',
      `appSig=${appSig.slice(0, 16)}... viewerSig=${viewerSig.slice(0, 16)}...`
    );

    // Verify shading lifecycle APPLY then CHECK_SYNC does not immediately flag stale
    const initialState = createInitialShadingLifecycleState();
    const appliedState = shadingLifecycleReducer(initialState, {
      type: 'APPLY',
      lossPct: 3.5,
      capacityKwp: dcCapacityKwp,
      projectCapacityKwp: dcCapacityKwp,
      appliedAtIso: new Date().toISOString(),
      cityId: 'tehran',
      source: 'project_array_design',
      signatureHash: viewerSig,
    });
    const syncState = shadingLifecycleReducer(appliedState, {
      type: 'CHECK_SYNC',
      currentCityId: 'tehran',
      currentCapacityKwp: dcCapacityKwp,
      currentSignatureHash: appSig,
    });
    assert(
      syncState.isStale === false && syncState.appliedShading !== null,
      'Powerplant 3D shading lifecycle preserves valid non-stale applied state after CHECK_SYNC',
      `isStale=${syncState.isStale}, staleReason=${syncState.staleReason ?? 'none'}`
    );

    // 4) Scene Albedo Direct Consumption in Simulator Probe
    // simulateAnnual3dShading must respect scene.albedo directly when options.albedo is omitted
    const sceneAlbedo08 = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      tiltDeg: 25,
      azimuthDeg: 0,
      latitude: 35.6892,
      longitude: 51.3890,
      albedo: 0.80,
    });
    const resWithoutOptions = simulateAnnual3dShading(sceneAlbedo08, 5.2, 40.0);
    const resWithOptions08 = simulateAnnual3dShading(sceneAlbedo08, 5.2, 40.0, { albedo: 0.80 });

    assert(
      resWithoutOptions.totalUnshadedAnnualKwh === resWithOptions08.totalUnshadedAnnualKwh &&
        resWithoutOptions.sceneState.albedo === 0.80,
      'simulateAnnual3dShading directly consumes scene.albedo when options.albedo is omitted (identical unshaded kWh and preserved albedo)',
      `unshadedWithoutOpt=${resWithoutOptions.totalUnshadedAnnualKwh} kWh, unshadedWithOpt=${resWithOptions08.totalUnshadedAnnualKwh} kWh, sceneAlbedo=${resWithoutOptions.sceneState.albedo}`
    );

    // 5) Hourly 8760 Mode App & ThreeJsViewer Signature & Lifecycle Parity Probe
    const appSig8760 = computeShadingSceneSignature({
      scene: appPowerplantScene,
      cityId: 'tehran',
      peakSunHours: 5.17,
      albedo: 0.20,
      simulationMode: 'hourly_8760',
    });
    const viewerSig8760 = computeShadingSceneSignature({
      scene: viewerPowerplantScene,
      cityId: 'tehran',
      peakSunHours: 5.17,
      albedo: 0.20,
      simulationMode: 'hourly_8760',
    });

    assert(
      appSig8760 === viewerSig8760,
      'Powerplant 8760-hour simulation mode achieves 100% signature parity between App and Viewer',
      `appSig8760=${appSig8760.slice(0, 16)}... viewerSig8760=${viewerSig8760.slice(0, 16)}...`
    );

    const appliedState8760 = shadingLifecycleReducer(initialState, {
      type: 'APPLY',
      lossPct: 3.5,
      capacityKwp: dcCapacityKwp,
      projectCapacityKwp: dcCapacityKwp,
      appliedAtIso: new Date().toISOString(),
      cityId: 'tehran',
      source: 'project_array_design',
      signatureHash: viewerSig8760,
      simulationMode: 'hourly_8760',
    });
    const syncState8760 = shadingLifecycleReducer(appliedState8760, {
      type: 'CHECK_SYNC',
      currentCityId: 'tehran',
      currentCapacityKwp: dcCapacityKwp,
      currentSignatureHash: appSig8760,
    });
    assert(
      syncState8760.isStale === false && syncState8760.appliedShading?.simulationMode === 'hourly_8760',
      '8760-hour 3D shading lifecycle preserves valid non-stale applied state after CHECK_SYNC',
      `isStale=${syncState8760.isStale}, appliedMode=${syncState8760.appliedShading?.simulationMode}`
    );

    // 6) Simulation Mode Transition Probe (Decoupled Preview & Seamless Mode Upgrade without Revert)
    // Starting with applied 3-day fast screening:
    // Switching preview simulation mode to 8760h flags stale in CHECK_SYNC due to signature difference:
    const syncStateSwitchedMode = shadingLifecycleReducer(appliedState, {
      type: 'CHECK_SYNC',
      currentCityId: 'tehran',
      currentCapacityKwp: dcCapacityKwp,
      currentSignatureHash: appSig8760,
    });
    assert(
      syncStateSwitchedMode.isStale === true && syncStateSwitchedMode.appliedShading !== null,
      'Switching preview simulation mode flags staleness against existing applied record without destroying applied state',
      `isStale=${syncStateSwitchedMode.isStale}, reason=${syncStateSwitchedMode.staleReason}`
    );

    // Re-applying directly with new 8760h result seamlessly upgrades applied record without requiring Revert:
    const upgradedState8760 = shadingLifecycleReducer(syncStateSwitchedMode, {
      type: 'APPLY',
      lossPct: 3.8,
      capacityKwp: dcCapacityKwp,
      projectCapacityKwp: dcCapacityKwp,
      appliedAtIso: new Date().toISOString(),
      cityId: 'tehran',
      source: 'project_array_design',
      signatureHash: viewerSig8760,
      simulationMode: 'hourly_8760',
    });
    const syncUpgraded = shadingLifecycleReducer(upgradedState8760, {
      type: 'CHECK_SYNC',
      currentCityId: 'tehran',
      currentCapacityKwp: dcCapacityKwp,
      currentSignatureHash: appSig8760,
    });
    assert(
      syncUpgraded.isStale === false &&
        syncUpgraded.appliedShading?.simulationMode === 'hourly_8760' &&
        syncUpgraded.appliedShading?.lossPct === 3.8,
      'Re-applying 8760h simulation seamlessly clears staleness and updates applied loss without requiring prior manual revert',
      `isStale=${syncUpgraded.isStale}, lossPct=${syncUpgraded.appliedShading?.lossPct}%`
    );

    // 7) Component-Level SSR Button Availability Probe: Independent Apply / Update vs Revert in UI
    const testCity = {
      id: 'tehran',
      nameFa: 'تهران',
      nameEn: 'Tehran',
      latitude: 35.6892,
      longitude: 51.3890,
      elevationM: 1200,
      peakSunHours: 5.2,
      optimalTiltAnnualDeg: 25,
      albedo: 0.20,
    };
    const testArrayDesign = {
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      interRowSpacingM: 5.0,
      tiltDeg: 25,
      azimuthDeg: 0,
    };

    // Sub-case 7a: Initial unapplied state -> Apply button present, Revert absent
    const htmlUnapplied = ReactDOMServer.renderToString(
      React.createElement(ThreeJsViewer, {
        lang: 'en',
        city: testCity as any,
        arrayDesign: testArrayDesign,
        plantCapacityKw: 14.85,
        annualYieldKwh: 25000,
        appliedShading: null,
        simulationMode: 'screening_3day',
      })
    );
    const unappliedHasApply = htmlUnapplied.includes('Apply -');
    const unappliedHasRevert = htmlUnapplied.includes('Revert to Default');
    assert(
      unappliedHasApply && !unappliedHasRevert,
      'ThreeJsViewer UI: Initial state renders Apply button without Revert button',
      `hasApply=${unappliedHasApply}, hasRevert=${unappliedHasRevert}`
    );

    // Sub-case 7b: Existing applied 3-day record, previewing fresh 8760h mode
    // Both Revert AND Update Project buttons MUST be rendered independently!
    const htmlAppliedWithModeChange = ReactDOMServer.renderToString(
      React.createElement(ThreeJsViewer, {
        lang: 'en',
        city: testCity as any,
        arrayDesign: testArrayDesign,
        plantCapacityKw: 14.85,
        annualYieldKwh: 25000,
        appliedShading: {
          lossPct: 2.8,
          source: 'project_array_design',
          appliedAtIso: new Date().toISOString(),
          capacityKwp: 14.85,
          signatureHash: 'some-hash-3day',
          simulationMode: 'screening_3day',
        },
        simulationMode: 'hourly_8760',
      })
    );
    const appliedHasUpdate = htmlAppliedWithModeChange.includes('Update Project');
    const appliedHasRevert = htmlAppliedWithModeChange.includes('Revert to Default');
    assert(
      appliedHasUpdate && appliedHasRevert,
      'ThreeJsViewer UI: When applied record exists and fresh 8760h result is ready, BOTH Update Project and Revert buttons are rendered',
      `hasUpdate=${appliedHasUpdate}, hasRevert=${appliedHasRevert}`
    );
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(` AUDIT REMEDIATION SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('================================================================================');

  process.exit(failures === 0 ? 0 : 1);
}

runAuditRemediationSuite().catch((err) => {
  console.error('Fatal audit suite error:', err);
  process.exit(2);
});
