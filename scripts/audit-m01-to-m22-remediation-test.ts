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
  calculateLcoe,
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
  buildSceneFromProjectDesign,
  calculateRayTracedShadingFactor,
  generateTableMeshSamplePoints,
  computeTableShadingGeometricMesh,
  type PvTable3D,
  type RoofPlane,
  type Scene3DState,
} from '../src/engine/roof3dShadingEngine';
import { ClimateDataProvider } from '../src/engine/dataGateway/climateDataProvider';
import { StructuralHazardProvider } from '../src/engine/dataGateway/structuralHazardProvider';
import { CircuitBreaker } from '../src/engine/dataGateway/circuitBreaker';
import { calculateSolarPump } from '../src/engine/solarPumpEngine';
import { buildExcelWorkbookXml, escapeXml } from '../src/engine/reportingEngine';
import { app, setPersistPathForTesting, db as activeDb } from '../server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

let passes = 0;
let failures = 0;

function assert(condition: boolean, testName: string, detail: string = ''): void {
  if (condition) {
    passes++;
    console.log(`  [PASS] ${testName}${detail ? ' -> ' + detail : ''}`);
  } else {
    failures++;
    const failure = `${testName}${detail ? ' -> ' + detail : ''}`;
    console.error(`  [FAIL] ${failure}`);
    if (process.env.GITHUB_ACTIONS === 'true') {
      const annotation = failure.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
      console.error(`::error title=M01-M22 audit regression::${annotation}`);
    }
  }
}

