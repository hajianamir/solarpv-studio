// Offline Project Transfer Envelope & Multi-Currency Engine (OFF-01, OFF-02, OFF-04)
// Provides versioned export/import with embedded custom equipment snapshots,
// deterministic migrations, and multi-currency/locale support.

import {
  CatalogRepository,
  type EnhancedCatalogBattery,
  type EnhancedCatalogModule,
  type EnhancedCatalogInverter,
} from './catalogRepository';
import { type ModuleSpecs, type InverterSpecs } from './pvEngineAdvanced';
import { type CatalogBattery } from './equipmentCatalogData';
import { migrateProjectToV3, type MigrationResult, type MigrationSafetyStatus } from './core/projectMigration';

export type SupportedCurrency = 'USD' | 'EUR' | 'TOMAN' | 'IRR';

export interface ExchangeRates {
  usdToToman: number;
  eurToToman?: number;
  usdToEur?: number;
}

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  usdToToman: 90000,
  eurToToman: 98000,
  usdToEur: 0.92,
};

export interface ProjectTransferEnvelope {
  format: 'solarpv_project_envelope';
  schemaVersion: '3.1.0';
  exportedAt: string;
  sourceApp: 'SolarPV Studio';
  appVersion: string;
  metadata: {
    docId?: string;
    docVersion?: string;
    companyName?: string;
    leadEngineer?: string;
    clientName?: string;
    approvalStatus?: string;
    detailLevel?: string;
    engineerNotes?: string;
    [key: string]: any;
  };
  projectData: Record<string, any>;
  customEquipmentSnapshots: {
    modules: (ModuleSpecs | EnhancedCatalogModule)[];
    inverters: (InverterSpecs | EnhancedCatalogInverter)[];
    batteries: (CatalogBattery | EnhancedCatalogBattery)[];
  };
  currencyConfig: {
    primaryCurrency: SupportedCurrency;
    exchangeRates: ExchangeRates;
  };
}

export interface CreateEnvelopeParams {
  projectName: string;
  projectData: Record<string, any>;
  metadata?: Record<string, any>;
  currencyConfig?: {
    primaryCurrency?: SupportedCurrency;
    exchangeRates?: Partial<ExchangeRates>;
  };
  activeModule?: ModuleSpecs;
  activeInverter?: InverterSpecs;
}

export interface PendingCustomEquipmentSnapshots {
  modules: unknown[];
  inverters: unknown[];
  batteries: unknown[];
}

export interface RestoreEnvelopeResult {
  success: boolean;
  migrationStatus: MigrationSafetyStatus;
  project: any;
  migrationResult: MigrationResult;
  pendingCustomEquipmentSnapshots: PendingCustomEquipmentSnapshots;
  restoredCustomEquipment: {
    modulesCount: number;
    invertersCount: number;
    batteriesCount: number;
  };
  metadata: Record<string, unknown>;
  envelopeSchemaVersion: string;
  warnings: string[];
}

/**
 * Creates a versioned project transfer envelope bundling custom equipment snapshots (OFF-01).
 */
