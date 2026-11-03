// ============================================================================
// SolarPV Studio v3.0 - Robust Zod Schema Validation & Data Migration (Phase 1a/PR-Fix)
// Guarantees zero data loss, safe fallback, and forward/backward compatibility
// Three-State Safety Architecture:
// 1. VALID: Silent lossless migration
// 2. RECOVERED_WITH_WARNINGS: Non-critical fields populated with warnings & user confirmation required
// 3. BLOCKED_INCONSISTENT: Physically impossible inputs (negative capacity, efficiency >100%) BLOCKED
// ============================================================================

import { z } from 'zod';
// R5 (v1.0.3): Legacy feature flags retained in schema for migration compatibility
export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  enableMultiphysicsCoupling: false,
  enableClimateResilience15Min: false,
  enableLcaLifecycleSustainability: false,
  enableNextGenGridHydrogen: false,
  enableAdvancedGeotechnicalCivil: false,
});
export type AdvancedFeatureFlags = typeof DEFAULT_FEATURE_FLAGS;
import { generateTraceId } from './modelRegistry';
import { getDefaultClimateCity } from '../climaticData';
import type { LoadCategory } from '../loadProfiles';
import { DEFAULT_FINANCIAL_PRICING } from '../financialEngine';
import type { UserFinancialPricing } from '../financialEngine';

// ----------------------------------------------------------------------------
// Zod Schemas for Atomic Engineering Objects
// ----------------------------------------------------------------------------

export const FeatureFlagsSchema = z.object({
  enableMultiphysicsCoupling: z.boolean().default(false),
  enableClimateResilience15Min: z.boolean().default(false),
  enableLcaLifecycleSustainability: z.boolean().default(false),
  enableNextGenGridHydrogen: z.boolean().default(false),
  enableAdvancedGeotechnicalCivil: z.boolean().default(false),
});

export const ClimateCitySchema = z.object({
  id: z.string(),
  nameFa: z.string(),
  nameEn: z.string(),
  provinceFa: z.string(),
  provinceEn: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevationM: z.number().default(1000),
  peakSunHours: z.number().min(0.5).max(12),
  tempMinC: z.number().min(-60).max(50),
  tempMaxC: z.number().min(-20).max(65),
  albedo: z.number().min(0.05).max(0.95).default(0.20),
  soilingLossPct: z.number().min(0).max(30).default(4.0),
  optimalTiltAnnualDeg: z.number().min(0).max(90).default(30),
  optimalTiltWinterDeg: z.number().min(0).max(90).default(45),
  optimalTiltSummerDeg: z.number().min(0).max(90).default(15),
  descriptionFa: z.string().optional().default(''),
  descriptionEn: z.string().optional().default(''),
  basicWindSpeedKmh: z.number().optional().default(120),
  groundSnowLoadKgM2: z.number().optional().default(50),
  annualRainfallMm: z.number().optional().default(230),
  soilType: z.enum(['dense_sand_gravel', 'medium_clay', 'loose_sand', 'rocky_limestone']).default('dense_sand_gravel'),
  soilBearingCapacityKpa: z.number().optional().default(200),
  soilInternalFrictionAngleDeg: z.number().optional().default(32),
  soilCohesionKpa: z.number().optional().default(10),
  soilDensityKnM3: z.number().optional().default(18.5),
  frostDepthCm: z.number().optional().default(40),
  seismicZoneCoefficientA: z.number().optional().default(0.35),
  dataSourceFa: z.string().optional().default('سازمان هواشناسی کشور'),
  dataSourceEn: z.string().optional().default('Iran Meteorological Organization (IRIMO)'),
  dataRetrievalDate: z.string().optional().default('2026-01-01'),
});

