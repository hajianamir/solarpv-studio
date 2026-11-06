/**
 * SolarPV Studio — Comprehensive Audit Remediation Verification Suite (M01–M22)
 *
 * Verifies all 22 itemized findings from the post-PR#21 comprehensive audit:
 *   P1 Findings: M01, M02, M03, M04, M05, M06, M07
 *   P2 Findings: M08, M09, M10, M11, M12, M13, M14, M15, M16, M17, M18, M19, M20, M22
 *   P3 Finding:  M21
 */

import { calculateSingleDiodeCurve } from '../src/engine/singleDiodeModel';
import { designMvSubstation } from '../src/engine/mvSubstationEngine';
import { analyzePowerplantHarmonics, analyzeUpstreamGridConditions } from '../src/engine/harmonicsEngine';
import { runExternalEmpiricalValidationSuite } from '../src/engine/core/benchmarks/externalValidation';
import { runIranianRegulationFinancialModel } from '../src/engine/iranianRegulationsFinancial';
import {
  calculateIrr,
  calculateIrrDetailed,
  calculateVoltageDropDc,
  InMemorySolarDatabase,
  performQuickSizing,
  DEFAULT_MODULES,
  DEFAULT_INVERTERS,
  DEFAULT_BATTERIES,
} from '../src/engine/solarPvEngine';
import {
  checkTableSetbackCompliance,
  simulateAnnual3dShading,
  type PvTable3D,
  type RoofPlane,
  type Scene3DState,
} from '../src/engine/roof3dShadingEngine';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { StructuralHazardProvider } from '../src/engine/dataGateway/structuralHazardProvider';
import { CircuitBreaker } from '../src/engine/dataGateway/circuitBreaker';
import { calculateSolarPump } from '../src/engine/solarPumpEngine';
import { buildExcelWorkbookXml, escapeXml } from '../src/engine/reportingEngine';
import { app } from '../server';

let passes = 0;
let failures = 0;