export function createProjectTransferEnvelope(params: CreateEnvelopeParams): ProjectTransferEnvelope {
  const customStore = CatalogRepository.getCustomEquipment();

  // Project selections are partial engineering projections, not complete catalog
  // records. Never replace a full catalog snapshot with one: it would lack e.g.
  // cell type/lengthMm or inverter technology and fail on re-import. If the
  // selected record no longer exists in the catalog, projectData still retains
  // its exact selected snapshot; we do not invent missing catalog fields.
  const customModulesMap = new Map<string, EnhancedCatalogModule>();
  for (const m of customStore.modules) {
    customModulesMap.set(m.id, m);
  }

  const customInvertersMap = new Map<string, EnhancedCatalogInverter>();
  for (const inv of customStore.inverters) {
    customInvertersMap.set(inv.id, inv);
  }

  const customBatteriesMap = new Map<string, CatalogBattery | EnhancedCatalogBattery>();
  for (const b of customStore.batteries) {
    customBatteriesMap.set(b.id, b);
  }

  const rates: ExchangeRates = {
    ...DEFAULT_EXCHANGE_RATES,
    ...(params.currencyConfig?.exchangeRates || {}),
  };

  return {
    format: 'solarpv_project_envelope',
    schemaVersion: '3.1.0',
    exportedAt: new Date().toISOString(),
    sourceApp: 'SolarPV Studio',
    appVersion: '3.1.0',
    metadata: {
      docId: params.metadata?.docId || `DOC-${Date.now().toString(36).toUpperCase()}`,
      docVersion: params.metadata?.docVersion || '3.1.0',
      ...params.metadata,
    },
    projectData: params.projectData,
    customEquipmentSnapshots: {
      modules: Array.from(customModulesMap.values()),
      inverters: Array.from(customInvertersMap.values()),
      batteries: Array.from(customBatteriesMap.values()),
    },
    currencyConfig: {
      primaryCurrency: params.currencyConfig?.primaryCurrency || 'USD',
      exchangeRates: rates,
    },
  };
}

/**
 * Parse and migrate an import without mutating the catalog or project state.
 * Equipment snapshots are staged until the caller has accepted any warnings.
 */
export function restoreProjectTransferEnvelope(rawInput: unknown): RestoreEnvelopeResult {
  const warnings: string[] = [];
  let envelopeVersion = 'legacy-unknown';
  let metadata: Record<string, unknown> = {};
  let pendingCustomEquipmentSnapshots: PendingCustomEquipmentSnapshots = {
    modules: [], inverters: [], batteries: [],
  };
  let rawProjectPayload: unknown = rawInput;

  if (rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    const obj = rawInput as Record<string, unknown>;
    if (obj.format === 'solarpv_project_envelope') {
      envelopeVersion = typeof obj.schemaVersion === 'string' ? obj.schemaVersion : 'unknown';
      metadata = obj.metadata && typeof obj.metadata === 'object' && !Array.isArray(obj.metadata)
        ? { ...(obj.metadata as Record<string, unknown>) }
        : {};
      rawProjectPayload = obj.projectData && typeof obj.projectData === 'object' && !Array.isArray(obj.projectData)
        ? obj.projectData
        : null;
      const snapshots = obj.customEquipmentSnapshots;
      if (snapshots && typeof snapshots === 'object' && !Array.isArray(snapshots)) {
        const source = snapshots as Record<string, unknown>;
        const invalidFields = ['modules', 'inverters', 'batteries'].filter(
          (key) => source[key] !== undefined && !Array.isArray(source[key]),
        );
        if (invalidFields.length) {
          warnings.push(`Invalid custom equipment snapshot arrays: ${invalidFields.join(', ')}.`);
          rawProjectPayload = null;
        } else {
          pendingCustomEquipmentSnapshots = {
            modules: (source.modules as unknown[] | undefined) ?? [],
            inverters: (source.inverters as unknown[] | undefined) ?? [],
            batteries: (source.batteries as unknown[] | undefined) ?? [],
          };
        }
      }
    } else if (typeof obj.version === 'string') {
      envelopeVersion = obj.version;
    }
  }

  if (Object.keys(metadata).length === 0 && rawInput && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    const rawMetadata = (rawInput as Record<string, unknown>).metadata;
    if (rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)) {
      metadata = { ...(rawMetadata as Record<string, unknown>) };
    }
  }
  const migrationResult = migrateProjectToV3(rawProjectPayload);
  if (warnings.length) {
    migrationResult.warnings.push(...warnings);
    if (migrationResult.migrationStatus !== 'BLOCKED_INCONSISTENT') {
      migrationResult.migrationStatus = 'RECOVERED_WITH_WARNINGS';
      migrationResult.requiresUserConfirmation = true;
    }
  }
  if (envelopeVersion !== 'legacy-unknown' && envelopeVersion !== '3.1.0') {
    migrationResult.warnings.push(`Envelope schema [${envelopeVersion}] is not the current 3.1.0 format; review the migration before applying.`);
    if (migrationResult.migrationStatus !== 'BLOCKED_INCONSISTENT') {
      migrationResult.migrationStatus = 'RECOVERED_WITH_WARNINGS';
      migrationResult.requiresUserConfirmation = true;
    }
  }
  if (migrationResult.success && migrationResult.migrationStatus !== 'BLOCKED_INCONSISTENT') {
    const equipmentValidation = CatalogRepository.getInstance().restoreCustomEquipmentSnapshots(
      pendingCustomEquipmentSnapshots,
      { persist: false },
    );
    if (!equipmentValidation.success) {
      migrationResult.blockerReasons.push(...equipmentValidation.errors);
      migrationResult.warnings.push(...equipmentValidation.errors.map((error) => `Custom equipment import blocked: ${error}`));
      migrationResult.migrationStatus = 'BLOCKED_INCONSISTENT';
      migrationResult.requiresUserConfirmation = false;
    }
  }
  const blocked = !migrationResult.success || migrationResult.migrationStatus === 'BLOCKED_INCONSISTENT';

  return {
    success: !blocked,
    migrationStatus: migrationResult.migrationStatus,
    project: migrationResult.project,
    migrationResult,
    pendingCustomEquipmentSnapshots: blocked
      ? { modules: [], inverters: [], batteries: [] }
      : pendingCustomEquipmentSnapshots,
    restoredCustomEquipment: { modulesCount: 0, invertersCount: 0, batteriesCount: 0 },
    metadata,
    envelopeSchemaVersion: envelopeVersion,
    warnings: [...migrationResult.warnings],
  };
}