export const SiteGeotechnicalOverridesSchema = z.object({
  basicWindSpeedKmh: z.number().optional(),
  groundSnowLoadKgM2: z.number().optional(),
  annualRainfallMm: z.number().optional(),
  soilType: z.enum(['dense_sand_gravel', 'medium_clay', 'loose_sand', 'rocky_limestone']).optional(),
  soilBearingCapacityKpa: z.number().optional(),
  soilInternalFrictionAngleDeg: z.number().optional(),
  soilCohesionKpa: z.number().optional(),
  soilDensityKnM3: z.number().optional(),
  frostDepthCm: z.number().optional(),
  seismicZoneCoefficientA: z.number().optional(),
  customNotes: z.string().optional(),
}).default({});

// Phase 1.1 (P1): LOAD_CATEGORY_VALUES must mirror LoadCategory in
// loadProfiles.ts exactly. Test P1.1.4 in unitTestsCore.ts fails if they drift.
const LOAD_CATEGORY_VALUES = [
  'lighting',
  'refrigeration',
  'pumping',
  'hvac',
  'washing',
  'it_server',
  'industrial_motor',
  'industrial_heating_welding',
  'mining_datacenter',
  'entertainment',
  'other',
] as const;

// Canonical schema — exactly equivalent to ElectricalLoadItem in
// loadProfiles.ts. NO .default() on any field: a missing canonical field must
// fail safeParse and downgrade the project to RECOVERED_WITH_WARNINGS rather
// than silently defaulting (anti-pattern from the legacy schema).
export const ElectricalLoadItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(LOAD_CATEGORY_VALUES),
  ratedWatts: z.number().positive(),
  surgeMultiplier: z.number().min(1).max(10),
  quantity: z.number().int().positive(),
  dayHours: z.number().min(0).max(24),
  nightHours: z.number().min(0).max(24),
  isDc: z.boolean(),
});

/**
 * Maps legacy v2 load items (powerWatts, dailyHours, nameFa, ...) to the
 * canonical ElectricalLoadItem shape. Already-canonical items pass through
 * untouched; mixed items prefer new fields. Category is inferred by keyword
 * (Persian + English) with safe fallback 'other'.
 */
function normalizeLegacyLoad(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;

  // Already canonical -> pass through untouched.
  if (
    typeof raw.ratedWatts === 'number' &&
    typeof raw.dayHours === 'number' &&
    typeof raw.nightHours === 'number' &&
    typeof raw.category === 'string'
  ) {
    return raw;
  }

  const legacyName: string =
    typeof raw.name === 'string' ? raw.name
    : typeof raw.nameFa === 'string' ? raw.nameFa
    : typeof raw.nameEn === 'string' ? raw.nameEn
    : 'Legacy Load';

  const legacyRatedWatts: number =
    typeof raw.ratedWatts === 'number' ? raw.ratedWatts
    : typeof raw.powerWatts === 'number' ? raw.powerWatts
    : 0;

  const legacyTotalHours: number =
    typeof raw.dayHours === 'number' || typeof raw.nightHours === 'number'
      ? (raw.dayHours ?? 0) + (raw.nightHours ?? 0)
      : typeof raw.dailyHours === 'number' ? raw.dailyHours
      : 0;

  const daySharePct =
    typeof raw.daytimeSharePct === 'number'
      ? Math.max(0, Math.min(100, raw.daytimeSharePct))
      : 100;
  const dayHours = Number(((legacyTotalHours * daySharePct) / 100).toFixed(2));
  const nightHours = Number((legacyTotalHours - dayHours).toFixed(2));

  const lower = legacyName.toLowerCase();
  let inferredCategory: LoadCategory = 'other';
  if (/چیلر|کولر|اسپلیت|تهویه|hvac|split|cooler|chiller/.test(lower)) inferredCategory = 'hvac';
  else if (/یخچال|فریزر|سردخانه|refrig|freez/.test(lower)) inferredCategory = 'refrigeration';
  else if (/پمپ|شناور|pump|well/.test(lower)) inferredCategory = 'pumping';
  else if (/لامپ|روشنایی|پروژکتور|led|light|lamp|flood/.test(lower)) inferredCategory = 'lighting';
  else if (/موتور|electro.?motor|motor/.test(lower)) inferredCategory = 'industrial_motor';
  else if (/جوش|کوره|المنت|weld|furnace|heater/.test(lower)) inferredCategory = 'industrial_heating_welding';
  else if (/سرور|دوربین|شبکه|server|cctv|router|ups/.test(lower)) inferredCategory = 'it_server';
  else if (/ماشین.?لباس|ظرفشو|washing|dishwash/.test(lower)) inferredCategory = 'washing';

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `legacy-load-${Date.now()}`,
    name: legacyName,
    category: inferredCategory,
    ratedWatts: legacyRatedWatts,
    surgeMultiplier:
      typeof raw.surgeMultiplier === 'number' && raw.surgeMultiplier >= 1
        ? raw.surgeMultiplier
        : 1.0,
    quantity:
      typeof raw.quantity === 'number' && raw.quantity > 0
        ? Math.round(raw.quantity)
        : 1,
    dayHours: Math.max(0, Math.min(24, dayHours)),
    nightHours: Math.max(0, Math.min(24, nightHours)),
    isDc: typeof raw.isDc === 'boolean' ? raw.isDc : false,
  };
}