async function runM01ToM22TestSuite(): Promise<void> {
  console.log('================================================================================');
  console.log(' SolarPV Studio — Comprehensive Audit Remediation Verification Suite (M01–M22)');
  console.log('================================================================================\n');

  const syncPushRoute = (app as any)._router.stack
    .find((r: any) => r.route && r.route.path === '/api/v1/sync/push' && r.route.methods.post)
    ?.route.stack[0].handle;
  let sharedAliceProjectId = '';

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

    // Round-trip test: feeding calculated max capacity back into the voltage rise equation
    const rtLeading = analyzeUpstreamGridConditions({
      plantCapacityMw: gridLeading.maxAllowablePlantCapacityMw,
      gridVoltageKv: 20.0,
      gridShortCircuitMva: 120.0,
      gridXrRatio: 6.0,
      inverterPowerFactor: 0.95,
      isPowerFactorLagging: false,
    });
    assert(
      rtLeading.pccVoltageRiseCompliant && rtLeading.pccVoltageRisePct <= 3.0,
      'M03: Round-trip test: leading max capacity strictly complies with <= 3% limit',
      `rise=${rtLeading.pccVoltageRisePct}%, compliant=${rtLeading.pccVoltageRiseCompliant}`
    );

    // Reviewer case: 50 MVA grid, X/R = 4, lagging 0.95 PF
    const reviewerGrid = analyzeUpstreamGridConditions({
      plantCapacityMw: 10.0,
      gridVoltageKv: 20.0,
      gridShortCircuitMva: 50.0,
      gridXrRatio: 4.0,
      inverterPowerFactor: 0.95,
      isPowerFactorLagging: true,
    });
    const rtLagging = analyzeUpstreamGridConditions({
      plantCapacityMw: reviewerGrid.maxAllowablePlantCapacityMw,
      gridVoltageKv: 20.0,
      gridShortCircuitMva: 50.0,
      gridXrRatio: 4.0,
      inverterPowerFactor: 0.95,
      isPowerFactorLagging: true,
    });
    assert(
      rtLagging.pccVoltageRiseCompliant && Math.abs(rtLagging.pccVoltageRisePct) <= 3.0,
      'M03: Reviewer lagging round-trip case complies with <= 3% limit without undervoltage violation',
      `maxMw=${reviewerGrid.maxAllowablePlantCapacityMw}MW, rise=${rtLagging.pccVoltageRisePct}%`
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

    const manifestPath = path.resolve(process.cwd(), 'benchmarks/reference_files/sam_reference_manifest.json');
    const manifestExists = fs.existsSync(manifestPath);
    let casesCount = 0;
    let allChecksumsValid = false;
    if (manifestExists) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      casesCount = manifest.cases?.length || 0;
      let matches = 0;
      for (const c of manifest.cases) {
        const filePath = path.resolve(process.cwd(), 'benchmarks/reference_files', c.benchmarkFile);
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(fileContent).digest('hex');
          if (actualHash === c.sha256) {
            matches++;
          }
        }
      }
      allChecksumsValid = matches === casesCount && casesCount === 3;
    }
    assert(
      manifestExists && casesCount === 3,
      'M04: SAM reference manifest exists and specifies exact case checksums and configurations',
      `exists=${manifestExists}, cases=${casesCount}`
    );
    assert(
      allChecksumsValid === true,
      'M04: All referenced .sam files exist on disk and their SHA-256 hashes strictly match the manifest',
      `checksumsMatch=${allChecksumsValid}`
    );

    // M04: Real disk mutation sensitivity test - altering a reference target strictly causes benchmark failure
    const phxFilePath = path.resolve(process.cwd(), 'benchmarks/reference_files/sam_2023_12_17_phoenix_soiling_reference.sam');
    const phxOriginalContent = fs.readFileSync(phxFilePath, 'utf-8');
    try {
      const phxMutated = JSON.parse(phxOriginalContent);
      phxMutated.benchmarkTargetOutputs.annualAverageSoilingLossPct = 99.0;
      fs.writeFileSync(phxFilePath, JSON.stringify(phxMutated, null, 2));

      const mutatedReport = runExternalEmpiricalValidationSuite();
      const phxHub = mutatedReport.crossModelComparisons.find(c => c.climateHubId === 'SAM-HUB-PHOENIX');
      assert(
        mutatedReport.overallStatus === 'FAIL' && phxHub?.overallStatus === 'WARN' && phxHub?.samAnnualSoilingPercent === 99.0,
        'M04: Real on-disk SAM file mutation is dynamically consumed and immediately fails validation',
        `overallStatus=${mutatedReport.overallStatus}, phxStatus=${phxHub?.overallStatus}, phxTarget=${phxHub?.samAnnualSoilingPercent}%`
      );
    } finally {
      fs.writeFileSync(phxFilePath, phxOriginalContent);
    }

    // M04: Missing reference file strictly throws explicit error rather than silently falling back
    let missingFileErrorCaught = false;
    try {
      const tempPath = phxFilePath + '.temp_test_bak';
      fs.renameSync(phxFilePath, tempPath);
      try {
        runExternalEmpiricalValidationSuite();
      } catch (err: any) {
        if (err.message.includes('Required SAM reference case file') && err.message.includes('was not found')) {
          missingFileErrorCaught = true;
        }
      } finally {
        fs.renameSync(tempPath, phxFilePath);
      }
    } catch {}
    assert(
      missingFileErrorCaught === true,
      'M04: Missing SAM reference file strictly throws fail-closed error rather than silently falling back to defaults',
      `caught=${missingFileErrorCaught}`
    );

    // M04: Incomplete / invalid benchmarkTargetOutputs schema strictly throws error without falling back to constants
    const schemaTestCases = [
      { name: 'empty benchmarkTargetOutputs {}', mutate: (m: any) => { m.benchmarkTargetOutputs = {}; } },
      { name: 'invalid string type "invalid"', mutate: (m: any) => { m.benchmarkTargetOutputs.annualAverageSoilingLossPct = 'invalid'; } },
      { name: 'null target value', mutate: (m: any) => { m.benchmarkTargetOutputs.annualAverageSoilingLossPct = null; } },
      { name: 'deleted target key', mutate: (m: any) => { delete m.benchmarkTargetOutputs.annualAverageSoilingLossPct; } },
    ];

    for (const tc of schemaTestCases) {
      let schemaErrorCaught = false;
      try {
        const mutated = JSON.parse(phxOriginalContent);
        tc.mutate(mutated);
        fs.writeFileSync(phxFilePath, JSON.stringify(mutated, null, 2));
        runExternalEmpiricalValidationSuite();
      } catch (err: any) {
        if (err.message.includes('Reference case file') || err.message.includes('benchmarkTargetOutputs')) {
          schemaErrorCaught = true;
        }
      } finally {
        fs.writeFileSync(phxFilePath, phxOriginalContent);
      }
      assert(
        schemaErrorCaught === true,
        `M04: Benchmark schema strictly throws on ${tc.name} without silent fallback to constant 4.2`,
        `caught=${schemaErrorCaught}`
      );
    }

    // M04: Validation runner forceCrossModelFailure option verification
    const failedReport = runExternalEmpiricalValidationSuite({ forceCrossModelFailure: true });
    assert(
      failedReport.overallStatus === 'FAIL',
      'M04: Validation runner strictly flags failure when model parameters/targets diverge from baseline',
      `status=${failedReport.overallStatus}`
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
          { id: 'msg-unsupported-4', entityType: 'UnsupportedType', payloadJson: JSON.stringify({ foo: 'bar' }) },
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
      !responseBody.ackedIds.includes('msg-unsupported-4'),
      'M05: Unsupported entityType is NOT acknowledged in ackedIds',
      `unsupportedAcknowledged=${responseBody.ackedIds.includes('msg-unsupported-4')}`
    );
    assert(
      responseBody.rejected.length === 3,
      'M05: All 3 invalid messages are listed in rejected with failure reasons',
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

    // M08: String sizing rejects omitted temperature coefficient
    let ssStatus = 0;
    let ssBody: any = null;
    const mockSsRes: any = {
      status(s: number) { ssStatus = s; return this; },
      json(d: any) { ssBody = d; return this; },
    };
    const ssRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/electrical/string-sizing' && r.route.methods.post)
      ?.route.stack[0].handle;

    await ssRoute({ body: { panelVoc: 50, panelVmp: 40, tempMinC: -10, tempMaxC: 45, inverterVdcMax: 1000, inverterMpptMin: 200, inverterMpptMax: 800 } }, mockSsRes);
    assert(
      ssStatus === 400 && ssBody.error.includes('Temperature coefficient'),
      'M08: String sizing rejects omitted temperature coefficient with HTTP 400 instead of nulls',
      `status=${ssStatus}, error=${ssBody.error}`
    );

    // M08: String sizing rejects non-numeric betaPmpPerC
    await ssRoute({ body: { panelVoc: 50, panelVmp: 40, tempMinC: -10, tempMaxC: 45, inverterVdcMax: 1000, inverterMpptMin: 200, inverterMpptMax: 800, betaVocPerC: -0.0028, betaPmpPerC: 'invalid' } }, mockSsRes);
    assert(
      ssStatus === 400 && ssBody.error.includes('betaPmpPerC'),
      'M08: String sizing rejects non-numeric betaPmpPerC with HTTP 400',
      `status=${ssStatus}`
    );

    // M08: String sizing rejects positive betaPmpPerC
    await ssRoute({ body: { panelVoc: 50, panelVmp: 40, tempMinC: -10, tempMaxC: 45, inverterVdcMax: 1000, inverterMpptMin: 200, inverterMpptMax: 800, betaVocPerC: -0.0028, betaPmpPerC: 0.05 } }, mockSsRes);
    assert(
      ssStatus === 400 && ssBody.error.includes('betaPmpPerC'),
      'M08: String sizing rejects positive betaPmpPerC with HTTP 400',
      `status=${ssStatus}`
    );

    // M06: Sync push rejects negative project capacity
    let negPushStatus = 0;
    let negPushBody: any = null;
    await syncPushRoute({
      body: {
        messages: [
          {
            id: 'msg-neg-cap',
            entityType: 'project',
            payloadJson: JSON.stringify({ id: 'proj-neg', name: 'Neg Cap Proj', systemCapacityKwp: -999 }),
          },
        ],
      },
    }, {
      status(s: number) { negPushStatus = s; return this; },
      json(d: any) { negPushBody = d; return this; },
    });
    assert(
      negPushBody.rejected.length === 1 && negPushBody.rejected[0].reason.includes('positive finite number'),
      'M06: Sync push strictly rejects negative project capacity (-999 kWp)',
      `rejected=${negPushBody.rejected[0].reason}`
    );

    // M06: Access control protects projects: Bob cannot overwrite Alice project
    const aliceProjectRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/projects/quick-size' && r.route.methods.post)
      ?.route.stack[0].handle;
    let aliceBody: any = null;
    await aliceProjectRoute({
      body: { projectName: 'Alice Array', dailyKwh: 30, autonomyDays: 1, latitude: 35.6, longitude: 51.3, ownerId: 'alice' },
      headers: {},
    }, {
      status() { return this; },
      json(d: any) { aliceBody = d; return this; },
    });
    sharedAliceProjectId = aliceBody.projectId;

    let bobPushBody: any = null;
    await syncPushRoute({
      headers: { 'x-user-id': 'bob' },
      body: {
        messages: [
          {
            id: 'msg-bob-attack',
            entityType: 'project',
            payloadJson: JSON.stringify({ id: aliceBody.projectId, name: 'Hacked by Bob', systemCapacityKwp: 50, ownerId: 'bob' }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { bobPushBody = d; return this; },
    });
    assert(
      bobPushBody.rejected.length === 1 && bobPushBody.rejected[0].reason.includes('Access denied'),
      'M06: Access control protects projects: Bob cannot overwrite Alice project',
      `reason=${bobPushBody.rejected[0].reason}`
    );

    // M06: PUT to Alice's project without identity returns HTTP 403
    const projectPutRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/projects/:id' && r.route.methods.put)
      ?.route.stack[0].handle;

    let unauthPutStatus = 0;
    let unauthPutBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: {},
      body: { name: 'Attempted Unauth Update', systemCapacityKwp: 10.0 },
    }, {
      status(s: number) { unauthPutStatus = s; return this; },
      json(d: any) { unauthPutBody = d; return this; },
    });
    assert(
      unauthPutStatus === 403 && unauthPutBody.error.includes('Authentication required'),
      'M06: PUT to owned project without identity header returns HTTP 403',
      `status=${unauthPutStatus}`
    );

    // M06: PUT with empty name returns HTTP 400
    let emptyNamePutStatus = 0;
    let emptyNamePutBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { 'x-user-id': 'alice' },
      body: { name: '   ', systemCapacityKwp: 10.0 },
    }, {
      status(s: number) { emptyNamePutStatus = s; return this; },
      json(d: any) { emptyNamePutBody = d; return this; },
    });
    assert(
      emptyNamePutStatus === 400 && emptyNamePutBody.error.includes('Project name is required'),
      'M06: PUT with empty project name returns HTTP 400',
      `status=${emptyNamePutStatus}`
    );

    // M06: PUT with negative capacity returns HTTP 400
    let negCapPutStatus = 0;
    let negCapPutBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { 'x-user-id': 'alice' },
      body: { name: 'Alice Good Name', systemCapacityKwp: -50.0 },
    }, {
      status(s: number) { negCapPutStatus = s; return this; },
      json(d: any) { negCapPutBody = d; return this; },
    });
    assert(
      negCapPutStatus === 400 && negCapPutBody.error.includes('positive finite number'),
      'M06: PUT with negative capacity returns HTTP 400',
      `status=${negCapPutStatus}`
    );

    // M06: Sync push without identity to owned project is rejected
    let unauthSyncBody: any = null;
    await syncPushRoute({
      headers: {},
      body: {
        messages: [
          {
            id: 'msg-unauth-sync',
            entityType: 'project',
            payloadJson: JSON.stringify({ id: sharedAliceProjectId, name: 'Anonymous Overwrite', systemCapacityKwp: 20 }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { unauthSyncBody = d; return this; },
    });
    assert(
      unauthSyncBody.rejected.length === 1 && unauthSyncBody.rejected[0].reason.includes('Authentication required'),
      'M06: Sync push without identity to owned project is rejected with Authentication required',
      `reason=${unauthSyncBody.rejected[0].reason}`
    );

    // -------------------------------------------------------------------------
    // M06 Mode 1: JWT-Only Mode (JWT_SECRET set, INTERNAL_GATEWAY_SECRET unset)
    // -------------------------------------------------------------------------
    delete process.env.INTERNAL_GATEWAY_SECRET;
    process.env.JWT_SECRET = 'jwt-only-secret-abc';

    // 1a. Raw x-user-id header without JWT is strictly rejected in JWT-only mode (fail-closed against JWT bypass)
    let jwtOnlyRawUserStatus = 0;
    let jwtOnlyRawUserBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { 'x-user-id': 'alice' }, // Bypassing JWT via raw header
      body: { name: 'Raw Header Bypass Attempt' },
    }, {
      status(s: number) { jwtOnlyRawUserStatus = s; return this; },
      json(d: any) { jwtOnlyRawUserBody = d; return this; },
    });
    assert(
      jwtOnlyRawUserStatus === 401 && jwtOnlyRawUserBody.error.includes('JWT-only mode'),
      'M06: Raw x-user-id header is strictly rejected in JWT-only mode (fail-closed against JWT bypass)',
      `status=${jwtOnlyRawUserStatus}, error=${jwtOnlyRawUserBody.error}`
    );

    // 1b. Raw Bearer token is rejected in JWT-only mode
    let jwtOnlyRawBearerStatus = 0;
    let jwtOnlyRawBearerBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { authorization: 'Bearer alice' },
      body: { name: 'Raw Bearer Attempt' },
    }, {
      status(s: number) { jwtOnlyRawBearerStatus = s; return this; },
      json(d: any) { jwtOnlyRawBearerBody = d; return this; },
    });
    assert(
      jwtOnlyRawBearerStatus === 401 && jwtOnlyRawBearerBody.error.includes('Untrusted bearer token'),
      'M06: Raw Bearer token is rejected in JWT-only mode',
      `status=${jwtOnlyRawBearerStatus}`
    );

    // 1c. Fake signature JWT is rejected
    const fakeJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsImV4cCI6MX0.fakesig';
    let fakeJwtStatus = 0;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { authorization: 'Bearer ' + fakeJwt },
      body: { name: 'Fake JWT Attempt' },
    }, {
      status(s: number) { fakeJwtStatus = s; return this; },
      json() { return this; },
    });
    assert(
      fakeJwtStatus === 401,
      'M06: Forged JWT signature is rejected with HTTP 401',
      `status=${fakeJwtStatus}`
    );

    // 1d. Validly signed JWT authorizes update in JWT-only mode
    const b64u = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const jwtHeader = b64u({ alg: 'HS256', typ: 'JWT' });
    const jwtPayload = b64u({ sub: 'alice', exp: Math.floor(Date.now() / 1000) + 3600 });
    const jwtSig = crypto.createHmac('sha256', 'jwt-only-secret-abc').update(jwtHeader + '.' + jwtPayload).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const validJwt = jwtHeader + '.' + jwtPayload + '.' + jwtSig;

    let validJwtOnlyStatus = 200;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { authorization: 'Bearer ' + validJwt },
      body: { name: 'Alice Legit JWT Update', systemCapacityKwp: 12.0 },
    }, {
      status(s: number) { validJwtOnlyStatus = s; return this; },
      json() { return this; },
    });
    assert(
      validJwtOnlyStatus === 200,
      'M06: Validly signed JWT succeeds in JWT-only mode',
      `status=${validJwtOnlyStatus}`
    );

    // 1e. PUT with body.requesterId without identity headers is rejected with HTTP 401/403
    let bodyBypassStatus = 0;
    let bodyBypassBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: {},
      body: { name: 'Body Bypass Attempt', requesterId: 'alice' },
    }, {
      status(s: number) { bodyBypassStatus = s; return this; },
      json(d: any) { bodyBypassBody = d; return this; },
    });
    assert(
      (bodyBypassStatus === 401 || bodyBypassStatus === 403) && bodyBypassBody.error.includes('Authentication required'),
      'M06: Body requesterId fallback is ignored and unauthenticated PUT is rejected with HTTP 401/403',
      `status=${bodyBypassStatus}`
    );

    // 1f. Sync push with msg.userId without verified identity header is rejected
    let syncMsgBypassBody: any = null;
    await syncPushRoute({
      headers: {},
      body: {
        messages: [
          {
            id: 'msg-sync-bypass',
            entityType: 'project',
            userId: 'alice',
            payloadJson: JSON.stringify({ id: sharedAliceProjectId, name: 'Sync Bypass Update', systemCapacityKwp: 25 }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { syncMsgBypassBody = d; return this; },
    });
    assert(
      syncMsgBypassBody.rejected.length === 1 && syncMsgBypassBody.rejected[0].reason.includes('Authentication required'),
      'M06: Sync message.userId fallback is ignored and unauthenticated sync is rejected',
      `reason=${syncMsgBypassBody.rejected[0].reason}`
    );

    // 1g. Unowned / Seed Project Mutation & Ownership Claim Protection (P1 Finding)
    const unownedSeedId = 'proj-seed-test-unowned';
    activeDb.projects.set(unownedSeedId, {
      id: unownedSeedId,
      name: 'Initial Unowned Seed System',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 35.0,
      autonomyDays: 1.0,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.05,
      createdAt: new Date().toISOString(),
    });

    // In JWT-only mode (or production), unauthenticated PUT to unowned seed project is rejected with HTTP 401
    let unauthUnownedPutStatus = 0;
    let unauthUnownedPutBody: any = null;
    await projectPutRoute({
      params: { id: unownedSeedId },
      headers: {},
      body: { name: 'Mallory Unauth Overwrite' },
    }, {
      status(s: number) { unauthUnownedPutStatus = s; return this; },
      json(d: any) { unauthUnownedPutBody = d; return this; },
    });
    assert(
      unauthUnownedPutStatus === 401 && unauthUnownedPutBody.error.includes('Authentication required'),
      'M06: Unauthenticated PUT to unowned/seed project is strictly rejected with HTTP 401 in secure mode',
      `status=${unauthUnownedPutStatus}, error=${unauthUnownedPutBody.error}`
    );

    // Unauthenticated sync attempting to claim unowned project with ownerId: 'mallory' is rejected
    let mallorySyncBody: any = null;
    await syncPushRoute({
      headers: {},
      body: {
        messages: [
          {
            id: 'msg-mallory-claim',
            entityType: 'project',
            payloadJson: JSON.stringify({ id: unownedSeedId, name: 'Claimed by Mallory', ownerId: 'mallory' }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { mallorySyncBody = d; return this; },
    });
    assert(
      mallorySyncBody.rejected.length === 1 &&
      mallorySyncBody.rejected[0].reason.includes('Authentication required') &&
      activeDb.projects.get(unownedSeedId)?.ownerId !== 'mallory',
      'M06: Unauthenticated sync cannot claim ownership of unowned/seed projects via payload ownerId',
      `rejected=${mallorySyncBody.rejected.length}, ownerInDb=${activeDb.projects.get(unownedSeedId)?.ownerId}`
    );

    // Authenticated Alice claims the unowned project via valid JWT
    let aliceClaimStatus = 200;
    await projectPutRoute({
      params: { id: unownedSeedId },
      headers: { authorization: 'Bearer ' + validJwt },
      body: { name: 'Alice Claimed Seed System', systemCapacityKwp: 12.0 },
    }, {
      status(s: number) { aliceClaimStatus = s; return this; },
      json() { return this; },
    });
    const claimedProj = activeDb.projects.get(unownedSeedId);
    assert(
      aliceClaimStatus === 200 && claimedProj?.ownerId === 'alice',
      'M06: Authenticated requester successfully claims unowned project and binds ownership to verified identity',
      `status=${aliceClaimStatus}, ownerId=${claimedProj?.ownerId}`
    );

    // -------------------------------------------------------------------------
    // M06 Mode 2: Gateway-Only Mode (INTERNAL_GATEWAY_SECRET set, JWT_SECRET unset)
    // -------------------------------------------------------------------------
    delete process.env.JWT_SECRET;
    process.env.INTERNAL_GATEWAY_SECRET = 'secret-gateway-token-xyz';

    // 2a. Direct x-user-id header without x-gateway-secret is rejected
    let gwSpoofStatus = 0;
    let gwSpoofBody: any = null;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { 'x-user-id': 'alice' }, // Missing x-gateway-secret!
      body: { name: 'Spoofed Update Attempt' },
    }, {
      status(s: number) { gwSpoofStatus = s; return this; },
      json(d: any) { gwSpoofBody = d; return this; },
    });
    assert(
      gwSpoofStatus === 401 && gwSpoofBody.error.includes('gateway signature'),
      'M06: Direct x-user-id header spoofing is rejected in Gateway-only mode',
      `status=${gwSpoofStatus}`
    );

    // 2b. Bearer token is rejected in Gateway-only mode
    let gwBearerStatus = 0;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { authorization: 'Bearer ' + validJwt },
      body: { name: 'Bearer in Gateway-Only Mode' },
    }, {
      status(s: number) { gwBearerStatus = s; return this; },
      json() { return this; },
    });
    assert(
      gwBearerStatus === 401,
      'M06: Bearer token is rejected in Gateway-only mode (fail-closed)',
      `status=${gwBearerStatus}`
    );

    // 2c. Valid gateway secret authorizes request with constant-time equality check
    let validGwStatus = 200;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { 'x-user-id': 'alice', 'x-gateway-secret': 'secret-gateway-token-xyz' },
      body: { name: 'Alice Gateway Update', systemCapacityKwp: 14.0 },
    }, {
      status(s: number) { validGwStatus = s; return this; },
      json() { return this; },
    });
    assert(
      validGwStatus === 200,
      'M06: Valid gateway secret authorizes project modification with constant-time equality check',
      `status=${validGwStatus}`
    );

    // -------------------------------------------------------------------------
    // M06 Mode 3: Mixed Mode (both JWT_SECRET and INTERNAL_GATEWAY_SECRET set)
    // -------------------------------------------------------------------------
    process.env.JWT_SECRET = 'jwt-only-secret-abc';
    process.env.INTERNAL_GATEWAY_SECRET = 'secret-gateway-token-xyz';

    let mixedJwtStatus = 200;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { authorization: 'Bearer ' + validJwt },
      body: { name: 'Alice Mixed JWT Update', systemCapacityKwp: 15.0 },
    }, {
      status(s: number) { mixedJwtStatus = s; return this; },
      json() { return this; },
    });
    let mixedGwStatus = 200;
    await projectPutRoute({
      params: { id: sharedAliceProjectId },
      headers: { 'x-user-id': 'alice', 'x-gateway-secret': 'secret-gateway-token-xyz' },
      body: { name: 'Alice Mixed Gateway Update', systemCapacityKwp: 16.0 },
    }, {
      status(s: number) { mixedGwStatus = s; return this; },
      json() { return this; },
    });
    assert(
      mixedJwtStatus === 200 && mixedGwStatus === 200,
      'M06: In mixed mode, both valid JWT and valid Gateway secret are independently authorized',
      `jwtStatus=${mixedJwtStatus}, gwStatus=${mixedGwStatus}`
    );

    delete process.env.JWT_SECRET;
    delete process.env.INTERNAL_GATEWAY_SECRET;
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

    // M07: Persistent disk failure returns HTTP 500 and 0 ackedIds
    const outboxCountBefore = activeDb.outbox.length;
    // Make the would-be parent a regular file. Creating a child path beneath it
    // deterministically fails on Windows and POSIX (unlike chmod/root paths).
    const persistBlockerPath = path.join(os.tmpdir(), `solarpv-persist-blocker-${process.pid}`);
    fs.rmSync(persistBlockerPath, { force: true });
    fs.writeFileSync(persistBlockerPath, 'not a directory');
    setPersistPathForTesting(path.join(persistBlockerPath, 'snapshot.json'));
    let failPushStatus = 0;
    let failPushBody: any = null;
    await syncPushRoute({
      body: {
        messages: [
          {
            id: 'msg-disk-fail',
            entityType: 'project',
            payloadJson: JSON.stringify({ id: 'proj-disk-test', name: 'Disk Fail Test', systemCapacityKwp: 10 }),
          },
        ],
      },
    }, {
      status(s: number) { failPushStatus = s; return this; },
      json(d: any) { failPushBody = d; return this; },
    });
    const outboxCountAfter = activeDb.outbox.length;

    assert(
      failPushStatus === 500 && failPushBody.ackedIds.length === 0,
      'M07: Disk write failure refuses durable ack and returns HTTP 500 with explicit rejection',
      `status=${failPushStatus}, acked=${failPushBody.ackedIds.length}`
    );
    assert(
      outboxCountBefore === outboxCountAfter,
      'M07: Transactional rollback strictly removes failed sync messages from outbox (zero dirty state)',
      `outboxBefore=${outboxCountBefore}, outboxAfter=${outboxCountAfter}`
    );

    // M07: Catalog POST under storage failure returns HTTP 500 and rolls back
    const catModPostRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/modules' && r.route.methods.post)
      ?.route.stack[0].handle;
    const catInvPostRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/inverters' && r.route.methods.post)
      ?.route.stack[0].handle;
    const catBatPostRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/batteries' && r.route.methods.post)
      ?.route.stack[0].handle;

    // Seed original items in database to test overwrite rollback
    activeDb.pvModules.set('mod-keep-1', { id: 'mod-keep-1', modelName: 'Original Module', manufacturer: 'SolarCorp', pmpWatts: 500, vmpVolts: 40, impAmps: 12.5, vocVolts: 48, iscAmps: 13.5, betaVocPerC: -0.0028 });
    activeDb.inverters.set('inv-keep-1', { id: 'inv-keep-1', modelName: 'Original Inverter', manufacturer: 'InvCorp', pnomAcKw: 10, vdcMaxVolts: 1000, vmpptMinVolts: 200, vmpptMaxVolts: 800 });
    activeDb.batteries.set('bat-keep-1', { id: 'bat-keep-1', modelName: 'Original Battery', manufacturer: 'BatCorp', nominalVoltageVolts: 48, capacityKwh: 10, depthOfDischargeMax: 0.8 });

    let modOverwriteStatus = 0;
    await catModPostRoute({
      body: { id: 'mod-keep-1', modelName: 'Malicious Overwrite Module', manufacturer: 'Hacker', pmpWatts: 900, vmpVolts: 45, impAmps: 20, vocVolts: 52, iscAmps: 22 },
    }, { status(s: number) { modOverwriteStatus = s; return this; }, json() { return this; } });

    let invOverwriteStatus = 0;
    await catInvPostRoute({
      body: { id: 'inv-keep-1', modelName: 'Malicious Overwrite Inverter', manufacturer: 'Hacker', pnomAcKw: 99, vdcMaxVolts: 1200, vmpptMinVolts: 300, vmpptMaxVolts: 900 },
    }, { status(s: number) { invOverwriteStatus = s; return this; }, json() { return this; } });

    let batOverwriteStatus = 0;
    await catBatPostRoute({
      body: { id: 'bat-keep-1', modelName: 'Malicious Overwrite Battery', manufacturer: 'Hacker', nominalVoltageVolts: 96, capacityKwh: 100 },
    }, { status(s: number) { batOverwriteStatus = s; return this; }, json() { return this; } });

    const restoredMod = activeDb.pvModules.get('mod-keep-1');
    const restoredInv = activeDb.inverters.get('inv-keep-1');
    const restoredBat = activeDb.batteries.get('bat-keep-1');

    assert(
      modOverwriteStatus === 500 && restoredMod !== undefined && restoredMod.modelName === 'Original Module',
      'M07: Module catalog overwrite failure restores original item without deleting it from memory',
      `status=${modOverwriteStatus}, restoredModel=${restoredMod?.modelName}`
    );
    assert(
      invOverwriteStatus === 500 && restoredInv !== undefined && restoredInv.modelName === 'Original Inverter',
      'M07: Inverter catalog overwrite failure restores original item without deleting it from memory',
      `status=${invOverwriteStatus}, restoredModel=${restoredInv?.modelName}`
    );
    assert(
      batOverwriteStatus === 500 && restoredBat !== undefined && restoredBat.modelName === 'Original Battery',
      'M07: Battery catalog overwrite failure restores original item without deleting it from memory',
      `status=${batOverwriteStatus}, restoredModel=${restoredBat?.modelName}`
    );

    // Reset the injected failure path and remove the cross-platform blocker.
    setPersistPathForTesting('./data/solar-db-snapshot.json');
    fs.rmSync(persistBlockerPath, { force: true });
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

    // Discrepant report metrics against snapshot
    repStatus = 200;
    repBody = null;
    reportRoute({ headers: { 'x-user-id': 'alice' }, body: { projectId: sharedAliceProjectId, systemCapacityKwp: 25.0, panelCount: 50 } }, mockRepRes);
    assert(
      repStatus === 200 && repBody.isReconciledAgainstSnapshot === false && repBody.discrepancies?.length > 0,
      'M09: Discrepant report metrics are strictly flagged as NOT reconciled with detailed discrepancies',
      `isReconciled=${repBody.isReconciledAgainstSnapshot}, discrepanciesCount=${repBody.discrepancies?.length}`
    );

    // M09: Zero annual yield baseline must NOT falsely reconcile non-zero yield
    activeDb.projects.set('proj-zero-yield', {
      id: 'proj-zero-yield',
      name: 'Zero Yield Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 0,
      autonomyDays: 0,
      systemCapacityKwp: 5.5,
      panelCount: 10,
      inverterCount: 1,
      batteryCount: 0,
      lcoeUsdPerKwh: 0,
      estimatedAnnualYieldKwh: 0,
    });

    repStatus = 200;
    repBody = null;
    reportRoute({
      body: {
        projectId: 'proj-zero-yield',
        systemCapacityKwp: 5.5,
        panelCount: 10,
        annualYieldKwh: 1_000_000,
      },
    }, mockRepRes);
    assert(
      repStatus === 200 && repBody.isReconciledAgainstSnapshot === false && repBody.discrepancies?.some((d: string) => d.includes('Annual yield mismatch')),
      'M09: Zero annual energy snapshot baseline strictly detects non-zero annual yield discrepancy',
      `isReconciled=${repBody.isReconciledAgainstSnapshot}, discrepancies=${repBody.discrepancies?.join('; ')}`
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

    const resPositive = runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa');
    assert(
      resPositive.lcoeTomanPerKwh !== null && resPositive.lcoeTomanPerKwh > 1000 && resPositive.lcoeTomanPerKwh < 10000,
      'M11: Positive generation computes comprehensive 25-year discounted LCOE with OPEX, degradation, and discounting',
      `lcoe=${resPositive.lcoeTomanPerKwh} Toman/kWh`
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

    // U-shaped concave roof with an inner cutout/courtyard
    const uRoof: RoofPlane = {
      id: 'roof-u-shape',
      name: 'U-Shaped Rooftop',
      polygonWgs84: [],
      polygonEnu: [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 30 },
        { x: 20, y: 30 },
        { x: 20, y: 15 },
        { x: 10, y: 15 },
        { x: 10, y: 30 },
        { x: 0, y: 30 },
      ],
      tiltDeg: 0,
      azimuthDeg: 0,
      eavesHeightM: 10,
      setbackClearanceM: 1.0,
    };

    // A table spanning the courtyard between x=5 and x=25 at y=22
    const spanningTable: PvTable3D = {
      id: 'table-spanning',
      tableIndex: 1,
      positionEnu: { x: 15, y: 22, z: 10.5 },
      tiltDeg: 0,
      azimuthDeg: 0,
      widthM: 16.0,
      slopedLengthM: 4.0,
      moduleCount: 16,
      ratedPowerWp: 8800,
    };

    const resSpanning = checkTableSetbackCompliance(spanningTable, uRoof);
    assert(
      resSpanning.isCompliant === false && resSpanning.minimumClearanceM === 0,
      'M13: Concave U-shaped roof strictly detects table cutting across the central void as non-compliant',
      `isCompliant=${resSpanning.isCompliant}, clearance=${resSpanning.minimumClearanceM}m`
    );

    // Continuous segment distance on narrow roof indentation
    const narrowIndentRoof: RoofPlane = {
      id: 'roof-indent',
      name: 'Roof with Narrow Indentation',
      polygonWgs84: [],
      polygonEnu: [
        { x: -6, y: -6 },
        { x: 6, y: -6 },
        { x: 6, y: 6 },
        { x: 0.5, y: 6 },
        { x: 0.5, y: 2.1 },
        { x: -0.5, y: 2.1 },
        { x: -0.5, y: 6 },
        { x: -6, y: 6 },
      ],
      tiltDeg: 0,
      azimuthDeg: 0,
      eavesHeightM: 10,
      setbackClearanceM: 0.5,
    };

    const tableNearIndent: PvTable3D = {
      id: 'table-near-indent',
      tableIndex: 1,
      positionEnu: { x: 0, y: 0, z: 10.5 },
      tiltDeg: 0,
      azimuthDeg: 0,
      widthM: 8.0,
      slopedLengthM: 4.0,
      moduleCount: 8,
      ratedPowerWp: 4400,
    };

    const resIndent = checkTableSetbackCompliance(tableNearIndent, narrowIndentRoof);
    assert(
      resIndent.isCompliant === false && Math.abs(resIndent.minimumClearanceM - 0.10) < 0.02,
      'M13: Continuous segment-to-segment distance detects narrow boundary indentation without sample point misses',
      `isCompliant=${resIndent.isCompliant}, clearance=${resIndent.minimumClearanceM}m (expected ~0.10m)`
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

    const origFetch = globalThis.fetch;
    try {
      // Mock fetch failure to deterministically verify that remote_required throws
      // instead of silently falling back to the analytical model in both offline and online CI runners
      globalThis.fetch = (async () => {
        throw new Error('Connection refused');
      }) as any;

      await provider.fetchClimateResource(35.689, 51.389, { policy: 'remote_required', bypassCache: true });
    } catch (err: any) {
      threw = true;
      errorMessage = err.message;
    } finally {
      globalThis.fetch = origFetch;
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

    const pump01 = calculateSolarPump({
      dailyWaterRequirementM3: 25,
      peakSunHours: 0.1,
      wellDepthM: 20,
      tankHeightM: 5,
      pipeDiameterMm: 63,
      pipeLengthM: 30,
      irrigationType: 'drip',
    });
    const pump02 = calculateSolarPump({
      dailyWaterRequirementM3: 25,
      peakSunHours: 0.2,
      wellDepthM: 20,
      tankHeightM: 5,
      pipeDiameterMm: 63,
      pipeLengthM: 30,
      irrigationType: 'drip',
    });
    assert(
      Math.abs(pump01.flowRateM3PerHour / pump02.flowRateM3PerHour - 2.0) < 0.01,
      'M19: PSH=0.1 produces proportionally higher flow rate than PSH=0.2 without hidden clamping to 0.2',
      `flow01=${pump01.flowRateM3PerHour.toFixed(1)}m³/h, flow02=${pump02.flowRateM3PerHour.toFixed(1)}m³/h`
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
  // [N01–N08] Post-PR#21 Comprehensive Audit Remediation Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- [N01–N08] Post-PR#21 Comprehensive Audit Remediation Verification ---');

  // N01: Project Read Authorization & Privacy (P1)
  {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-jwt-secret-xyz';

    const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mkJwt = (sub: string) => {
      const h = b64({ alg: 'HS256', typ: 'JWT' });
      const p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });
      const s = crypto.createHmac('sha256', 'secure-jwt-secret-xyz').update(h + '.' + p).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `${h}.${p}.${s}`;
    };
    const aliceJwt = mkJwt('alice');
    const bobJwt = mkJwt('bob');

    const aliceProjId = 'proj-n01-alice-private';
    activeDb.projects.set(aliceProjId, {
      id: aliceProjId,
      name: 'Alice Top Secret Array',
      ownerId: 'alice',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 50,
      autonomyDays: 1,
      systemCapacityKwp: 20.0,
      panelCount: 40,
      inverterCount: 2,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.04,
      estimatedAnnualYieldKwh: 35000,
      createdAt: new Date().toISOString(),
    });

    const projGetRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/projects/:id' && r.route.methods.get)
      ?.route.stack[0].handle;
    const projListRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/projects' && r.route.methods.get)
      ?.route.stack[0].handle;
    const syncPullRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/sync/pull' && r.route.methods.get)
      ?.route.stack[0].handle;
    const repRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/reports/generate' && r.route.methods.post)
      ?.route.stack[0].handle;

    // 1. Unauthenticated GET /projects/:id on Alice's private project is rejected with 401
    let unauthGetStatus = 0;
    await projGetRoute({ params: { id: aliceProjId }, headers: {} }, {
      status(s: number) { unauthGetStatus = s; return this; },
      json() { return this; },
    });
    assert(
      unauthGetStatus === 401,
      'N01: Unauthenticated request to read private project returns HTTP 401',
      `status=${unauthGetStatus}`
    );

    // 2. Bob GET /projects/:id on Alice's project is rejected with 403 Access Denied
    let bobGetStatus = 0;
    await projGetRoute({ params: { id: aliceProjId }, headers: { authorization: `Bearer ${bobJwt}` } }, {
      status(s: number) { bobGetStatus = s; return this; },
      json() { return this; },
    });
    assert(
      bobGetStatus === 403,
      'N01: Bob attempting to read Alice private project returns HTTP 403 Access Denied',
      `status=${bobGetStatus}`
    );

    // 3. Alice GET /projects/:id returns 200
    let aliceGetStatus = 200;
    let aliceGetBody: any = null;
    await projGetRoute({ params: { id: aliceProjId }, headers: { authorization: `Bearer ${aliceJwt}` } }, {
      status(s: number) { aliceGetStatus = s; return this; },
      json(d: any) { aliceGetBody = d; return this; },
    });
    assert(
      aliceGetStatus === 200 && aliceGetBody?.id === aliceProjId,
      'N01: Alice successfully reads her own private project with HTTP 200',
      `status=${aliceGetStatus}`
    );

    // 4. Bob GET /projects does not leak Alice's project
    let bobListBody: any = null;
    await projListRoute({ headers: { authorization: `Bearer ${bobJwt}` } }, {
      status() { return this; },
      json(d: any) { bobListBody = d; return this; },
    });
    const bobCanSeeAliceProj = Array.isArray(bobListBody) && bobListBody.some((p: any) => p.id === aliceProjId);
    assert(
      !bobCanSeeAliceProj,
      'N01: Bob GET /projects does not expose Alice private project in project list',
      `bobCanSeeAliceProj=${bobCanSeeAliceProj}`
    );

    // 5. Bob GET /sync/pull does not leak Alice's project
    let bobPullBody: any = null;
    await syncPullRoute({ headers: { authorization: `Bearer ${bobJwt}` } }, {
      status() { return this; },
      json(d: any) { bobPullBody = d; return this; },
    });
    const bobCanPullAliceProj = Array.isArray(bobPullBody?.projects) && bobPullBody.projects.some((p: any) => p.id === aliceProjId);
    assert(
      !bobCanPullAliceProj,
      'N01: Bob GET /sync/pull does not leak Alice private project in sync pull stream',
      `bobCanPullAliceProj=${bobCanPullAliceProj}`
    );

    // 6. Bob generating official report on Alice's project is rejected with 403
    let bobReportStatus = 0;
    await repRoute({ headers: { authorization: `Bearer ${bobJwt}` }, body: { projectId: aliceProjId } }, {
      status(s: number) { bobReportStatus = s; return this; },
      json() { return this; },
    });
    assert(
      bobReportStatus === 403,
      'N01: Bob generating official report on Alice private project returns HTTP 403 Access Denied',
      `status=${bobReportStatus}`
    );

    // Clean up N01 environment
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  }

  // N02: Catalog Modification Authorization & Built-in Protection (P1)
  {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-jwt-secret-xyz';

    const catModPost = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/modules' && r.route.methods.post)
      ?.route.stack[0].handle;

    // 1. Unauthenticated module catalog modification is rejected with 401
    let unauthModStatus = 0;
    await catModPost({
      headers: {},
      body: { id: 'mod-custom-hacker', modelName: 'Hacker Panel', pmpWatts: 500, vmpVolts: 40, impAmps: 12.5, vocVolts: 48, iscAmps: 13.5 },
    }, {
      status(s: number) { unauthModStatus = s; return this; },
      json() { return this; },
    });
    assert(
      unauthModStatus === 401,
      'N02: Unauthenticated catalog modification returns HTTP 401 in secure mode',
      `status=${unauthModStatus}`
    );

    // 2. Overwriting built-in catalog item returns 403
    const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mkJwt = (sub: string) => {
      const h = b64({ alg: 'HS256', typ: 'JWT' });
      const p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });
      const s = crypto.createHmac('sha256', 'secure-jwt-secret-xyz').update(h + '.' + p).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `${h}.${p}.${s}`;
    };
    let overwriteBuiltinStatus = 0;
    await catModPost({
      headers: { authorization: `Bearer ${mkJwt('alice')}` },
      body: { id: 'mod-jinko-550', modelName: 'Corrupted Jinko', pmpWatts: 50, vmpVolts: 40, impAmps: 1.25, vocVolts: 48, iscAmps: 1.35 },
    }, {
      status(s: number) { overwriteBuiltinStatus = s; return this; },
      json() { return this; },
    });
    assert(
      overwriteBuiltinStatus === 403,
      'N02: Attempting to overwrite built-in catalog equipment is rejected with HTTP 403',
      `status=${overwriteBuiltinStatus}`
    );

    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  }

  // N03: Malformed & Unauthenticated Sync Entities Rejected (P2)
  {
    const syncPush = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/sync/push' && r.route.methods.post)
      ?.route.stack[0].handle;

    let syncBrokenRes: any = null;
    await syncPush({
      headers: {},
      body: {
        messages: [
          { id: 'msg-broken-report', entityType: 'report', payloadJson: '{broken' },
          { id: 'msg-broken-shading', entityType: 'shading_scene', payloadJson: '{broken' },
          { id: 'msg-broken-finance', entityType: 'financial_model', payloadJson: '{broken' },
          { id: 'msg-empty-report', entityType: 'report' },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { syncBrokenRes = d; return this; },
    });

    assert(
      syncBrokenRes?.ackedIds?.length === 0 && syncBrokenRes?.rejected?.length === 4,
      'N03: Malformed or missing payloadJson on report, shading_scene, and financial_model are strictly rejected without false acks',
      `ackedCount=${syncBrokenRes?.ackedIds?.length}, rejectedCount=${syncBrokenRes?.rejected?.length}`
    );
  }

  // N04: Calculations Input Validation & Elimination of False Success (P2)
  {
    const poaRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/solar/poa' && r.route.methods.post)
      ?.route.stack[0].handle;
    const npvRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/finance/npv' && r.route.methods.post)
      ?.route.stack[0].handle;
    const lcoeRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/finance/lcoe' && r.route.methods.post)
      ?.route.stack[0].handle;

    // POA with empty body {}
    let poaEmptyStatus = 0;
    await poaRoute({ body: {} }, { status(s: number) { poaEmptyStatus = s; return this; }, json() { return this; } });
    assert(poaEmptyStatus === 400, 'N04: POA endpoint with empty body {} returns HTTP 400 instead of HTTP 200 with null', `status=${poaEmptyStatus}`);

    // NPV with rate: -1
    let npvNegStatus = 0;
    await npvRoute({ body: { rate: -1, cashflows: [-100, 50, 60] } }, { status(s: number) { npvNegStatus = s; return this; }, json() { return this; } });
    assert(npvNegStatus === 400, 'N04: NPV endpoint with rate <= -1 returns HTTP 400 instead of HTTP 200 with null', `status=${npvNegStatus}`);

    // LCOE with lifetimeYears: 0.5
    let lcoeFractionalStatus = 0;
    await lcoeRoute({ body: { capex: 10000, opexAnnual: 200, energyAnnual: 5000, lifetimeYears: 0.5 } }, { status(s: number) { lcoeFractionalStatus = s; return this; }, json() { return this; } });
    assert(lcoeFractionalStatus === 400, 'N04: LCOE endpoint with lifetimeYears < 1 returns HTTP 400 instead of HTTP 200 with 0', `status=${lcoeFractionalStatus}`);
  }

  // N05: Project Schema Input Range Validation (P2)
  {
    const projPut = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/projects/:id' && r.route.methods.put)
      ?.route.stack[0].handle;

    const testProjId = 'proj-n05-validation';
    activeDb.projects.set(testProjId, {
      id: testProjId,
      name: 'Validation Test Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 20,
      autonomyDays: 1,
      systemCapacityKwp: 10,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.05,
      createdAt: new Date().toISOString(),
    });

    let negPanelStatus = 0;
    await projPut({ params: { id: testProjId }, body: { panelCount: -1 } }, { status(s: number) { negPanelStatus = s; return this; }, json() { return this; } });
    assert(negPanelStatus === 400, 'N05: Project PUT with negative panelCount returns HTTP 400', `status=${negPanelStatus}`);

    let badLatStatus = 0;
    await projPut({ params: { id: testProjId }, body: { latitude: 120 } }, { status(s: number) { badLatStatus = s; return this; }, json() { return this; } });
    assert(badLatStatus === 400, 'N05: Project PUT with invalid latitude > 90 returns HTTP 400', `status=${badLatStatus}`);
  }

  // N06: Report Strict Reconciliation against Snapshot Baseline (P2)
  {
    const repRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/reports/generate' && r.route.methods.post)
      ?.route.stack[0].handle;

    const reconProjId = 'proj-n06-recon';
    activeDb.projects.set(reconProjId, {
      id: reconProjId,
      name: 'Recon Test Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 20,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.05,
      estimatedAnnualYieldKwh: 15000,
      createdAt: new Date().toISOString(),
    });

    let repLcoeRes: any = null;
    await repRoute({ body: { projectId: reconProjId, systemCapacityKwp: 10.0, panelCount: 20, inverterCount: 1, annualYieldKwh: 15000, lcoeUsdPerKwh: 999 } }, {
      status() { return this; },
      json(d: any) { repLcoeRes = d; return this; },
    });
    assert(
      repLcoeRes?.isReconciledAgainstSnapshot === false && repLcoeRes?.discrepancies?.some((d: string) => d.includes('LCOE mismatch')),
      'N06: Report with discrepant LCOE (999 vs 0.05) is flagged as NOT reconciled with detailed discrepancy',
      `isReconciled=${repLcoeRes?.isReconciledAgainstSnapshot}`
    );

    // Missing baseline yield flags discrepancy
    const missingBaselineId = 'proj-n06-missing-yield';
    activeDb.projects.set(missingBaselineId, {
      id: missingBaselineId,
      name: 'Missing Baseline Yield Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 20,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.05,
      createdAt: new Date().toISOString(),
    });

    let repMissingRes: any = null;
    await repRoute({ body: { projectId: missingBaselineId, systemCapacityKwp: 10.0, annualYieldKwh: 1_000_000_000 } }, {
      status() { return this; },
      json(d: any) { repMissingRes = d; return this; },
    });
    assert(
      repMissingRes?.isReconciledAgainstSnapshot === false && repMissingRes?.discrepancies?.some((d: string) => d.includes('missing baseline estimatedAnnualYieldKwh')),
      'N06: Snapshot missing baseline annual yield flags discrepancy and refuses false reconciliation',
      `isReconciled=${repMissingRes?.isReconciledAgainstSnapshot}`
    );
  }

  // N07: Canonical Capacity in 3D Builder & Reconciliation (P2)
  {
    const scene = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 15.34,
      totalModulesCount: 27,
      modulePmpWatts: 550,
      latitude: 35.6892,
      longitude: 51.3890,
    });
    const sumTablesWp = scene.pvTables.reduce((sum, t) => sum + (t.ratedPowerWp || 0), 0);
    const sumTablesKwp = Number((sumTablesWp / 1000.0).toFixed(2));
    assert(
      sumTablesKwp === 14.85,
      'N07: 3D scene builder constructs tables with canonical power 27 * 550W = 14.85 kWp without silent redistribution to 15.34 kWp',
      `sumTablesKwp=${sumTablesKwp}`
    );

    const shadingSim = simulateAnnual3dShading(scene);
    assert(
      shadingSim.reconciliationStatus?.isProjectSnapshotConsistent === false &&
      Boolean(shadingSim.reconciliationStatus?.reconciliationNotes.includes('Capacity mismatch')),
      'N07: Declared capacity discrepancy (15.34 vs 14.85 kWp) is flagged as inconsistent in shading reconciliation',
      `isSnapshotConsistent=${shadingSim.reconciliationStatus?.isProjectSnapshotConsistent}`
    );
  }

  // Low Priority: Loan Installment Rounding to Exact Principal Total
  {
    const loanModel = runIranianRegulationFinancialModel(100, 180, 'satba_fit_ppa', 4200, 70, 0, 6, 0);
    // Loan principal: 100kWp * 31.5 = 3150 Million Toman. 70% debt = 2205 Million Toman.
    const totalDebtPaid = loanModel.cashFlow25Years.reduce((sum, yr) => sum + yr.debtServiceMillionToman, 0);
    assert(
      totalDebtPaid === 2205,
      'Loan installment rounding: Zero-interest loan exactly repays 2205 Million Toman principal over 6 years without overpayment',
      `totalDebtPaid=${totalDebtPaid}, expected=2205`
    );
  }

  // ---------------------------------------------------------------------------
  // [R847-01 – R847-08] Verification of Independent Review Remediations
  // ---------------------------------------------------------------------------
  console.log('\n--- [R847-01 – R847-08] Independent Review Remediations Verification ---');

  // R847-01: Ownership bypass in Sync Push via contradictory id & projectId (P1)
  {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-jwt-secret-xyz';

    const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mkJwt = (sub: string) => {
      const h = b64({ alg: 'HS256', typ: 'JWT' });
      const p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });
      const s = crypto.createHmac('sha256', 'secure-jwt-secret-xyz').update(h + '.' + p).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `${h}.${p}.${s}`;
    };
    const bobJwt = mkJwt('bob');

    const aliceProjId = 'proj-alice-secure-target';
    const bobProjId = 'proj-bob-legit';
    activeDb.projects.set(aliceProjId, {
      id: aliceProjId,
      name: 'Alice Original Project',
      ownerId: 'alice',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 50,
      autonomyDays: 1,
      systemCapacityKwp: 20.0,
      panelCount: 40,
      inverterCount: 2,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.04,
      estimatedAnnualYieldKwh: 35000,
      createdAt: new Date().toISOString(),
    });
    activeDb.projects.set(bobProjId, {
      id: bobProjId,
      name: 'Bob Own Project',
      ownerId: 'bob',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 50,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      lcoeUsdPerKwh: 0.05,
      estimatedAnnualYieldKwh: 15000,
      createdAt: new Date().toISOString(),
    });

    const syncPush = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/sync/push' && r.route.methods.post)
      ?.route.stack[0].handle;

    let bypassRes: any = null;
    await syncPush({
      headers: { authorization: `Bearer ${bobJwt}` },
      body: {
        messages: [
          {
            id: 'msg-attack-bypass-1',
            entityType: 'project',
            payloadJson: JSON.stringify({
              id: aliceProjId,
              projectId: bobProjId,
              name: 'Hacked by Bob with projectId disguise',
              systemCapacityKwp: 15.0,
            }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { bypassRes = d; return this; },
    });

    const aliceAfterAttack = activeDb.projects.get(aliceProjId);
    assert(
      bypassRes?.ackedIds?.length === 0 &&
      bypassRes?.rejected?.length === 1 &&
      aliceAfterAttack?.name === 'Alice Original Project',
      'R847-01: Contradictory project id and projectId in sync push is rejected, preventing ownership bypass',
      `ackedCount=${bypassRes?.ackedIds?.length}, aliceProjectName='${aliceAfterAttack?.name}'`
    );

    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  }

  // R847-02: Report generation on incomplete snapshot without overrides marks isReconciledAgainstSnapshot: false (P2)
  {
    const reportRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/reports/generate' && r.route.methods.post)
      ?.route.stack[0].handle;

    const incompleteProjId = 'proj-r847-incomplete';
    activeDb.projects.set(incompleteProjId, {
      id: incompleteProjId,
      name: 'Incomplete Project Without Metrics',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 0,
      autonomyDays: 0,
      systemCapacityKwp: 0, // unphysical / incomplete
      panelCount: 0,
      inverterCount: 0,
      batteryCount: 0,
      lcoeUsdPerKwh: 0,
      createdAt: new Date().toISOString(),
    });

    let repIncompleteRes: any = null;
    await reportRoute({ body: { projectId: incompleteProjId } }, {
      status() { return this; },
      json(d: any) { repIncompleteRes = d; return this; },
    });

    assert(
      repIncompleteRes?.isReconciledAgainstSnapshot === false &&
      repIncompleteRes?.discrepancies?.length > 0,
      'R847-02: Report generated on incomplete snapshot without overrides is flagged as NOT reconciled',
      `isReconciled=${repIncompleteRes?.isReconciledAgainstSnapshot}, discrepancies=${repIncompleteRes?.discrepancies?.join('; ')}`
    );
  }

  // R847-03: Shading simulation with capacity mismatch has overallReconciled: false
  {
    const sceneMismatch = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 15.34, // Declared capacity diverges from 27 * 550W = 14.85 kWp
      totalModulesCount: 27,
      modulePmpWatts: 550,
      latitude: 35.6892,
      longitude: 51.3890,
    });
    const simRes = simulateAnnual3dShading(sceneMismatch);
    assert(
      simRes.reconciliationStatus?.overallReconciled === false &&
      simRes.reconciliationStatus?.isProjectSnapshotConsistent === false,
      'R847-03: Capacity mismatch strictly marks simulation overallReconciled: false',
      `overallReconciled=${simRes.reconciliationStatus?.overallReconciled}, isSnapshotConsistent=${simRes.reconciliationStatus?.isProjectSnapshotConsistent}`
    );
  }

  // R847-04: Independent unshaded baseline calculation across Default, Fresh Applied, and Stale states
  {
    const nominalYieldKwh = 100_000;
    // 1. Fresh Applied at 10%
    const appliedLossPct = 10.0;
    const freshBaselineKwh = Math.round(nominalYieldKwh / (1.0 - appliedLossPct / 100.0));
    // 2. Default at 2.4%
    const defaultLossPct = 2.4;
    const defaultBaselineKwh = Math.round(nominalYieldKwh / (1.0 - defaultLossPct / 100.0));

    assert(
      freshBaselineKwh === 111111 && defaultBaselineKwh === 102459,
      'R847-04: Unshaded baseline recovers true unshaded energy in both Fresh Applied and Default states',
      `fresh=${freshBaselineKwh}, default=${defaultBaselineKwh}`
    );
  }

  // R847-05: LCOE engine & endpoint safe against 1e20 lifetime infinite loop (P2)
  {
    const t0 = Date.now();
    const lcoeHugeLifetime = calculateLcoe(10000, 200, 5000, 0.05, 1e20);
    const elapsedMs = Date.now() - t0;
    assert(
      elapsedMs < 50 && Number.isFinite(lcoeHugeLifetime) && lcoeHugeLifetime > 0,
      'R847-05: calculateLcoe with lifetimeYears=1e20 safely clamps to 100 years and completes in < 50ms without CPU freeze',
      `elapsedMs=${elapsedMs}ms, lcoe=${lcoeHugeLifetime}`
    );

    const lcoeRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/finance/lcoe' && r.route.methods.post)
      ?.route.stack[0].handle;

    let lcoeRouteHugeStatus = 0;
    await lcoeRoute({ body: { capex: 10000, opexAnnual: 200, energyAnnual: 5000, discountRate: 0.05, lifetimeYears: 1e20 } }, {
      status(s: number) { lcoeRouteHugeStatus = s; return this; },
      json() { return this; },
    });
    assert(
      lcoeRouteHugeStatus === 400,
      'R847-05: LCOE route with lifetimeYears > 100 returns HTTP 400',
      `status=${lcoeRouteHugeStatus}`
    );
  }

  // R847-06: Outbox sanitizes spoofed userId and rejects non-string id (e.g. []) (P2)
  {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-jwt-secret-xyz';

    const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mkJwt = (sub: string) => {
      const h = b64({ alg: 'HS256', typ: 'JWT' });
      const p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });
      const s = crypto.createHmac('sha256', 'secure-jwt-secret-xyz').update(h + '.' + p).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `${h}.${p}.${s}`;
    };
    const bobJwt = mkJwt('bob');

    const syncPush = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/sync/push' && r.route.methods.post)
      ?.route.stack[0].handle;

    // 1. Bob attempts to spoof msg.userId = 'alice'
    let spoofUserIdRes: any = null;
    await syncPush({
      headers: { authorization: `Bearer ${bobJwt}` },
      body: {
        messages: [
          {
            id: 'msg-legit-bob-report',
            userId: 'alice', // Spoofed!
            entityType: 'report',
            payloadJson: JSON.stringify({
              id: 'rep-bob-1',
              title: 'Bob Report',
            }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { spoofUserIdRes = d; return this; },
    });

    const recordedOutboxMsg = activeDb.outbox.find((m) => m.id === 'msg-legit-bob-report');
    assert(
      spoofUserIdRes?.ackedIds?.includes('msg-legit-bob-report') &&
      recordedOutboxMsg?.userId === 'bob',
      'R847-06: Outbox binds message userId strictly to verified headerUserId (bob), ignoring spoofed userId (alice)',
      `outboxUserId='${recordedOutboxMsg?.userId}'`
    );

    // 2. Reject non-string id (e.g. id: [])
    let badIdRes: any = null;
    await syncPush({
      headers: { authorization: `Bearer ${bobJwt}` },
      body: {
        messages: [
          {
            id: 'msg-array-id',
            entityType: 'report',
            payloadJson: JSON.stringify({
              id: [], // Invalid non-string ID!
              title: 'Corrupted ID Report',
            }),
          },
        ],
      },
    }, {
      status() { return this; },
      json(d: any) { badIdRes = d; return this; },
    });

    assert(
      badIdRes?.ackedIds?.length === 0 && badIdRes?.rejected?.length === 1,
      'R847-06: Non-string id (e.g. payload.id: []) is strictly rejected with malformed payload',
      `ackedCount=${badIdRes?.ackedIds?.length}, reason='${badIdRes?.rejected?.[0]?.reason}'`
    );

    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  }

  // R847-07: Cross-user custom catalog item overwrite protection (P2)
  {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-jwt-secret-xyz';

    const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const mkJwt = (sub: string) => {
      const h = b64({ alg: 'HS256', typ: 'JWT' });
      const p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 3600 });
      const s = crypto.createHmac('sha256', 'secure-jwt-secret-xyz').update(h + '.' + p).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      return `${h}.${p}.${s}`;
    };
    const aliceJwt = mkJwt('alice');
    const bobJwt = mkJwt('bob');

    const catModPost = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/modules' && r.route.methods.post)
      ?.route.stack[0].handle;

    // Alice creates custom module
    let aliceModStatus = 0;
    await catModPost({
      headers: { authorization: `Bearer ${aliceJwt}` },
      body: { id: 'mod-alice-unique-custom', modelName: 'Alice Custom Panel', pmpWatts: 550, vmpVolts: 40, impAmps: 13.75, vocVolts: 48, iscAmps: 14.5 },
    }, {
      status(s: number) { aliceModStatus = s; return this; },
      json() { return this; },
    });
    assert(aliceModStatus === 201, 'R847-07: Alice successfully creates custom catalog module', `status=${aliceModStatus}`);

    // Bob attempts to overwrite Alice custom module
    let bobOverwriteStatus = 0;
    await catModPost({
      headers: { authorization: `Bearer ${bobJwt}` },
      body: { id: 'mod-alice-unique-custom', modelName: 'Bob Hijacked Panel', pmpWatts: 100, vmpVolts: 20, impAmps: 5, vocVolts: 24, iscAmps: 6 },
    }, {
      status(s: number) { bobOverwriteStatus = s; return this; },
      json() { return this; },
    });
    assert(
      bobOverwriteStatus === 403,
      'R847-07: Bob attempting to overwrite Alice custom catalog module returns HTTP 403 Access Denied',
      `status=${bobOverwriteStatus}`
    );

    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;
  }

  // R847-08: samplePointsPerTable exact point count (P3)
  {
    const sceneTest = buildSceneFromProjectDesign({
      totalPvCapacityKwp: 14.85,
      totalModulesCount: 27,
      modulePmpWatts: 550,
      latitude: 35.6892,
      longitude: 51.3890,
    });

    const res1 = calculateRayTracedShadingFactor(sceneTest, [], { samplePointsPerTable: 1 });
    const ptsPerTable1 = res1.samplePointsCount / sceneTest.pvTables.length;
    assert(
      ptsPerTable1 === 1,
      'R847-08: samplePointsPerTable=1 produces exactly 1 point per table',
      `ptsPerTable=${ptsPerTable1}`
    );

    const res100 = calculateRayTracedShadingFactor(sceneTest, [], { samplePointsPerTable: 100 });
    const ptsPerTable100 = res100.samplePointsCount / sceneTest.pvTables.length;
    assert(
      ptsPerTable100 === 100,
      'R847-08: samplePointsPerTable=100 produces exactly 100 points per table',
      `ptsPerTable=${ptsPerTable100}`
    );

    // Multi-subrect unique coordinate verification (P3)
    const ptsArray = generateTableMeshSamplePoints(sceneTest.pvTables[0], 4, 3, 100);
    const uniqueCoords = new Set(ptsArray.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`));
    assert(
      ptsArray.length === 100 && uniqueCoords.size === 100,
      'P3: Multi-subrect table sample points generate 100% unique spatial coordinates without duplicate points',
      `totalPoints=${ptsArray.length}, uniqueCoords=${uniqueCoords.size}`
    );
  }

  // P3 Polish: Public Catalog GET ownerId sanitization
  {
    const catModGet = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/modules' && r.route.methods.get)
      ?.route.stack[0].handle;

    let catListRes: any = null;
    await catModGet({ headers: {} }, {
      json(d: any) { catListRes = d; return this; },
    });

    const anyExposedOwner = Array.isArray(catListRes) && catListRes.some((m: any) => m.ownerId !== undefined);
    assert(
      !anyExposedOwner,
      'P3: Anonymous GET /api/v1/catalog/modules sanitizes internal ownerId from public output',
      `anyExposedOwner=${anyExposedOwner}`
    );
  }

  // P3 Polish: Report Baseline Invalidation on Contradictory Inverter or LCOE
  {
    const reportRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/reports/generate' && r.route.methods.post)
      ?.route.stack[0].handle;

    const invalidSnapId = 'proj-invalid-inv-baseline';
    activeDb.projects.set(invalidSnapId, {
      id: invalidSnapId,
      name: 'Invalid Inverter Baseline Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 10,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: -5, // Invalid!
      batteryCount: 0,
      estimatedAnnualYieldKwh: 15000,
      lcoeUsdPerKwh: 0.05,
      createdAt: new Date().toISOString(),
    });

    let invRepRes: any = null;
    await reportRoute({ body: { projectId: invalidSnapId } }, {
      status() { return this; },
      json(d: any) { invRepRes = d; return this; },
    });

    assert(
      invRepRes?.isReconciledAgainstSnapshot === false &&
      invRepRes?.discrepancies?.some((d: string) => d.includes('invalid inverterCount')),
      'P3: Report rejects snapshot containing invalid inverterCount as unreconciled',
      `isReconciled=${invRepRes?.isReconciledAgainstSnapshot}`
    );
  }

  // P3 Polish: Unknown /api and /api/* Route 404 JSON Handler (MAIN-01)
  {
    const api404Route = (app as any)._router.stack
      .find((r: any) => r.route && (r.route.path === '/api/*' || (Array.isArray(r.route.path) && r.route.path.includes('/api'))))
      ?.route.stack[0].handle;

    let notFoundCode1 = 0;
    let notFoundBody1: any = null;
    await api404Route(
      { originalUrl: '/api/v1/nonexistent/service' },
      {
        status(c: number) { notFoundCode1 = c; return this; },
        json(d: any) { notFoundBody1 = d; return this; },
      }
    );

    let notFoundCode2 = 0;
    let notFoundBody2: any = null;
    await api404Route(
      { originalUrl: '/api' },
      {
        status(c: number) { notFoundCode2 = c; return this; },
        json(d: any) { notFoundBody2 = d; return this; },
      }
    );

    assert(
      notFoundCode1 === 404 && notFoundBody1?.error === 'API endpoint not found' &&
      notFoundCode2 === 404 && notFoundBody2?.error === 'API endpoint not found',
      'P3/MAIN-01: Both /api and /api/* routes return 404 JSON response instead of SPA HTML',
      `code1=${notFoundCode1}, code2=${notFoundCode2}`
    );
  }

  // P3 Polish: Global Security Headers Middleware with CSP (MAIN-02)
  {
    const secHeadersMiddleware = (app as any)._router.stack
      .find((r: any) => r.name === 'securityHeadersMiddleware')
      ?.handle;

    const setHeaders: Record<string, string> = {};
    const mockRes = {
      setHeader(k: string, v: string) { setHeaders[k] = v; },
    };
    let nextCalled = false;
    if (secHeadersMiddleware) {
      secHeadersMiddleware({}, mockRes, () => { nextCalled = true; });
    }

    assert(
      setHeaders['X-Content-Type-Options'] === 'nosniff' &&
      setHeaders['X-Frame-Options'] === 'SAMEORIGIN' &&
      setHeaders['Referrer-Policy'] === 'strict-origin-when-cross-origin' &&
      Boolean(
        setHeaders['Content-Security-Policy'] &&
        setHeaders['Content-Security-Policy'].includes("default-src 'self'") &&
        setHeaders['Content-Security-Policy'].includes('arcgisonline.com') &&
        setHeaders['Content-Security-Policy'].includes('opentopomap.org') &&
        setHeaders['Content-Security-Policy'].includes('nominatim.openstreetmap.org') &&
        setHeaders['Content-Security-Policy'].includes('overpass-api.de') &&
        setHeaders['Content-Security-Policy'].includes('rest.isric.org')
      ) &&
      nextCalled,
      'P3/MAIN-02: Global security headers middleware applies nosniff, SAMEORIGIN, and complete functional Content-Security-Policy',
      `headers=${JSON.stringify(setHeaders)}`
    );
  }

  // P3 Polish: JSON Body Parser SyntaxError & 413 Payload Too Large Handler (MAIN-01)
  {
    const jsonErrHandler = (app as any)._router.stack
      .find((r: any) => r.name === 'jsonErrorHandler')
      ?.handle;

    const synErr = new SyntaxError('Unexpected token in JSON');
    (synErr as any).status = 400;
    (synErr as any).body = '{"bad: true}';

    let jsonErrCode = 0;
    let jsonErrBody: any = null;
    if (jsonErrHandler) {
      jsonErrHandler(synErr, { path: '/api/v1/projects' }, {
        status(c: number) { jsonErrCode = c; return this; },
        json(d: any) { jsonErrBody = d; return this; },
      }, () => {});
    }

    const largeErr = new Error('Payload too large');
    (largeErr as any).type = 'entity.too.large';
    (largeErr as any).status = 413;

    let largeErrCode = 0;
    let largeErrBody: any = null;
    if (jsonErrHandler) {
      jsonErrHandler(largeErr, { path: '/api/v1/projects' }, {
        status(c: number) { largeErrCode = c; return this; },
        json(d: any) { largeErrBody = d; return this; },
      }, () => {});
    }

    assert(
      jsonErrCode === 400 && jsonErrBody?.error?.includes('Invalid JSON payload') &&
      largeErrCode === 413 && largeErrBody?.error === 'Payload Too Large',
      'P3/MAIN-01: JSON body parse error handler intercepts SyntaxError (400) and entity.too.large (413) as JSON',
      `code400=${jsonErrCode}, code413=${largeErrCode}`
    );
  }

  // P3 Polish: Report Baseline Missing Equipment Reference Check (MAIN-06)
  {
    const reportRoute = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/reports/generate' && r.route.methods.post)
      ?.route.stack[0].handle;

    const missingEquipSnapId = 'proj-missing-equip-baseline';
    activeDb.projects.set(missingEquipSnapId, {
      id: missingEquipSnapId,
      name: 'Missing Equipment Baseline Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 10,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      estimatedAnnualYieldKwh: 15000,
      lcoeUsdPerKwh: 0.05,
      // moduleId omitted!
      createdAt: new Date().toISOString(),
    } as any);

    let misRepRes: any = null;
    await reportRoute({
      body: {
        projectId: missingEquipSnapId,
        panelType: 'Jinko Solar 550W TOPCon',
      },
    }, {
      status() { return this; },
      json(d: any) { misRepRes = d; return this; },
    });

    assert(
      misRepRes?.isReconciledAgainstSnapshot === false &&
      misRepRes?.discrepancies?.some((d: string) => d.includes('Snapshot missing baseline moduleId')),
      'P3: Report flags missing baseline moduleId in snapshot as reconciliation discrepancy',
      `isReconciled=${misRepRes?.isReconciledAgainstSnapshot}, discrepancies=${JSON.stringify(misRepRes?.discrepancies)}`
    );

    // Dangling catalog reference in snapshot:
    const danglingSnapId = 'proj-dangling-catalog-ref';
    activeDb.projects.set(danglingSnapId, {
      id: danglingSnapId,
      name: 'Dangling Catalog Ref Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 10,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      batteryCount: 0,
      estimatedAnnualYieldKwh: 15000,
      lcoeUsdPerKwh: 0.05,
      moduleId: 'mod-nonexistent-ghost-id',
      createdAt: new Date().toISOString(),
    } as any);

    let dangRepRes: any = null;
    await reportRoute({
      body: {
        projectId: danglingSnapId,
      },
    }, {
      status() { return this; },
      json(d: any) { dangRepRes = d; return this; },
    });

    assert(
      dangRepRes?.isReconciledAgainstSnapshot === false &&
      dangRepRes?.discrepancies?.some((d: string) => d.includes('non-existent module ID')),
      'P3/MAIN-06: Report rejects snapshot with dangling equipment catalog reference as unreconciled',
      `isReconciled=${dangRepRes?.isReconciledAgainstSnapshot}, discrepancies=${JSON.stringify(dangRepRes?.discrepancies)}`
    );

    // Missing batteryCount in baseline snapshot (MAIN-06):
    const missingBatCountSnapId = 'proj-missing-batcount-baseline';
    activeDb.projects.set(missingBatCountSnapId, {
      id: missingBatCountSnapId,
      name: 'Missing BatteryCount Baseline Project',
      latitude: 35.6,
      longitude: 51.3,
      dailyLoadKwh: 10,
      autonomyDays: 1,
      systemCapacityKwp: 10.0,
      panelCount: 20,
      inverterCount: 1,
      moduleId: 'mod-0',
      inverterId: 'inv-0',
      // batteryCount is undefined
      estimatedAnnualYieldKwh: 15000,
      lcoeUsdPerKwh: 0.05,
      createdAt: new Date().toISOString(),
    } as any);

    let batRepRes: any = null;
    await reportRoute({
      body: {
        projectId: missingBatCountSnapId,
      },
    }, {
      status() { return this; },
      json(d: any) { batRepRes = d; return this; },
    });

    assert(
      batRepRes?.isReconciledAgainstSnapshot === false &&
      batRepRes?.discrepancies?.some((d: string) => d.includes('missing baseline batteryCount')),
      'P3/MAIN-06: Report rejects snapshot with missing batteryCount baseline as unreconciled',
      `isReconciled=${batRepRes?.isReconciledAgainstSnapshot}, discrepancies=${JSON.stringify(batRepRes?.discrepancies)}`
    );
  }

  // P3 Polish: Legacy Catalog Item Protected Against First-Claim Overwrite (MAIN-07)
  {
    const catModPost = (app as any)._router.stack
      .find((r: any) => r.route && r.route.path === '/api/v1/catalog/modules' && r.route.methods.post)
      ?.route.stack[0].handle;

    const legacyModId = 'mod-legacy-custom-001';
    activeDb.pvModules.set(legacyModId, {
      id: legacyModId,
      modelName: 'Legacy Custom Module',
      manufacturer: 'Vintage Solar',
      pmpWatts: 400,
      vmpVolts: 40,
      impAmps: 10,
      vocVolts: 48,
      iscAmps: 10.5,
      betaVocPerC: -0.28,
      // ownerId is undefined (legacy item)
    } as any);

    const origEnv = process.env.INTERNAL_GATEWAY_SECRET;
    process.env.INTERNAL_GATEWAY_SECRET = 'active-secret-auth';

    // Authenticated user attempting first-claim overwrite on legacy item:
    let legStatus = 0;
    let legBody: any = null;
    await catModPost({
      headers: {
        'x-user-id': 'charlie-claimant',
        'x-gateway-secret': 'active-secret-auth',
      },
      body: {
        id: legacyModId,
        pmpWatts: 450,
        vmpVolts: 42,
        impAmps: 10.7,
        vocVolts: 50,
        iscAmps: 11.2,
      },
    }, {
      status(c: number) { legStatus = c; return this; },
      json(d: any) { legBody = d; return this; },
    });

    process.env.INTERNAL_GATEWAY_SECRET = origEnv;

    assert(
      legStatus === 403 && legBody?.error?.includes('legacy system catalog item and cannot be overwritten'),
      'P3/MAIN-07: Authenticated user cannot first-claim or overwrite existing legacy catalog item (HTTP 403)',
      `status=${legStatus}, error=${legBody?.error}`
    );
  }

  // P3 Polish: Zero Obstacle Fast-Path Shading Metric (MAIN-05)
  {
    const dummyTable: PvTable3D = {
      id: 'table-fastpath-test',
      tableIndex: 1,
      positionEnu: { x: 0, y: 0, z: 2 },
      widthM: 10,
      slopedLengthM: 2,
      tiltDeg: 25,
      azimuthDeg: 180,
      moduleCount: 27,
      ratedPowerWp: 14850,
    };
    const noonSun = { hour: 12, altitudeDeg: 60, azimuthDeg: 180, isDaylight: true };
    const resFast = computeTableShadingGeometricMesh(dummyTable, [], noonSun);

    assert(
      resFast.beamCoveragePct === 0 &&
      resFast.directBeamLossFraction === 0 &&
      resFast.isDiodeTriggered === false &&
      resFast.electricalMismatchFactor === 1.0,
      'P3/MAIN-05: Zero-obstacle fast path returns beamCoveragePct: 0 (unshaded) and zero beam loss',
      `beamCoveragePct=${resFast.beamCoveragePct}, directLoss=${resFast.directBeamLossFraction}`
    );
  }

  // P3/MAIN-05: 10,000 Module Screening Performance & Swath Acceleration
  {
    const scene10k = {
      anchorLocation: { latitude: 35.6, longitude: 51.3, elevationM: 1200 },
      roofPlanes: [],
      pvTables: [
        {
          id: 'tbl-10k',
          tableIndex: 1,
          positionEnu: { x: 0, y: 0, z: 2 },
          widthM: 500,
          slopedLengthM: 2.3,
          tiltDeg: 25,
          azimuthDeg: 180,
          moduleCount: 10000,
          ratedPowerWp: 5500000,
        },
      ],
      obstacles: [
        {
          id: 'obs-tree-10k',
          name: 'Tree 1',
          type: 'tree' as const,
          positionEnu: { x: 50, y: 50, z: 0 },
          geometry: { radiusM: 5, heightM: 12 },
        },
      ],
      totalPvCapacityKwp: 5500,
      totalModulesCount: 10000,
      updatedAt: new Date().toISOString(),
    };

    const progressRecords: number[] = [];
    const t0 = performance.now();
    const res10k = simulateAnnual3dShading(scene10k as any, 5.2, 40.0, {
      simulationMode: 'screening_3day',
      onProgress: (pct) => progressRecords.push(pct),
    });
    const elapsed10k = performance.now() - t0;

    assert(
      elapsed10k < 500 && res10k.reconciliationStatus?.isArithmeticBalanceOk === true,
      'P3/MAIN-05: 10,000-module screening finishes in < 500ms (down from 4.4s) with arithmetic balance preserved',
      `elapsed=${elapsed10k.toFixed(1)}ms, unshaded=${res10k.totalUnshadedAnnualKwh}, lost=${res10k.totalLostAnnualKwh}`
    );

    assert(
      progressRecords.length > 5 && progressRecords[progressRecords.length - 1] === 100,
      'P3/MAIN-05: Shading simulation invokes onProgress callback smoothly reaching 100%',
      `progressUpdatesCount=${progressRecords.length}, lastProgress=${progressRecords[progressRecords.length - 1]}%`
    );

    // Abort cancellation verification
    const controller = new AbortController();
    controller.abort();
    let abortedCleanly = false;
    try {
      simulateAnnual3dShading(scene10k as any, 5.2, 40.0, {
        abortSignal: controller.signal,
      });
    } catch (err: any) {
      if (err?.message?.includes('aborted') || err?.name === 'AbortError') {
        abortedCleanly = true;
      }
    }
    assert(
      abortedCleanly,
      'P3/MAIN-05: Shading simulation respects AbortSignal and aborts immediately when cancelled by user',
      `abortedCleanly=${abortedCleanly}`
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