/** Persist staged custom equipment only after the caller accepts the migrated project. */
export function commitRestoredCustomEquipment(result: RestoreEnvelopeResult): {
  success: boolean;
  counts: { modules: number; inverters: number; batteries: number };
  errors: string[];
} {
  if (!result.success || result.migrationStatus === 'BLOCKED_INCONSISTENT') {
    return { success: false, counts: { modules: 0, inverters: 0, batteries: 0 }, errors: ['Blocked imports cannot restore equipment.'] };
  }
  const snapshots = result.pendingCustomEquipmentSnapshots;
  if (!snapshots.modules.length && !snapshots.inverters.length && !snapshots.batteries.length) {
    return { success: true, counts: { modules: 0, inverters: 0, batteries: 0 }, errors: [] };
  }
  return CatalogRepository.getInstance().restoreCustomEquipmentSnapshots(snapshots);
}

/** UI import path: serialize batch writes across tabs, reload the latest catalog under lock, then validate/commit atomically. */
export async function commitRestoredCustomEquipmentWithCrossTabLock(result: RestoreEnvelopeResult): Promise<{
  success: boolean;
  counts: { modules: number; inverters: number; batteries: number };
  errors: string[];
}> {
  const snapshots = result.pendingCustomEquipmentSnapshots;
  if (!snapshots.modules.length && !snapshots.inverters.length && !snapshots.batteries.length) {
    return commitRestoredCustomEquipment(result); // no catalog write to serialize
  }
  const repository = CatalogRepository.getInstance();
  return await repository.withCrossTabWriteLock(() => commitRestoredCustomEquipment(result));
}

// ----------------------------------------------------
// Multi-Currency & Internationalization Helpers (OFF-04)
// ----------------------------------------------------

/**
 * Converts a base monetary amount from one currency to another using exchange rates.
 */