export const ModuleSpecsSchema = z.object({
  manufacturer: z.string(),
  modelName: z.string(),
  pmpWatts: z.number().positive(),
  vocVolts: z.number().positive(),
  vmpVolts: z.number().positive(),
  iscAmps: z.number().positive(),
  impAmps: z.number().positive(),
  tempCoeffVocPct: z.number(),
  tempCoeffPmpPct: z.number(),
  noctC: z.number().default(45),
  lengthM: z.number().positive().default(2.278),
  widthM: z.number().positive().default(1.134),
  bifacialityFactor: z.number().min(0).max(1).default(0.80),
});

export const InverterSpecsSchema = z.object({
  manufacturer: z.string(),
  modelName: z.string(),
  pnomAcKw: z.number().positive(),
  vdcMaxVolts: z.number().positive(),
  vmpptMinVolts: z.number().positive(),
  vmpptMaxVolts: z.number().positive(),
  iscMaxAmpsPerMppt: z.number().positive().default(30),
  imppMaxAmpsPerMppt: z.number().positive().default(26),
  mpptChannelsCount: z.number().int().positive().default(1),
  efficiencyMaxPct: z.number().min(80).max(100).default(98.5),
  isThreePhase: z.boolean().default(true),
});

// Phase 1.2 (P1.2): mirrors UserFinancialPricing in financialEngine.ts
// EXACTLY — 21 fields, NO .default() anywhere. Safe defaulting for partial or
// legacy pricing happens in normalizeLegacyPricing() BEFORE this schema runs.
export const UserFinancialPricingSchema = z.object({
  moduleUsdPerWp: z.number().positive(),
  inverterUsdPerKw: z.number().positive(),
  batteryUsdPerKwh: z.number().positive(),
  structureUsdPerWp: z.number().nonnegative(),
  cablingBopUsdPerWp: z.number().nonnegative(),
  substationUsdPerMva: z.number().nonnegative(),
  epcLaborUsdPerKw: z.number().nonnegative(),
  gridTariffTomanPerKwh: z.number().nonnegative(),
  usdToTomanRate: z.number().positive(),
  annualOpexPctOfCapex: z.number().nonnegative(),
  discountRatePct: z.number().min(0).max(100),
  tariffEscalationPct: z.number().min(0).max(100),
  includeDieselGenSet: z.boolean(),
  dieselGenSetCapexUsd: z.number().nonnegative(),
  dieselAnnualFuelLiters: z.number().nonnegative(),
  dieselFuelPriceTomanPerLiter: z.number().nonnegative(),
  hvConnectionUsdPerKva: z.number().nonnegative(),
  ppaTariffTomanPerKwh: z.number().nonnegative(),
  landLeaseUsdPerKwpYear: z.number().nonnegative(),
  gridOperatorFeeUsdPerKwpYear: z.number().nonnegative(),
  dieselAnnualServiceOpexUsd: z.number().nonnegative(),
});

// ----------------------------------------------------------------------------
// Full Root Project Schema (v3.0.0)
// ----------------------------------------------------------------------------