function assert(condition: boolean, testName: string, detail: string = ''): void {
  if (condition) {
    passes++;
    console.log(`  [PASS] ${testName}${detail ? ' -> ' + detail : ''}`);
  } else {
    failures++;
    console.error(`  [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
  }
}

async function runM01ToM22TestSuite(): Promise<void> {
  console.log('================================================================================');
  console.log(' SolarPV Studio — Comprehensive Audit Remediation Verification Suite (M01–M22)');
  console.log('================================================================================\n');

  // ---------------------------------------------------------------------------
  // [M01] Single Diode I–V Series String Scaling
  // ---------------------------------------------------------------------------
  console.log('--- [M01] Single Diode I–V Series String Scaling ---');
  {
    const stcVoc = 51.2;
    const stcIsc = 14.37;
    const stcVmp = 42.65;
    const stcImp = 13.6;
    const stcPmp = 580.0;

    const c1 = calculateSingleDiodeCurve(stcVoc, stcIsc, stcVmp, stcImp, stcPmp, -0.25, 0.045, -0.29, 1000, 25, 1);
    const c10 = calculateSingleDiodeCurve(stcVoc, stcIsc, stcVmp, stcImp, stcPmp, -0.25, 0.045, -0.29, 1000, 25, 10);
    const c18 = calculateSingleDiodeCurve(stcVoc, stcIsc, stcVmp, stcImp, stcPmp, -0.25, 0.045, -0.29, 1000, 25, 18);

    const pRatio10 = c10.pmp / c1.pmp;
    const vRatio10 = c10.voc / c1.voc;
    const vmpRatio10 = c10.vmp / c1.vmp;
    const iDiff10 = Math.abs(c10.imp - c1.imp);

    assert(
      Math.abs(pRatio10 - 10.0) < 0.02,
      'M01: Pmp scales linearly by 10x for N=10 string (eliminates ~9.7W collapse)',
      `P1=${c1.pmp}W, P10=${c10.pmp}W, ratio=${pRatio10.toFixed(4)}`
    );
    assert(
      Math.abs(vRatio10 - 10.0) < 0.01,
      'M01: Voc scales linearly by 10x for N=10 string',
      `Voc1=${c1.voc}V, Voc10=${c10.voc}V`
    );
    assert(
      Math.abs(vmpRatio10 - 10.0) < 0.02,
      'M01: Vmp scales linearly by 10x for N=10 string',
      `Vmp1=${c1.vmp}V, Vmp10=${c10.vmp}V`
    );
    assert(
      iDiff10 < 0.05,
      'M01: Imp is preserved identically across series string',
      `Imp1=${c1.imp}A, Imp10=${c10.imp}A`
    );
    assert(
      Math.abs(c10.efficiencyPct - c1.efficiencyPct) < 0.2,
      'M01: String conversion efficiency is invariant to string length',
      `Eff1=${c1.efficiencyPct}%, Eff10=${c10.efficiencyPct}%`
    );
    assert(
      Math.abs(c18.pmp / c1.pmp - 18.0) < 0.05,
      'M01: Full 18-module string scales to 18x single module power',
      `P18=${c18.pmp}W, ratio=${(c18.pmp / c1.pmp).toFixed(2)}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M02] Earthing Conductor Sizing & IEEE 80 Compliance Gating
  // ---------------------------------------------------------------------------
  console.log('\n--- [M02] Earthing Conductor Sizing & IEEE 80 Compliance Gating ---');
  {
    // Normal substation (10 MVA, 20kV)
    const subNormal = designMvSubstation({
      plantCapacityAcMva: 10.0,
      inverterOutputVoltageV: 800,
      gridConnectionVoltageKv: 20.0,
      soilResistivityOhmM: 80.0,
      clearingTimeSec: 0.5,
    });
    assert(
      subNormal.earthing.groundGridConductorMm2 >= 70,
      'M02: Normal fault conditions select standard conductor >= 70 mm²',
      `conductor=${subNormal.earthing.groundGridConductorMm2}mm²`
    );

    // High fault current condition requiring > 240 mm²
    // e.g. 30 MVA at 11kV with 0.8s clearing time
    const subHighFault = designMvSubstation({
      plantCapacityAcMva: 30.0,
      inverterOutputVoltageV: 690,
      gridConnectionVoltageKv: 11.0,
      soilResistivityOhmM: 50.0,
      clearingTimeSec: 0.8,
    });
    const requiredConductor = subHighFault.earthing.requiredConductorMm2 ?? 0;
    const selectedConductor = subHighFault.earthing.groundGridConductorMm2;

    assert(
      selectedConductor >= requiredConductor,
      'M02: Earthing conductor is NOT clamped to 240 mm² when required exceeds 240 mm²',
      `required=${requiredConductor}mm², selected=${selectedConductor}mm²`
    );
    assert(
      subHighFault.earthing.isConductorCompliant === true,
      'M02: High-fault substation accurately confirms conductor compliance against required cross-section',
      `isConductorCompliant=${subHighFault.earthing.isConductorCompliant}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M03] Grid Voltage Rise MW vs MVA Calculation
  // ---------------------------------------------------------------------------
  console.log('\n--- [M03] Grid Voltage Rise MW vs MVA Calculation ---');
  {
    const gridLeading = analyzeUpstreamGridConditions({
      plantCapacityMw: 10.0,
      gridVoltageKv: 20.0,
      gridShortCircuitMva: 120.0,
      gridXrRatio: 6.0,
      inverterPowerFactor: 0.95,
      isPowerFactorLagging: false, // Injecting capacitive Q increases voltage
    });

    const gridLagging = analyzeUpstreamGridConditions({
      plantCapacityMw: 10.0,
      gridVoltageKv: 20.0,
      gridShortCircuitMva: 120.0,
      gridXrRatio: 6.0,
      inverterPowerFactor: 0.95,
      isPowerFactorLagging: true, // Absorbing inductive Q reduces voltage rise
    });

    assert(
      gridLeading.pccVoltageRisePct > gridLagging.pccVoltageRisePct,
      'M03: Active (P) and Reactive (Q) correctly differentiated: capacitive Q increases PCC voltage rise vs inductive Q',
      `leadingRise=${gridLeading.pccVoltageRisePct}%, laggingRise=${gridLagging.pccVoltageRisePct}%`
    );
    assert(
      Number.isFinite(gridLagging.maxAllowablePlantCapacityMw) && gridLagging.maxAllowablePlantCapacityMw > 0,
      'M03: Max allowable plant capacity correctly calculated from active/reactive impedance formula',
      `maxMw=${gridLagging.maxAllowablePlantCapacityMw}MW`
    );
  }

  // ---------------------------------------------------------------------------
  // [M04] Dynamic SAM External Validation Execution
  // ---------------------------------------------------------------------------
  console.log('\n--- [M04] Dynamic SAM External Validation Execution ---');
  {
    const valReport = runExternalEmpiricalValidationSuite();
    assert(
      valReport.overallStatus === 'PASS',
      'M04: Dynamic external validation report passes across all hubs',
      `status=${valReport.overallStatus}`
    );
    const phxHub = valReport.crossModelComparisons.find(h => h.climateHubId === 'SAM-HUB-PHOENIX');
    const munichHub = valReport.crossModelComparisons.find(h => h.climateHubId === 'SAM-HUB-MUNICH');
    const sgHub = valReport.crossModelComparisons.find(h => h.climateHubId === 'SAM-HUB-SINGAPORE');

    assert(
      phxHub !== undefined && phxHub.studioAnnualSoilingPercent > 0 && phxHub.overallStatus === 'PASS',
      'M04: Phoenix soiling is dynamically executed and matches SAM within tolerance',
      `sim=${phxHub?.studioAnnualSoilingPercent}%, sam=${phxHub?.samAnnualSoilingPercent}%, delta=${phxHub?.soilingDeltaPercent}%`
    );
    assert(
      munichHub !== undefined && munichHub.studioAnnualSnowPercent > 0 && munichHub.overallStatus === 'PASS',
      'M04: Munich snow is dynamically executed and matches SAM within tolerance',
      `simSnow=${munichHub?.studioAnnualSnowPercent}%, samSnow=${munichHub?.samAnnualSnowPercent}%, delta=${munichHub?.snowDeltaPercent}%`
    );
    assert(
      sgHub !== undefined && sgHub.studioAnnualSoilingPercent > 0 && sgHub.overallStatus === 'PASS',
      'M04: Singapore soiling is dynamically executed and matches SAM within tolerance',
      `sim=${sgHub?.studioAnnualSoilingPercent}%, sam=${sgHub?.samAnnualSoilingPercent}%, delta=${sgHub?.soilingDeltaPercent}%`
    );
  }

  // ---------------------------------------------------------------------------
  // [M05] Sync Server Rejecting Malformed Payloads & No False Ack
  // ---------------------------------------------------------------------------
  console.log('\n--- [M05] Sync Server Rejecting Malformed Payloads & No False Ack ---');
  {
    const reqPush = {
      body: {
        messages: [
          { id: 'msg-valid-1', entityType: 'Project', payloadJson: JSON.stringify({ id: 'p-valid', name: 'Valid Project' }) },
          { id: 'msg-corrupt-2', entityType: 'Project', payloadJson: 'CORRUPTED_JSON_NOT_VALID{' },
          { id: 'msg-noid-3', entityType: 'Project', payloadJson: JSON.stringify({ name: 'Project without ID' }) },
        ],
      },
    };

    let responseStatus = 0;
    let responseBody: any = null;
    const mockRes: any = {
      status(s: number) {
        responseStatus = s;
        return this;
      },
      json(data: any) {
        responseBody = data;
        return this;
      },
    };

    // Invoke sync route logic
    const syncPushRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/sync/push' && r.route.methods.post)
      ?.route.stack[0].handle;

    await syncPushRoute(reqPush, mockRes);

    assert(
      responseBody.ackedIds.includes('msg-valid-1'),
      'M05: Valid sync message is acknowledged in ackedIds',
      `acked=${responseBody.ackedIds.join(',')}`
    );
    assert(
      !responseBody.ackedIds.includes('msg-corrupt-2'),
      'M05: Corrupted JSON message is NOT acknowledged in ackedIds',
      `corruptAcknowledged=${responseBody.ackedIds.includes('msg-corrupt-2')}`
    );
    assert(
      !responseBody.ackedIds.includes('msg-noid-3'),
      'M05: Message missing project ID is NOT acknowledged in ackedIds',
      `noIdAcknowledged=${responseBody.ackedIds.includes('msg-noid-3')}`
    );
    assert(
      responseBody.rejected.length === 2,
      'M05: Both malformed messages are listed in rejected with failure reasons',
      `rejectedCount=${responseBody.rejected.length}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M06 & M08] Server Endpoints Input Validation & Rejection of Negative Values
  // ---------------------------------------------------------------------------
  console.log('\n--- [M06 & M08] Server Endpoints Input Validation & Negative Rejection ---');
  {
    let vDropResStatus = 0;
    let vDropResBody: any = null;
    const mockRes: any = {
      status(s: number) { vDropResStatus = s; return this; },
      json(d: any) { vDropResBody = d; return this; },
    };

    const vDropRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/electrical/voltage-drop' && r.route.methods.post)
      ?.route.stack[0].handle;

    // Negative length
    await vDropRoute({ body: { lengthM: -10, currentA: 10, crossSectionMm2: 4, vNominal: 400 } }, mockRes);
    assert(
      vDropResStatus === 400 && vDropResBody.error.includes('lengthM'),
      'M08: Negative cable length returns HTTP 400 instead of HTTP 200 with negative voltage drop',
      `status=${vDropResStatus}, error=${vDropResBody.error}`
    );

    // Negative current
    await vDropRoute({ body: { lengthM: 20, currentA: -5, crossSectionMm2: 4, vNominal: 400 } }, mockRes);
    assert(
      vDropResStatus === 400 && vDropResBody.error.includes('currentA'),
      'M08: Negative current returns HTTP 400',
      `status=${vDropResStatus}`
    );

    // Zero cross section
    await vDropRoute({ body: { lengthM: 20, currentA: 5, crossSectionMm2: 0, vNominal: 400 } }, mockRes);
    assert(
      vDropResStatus === 400,
      'M08: Zero cross-section returns HTTP 400',
      `status=${vDropResStatus}`
    );

    // Catalog Module: negative watts
    let catModStatus = 0;
    let catModBody: any = null;
    const mockCatRes: any = {
      status(s: number) { catModStatus = s; return this; },
      json(d: any) { catModBody = d; return this; },
    };
    const catModRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/modules' && r.route.methods.post)
      ?.route.stack[0].handle;

    await catModRoute({ body: { pmpWatts: -500, vmpVolts: 40, impAmps: 10, vocVolts: 48, iscAmps: 11 } }, mockCatRes);
    assert(
      catModStatus === 400,
      'M06: Module catalog endpoint rejects negative wattage with HTTP 400',
      `status=${catModStatus}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M07] InMemorySolarDatabase Persistence & Recovery
  // ---------------------------------------------------------------------------
  console.log('\n--- [M07] InMemorySolarDatabase Persistence & Recovery ---');
  {
    const db1 = new InMemorySolarDatabase();
    performQuickSizing(
      {
        projectName: 'Persistence Test Array',
        latitude: 35.689,
        longitude: 51.389,
        dailyKwh: 50.0,
        autonomyDays: 2.0,
      },
      db1
    );

    const snapshot = db1.exportSnapshot();
    assert(
      snapshot.projects.length >= 1 && snapshot.version === 1,
      'M07: Database exports structured JSON snapshot',
      `projectsInSnapshot=${snapshot.projects.length}`
    );

    const db2 = new InMemorySolarDatabase();
    const imported = db2.importSnapshot(snapshot);
    assert(
      imported === true && db2.projects.size >= 1,
      'M07: Second database instance cleanly restores projects from exported snapshot',
      `projectsRestored=${db2.projects.size}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M09] Report Generation Snapshot Reconciliation & Equipment Integrity
  // ---------------------------------------------------------------------------
  console.log('\n--- [M09] Report Generation Snapshot Reconciliation & Equipment Integrity ---');
  {
    let repStatus = 200;
    let repBody: any = null;
    const mockRepRes: any = {
      status(s: number) { repStatus = s; return this; },
      json(d: any) { repBody = d; return this; },
    };
    const reportRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/reports/generate' && r.route.methods.post)
      ?.route.stack[0].handle;

    // Report with physical contradiction: 100 panels for 1000 kWp = 10,000 W/panel
    reportRoute({ body: { panelCount: 100, systemCapacityKwp: 1000 } }, mockRepRes);
    assert(
      repStatus === 400 && repBody.error.includes('unphysical module wattage'),
      'M09: Report generation rejects physically impossible capacity/panel mismatch (10kW/panel)',
      `status=${repStatus}`
    );

    // Report without specific equipment: must NOT fabricate commercial marketing name
    repStatus = 200;
    repBody = null;
    reportRoute({ body: { panelCount: 20, systemCapacityKwp: 11.5 } }, mockRepRes);
    assert(
      repStatus === 200 && !repBody.metrics.panelType.includes('575W N-Type High Efficiency Modules'),
      'M09: Report generation does not fabricate specific commercial brand names when unspecified',
      `resolvedPanelType=${repBody.metrics.panelType}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M10] Iranian Financial Model Inflation Escalation
  // ---------------------------------------------------------------------------
  console.log('\n--- [M10] Iranian Financial Model Inflation Escalation ---');
  {
    const resInf0 = runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 3200, 70, 23, 5, 0);
    const resInf25 = runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 3200, 70, 23, 5, 25);
    const resInf50 = runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 3200, 70, 23, 5, 50);

    const revYr25_0 = resInf0.cashFlow25Years[24].revenueMillionToman;
    const revYr25_25 = resInf25.cashFlow25Years[24].revenueMillionToman;
    const revYr25_50 = resInf50.cashFlow25Years[24].revenueMillionToman;

    assert(
      revYr25_50 > revYr25_25 && revYr25_25 > revYr25_0,
      'M10: Iranian financial model indexes revenue escalation dynamically to inflationPct',
      `rev0=${revYr25_0}M, rev25=${revYr25_25}M, rev50=${revYr25_50}M`
    );

    const opexYr25_0 = resInf0.cashFlow25Years[24].opexMillionToman;
    const opexYr25_50 = resInf50.cashFlow25Years[24].opexMillionToman;
    assert(
      opexYr25_50 > opexYr25_0,
      'M10: OPEX escalation indexes dynamically to inflationPct',
      `opex0=${opexYr25_0}M, opex50=${opexYr25_50}M`
    );
  }

  // ---------------------------------------------------------------------------
  // [M11] Iranian Financial Model Zero Energy & Negative Payback Status
  // ---------------------------------------------------------------------------
  console.log('\n--- [M11] Iranian Financial Model Zero Energy & Negative Payback Status ---');
  {
    const resZero = runIranianRegulationFinancialModel(100, 0, 'satba_fit_ppa');
    assert(
      resZero.lcoeTomanPerKwh === null,
      'M11: Zero annual generation returns lcoeTomanPerKwh: null instead of Infinity',
      `lcoe=${resZero.lcoeTomanPerKwh}`
    );
    assert(
      resZero.simplePaybackYears === null,
      'M11: Zero generation returns simplePaybackYears: null',
      `simplePayback=${resZero.simplePaybackYears}`
    );
    assert(
      resZero.paybackStatus === 'not_achieved',
      'M11: Zero generation returns structured paybackStatus: not_achieved',
      `paybackStatus=${resZero.paybackStatus}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M12] General IRR Root Existence & Null on Outflows Only
  // ---------------------------------------------------------------------------
  console.log('\n--- [M12] General IRR Root Existence & Null on Outflows Only ---');
  {
    const irrLoss = calculateIrr([-100, -10, -5]);
    const detailedLoss = calculateIrrDetailed([-100, -10, -5]);
    assert(
      irrLoss === null,
      'M12: calculateIrr([-100, -10, -5]) returns null instead of false 0.0% breakeven',
      `irr=${irrLoss}`
    );
    assert(
      detailedLoss.status === 'no_root',
      'M12: calculateIrrDetailed returns structured status: no_root',
      `status=${detailedLoss.status}`
    );

    const irrStandard = calculateIrr([-100, 30, 40, 50]);
    assert(
      irrStandard !== null && irrStandard > 0.05,
      'M12: Profitable conventional cash flow returns valid numerical IRR',
      `irr=${irrStandard?.toFixed(4)}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M13] Setback Clearance Rotated Footprint Validation
  // ---------------------------------------------------------------------------
  console.log('\n--- [M13] Setback Clearance Rotated Footprint Validation ---');
  {
    const roof: RoofPlane = {
      id: 'roof-1',
      name: 'Main Concrete Flat Roof',
      polygonWgs84: [],
      polygonEnu: [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 5, y: 5 },
        { x: -5, y: 5 },
      ],
      tiltDeg: 0,
      azimuthDeg: 0,
      eavesHeightM: 10,
      setbackClearanceM: 1.0,
    };

    const tableUnrotated: PvTable3D = {
      id: 't-unrot',
      tableIndex: 1,
      positionEnu: { x: 0, y: 0, z: 10.5 },
      tiltDeg: 0,
      azimuthDeg: 0,
      widthM: 4.0,
      slopedLengthM: 4.0,
      moduleCount: 4,
      ratedPowerWp: 2200,
    };

    const tableRotated: PvTable3D = {
      ...tableUnrotated,
      azimuthDeg: 45,
    };

    const resUnrot = checkTableSetbackCompliance(tableUnrotated, roof);
    const resRot = checkTableSetbackCompliance(tableRotated, roof);

    assert(
      resRot.minimumClearanceM < resUnrot.minimumClearanceM,
      'M13: 45° azimuth rotation extends square table corners diagonally (from 3.0m to 2.17m), reducing clearance',
      `unrotatedClearance=${resUnrot.minimumClearanceM}m, rotatedClearance=${resRot.minimumClearanceM}m`
    );
  }

  // ---------------------------------------------------------------------------
  // [M14] Snapshot Capacity Reconciliation Precision
  // ---------------------------------------------------------------------------
  console.log('\n--- [M14] Snapshot Capacity Reconciliation Precision ---');
  {
    // A 15 kWp declared project with only 14.5 kWp active tables (0.5 kW drift)
    const driftScene: Scene3DState = {
      anchorLocation: { latitude: 35.6892, longitude: 51.3890, elevationM: 1200 },
      roofPlanes: [
        {
          id: 'roof-drift',
          name: 'Commercial Roof',
          polygonWgs84: [],
          polygonEnu: [{ x: -10, y: -10 }, { x: 10, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }],
          tiltDeg: 0,
          azimuthDeg: 0,
          eavesHeightM: 8,
          setbackClearanceM: 0.8,
        },
      ],
      pvTables: [
        {
          id: 'table-1',
          tableIndex: 1,
          positionEnu: { x: 0, y: 0, z: 8.5 },
          tiltDeg: 25,
          azimuthDeg: 0,
          widthM: 10,
          slopedLengthM: 2.278,
          moduleCount: 26,
          ratedPowerWp: 14500, // 14.5 kWp
        },
      ],
      obstacles: [],
      totalPvCapacityKwp: 15.0, // 15.0 kWp declared vs 14.5 kWp actual
      totalModulesCount: 26,
      updatedAt: new Date().toISOString(),
    };

    const simResult = simulateAnnual3dShading(driftScene);
    assert(
      simResult.reconciliationStatus?.isProjectSnapshotConsistent === false,
      'M14: 0.5 kW capacity drift on a 15 kWp system (~3.3%) is strictly detected as inconsistent',
      `isProjectSnapshotConsistent=${simResult.reconciliationStatus?.isProjectSnapshotConsistent}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M15] Climate Data Provider remote_required Policy Enforcement
  // ---------------------------------------------------------------------------
  console.log('\n--- [M15] Climate Data Provider remote_required Policy Enforcement ---');
  {
    const provider = new ClimateDataProvider();
    let threw = false;
    let errorMessage = '';

    try {
      // In this environment without external satellite API access, remote_required must fail
      await provider.fetchClimateResource(35.689, 51.389, { policy: 'remote_required', bypassCache: true });
    } catch (err: any) {
      threw = true;
      errorMessage = err.message;
    }

    assert(
      threw && errorMessage.includes('remote_required failed'),
      'M15: remote_required policy throws explicit error instead of silently falling back to analytical model',
      `errorMessage=${errorMessage}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M16] Structural Hazard Provider Provenance Flag
  // ---------------------------------------------------------------------------
  console.log('\n--- [M16] Structural Hazard Provider Provenance Flag ---');
  {
    const hazardProvider = new StructuralHazardProvider();
    const hazard = hazardProvider.computeAnalyticalHazard(35.689, 51.389);
    assert(
      hazard.metadata.isEstimatedFromGlobalModel === true,
      'M16: Regional analytical structural hazard model is accurately tagged with isEstimatedFromGlobalModel: true',
      `isEstimated=${hazard.metadata.isEstimatedFromGlobalModel}, source=${hazard.metadata.sourceProvider}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M17] Circuit Breaker Half-Open Concurrency Limit
  // ---------------------------------------------------------------------------
  console.log('\n--- [M17] Circuit Breaker Half-Open Concurrency Limit ---');
  {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 15, halfOpenMaxTrials: 2 });
    // Transition to OPEN
    await cb.execute(async () => { throw new Error('fail 1'); }, () => 'fb');
    await cb.execute(async () => { throw new Error('fail 2'); }, () => 'fb');

    // Wait for cooldown to transition to HALF_OPEN
    await new Promise(r => setTimeout(r, 20));
    assert(cb.getState() === 'HALF_OPEN', 'M17: Breaker transitions to HALF_OPEN after cooldown');

    let launchedTrials = 0;
    const promises = [1, 2, 3, 4].map(i =>
      cb.execute(
        async () => {
          launchedTrials++;
          await new Promise(r => setTimeout(r, 30));
          return `success-${i}`;
        },
        (err) => `fallback-${i}: ${err.message}`
      )
    );

    const outcomes = await Promise.all(promises);
    assert(
      launchedTrials <= 2,
      'M17: Concurrent requests in HALF_OPEN are limited to halfOpenMaxTrials (2)',
      `launchedTrials=${launchedTrials}`
    );
    assert(
      outcomes[2].includes('Circuit breaker is HALF_OPEN and max trials (2) are already in progress'),
      'M17: 3rd concurrent request is immediately failed over without overloading remote endpoint',
      `outcome3=${outcomes[2]}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M18] Harmonics Analysis with Zero Operating Power
  // ---------------------------------------------------------------------------
  console.log('\n--- [M18] Harmonics Analysis with Zero Operating Power ---');
  {
    const harmZero = analyzePowerplantHarmonics(10.0, 20.0, 15.0, 0, 300);
    assert(
      harmZero.individualHarmonics[0].currentAmps === 0,
      'M18: Harmonics analysis with 0 MW operating power produces strictly 0 A harmonic current',
      `h3Amps=${harmZero.individualHarmonics[0].currentAmps}A`
    );
    assert(
      harmZero.thdCurrentPct === 0 && harmZero.tddCurrentPct === 0,
      'M18: Harmonics analysis with 0 MW operating power produces 0.0% THD_I and 0.0% TDD',
      `THD_I=${harmZero.thdCurrentPct}%, TDD=${harmZero.tddCurrentPct}%`
    );
  }

  // ---------------------------------------------------------------------------
  // [M19] Solar Pump Engine Low PSH Clamping Elimination
  // ---------------------------------------------------------------------------
  console.log('\n--- [M19] Solar Pump Engine Low PSH Clamping Elimination ---');
  {
    const pump05 = calculateSolarPump({
      dailyWaterRequirementM3: 10,
      peakSunHours: 0.5,
      wellDepthM: 20,
      tankHeightM: 5,
      pipeDiameterMm: 63,
      pipeLengthM: 30,
      irrigationType: 'drip',
    });
    // At PSH = 0.5, flow rate is ~20-22 m³/h, not clamped to PSH = 1.0 (~10-11 m³/h)
    assert(
      pump05.flowRateM3PerHour >= 19.0,
      'M19: Solar pump engine does not clamp PSH=0.5 to 1.0 (flowRate ~20-22 m³/h)',
      `flowRate=${pump05.flowRateM3PerHour}m³/h`
    );

    let threw = false;
    try {
      calculateSolarPump({
        dailyWaterRequirementM3: 10,
        peakSunHours: -2.0,
        wellDepthM: 20,
        tankHeightM: 5,
        pipeDiameterMm: 63,
        pipeLengthM: 30,
        irrigationType: 'drip',
      });
    } catch {
      threw = true;
    }
    assert(threw, 'M19: Negative PSH (-2.0) throws explicit validation error');
  }

  // ---------------------------------------------------------------------------
  // [M20 & M21] Production Runtime & Zero Vulnerabilities
  // ---------------------------------------------------------------------------
  console.log('\n--- [M20 & M21] Production Runtime & Dependency Security ---');
  {
    const packageJson = JSON.parse(await import('fs').then(f => f.readFileSync('package.json', 'utf-8')));
    assert(
      packageJson.dependencies && packageJson.dependencies.tsx !== undefined,
      'M20: tsx is present in production dependencies contract',
      `tsxVersion=${packageJson.dependencies.tsx}`
    );
    assert(
      packageJson.overrides && packageJson.overrides.minimatch !== undefined,
      'M21: Security overrides are registered in package.json',
      `minimatchOverride=${packageJson.overrides.minimatch}`
    );
  }

  // ---------------------------------------------------------------------------
  // [M22] Excel XML Export Special Characters Escaping
  // ---------------------------------------------------------------------------
  console.log('\n--- [M22] Excel XML Export Special Characters Escaping ---');
  {
    const rawStr = 'V < 3% & Safe "quoted" \'test\' > 0';
    const escaped = escapeXml(rawStr);
    assert(
      escaped === 'V &lt; 3% &amp; Safe &quot;quoted&quot; &apos;test&apos; &gt; 0',
      'M22: escapeXml replaces all XML special characters (&, <, >, ", \')',
      `escaped=${escaped}`
    );

    const xml = buildExcelWorkbookXml([
      {
        sheetName: 'Engineering & Feasibility <1>',
        rows: [
          ['Item', 'Value', 'Notes'],
          ['Voltage Drop', 1.85, 'V < 3% & Safe'],
          ['Equipment', 'Module "TOPCon" 580W', 'Clean & Verified'],
        ],
      },
    ]);

    assert(
      xml.includes('ss:Name="Engineering &amp; Feasibility &lt;1&gt;"'),
      'M22: Sheet name XML attributes are properly escaped',
      'found=true'
    );
    assert(
      xml.includes('<Data ss:Type="String">V &lt; 3% &amp; Safe</Data>'),
      'M22: String cell values are properly XML escaped',
      'found=true'
    );
    assert(
      xml.includes('<Data ss:Type="String">Module &quot;TOPCon&quot; 580W</Data>'),
      'M22: Quotes in cell values are properly XML escaped',
      'found=true'
    );
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(` M01–M22 AUDIT TEST SUMMARY: ${passes} PASSED, ${failures} FAILED`);
  console.log('================================================================================');

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runM01ToM22TestSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