export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
  if (from === to) return amount;

  // Convert `from` to USD baseline
  let amountUsd = amount;
  if (from === 'TOMAN') {
    amountUsd = amount / rates.usdToToman;
  } else if (from === 'IRR') {
    amountUsd = amount / (rates.usdToToman * 10);
  } else if (from === 'EUR') {
    amountUsd = amount / (rates.usdToEur || 0.92);
  }

  // Convert USD baseline to `to`
  if (to === 'USD') return amountUsd;
  if (to === 'TOMAN') return amountUsd * rates.usdToToman;
  if (to === 'IRR') return amountUsd * rates.usdToToman * 10;
  if (to === 'EUR') return amountUsd * (rates.usdToEur || 0.92);

  return amountUsd;
}

/**
 * Formats a monetary amount into a clean, human-readable string with currency symbol.
 */
export function formatCurrencyAmount(
  amountUsd: number,
  targetCurrency: SupportedCurrency = 'USD',
  usdToTomanRate: number = 90000,
  locale: 'fa' | 'en' = 'fa'
): string {
  const isEn = locale === 'en';
  const rates: ExchangeRates = { ...DEFAULT_EXCHANGE_RATES, usdToToman: usdToTomanRate };
  const converted = convertCurrency(amountUsd, 'USD', targetCurrency, rates);

  switch (targetCurrency) {
    case 'USD':
      return `$${Math.round(converted).toLocaleString(isEn ? 'en-US' : 'fa-IR')}`;
    case 'EUR':
      return `€${Math.round(converted).toLocaleString(isEn ? 'en-US' : 'fa-IR')}`;
    case 'TOMAN': {
      if (converted >= 1_000_000_000) {
        const billions = (converted / 1_000_000_000).toFixed(2);
        return isEn ? `${billions} B Toman` : `${billions} میلیارد تومان`;
      }
      if (converted >= 1_000_000) {
        const millions = (converted / 1_000_000).toFixed(1);
        return isEn ? `${millions} M Toman` : `${millions} میلیون تومان`;
      }
      return isEn
        ? `${Math.round(converted).toLocaleString()} Toman`
        : `${Math.round(converted).toLocaleString('fa-IR')} تومان`;
    }
    case 'IRR':
      return isEn
        ? `${Math.round(converted).toLocaleString()} IRR`
        : `${Math.round(converted).toLocaleString('fa-IR')} ریال`;
    default:
      return `$${Math.round(amountUsd).toLocaleString()}`;
  }
}

/**
 * Formats standard engineering metrics with international or Persian units.
 */
export function formatLocalizedEngineeringUnit(
  value: number,
  unitType: 'power_kw' | 'energy_mwh' | 'length_m' | 'area_ha' | 'pressure_kpa' | 'weight_kg',
  locale: 'fa' | 'en' = 'fa'
): string {
  const isEn = locale === 'en';
  const numStr = value.toLocaleString(isEn ? 'en-US' : 'fa-IR', { maximumFractionDigits: 2 });

  switch (unitType) {
    case 'power_kw':
      if (value >= 1000) {
        const mw = (value / 1000).toFixed(2);
        return isEn ? `${mw} MWp` : `${mw} مگاوات‌پیک`;
      }
      return isEn ? `${numStr} kWp` : `${numStr} کیلووات‌پیک`;
    case 'energy_mwh':
      if (value >= 1000) {
        const gwh = (value / 1000).toFixed(2);
        return isEn ? `${gwh} GWh/yr` : `${gwh} گیگاوات‌ساعت/سال`;
      }
      return isEn ? `${numStr} MWh/yr` : `${numStr} مگاوات‌ساعت/سال`;
    case 'area_ha':
      return isEn ? `${numStr} Ha` : `${numStr} هکتار`;
    case 'length_m':
      return isEn ? `${numStr} m` : `${numStr} متر`;
    case 'pressure_kpa':
      return isEn ? `${numStr} kPa` : `${numStr} کیلوپاسکال`;
    case 'weight_kg':
      if (value >= 1000) {
        const tons = (value / 1000).toFixed(2);
        return isEn ? `${tons} tonnes` : `${tons} تن`;
      }
      return isEn ? `${numStr} kg` : `${numStr} کیلوگرم`;
    default:
      return `${numStr}`;
  }
}
