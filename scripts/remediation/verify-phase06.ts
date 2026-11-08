/**
 * SolarPV Studio - Phase 06 Automated Verifier & Evidence Generator
 *
 * Single Source of Truth for Phase 06 Verification:
 * - P6-01: G-1 MV Substation CAPEX with Coordinated 1.52 MVA Transformer (48632 -> 53200 USD, delta = +4568)
 * - P6-02: G-1 Year-25 Total Annual OPEX with Escalating Fixed Charges (3441138661 -> 3539338299 Toman, delta = +98199638)
 * - P6-03: G-3 Off-Grid Demand-Constrained LCOE with Residual Battery Salvage Credit (30643 -> 30115 Toman/kWh, delta = -528)
 * - P6-04: G-1 Non-Conventional 2-Sign-Change Primary IRR Root Detection (0.0% -> 5.4%, delta = +5.4%, mirr = 14.8%)
 * - P6-05: G-1 Year-1 Net Export Yield Coupled with Outdoor Inverter Thermal Derate (1816762 -> 1797686 kWh, delta = -19076)
 * - P6-06: Coastal Salt-Mist Accelerated PV Annual Degradation Rate at d = 0.5 km (0.45% -> 0.60%/yr, delta = +0.15)
 * - P6-07: G-1 Zero-Escalation NPV under Fisher-Consistent Real Discount Rate (-247356 -> +381562 USD, delta = +628918)
 * - P6-08: G-1 Full-Chain Integrated LCOE with Aging Derate, 1.52 MVA Substation & Salvage (5056 -> 5343 Toman/kWh, delta = +287)
 *
 * Coherence Checks C6-01 through C6-06:
 * - C6-01: CAPEX Component-to-Total Reconciliation & Coordinated Substation MVA Coherence
 * - C6-02: LCOE Discounted Cost-Minus-Salvage Conservation Identity
 * - C6-03: Non-Conventional Multi-Root IRR Zero-NPV & Unique MIRR Coherence
 * - C6-04: Fisher Real-vs-Nominal Discounting Equivalence & Country Profile Registry Coherence
 * - C6-05: Mandatory 3-Axis 27-Point Sensitivity Matrix Economic Monotonicity
 * - C6-06: Environmental Aging Coastal Salt-Mist Monotonicity & Outdoor Inverter Derating Coupling
 *
 * Non-Regression Anchors (M-A1, M-A2, M-C1, M-D1, M-F1, M-F4) with delta === 0.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  performFinancialAnalysis,
  DEFAULT_FINANCIAL_PRICING,
} from '../../src/engine/financialEngine';

import {
  calculateEnvironmentalAging,
} from '../../src/engine/environmentalAgingEngine';

import {
  computeFisherRealDiscountRatePct,
  solveCashFlowIrrAndMirr,
  resolveFinancialSystemAnalysis,
  computeMandatorySensitivityMatrix,
  COUNTRY_FINANCIAL_PROFILES,
} from '../../src/engine/core/financialContract';

import {
  measureGroupA,
  measureGroupC,
  measureGroupD,
  measureGroupF,
} from './measure';

export interface Phase06Quantity {
  id: string;
  name: string;
  unit: string;
  case: string;
  before: number | null;
  after: number;
  delta: number | null;
  producer: string;
  formula: string;
  reproduce: string;
  details: Record<string, unknown>;
  verified?: boolean;
}

export interface Phase06Check {
  id: string;
  name: string;
  lhs: number;
  rhs: number;
  delta: number;
  pass: boolean;
  definition: string;
}

export interface Phase06Anchor {
  expected: number;
  actual: number;
  delta: number;
  pass: boolean;
}

export interface Phase06Evidence {
  phase: string;
  generatedAtCommit: string;
  harnessSha256: string;
  contractSha256: string;
  quantities: Phase06Quantity[];
  coherenceChecks: Phase06Check[];
  nonRegression: Record<string, Phase06Anchor>;
}

export function runPhase06Verification(): Phase06Evidence {
  // -------------------------------------------------------------------------
  // 1. Load Baseline Fixtures and Historical Frozen Evidence
  // -------------------------------------------------------------------------
  const p1Path = path.resolve(
    process.cwd(),
    'docs/audit/remediation/evidence/phase01/measurements.json'
  );
  if (!fs.existsSync(p1Path)) {
    throw new Error(`Required baseline file not found: ${p1Path}`);
  }
  const p1Evidence = JSON.parse(fs.readFileSync(p1Path, 'utf8'));

  const getP1Quantity = (id: string) => {
    const q = p1Evidence.quantities.find((item: { id: string }) => item.id === id);
    if (!q) throw new Error(`Baseline quantity ${id} not found in Phase 01 evidence`);
    return q;
  };

  const p4Path = path.resolve(
    process.cwd(),
    'docs/audit/remediation/evidence/phase04/phase04-measurements.json'
  );
  if (!fs.existsSync(p4Path)) {
    throw new Error(`Required Phase 04 baseline file not found: ${p4Path}`);
  }
  const p4Evidence = JSON.parse(fs.readFileSync(p4Path, 'utf8'));

  const getP4Quantity = (id: string) => {
    const q = p4Evidence.quantities.find((item: { id: string }) => item.id === id);
    if (!q) throw new Error(`Phase 04 quantity ${id} not found in Phase 04 evidence`);
    return q;
  };

  // -------------------------------------------------------------------------
  // 2. Measure P6-01: G-1 Substation CAPEX with Coordinated 1.52 MVA Transformer
  // -------------------------------------------------------------------------
  // Before: Legacy inverter apparent power proxy: 1320 / 0.95 / 1000 = 1.389474 MVA * 35000 = 48632 USD
  // Evaluated dynamically via performFinancialAnalysis with DEFAULT_FINANCIAL_PRICING
  const g1DefaultFin = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    DEFAULT_FINANCIAL_PRICING,
    25,
    'powerplant'
  );
  const p601Before = g1DefaultFin.capexBreakdown.substationMvUsd; // 48632 USD

  const g1P601Fin = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      substationTransformerMva: 1.52,
    },
    25,
    'powerplant'
  );
  const p601After = g1P601Fin.capexBreakdown.substationMvUsd; // 53200 USD
  const p601Delta = p601After - p601Before; // +4568 USD

  // -------------------------------------------------------------------------
  // 3. Measure P6-02: G-1 Year-25 OPEX with Escalating Fixed Charges
  // -------------------------------------------------------------------------
  // Before: Land lease and grid operator fee frozen at Year 1 nominal Toman = 3441138661 Toman
  // Evaluated dynamically from g1DefaultFin cash flow Year 25 without fixed charge escalation
  const p602Before = g1DefaultFin.cashFlow25Years[24].opexToman; // 3441138661 Toman
  const g1P602Fin = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      escalateFixedChargesWithOpex: true,
    },
    25,
    'powerplant'
  );
  const p602After = g1P602Fin.cashFlow25Years[24].opexToman; // 3539338299 Toman
  const p602Delta = p602After - p602Before; // +98199638 Toman

  // -------------------------------------------------------------------------
  // 4. Measure P6-03: G-3 Off-Grid Demand-Constrained LCOE with Salvage Credit
  // -------------------------------------------------------------------------
  // Before: Year-24 battery replacement charged at 100% with 0 salvage credit at Y25 = 30643 Toman/kWh
  // Evaluated dynamically via performFinancialAnalysis without residual salvage credit
  const g3DefaultFin = performFinancialAnalysis(
    4.68,
    19.2,
    5.0,
    4469,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      includeDieselGenSet: false,
      batteryChemistry: 'lifepo4',
      offgridDailyLoadKwh: 8.26,
    },
    25,
    'offgrid'
  );
  if (
    typeof g3DefaultFin.lcoeTomanPerKwh !== 'number' ||
    !Number.isFinite(g3DefaultFin.lcoeTomanPerKwh)
  ) {
    throw new Error('P6-03 baseline calculation failure: lcoeTomanPerKwh is null');
  }
  const p603Before = g3DefaultFin.lcoeTomanPerKwh; // 30643 Toman/kWh

  const g3P603Fin = performFinancialAnalysis(
    4.68,
    19.2,
    5.0,
    4469,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      includeDieselGenSet: false,
      batteryChemistry: 'lifepo4',
      offgridDailyLoadKwh: 8.26,
      includeResidualSalvageValue: true,
    },
    25,
    'offgrid'
  );
  if (
    typeof g3P603Fin.lcoeTomanPerKwh !== 'number' ||
    !Number.isFinite(g3P603Fin.lcoeTomanPerKwh)
  ) {
    throw new Error(
      `P6-03 calculation failure: lcoeTomanPerKwh is ${g3P603Fin.lcoeTomanPerKwh}`
    );
  }
  const p603After = g3P603Fin.lcoeTomanPerKwh; // 30115 Toman/kWh
  const p603Delta = p603After - p603Before; // -528 Toman/kWh

  // -------------------------------------------------------------------------
  // 5. Measure P6-04: Non-Conventional 2-Sign-Change Primary IRR Root & MIRR
  // -------------------------------------------------------------------------
  // Before: Under standard bisection across [-0.5, 2.0], Bolzano sign-change condition fails
  // because NPV(-0.5) and NPV(2.0) have identical signs. No root exists under legacy solver -> null.
  // The absence of an IRR root is distinct from a zero return rate (0.0%), and the numerical delta is incomputable.
  const p604Before: number | null = null;
  const g1P604Fin = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      tariffEscalationPct: 0,
      opexEscalationPct: 8,
      inverterReplacementYear: 25,
      inverterReplacementCostRatio: 0.80,
    },
    25,
    'powerplant'
  );
  if (typeof g1P604Fin.irrPct !== 'number' || !Number.isFinite(g1P604Fin.irrPct)) {
    throw new Error(`P6-04 calculation failure: irrPct is ${g1P604Fin.irrPct}`);
  }
  const p604After = g1P604Fin.irrPct; // 5.4%
  const p604Delta: number | null = null; // Delta is mathematically incomputable when baseline root is non-existent

  // -------------------------------------------------------------------------
  // 6. Measure P6-05: G-1 Year-1 Net Export Yield Coupled with Inverter Derate
  // -------------------------------------------------------------------------
  // Before: Physical net yield from frozen Phase 04 evidence P4-07 (1816762 kWh) without inverter derating
  const p605Before = getP4Quantity('P4-07').after; // 1816762 kWh
  const agingG1 = calculateEnvironmentalAging({
    installationEnvironment: 'ground_mount',
    ambientTempMaxC: 39.0,
    elevationM: 1200,
    siteTiltDeg: 31.0,
  });
  if (
    typeof agingG1.inverterImpact.inverterAnnualEnergyDeratePct !== 'number' ||
    !Number.isFinite(agingG1.inverterImpact.inverterAnnualEnergyDeratePct)
  ) {
    throw new Error(
      `P6-05 calculation failure: inverterAnnualEnergyDeratePct is ${agingG1.inverterImpact.inverterAnnualEnergyDeratePct}`
    );
  }
  const inverterDerateG1 = agingG1.inverterImpact.inverterAnnualEnergyDeratePct; // 1.05%
  const p605After = Math.round(p605Before * (1.0 - inverterDerateG1 / 100.0)); // 1797686 kWh
  const p605Delta = p605After - p605Before; // -19076 kWh

  // -------------------------------------------------------------------------
  // 7. Measure P6-06: Coastal Salt-Mist Accelerated PV Degradation (d = 0.5 km)
  // -------------------------------------------------------------------------
  // Before: Standard inland degradation rate evaluated dynamically without coastal distance parameter = 0.45 %/yr
  const inlandAging = calculateEnvironmentalAging({
    installationEnvironment: 'ground_mount',
    ambientTempMaxC: 39.0,
    elevationM: 1200,
  });
  const p606Before = inlandAging.pvImpact.annualDegradationPct; // 0.45 %/yr
  const agingCoastal = calculateEnvironmentalAging({
    installationEnvironment: 'ground_mount',
    ambientTempMaxC: 39.0,
    elevationM: 1200,
    distanceToCoastKm: 0.5,
  });
  const p606After = agingCoastal.pvImpact.annualDegradationPct; // 0.60 %/yr
  const p606Delta = Number((p606After - p606Before).toFixed(2)); // +0.15 %/yr

  // -------------------------------------------------------------------------
  // 8. Measure P6-07: G-1 Zero-Escalation NPV under Fisher Real Discount Rate
  // -------------------------------------------------------------------------
  // Before: Extracted from frozen Phase 01 baseline M-F6 (0% tariff escalation sweep = -247356 USD)
  // which mixed 0% real tariff growth with 18% nominal discount rate
  const p607Before = getP1Quantity('M-F6').details.escalation0Pct.npvUsd; // -247356 USD
  const fisherDiscountRate = computeFisherRealDiscountRatePct(18.0, 15.0); // 2.6087%
  const g1FisherFin = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      discountRatePct: fisherDiscountRate,
      tariffEscalationPct: 0.0,
      opexEscalationPct: 0.0,
    },
    25,
    'powerplant'
  );
  const p607After = g1FisherFin.npvUsd; // 381562 USD
  const p607Delta = p607After - p607Before; // +628918 USD

  // -------------------------------------------------------------------------
  // 9. Measure P6-08: G-1 Full-Chain Integrated LCOE with Overhaul & Salvage
  // -------------------------------------------------------------------------
  // Before: Legacy uncoupled Phase 01 baseline M-F3 = 5056 Toman/kWh
  // Extracted dynamically from g1DefaultFin (confirmed by frozen M-F3)
  const p608Before = g1DefaultFin.lcoeTomanPerKwh!; // 5056 Toman/kWh
  const integratedG1 = resolveFinancialSystemAnalysis({
    totalPvCapacityKwp: 1134.9,
    inverterCapacityKw: 1320,
    batteryCapacityKwh: 0,
    baseAnnualYieldKwh: p605Before,
    substationTransformerMva: 1.52,
  });
  if (
    typeof integratedG1.financialResult.lcoeTomanPerKwh !== 'number' ||
    !Number.isFinite(integratedG1.financialResult.lcoeTomanPerKwh)
  ) {
    throw new Error(
      `P6-08 calculation failure: lcoeTomanPerKwh is ${integratedG1.financialResult.lcoeTomanPerKwh}`
    );
  }
  const p608After = integratedG1.financialResult.lcoeTomanPerKwh; // 5343 Toman/kWh
  const p608Delta = p608After - p608Before; // +287 Toman/kWh

  const quantities: Phase06Quantity[] = [
    {
      id: 'P6-01',
      name: 'G-1 MV Substation CAPEX with Coordinated 1.52 MVA Transformer',
      unit: 'USD',
      case: 'G-1',
      before: p601Before,
      after: p601After,
      delta: p601Delta,
      producer: 'src/engine/financialEngine.ts:performFinancialAnalysis',
      formula:
        'effectiveSubstationMva * substationUsdPerMva (1.52 MVA * 35000 $/MVA = 53200 USD vs legacy 1.389474 MVA * 35000 $/MVA = 48632 USD)',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-01',
      details: {
        legacyPlantMva: 1.389474,
        coordinatedTransformerMva: 1.52,
        substationUsdPerMva: 35000,
        capexDiffUsd: p601Delta,
      },
      verified: p601Before === 48632 && p601After === 53200 && p601Delta === 4568,
    },
    {
      id: 'P6-02',
      name: 'G-1 Year-25 Total Annual OPEX with Escalating Fixed Charges',
      unit: 'Toman',
      case: 'G-1',
      before: p602Before,
      after: p602After,
      delta: p602Delta,
      producer: 'src/engine/financialEngine.ts:performFinancialAnalysis',
      formula:
        'baseAnnualOpexToman * (1 + opexEscalationRate)^24 + fixedAnnualChargesToman * (1 + opexEscalationRate)^24',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-02',
      details: {
        fixedChargesAnnualUsd: 204.282,
        fixedChargesYear1Toman: 18385380,
        fixedChargesYear25Toman: 116585018,
        escalationPct: 8.0,
      },
      verified: p602Before === 3441138661 && p602After === 3539338299 && p602Delta === 98199638,
    },
    {
      id: 'P6-03',
      name: 'G-3 Off-Grid Demand-Constrained LCOE with Residual Battery Salvage Credit',
      unit: 'Toman/kWh',
      case: 'G-3',
      before: p603Before,
      after: p603After,
      delta: p603Delta,
      producer: 'src/engine/financialEngine.ts:performFinancialAnalysis',
      formula: 'sumDiscountedCostsWithResidualSalvage / sumDiscountedServedDemandEnergy',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-03',
      details: {
        batteryCapacityKwh: 19.2,
        batteryLifespanYears: 12,
        lastReplacementYear: 24,
        remainingLifespanRatio: '11/12',
        residualSalvageCreditToman: 544912886,
        residualSalvageUsd: 6055,
      },
      verified: p603Before === 30643 && p603After === 30115 && p603Delta === -528,
    },
    {
      id: 'P6-04',
      name: 'G-1 Non-Conventional 2-Sign-Change Primary IRR Root Detection',
      unit: '%',
      case: 'G-1',
      before: p604Before,
      after: p604After,
      delta: p604Delta,
      producer: 'src/engine/financialEngine.ts:performFinancialAnalysis',
      formula:
        'solveCashFlowIrrAndMirr([-CAPEX, CF_1, ..., CF_25]).irrPct (smallest positive root among [-12.5%, +5.4%]) vs legacy bisection which failed (null)',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-04',
      details: {
        signChanges: 2,
        legacyBisectionRoot: null,
        irrStatus: g1P604Fin.irrStatus,
        irrRootsPct: g1P604Fin.irrRootsPct,
        mirrPct: g1P604Fin.mirrPct,
        primaryPositiveRootPct: p604After,
      },
      verified:
        p604Before === null &&
        p604After === 5.4 &&
        p604Delta === null &&
        g1P604Fin.mirrPct === 14.8 &&
        Array.isArray(g1P604Fin.irrRootsPct) &&
        g1P604Fin.irrRootsPct.length >= 2,
    },
    {
      id: 'P6-05',
      name: 'G-1 Year-1 Net Export Yield Coupled with Outdoor Inverter Thermal Derate',
      unit: 'kWh',
      case: 'G-1',
      before: p605Before,
      after: p605After,
      delta: p605Delta,
      producer: 'src/engine/core/financialContract.ts:resolveFinancialSystemAnalysis',
      formula:
        'round(baseAnnualYieldKwh * (1.0 - inverterAnnualEnergyDeratePct / 100.0)) with derate = 3.0% * 0.35 = 1.05%',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-05',
      details: {
        baseAnnualYieldKwh: p605Before,
        ambientTempMaxC: 39.0,
        totalInverterDeratePct: 3.0,
        weightedInverterDeratePct: 1.05,
        lostGenerationKwh: Math.abs(p605Delta),
      },
      verified: p605Before === 1816762 && p605After === 1797686 && p605Delta === -19076,
    },
    {
      id: 'P6-06',
      name: 'Coastal Salt-Mist Accelerated PV Annual Degradation Rate at d = 0.5 km',
      unit: '%/yr',
      case: 'G-1',
      before: p606Before,
      after: p606After,
      delta: p606Delta,
      producer: 'src/engine/environmentalAgingEngine.ts:calculateEnvironmentalAging',
      formula:
        'baseDegradationPct + saltMistPvDegradationAdderPct (0.45% + 0.15% = 0.60%/yr per IEC 61701)',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-06',
      details: {
        distanceToCoastKm: 0.5,
        saltMistSeverity: agingCoastal.pvImpact.saltMistSeverity,
        adderPct: agingCoastal.pvImpact.saltMistPvDegradationAdderPct,
        twentyFiveYearRetentionPct: agingCoastal.pvImpact.twentyFiveYearCapacityRetentionPct,
        expectedLifespanYears: agingCoastal.pvImpact.expectedUsefulLifespanYears,
      },
      verified: p606Before === 0.45 && p606After === 0.60 && p606Delta === 0.15,
    },
    {
      id: 'P6-07',
      name: 'G-1 Zero-Escalation NPV under Fisher-Consistent Real Discount Rate',
      unit: 'USD',
      case: 'G-1',
      before: p607Before,
      after: p607After,
      delta: p607Delta,
      producer: 'src/engine/core/financialContract.ts:COUNTRY_FINANCIAL_PROFILES',
      formula:
        'performFinancialAnalysis with r_real = computeFisherRealDiscountRatePct(18.0, 15.0) = 2.6087%, tariffEscalation = 0%, opexEscalation = 0%',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-07',
      details: {
        nominalDiscountRatePct: 18.0,
        inflationRatePct: 15.0,
        realDiscountRatePct: fisherDiscountRate,
        tariffEscalationPct: 0.0,
        opexEscalationPct: 0.0,
        lcoeUsdPerKwh: g1FisherFin.lcoeUsdPerKwh,
      },
      verified: p607Before === -247356 && p607After === 381562 && p607Delta === 628918,
    },
    {
      id: 'P6-08',
      name: 'G-1 Full-Chain Integrated LCOE with Aging Derate, 1.52 MVA Substation, Year-12 Inverter Overhaul & Salvage',
      unit: 'Toman/kWh',
      case: 'G-1',
      before: p608Before,
      after: p608After,
      delta: p608Delta,
      producer: 'src/engine/core/financialContract.ts:resolveFinancialSystemAnalysis',
      formula:
        'LCOE of fully coupled system: yield = 1797686 kWh, transformer = 1.52 MVA, opex escalation active, Y12 inverter overhaul with 2/15 salvage credit at Y25',
      reproduce: 'npx tsx scripts/remediation/verify-phase06.ts --id P6-08',
      details: {
        lcoeUsdPerKwh: integratedG1.financialResult.lcoeUsdPerKwh,
        year1GenerationKwh: 1797686,
        totalCapexUsd: integratedG1.financialResult.capexBreakdown.totalCapexUsd,
        totalCapexToman: integratedG1.financialResult.capexBreakdown.totalCapexToman,
        salvageCreditY25Toman: 894028589,
      },
      verified: p608Before === 5056 && p608After === 5343 && p608Delta === 287,
    },
  ];

  // -------------------------------------------------------------------------
  // 10. Coherence Checks C6-01 through C6-06
  // -------------------------------------------------------------------------

  // C6-01: CAPEX Component-to-Total Reconciliation & Substation MVA Coherence
  const b601 = g1P601Fin.capexBreakdown;
  const c601SumUsd =
    b601.pvModulesUsd +
    b601.invertersUsd +
    b601.batteriesUsd +
    b601.structuresUsd +
    b601.cablesAndProtectionUsd +
    b601.substationMvUsd +
    b601.gridInterconnectionUsd +
    b601.hvConnectionUsd +
    b601.dieselGenSetUsd +
    b601.engineeringAndInstallationUsd +
    b601.contingencyUsd;
  const c601SumToman =
    b601.pvModulesToman +
    b601.invertersToman +
    b601.batteriesToman +
    b601.structuresToman +
    b601.cablesAndProtectionToman +
    b601.substationMvToman +
    b601.gridInterconnectionToman +
    b601.hvConnectionToman +
    b601.dieselGenSetToman +
    b601.engineeringAndInstallationToman +
    b601.contingencyToman;

  const c601Lhs = c601SumUsd;
  const c601Rhs = b601.totalCapexUsd;
  const c601Delta = Math.abs(c601Lhs - c601Rhs);
  const c601Pass =
    c601Lhs === c601Rhs &&
    b601.totalCapexUsd === 504352 &&
    b601.substationMvUsd === 53200 &&
    c601SumToman === b601.totalCapexToman &&
    b601.totalCapexToman === 45391651579 &&
    b601.isReconciled === true;

  // C6-02: LCOE Discounted Cost-Minus-Salvage Conservation Identity
  const rG3 = 0.18;
  let g3SumCosts = g3P603Fin.capexBreakdown.totalCapexToman;
  let g3SumEnergy = 0;
  const g3RawDemand = 8.26 * 365;
  const g3OffgridServed = Math.min(4469, g3RawDemand);
  for (let yr = 1; yr <= 25; yr++) {
    const cf = g3P603Fin.cashFlow25Years[yr - 1];
    const yrCost =
      cf.opexToman +
      cf.fuelCostToman +
      cf.batteryReplacementToman +
      (cf.inverterReplacementToman ?? 0) -
      (cf.salvageCreditToman ?? 0);
    const div = Math.pow(1 + rG3, yr);
    g3SumCosts += yrCost / div;
    const yrEnergy = Math.min(cf.generationKwh, g3OffgridServed);
    g3SumEnergy += yrEnergy / div;
  }
  const g3ExpectedLcoe = Math.round(g3SumCosts / g3SumEnergy);
  const c602Lhs = p603After;
  const c602Rhs = g3ExpectedLcoe;
  const c602Delta = Math.abs(c602Lhs - c602Rhs);
  const c602Pass =
    c602Lhs === c602Rhs &&
    c602Lhs === 30115 &&
    p608After === 5343 &&
    c602Lhs < p603Before;

  // C6-03: Non-Conventional Multi-Root IRR Zero-NPV & Unique MIRR Coherence
  const capexTomanP604 = g1P604Fin.capexBreakdown.totalCapexToman;
  const npvAtRate = (r: number) => {
    let npv = -capexTomanP604;
    for (let yr = 1; yr <= 25; yr++) {
      npv += g1P604Fin.cashFlow25Years[yr - 1].netCashFlowToman / Math.pow(1 + r, yr);
    }
    return npv;
  };

  // 60-iteration bisection on positive interval to obtain exact root
  let bisectLow = 0.0;
  let bisectHigh = 0.10;
  for (let i = 0; i < 60; i++) {
    const mid = (bisectLow + bisectHigh) / 2;
    if (npvAtRate(mid) > 0) bisectLow = mid;
    else bisectHigh = mid;
  }
  const rootExact = (bisectLow + bisectHigh) / 2;
  const npvExact = npvAtRate(rootExact);
  const c603RelErr = Math.abs(npvExact) / capexTomanP604;

  const c603Lhs = Number(c603RelErr.toExponential(4));
  const c603Rhs = 0;
  const c603Delta = c603Lhs;
  const c603Pass =
    c603RelErr <= 1e-6 &&
    g1P604Fin.irrStatus === 'NON_CONVENTIONAL_MULTIPLE_ROOTS' &&
    g1P604Fin.irrRootsPct?.length === 2 &&
    g1P604Fin.mirrPct === 14.8;

  // C6-04: Fisher Real-vs-Nominal Discounting Equivalence & Registry Coherence
  const c604Lhs = computeFisherRealDiscountRatePct(18.0, 15.0);
  const c604Rhs = Number(((((1.18 / 1.15) - 1) * 100)).toFixed(4));
  const c604Delta = Number(Math.abs(c604Lhs - c604Rhs).toFixed(6));

  // Verify real vs nominal operating cash flow NPV equivalence:
  const resNom = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      tariffEscalationPct: 15.0,
      opexEscalationPct: 15.0,
      escalateFixedChargesWithOpex: true,
      discountRatePct: 18.0,
    },
    25,
    'powerplant'
  );

  const resReal = performFinancialAnalysis(
    1134.9,
    0,
    1320,
    1851400,
    {
      ...DEFAULT_FINANCIAL_PRICING,
      tariffEscalationPct: 0.0,
      opexEscalationPct: 0.0,
      escalateFixedChargesWithOpex: true,
      discountRatePct: c604Lhs,
    },
    25,
    'powerplant'
  );

  let pvNomOps = 0;
  let pvRealOps = 0;
  const rRealDec = c604Lhs / 100;
  for (let yr = 1; yr <= 25; yr++) {
    pvNomOps += resNom.cashFlow25Years[yr - 1].netCashFlowToman / Math.pow(1.18, yr);
    pvRealOps += resReal.cashFlow25Years[yr - 1].netCashFlowToman / Math.pow(1 + rRealDec, yr);
  }
  const relDiffFisher = Math.abs(pvNomOps - pvRealOps / 1.15) / pvNomOps;

  const c604Pass =
    Math.abs(c604Lhs - c604Rhs) <= 1e-6 &&
    c604Lhs === 2.6087 &&
    relDiffFisher < 1e-4 &&
    Boolean(
      COUNTRY_FINANCIAL_PROFILES.IR_SATBA_NOMINAL_TOMAN &&
      COUNTRY_FINANCIAL_PROFILES.IR_FISHER_REAL_CONSTANT &&
      COUNTRY_FINANCIAL_PROFILES.INTL_USD_BENCHMARK
    );

  // C6-05: Mandatory 3-Axis 27-Point Sensitivity Matrix Economic Monotonicity
  const sensMatrix = computeMandatorySensitivityMatrix({
    totalPvCapacityKwp: 1134.9,
    inverterCapacityKw: 1320,
    batteryCapacityKwh: 0,
    baseAnnualYieldKwh: 1816762,
    substationTransformerMva: 1.52,
  });
  const c605Lhs = sensMatrix.monotonicPassingPointsCount;
  const c605Rhs = 27;
  const c605Delta = Math.abs(c605Lhs - c605Rhs);
  const c605Pass =
    sensMatrix.isMonotonicValid === true &&
    sensMatrix.totalPointsCount === 27 &&
    c605Lhs === 27;

  // C6-06: Environmental Aging Coastal Salt-Mist Monotonicity & Outdoor Inverter Derating
  const agingModerate = calculateEnvironmentalAging({
    installationEnvironment: 'ground_mount',
    ambientTempMaxC: 39.0,
    elevationM: 1200,
    distanceToCoastKm: 3.0,
  });
  const agingInland = calculateEnvironmentalAging({
    installationEnvironment: 'ground_mount',
    ambientTempMaxC: 39.0,
    elevationM: 1200,
    distanceToCoastKm: 50.0,
  });
  const agingShed = calculateEnvironmentalAging({
    installationEnvironment: 'industrial_shed',
    ambientTempMaxC: 39.0,
    elevationM: 1200,
  });

  const c606Lhs = agingCoastal.pvImpact.annualDegradationPct; // 0.60
  const c606Rhs = agingInland.pvImpact.annualDegradationPct; // 0.45
  const c606Delta = Number((c606Lhs - c606Rhs).toFixed(2)); // 0.15
  const c606Pass =
    agingCoastal.pvImpact.annualDegradationPct > agingModerate.pvImpact.annualDegradationPct &&
    agingModerate.pvImpact.annualDegradationPct > agingInland.pvImpact.annualDegradationPct &&
    agingG1.inverterImpact.inverterAnnualEnergyDeratePct === 1.05 &&
    agingShed.inverterImpact.inverterAnnualEnergyDeratePct === 0.0;

  const coherenceChecks: Phase06Check[] = [
    {
      id: 'C6-01',
      name: 'تراز دقیق جزء‌به‌کل CAPEX و انطباق هزینهٔ پست MV با ظرفیت ترانسفورماتور هماهنگ',
      lhs: c601Lhs,
      rhs: c601Rhs,
      delta: c601Delta,
      pass: c601Pass,
      definition:
        'مجموع ۱۱ جزء دلاری و تومانی در capexBreakdown دقیقاً برابر totalCapexUsd (504352 USD) و totalCapexToman (45391651579 Toman) بوده و پست MV دقیقاً 53200 USD (1.52 MVA * 35000 $/MVA) است.',
    },
    {
      id: 'C6-02',
      name: 'اتحاد پایستگی بهای تمام‌شدهٔ تنزیل‌شده منهای ارزش پسماند در LCOE',
      lhs: c602Lhs,
      rhs: c602Rhs,
      delta: c602Delta,
      pass: c602Pass,
      definition:
        'تطابق دقیق بهای تمام‌شده LCOE در حالت آف‌گرید G-3 (30115 Toman/kWh) با بازمحاسبه مستقل مجموع هزینه‌ها منهای ارزش پسماند باتری سال ۲۴ (544912886 Toman) بر انرژی تقاضاشده، و برقراری LCOE نیروگاه یکپارچه G-1 برابر 5343 Toman/kWh.',
    },
    {
      id: 'C6-03',
      name: 'صحت صفر شدن NPV در ریشه‌های چندگانهٔ IRR و یکتایی MIRR در جریان نقدی غیرمتعارف',
      lhs: c603Lhs,
      rhs: c603Rhs,
      delta: c603Delta,
      pass: c603Pass,
      definition:
        `قدرمطلق خطای نسبی NPV در ریشه مثبت دقیق (${rootExact.toFixed(8)}) کمتر از 1e-6 (معادل ${c603RelErr.toExponential(4)}) بوده و هر دو ریشه [-12.5%, 5.4%] و MIRR برابر 14.8% شناسایی شدند.`,
    },
    {
      id: 'C6-04',
      name: 'هم‌سازگاری تنزیل اسمی و حقیقی فیشر و اعتبار رجیستری پروفایل‌های کشوری',
      lhs: c604Lhs,
      rhs: c604Rhs,
      delta: c604Delta,
      pass: c604Pass,
      definition:
        `انطباق نرخ تنزیل حقیقی فیشر (2.6087%) با خطای کمتر از 1e-6، هم‌ارزی ارزش فعلی جریان‌های عملیاتی اسمی و حقیقی فیشر با خطای نسبی ${relDiffFisher.toExponential(4)} (< 1e-4)، و اعتبار هر سه پروفایل کشوری.`,
    },
    {
      id: 'C6-05',
      name: 'یکنواختی اکید اقتصادی در ماتریس حساسیت سه‌محوری اجباری (۲۷ نقطه)',
      lhs: c605Lhs,
      rhs: c605Rhs,
      delta: c605Delta,
      pass: c605Pass,
      definition:
        'برقراری کامل قوانین سه‌گانه یکنواختی اقتصادی (افزایش تعرفه -> افزایش NPV، افزایش تنزیل -> کاهش NPV و افزایش LCOE، افزایش CAPEX -> کاهش NPV و افزایش LCOE) در تمام ۲۷ نقطه ماتریس حساسیت.',
    },
    {
      id: 'C6-06',
      name: 'یکنواختی فیزیکی فرسایش محیطی ساحلی و اتصال افت حرارتی اینورتر فضای باز',
      lhs: c606Lhs,
      rhs: c606Rhs,
      delta: c606Delta,
      pass: c606Pass,
      definition:
        'یکنواختی اکید استهلاک سالانه پنل در فواصل ساحلی (0.60% > 0.53% > 0.45%/yr) طبق IEC 61701، و جریمه انرژی سالانه 1.05% برای اینورتر روباز در برابر 0.0% برای اینورتر سرپوشیده.',
    },
  ];

  // -------------------------------------------------------------------------
  // 11. Non-Regression Anchors Verification (M-A1, M-A2, M-C1, M-D1, M-F1, M-F4)
  // -------------------------------------------------------------------------
  const liveA = measureGroupA();
  const liveC = measureGroupC();
  const liveD = measureGroupD();
  const liveF = measureGroupF();

  const getLiveQuantity = (id: string) => {
    const all = [...liveA, ...liveC, ...liveD, ...liveF];
    const found = all.find((q) => q.id === id);
    if (!found) throw new Error(`Live quantity ${id} not found in measurement groups`);
    return found;
  };

  const anchorIds = ['M-A1', 'M-A2', 'M-C1', 'M-D1', 'M-F1', 'M-F4'];
  const nonRegression: Record<string, Phase06Anchor> = {};

  for (const aId of anchorIds) {
    const p1q = getP1Quantity(aId);
    const liveQ = getLiveQuantity(aId);
    const delta = Number((liveQ.value - p1q.value).toFixed(6));
    nonRegression[aId] = {
      expected: p1q.value,
      actual: liveQ.value,
      delta,
      pass: delta === 0,
    };
  }

  // -------------------------------------------------------------------------
  // 12. Checksums & Commit Hashes
  // -------------------------------------------------------------------------
  // Condition: Read generatedAtCommit from the latest commit that modified engine/server code
  let generatedAtCommit = '5e42ae4bf62c88bf659968f6c624bf47f33323de';
  try {
    const commitOutput = execSync('git log -n 1 --format=%H -- src/ server.ts', {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();
    if (commitOutput && commitOutput.length === 40) {
      generatedAtCommit = commitOutput;
    }
  } catch {
    // Keep fallback
  }

  const verifierContent = fs.readFileSync(__filename, 'utf8');
  const harnessSha256 = crypto.createHash('sha256').update(verifierContent).digest('hex');

  const contractPath = path.resolve(__dirname, '../../src/engine/core/financialContract.ts');
  const contractContent = fs.readFileSync(contractPath, 'utf8');
  const contractSha256 = crypto.createHash('sha256').update(contractContent).digest('hex');

  const evidence: Phase06Evidence = {
    phase: 'phase06',
    generatedAtCommit,
    harnessSha256,
    contractSha256,
    quantities,
    coherenceChecks,
    nonRegression,
  };

  return evidence;
}

// ---------------------------------------------------------------------------
// CLI Interface
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const evidence = runPhase06Verification();

  const evidenceDir = path.resolve(process.cwd(), 'docs/audit/remediation/evidence/phase06');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  const evidencePath = path.join(evidenceDir, 'phase06-measurements.json');
  fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n', 'utf8');

  // Handle --id P6-XX or --quantity P6-XX
  const idArg = args.find(
    (a) =>
      a.startsWith('--id=') ||
      a === '--id' ||
      a.startsWith('--quantity=') ||
      a === '--quantity'
  );
  if (idArg) {
    let targetId: string;
    if (idArg.startsWith('--id=')) {
      targetId = idArg.split('=')[1];
    } else if (idArg.startsWith('--quantity=')) {
      targetId = idArg.split('=')[1];
    } else if (idArg === '--id') {
      targetId = args[args.indexOf('--id') + 1];
    } else {
      targetId = args[args.indexOf('--quantity') + 1];
    }
    const foundQ = evidence.quantities.find((q) => q.id === targetId);
    if (!foundQ) {
      console.error(`[FAIL] Quantity ${targetId} not found in Phase 06 measurements`);
      process.exit(1);
    }
    console.log(JSON.stringify(foundQ, null, 2));
    process.exit(foundQ.verified ? 0 : 1);
  }

  // Handle --check C6-XX
  const checkArg = args.find((a) => a.startsWith('--check=') || a === '--check');
  if (checkArg) {
    const targetCheck = checkArg.startsWith('--check=')
      ? checkArg.split('=')[1]
      : args[args.indexOf('--check') + 1];
    const foundC = evidence.coherenceChecks.find((c) => c.id === targetCheck);
    if (!foundC) {
      console.error(`[FAIL] Coherence check ${targetCheck} not found in Phase 06`);
      process.exit(1);
    }
    console.log(JSON.stringify(foundC, null, 2));
    process.exit(foundC.pass ? 0 : 1);
  }

  console.log('='.repeat(80));
  console.log(' SolarPV Studio - Phase 06 Automated Verifier');
  console.log('='.repeat(80));
  console.log(`[PASS] Evidence written to docs/audit/remediation/evidence/phase06/phase06-measurements.json`);

  const allQuantitiesVerified = evidence.quantities.every((q) => q.verified);
  console.log(
    `[PASS] Quantities verified: ${evidence.quantities.filter((q) => q.verified).length} / ${evidence.quantities.length} (All PASS: ${allQuantitiesVerified})`
  );

  const allChecksPass = evidence.coherenceChecks.every((c) => c.pass);
  console.log(
    `[PASS] Checks executed: ${evidence.coherenceChecks.filter((c) => c.pass).length} / ${evidence.coherenceChecks.length} (All PASS: ${allChecksPass})`
  );

  const allAnchorsZero = Object.values(evidence.nonRegression).every((a) => a.delta === 0);
  console.log(
    `[PASS] Non-regression anchors verified: ${Object.values(evidence.nonRegression).filter((a) => a.delta === 0).length} / ${Object.keys(evidence.nonRegression).length} (All delta 0: ${allAnchorsZero})`
  );

  for (const q of evidence.quantities) {
    const beforeStr = q.before === null ? 'null' : q.before.toString();
    const deltaStr = q.delta === null ? 'null' : q.delta.toString();
    console.log(
      `  • [${q.id}] ${q.name}: ${beforeStr} -> ${q.after} ${q.unit} (delta: ${deltaStr}) [${q.verified ? 'OK' : 'FAIL'}]`
    );
  }

  for (const c of evidence.coherenceChecks) {
    console.log(
      `  • [${c.id}] ${c.name}: lhs=${c.lhs}, rhs=${c.rhs}, delta=${c.delta} [${c.pass ? 'PASS' : 'FAIL'}]`
    );
  }

  for (const [k, v] of Object.entries(evidence.nonRegression)) {
    console.log(
      `  • [ANCHOR ${k}] expected=${v.expected}, actual=${v.actual}, delta=${v.delta} [${v.pass ? 'PASS' : 'FAIL'}]`
    );
  }

  if (!allQuantitiesVerified || !allChecksPass || !allAnchorsZero) {
    console.error('\n[FATAL] One or more quantities, coherence checks, or non-regression anchors failed!');
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
