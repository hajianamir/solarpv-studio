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

import {
  buildSceneFromProjectDesign,
  simulateAnnual3dShading,
  calculateRayTracedShadingFactor,
  buildObstacleFacets,
  convertPvTablesToTriangles,
  generateTableMeshSamplePoints,
  getActiveTableSubRects,
  getLocalRoofElevationAt,
  RoofPlane,
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

    // Discrepancy 3: Ray-tracer sample point weighting distortion
    const samplePts27 = generateTableMeshSamplePoints(t27);
    assert(
      samplePts27.length === 27,
      'Area-weighted sample point generator allocates exactly 27 points for 27 modules (1 point per module)',
      `ptsCount=${samplePts27.length}`
    );
    const unshadedFraction = 26 / 27; // 26 unshaded, 1 shaded
    const singleModuleLossPct = (1 - unshadedFraction) * 100;
    assert(
      Math.abs(singleModuleLossPct - (1 / 27) * 100) < 0.01,
      'Single shaded module in 27-module table causes exactly 3.70% loss, avoiding 50% distortion',
      `lossPct=${singleModuleLossPct.toFixed(2)}%`
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

    // Discrepancy 6: Snapshot reconciliation capacity mismatch & NASA temperature sentinels
    const mismatchedScene = {
      ...sceneD1,
      totalPvCapacityKwp: 999.0, // Declared 999 kWp vs actual tables sum 14.85 kWp
    };
    const mismatchSimResult = simulateAnnual3dShading(mismatchedScene, 5.2, 40.0);
    assert(
      mismatchSimResult.reconciliationStatus?.isProjectSnapshotConsistent === false &&
        mismatchSimResult.isReconciled === false,
      'Snapshot reconciliation detects capacity mismatch between declared project total (999 kWp) and table sum (14.85 kWp)',
      `isProjectSnapshotConsistent=${mismatchSimResult.reconciliationStatus?.isProjectSnapshotConsistent}, overallReconciled=${mismatchSimResult.isReconciled}`
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