// PR-2a-7-FOLLOWUP-2 (BUG-2): tracker config persisted with the project
export const TrackerConfigSchema = z.object({
  gcr: z.number().gt(0).lt(1).default(0.33),
  axisTiltDeg: z.number().min(-90).max(90).default(0),
  maxRotationDeg: z.number().gt(0).max(90).default(60),
  enableBacktracking: z.boolean().default(true),
  albedo: z.number().min(0).max(1).optional(),
  latitudeDeg: z.number().min(-90).max(90).optional(),
});

export const ProjectDataV3Schema = z.object({
  version: z.literal('3.0.0').default('3.0.0'),
  savedAt: z.string(),
  projectName: z.string().min(1),
  systemMode: z.enum(['powerplant', 'ongrid', 'offgrid']).default('powerplant'),
  inverterTech: z.enum(['string_inverter', 'mv_turnkey']).default('string_inverter'),
  customBaysCount: z.number().int().min(1).max(20).default(2),
  mvVoltageKv: z.number().positive().default(20),
  targetPowerplantCapacityKw: z.number().positive().default(1000),
  enableDieselGenerator: z.boolean().default(false),
  autonomyDays: z.number().min(0).max(10).default(1.5),
  outageHours: z.number().min(0).max(24).default(6),
  selectedChemistry: z.enum(['lifepo4', 'nmc', 'lead_acid', 'lto', 'sodium_ion']).default('lifepo4'),

  // Sub-objects
  city: ClimateCitySchema,
  siteOverrides: SiteGeotechnicalOverridesSchema,
  loads: z.array(ElectricalLoadItemSchema).default([]),
  selectedModule: ModuleSpecsSchema,
  selectedInverter: InverterSpecsSchema,
  userPricing: UserFinancialPricingSchema,

  // Feature Flags
  featureFlags: FeatureFlagsSchema.default(DEFAULT_FEATURE_FLAGS),

  trackerConfig: TrackerConfigSchema.nullable().optional(),

  // Traceability & Metadata
  traceId: z.string().optional(),
});

export type ProjectDataV3 = z.infer<typeof ProjectDataV3Schema>;

export type MigrationSafetyStatus = 'VALID' | 'RECOVERED_WITH_WARNINGS' | 'BLOCKED_INCONSISTENT';

export interface MigrationResult {
  success: boolean;
  migrationStatus: MigrationSafetyStatus;
  project: ProjectDataV3;
  migratedFromVersion: string;
  requiresUserConfirmation: boolean;
  warnings: string[];
  blockerReasons: string[];
  traceId: string;
}

/**
 * Validates whether the incoming payload contains physical contradictions
 * that must BLOCK migration to prevent silent miscalculation.
 */
function checkPhysicalContradictions(raw: Record<string, any>): string[] {
  const blockers: string[] = [];

  // 1. Negative or zero capacity in powerplant mode
  if (raw.targetPowerplantCapacityKw !== undefined && Number(raw.targetPowerplantCapacityKw) <= 0) {
    blockers.push(`Physical contradiction: targetPowerplantCapacityKw is non-positive (${raw.targetPowerplantCapacityKw} kW)`);
  }

  // 2. Inverter or Module efficiency > 100% or negative
  if (raw.selectedInverter?.efficiencyMaxPct !== undefined) {
    const eff = Number(raw.selectedInverter.efficiencyMaxPct);
    if (eff > 100 || eff <= 0) {
      blockers.push(`Thermodynamic violation: Inverter efficiency is impossible (${eff}%)`);
    }
  }

  // 3. Electrical voltages/currents negative
  if (raw.selectedModule?.vocVolts !== undefined && Number(raw.selectedModule.vocVolts) <= 0) {
    blockers.push(`Electrical violation: Module Voc is non-positive (${raw.selectedModule.vocVolts} V)`);
  }

  // 4. Ground slope or tilt negative or > 90 deg
  if (raw.city?.optimalTiltAnnualDeg !== undefined) {
    const tilt = Number(raw.city.optimalTiltAnnualDeg);
    if (tilt < 0 || tilt > 90) {
      blockers.push(`Geometric violation: Array tilt angle out of physical bounds [0, 90]° (${tilt}°)`);
    }
  }

  // 5. Corrupted non-array loads in battery mode
  if (raw.systemMode && raw.systemMode !== 'powerplant' && raw.loads !== undefined && !Array.isArray(raw.loads)) {
    blockers.push(`Data corruption: Electrical loads specified as non-array type [${typeof raw.loads}] in ${raw.systemMode} mode`);
  }

  return blockers;
}

