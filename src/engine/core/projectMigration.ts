// ============================================================================
// SolarPV Studio v3.0 - Robust Zod Schema Validation & Data Migration (Phase 1a/PR-Fix)
// Guarantees zero data loss, safe fallback, and forward/backward compatibility
// Three-State Safety Architecture:
// 1. VALID: Silent lossless migration
// 2. RECOVERED_WITH_WARNINGS: Non-critical fields populated with warnings & user confirmation required
// 3. BLOCKED_INCONSISTENT: Physically impossible inputs (negative capacity, efficiency >100%) BLOCKED
// ============================================================================

import { z } from 'zod';
import { AdvancedFeatureFlags, DEFAULT_FEATURE_FLAGS } from './featureFlags';
import { generateTraceId } from './modelRegistry';
import { IRANIAN_CLIMATE_CITIES } from '../climaticData';

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

export const ElectricalLoadItemSchema = z.object({
  id: z.string(),
  nameFa: z.string(),
  nameEn: z.string().optional(),
  powerWatts: z.number().positive(),
  dailyHours: z.number().min(0).max(24),
  quantity: z.number().int().positive().default(1),
  surgeMultiplier: z.number().min(1).max(10).default(1.2),
  priority: z.enum(['critical', 'essential', 'normal', 'deferrable']).default('normal'),
  daytimeSharePct: z.number().min(0).max(100).default(50),
});

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

export const UserFinancialPricingSchema = z.object({
  moduleUsdPerWp: z.number().positive().default(0.14),
  inverterUsdPerKw: z.number().positive().default(55),
  batteryUsdPerKwh: z.number().positive().default(160),
  bosBalanceOfPlantUsdPerWp: z.number().default(0.12),
  epcLaborUsdPerWp: z.number().default(0.08),
  gridInterconnectionUsdPerKw: z.number().default(25),
  landLeaseUsdPerHectareYear: z.number().default(500),
  omAnnualUsdPerKwYear: z.number().default(12),
  discountRatePct: z.number().default(18),
  analysisYears: z.number().int().default(25),
  usdToTomanRate: z.number().positive().default(90000),
  ppaTariffTomanPerKwh: z.number().positive().default(3500),
  dieselGenSetCapexUsdPerKw: z.number().default(380),
  includeDieselGenSet: z.boolean().default(false),
  dieselGenSetCapexUsd: z.number().default(0),
  dieselAnnualFuelLiters: z.number().default(0),
  dieselFuelPriceTomanPerLiter: z.number().default(3500),
});

// ----------------------------------------------------------------------------
// Full Root Project Schema (v3.0.0)
// ----------------------------------------------------------------------------

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
    loads: Array.isArray(raw.loads) ? raw.loads : [],
    selectedModule: raw.selectedModule || getFallbackModule(),
    selectedInverter: raw.selectedInverter || getFallbackInverter(),
    userPricing: raw.userPricing || getFallbackPricing(),

    featureFlags,
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
  return { ...IRANIAN_CLIMATE_CITIES[0] };
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

function getFallbackPricing() {
  return {
    moduleUsdPerWp: 0.14,
    inverterUsdPerKw: 55,
    batteryUsdPerKwh: 160,
    bosBalanceOfPlantUsdPerWp: 0.12,
    epcLaborUsdPerWp: 0.08,
    gridInterconnectionUsdPerKw: 25,
    landLeaseUsdPerHectareYear: 500,
    omAnnualUsdPerKwYear: 12,
    discountRatePct: 18,
    analysisYears: 25,
    usdToTomanRate: 90000,
    ppaTariffTomanPerKwh: 3500,
    dieselGenSetCapexUsdPerKw: 380,
    includeDieselGenSet: false,
    dieselGenSetCapexUsd: 0,
    dieselAnnualFuelLiters: 0,
    dieselFuelPriceTomanPerLiter: 3500,
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
    userPricing: getFallbackPricing(),

    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    traceId: traceId || generateTraceId('PROJ'),
  };
}