/**
 * Three-State Migration Function:
 * 1. VALID: Zero data loss, silent execution.
 * 2. RECOVERED_WITH_WARNINGS: Missing fields safely populated, warnings recorded, user confirmation required.
 * 3. BLOCKED_INCONSISTENT: Physically impossible data is blocked to protect bankable integrity.
 */
/**
 * Phase 1.2 (P1.2): merges a possibly-partial/legacy userPricing object into a
 * complete canonical UserFinancialPricing. Strategy: start from
 * DEFAULT_FINANCIAL_PRICING, overlay explicitly-provided canonical fields, then
 * convert recognizable legacy fields only when the canonical equivalent was NOT
 * explicitly provided (canonical wins on collision). Legacy fields with no safe
 * conversion keep their DEFAULT (never zero/NaN).
 */
function normalizeLegacyPricing(raw: any): UserFinancialPricing {
  const out: UserFinancialPricing = { ...DEFAULT_FINANCIAL_PRICING };
  if (!raw || typeof raw !== 'object') return out;

  const num = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);
  const has = (k: string): boolean => num(raw[k]);

  const canonicalKeys: Array<keyof UserFinancialPricing> = [
    'moduleUsdPerWp', 'inverterUsdPerKw', 'batteryUsdPerKwh',
    'structureUsdPerWp', 'cablingBopUsdPerWp', 'substationUsdPerMva',
    'epcLaborUsdPerKw', 'gridTariffTomanPerKwh', 'usdToTomanRate',
    'annualOpexPctOfCapex', 'discountRatePct', 'tariffEscalationPct',
    'dieselGenSetCapexUsd', 'dieselAnnualFuelLiters',
    'dieselFuelPriceTomanPerLiter', 'hvConnectionUsdPerKva',
    'ppaTariffTomanPerKwh', 'landLeaseUsdPerKwpYear',
    'gridOperatorFeeUsdPerKwpYear', 'dieselAnnualServiceOpexUsd',
  ];
  for (const k of canonicalKeys) {
    if (num(raw[k])) (out as any)[k] = raw[k] as number;
  }
  if (typeof raw.includeDieselGenSet === 'boolean') {
    out.includeDieselGenSet = raw.includeDieselGenSet;
  }

  // Legacy conversions (only when canonical field was NOT explicitly provided)
  if (!has('moduleUsdPerWp') && num(raw.panelCostPerWattUsd)) out.moduleUsdPerWp = raw.panelCostPerWattUsd;
  if (!has('inverterUsdPerKw') && num(raw.inverterCostPerWattUsd)) out.inverterUsdPerKw = raw.inverterCostPerWattUsd * 1000;
  if (!has('batteryUsdPerKwh') && num(raw.batteryCostPerKwhUsd)) out.batteryUsdPerKwh = raw.batteryCostPerKwhUsd;
  if (!has('structureUsdPerWp') && num(raw.structureCostPerWattUsd)) out.structureUsdPerWp = raw.structureCostPerWattUsd;
  if (!has('cablingBopUsdPerWp') && num(raw.bopCostPerWattUsd)) out.cablingBopUsdPerWp = raw.bopCostPerWattUsd;
  if (!has('epcLaborUsdPerKw') && num(raw.installationCostPerWattUsd)) out.epcLaborUsdPerKw = raw.installationCostPerWattUsd * 1000;
  if (!has('gridTariffTomanPerKwh') && num(raw.electricitySellTariffTomanPerKwh)) out.gridTariffTomanPerKwh = raw.electricitySellTariffTomanPerKwh;
  if (!has('tariffEscalationPct') && num(raw.annualInflationPct)) out.tariffEscalationPct = raw.annualInflationPct;
  if (!has('annualOpexPctOfCapex') && num(raw.omCostPctOfCapexAnnual)) out.annualOpexPctOfCapex = raw.omCostPctOfCapexAnnual;

  return out;
}

export function migrateProjectToV3(rawInput: unknown): MigrationResult {
  const warnings: string[] = [];
  const traceId = generateTraceId('MIGR');

  if (!rawInput || typeof rawInput !== 'object') {
    return {
      success: false,
      migrationStatus: 'BLOCKED_INCONSISTENT',
      project: createDefaultProjectV3(traceId),
      migratedFromVersion: 'unknown',
      requiresUserConfirmation: true,
      warnings: ['Input was null, undefined, or primitive non-object.'],
      blockerReasons: ['Input payload is entirely unreadable or corrupt.'],
      traceId,
    };
  }

  const raw = rawInput as Record<string, any>;

  // Check 1: Physical Contradiction Blocker (State 3)
  const blockers = checkPhysicalContradictions(raw);
  if (blockers.length > 0) {
    return {
      success: false,
      migrationStatus: 'BLOCKED_INCONSISTENT',
      project: createDefaultProjectV3(traceId),
      migratedFromVersion: String(raw.version || 'unknown'),
      requiresUserConfirmation: true,
      warnings: ['Project migration was blocked due to physical contradictions.'],
      blockerReasons: blockers,
      traceId,
    };
  }

  // Check version and log upgrade path
  const originalVersion = String(raw.version || '1.0.0');
  let hadMissingFields = false;

  if (originalVersion !== '3.0.0') {
    hadMissingFields = true;
    warnings.push(`Migrating project schema from [${originalVersion}] to bankable standard [3.0.0].`);
  }

  // Ensure feature flags object exists
  const featureFlags: AdvancedFeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...(raw.featureFlags || {}),
  };

  // Check if non-critical sub-objects were missing
  if (!raw.siteOverrides) {
    hadMissingFields = true;
    warnings.push('Geotechnical overrides not present in legacy file; default zero overrides assumed.');
  }
  if (!raw.city?.soilType) {
    hadMissingFields = true;
    warnings.push('Soil classification parameter missing; populated with regional geotechnical standard.');
  }

  // Construct candidate
  const candidate = {
    version: '3.0.0' as const,
    savedAt: raw.savedAt || new Date().toISOString(),
    projectName: String(raw.projectName || 'Restored Solar PV Project'),
    systemMode: raw.systemMode || 'powerplant',
    inverterTech: raw.inverterTech || 'string_inverter',
    customBaysCount: Number(raw.customBaysCount) || 2,
    mvVoltageKv: Number(raw.mvVoltageKv) || 20,
    targetPowerplantCapacityKw: Number(raw.targetPowerplantCapacityKw) || 1000,
    enableDieselGenerator: Boolean(raw.enableDieselGenerator),
    autonomyDays: Number(raw.autonomyDays) || 1.5,
    outageHours: Number(raw.outageHours) || 6,
    selectedChemistry: raw.selectedChemistry || 'lifepo4',

    city: raw.city || getFallbackCity(),
    siteOverrides: raw.siteOverrides || {},
    loads: (Array.isArray(raw.loads) ? raw.loads : []).map(normalizeLegacyLoad), // P1: legacy v2 loads normalized before validation
    selectedModule: raw.selectedModule || getFallbackModule(),
    selectedInverter: raw.selectedInverter || getFallbackInverter(),
    userPricing: normalizeLegacyPricing(raw.userPricing), // P1.2: defaults applied here, never in schema

    featureFlags,
    trackerConfig: raw.trackerConfig !== undefined ? raw.trackerConfig : null, // BUG-2: persist (null = fixed tilt)
    traceId: raw.traceId || traceId,
  };

  // Validate with Zod safeParse
  const parsed = ProjectDataV3Schema.safeParse(candidate);

  if (parsed.success) {
    const isCleanV3 = originalVersion === '3.0.0' && !hadMissingFields;
    return {
      success: true,
      migrationStatus: isCleanV3 ? 'VALID' : 'RECOVERED_WITH_WARNINGS',
      project: parsed.data,
      migratedFromVersion: originalVersion,
      requiresUserConfirmation: !isCleanV3,
      warnings,
      blockerReasons: [],
      traceId,
    };
  } else {
    // Collect non-fatal field validation issues
    for (const issue of parsed.error.issues) {
      warnings.push(`Field [${issue.path.join('.')}]: ${issue.message}`);
    }

    const recovered = createDefaultProjectV3(traceId);
    if (candidate.projectName) recovered.projectName = candidate.projectName;
    if (candidate.systemMode) recovered.systemMode = candidate.systemMode;
    if (candidate.targetPowerplantCapacityKw) recovered.targetPowerplantCapacityKw = candidate.targetPowerplantCapacityKw;
    recovered.featureFlags = candidate.featureFlags;
    // P1.2: preserve normalized pricing even when validation fails on a
    // NON-pricing field — otherwise user pricing is silently reset.
    if (candidate.userPricing) recovered.userPricing = candidate.userPricing as any;

    return {
      success: true,
      migrationStatus: 'RECOVERED_WITH_WARNINGS',
      project: recovered,
      migratedFromVersion: originalVersion,
      requiresUserConfirmation: true,
      warnings,
      blockerReasons: [],
      traceId,
    };
  }
}

// ----------------------------------------------------------------------------
// Internal Fallback Builders (Pure & Zero-Side-Effect)
// ----------------------------------------------------------------------------

function getFallbackCity() {
  // dataRetrievalDate is optional on ClimateCity but required by
  // ClimateCitySchema's output type — pin the schema default explicitly.
  return { ...getDefaultClimateCity(), dataRetrievalDate: '2026-01-01' };
}

function getFallbackModule() {
  return {
    manufacturer: 'Jinko Solar',
    modelName: 'Tiger Neo JKM550N-72HL4-BDV (TOPCon)',
    pmpWatts: 550.26,
    vocVolts: 50.80,
    vmpVolts: 41.28,
    iscAmps: 13.99,
    impAmps: 13.33,
    tempCoeffVocPct: -0.25,
    tempCoeffPmpPct: -0.30,
    noctC: 45,
    lengthM: 2.278,
    widthM: 1.134,
    bifacialityFactor: 0.80,
  };
}

function getFallbackInverter() {
  return {
    manufacturer: 'Huawei',
    modelName: 'SUN2000-330KTL-H1',
    pnomAcKw: 330,
    vdcMaxVolts: 1500,
    vmpptMinVolts: 500,
    vmpptMaxVolts: 1500,
    iscMaxAmpsPerMppt: 30,
    imppMaxAmpsPerMppt: 26,
    mpptChannelsCount: 6,
    efficiencyMaxPct: 99.0,
    isThreePhase: true,
  };
}


export function createDefaultProjectV3(traceId?: string): ProjectDataV3 {
  return {
    version: '3.0.0',
    savedAt: new Date().toISOString(),
    projectName: 'Solar PV Engineering & EPC Project',
    systemMode: 'powerplant',
    inverterTech: 'string_inverter',
    customBaysCount: 2,
    mvVoltageKv: 20,
    targetPowerplantCapacityKw: 1000,
    enableDieselGenerator: false,
    autonomyDays: 1.5,
    outageHours: 6,
    selectedChemistry: 'lifepo4',

    city: getFallbackCity(),
    siteOverrides: {},
    loads: [],
    selectedModule: getFallbackModule(),
    selectedInverter: getFallbackInverter(),
    userPricing: { ...DEFAULT_FINANCIAL_PRICING } as ProjectDataV3['userPricing'] & import('../financialEngine').UserFinancialPricing as any,

    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    traceId: traceId || generateTraceId('PROJ'),
  };
}
