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
import { migrateProjectToV3, type MigrationResult } from './core/projectMigration';

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

export interface RestoreEnvelopeResult {
  success: boolean;
  project: any;
  migrationResult: MigrationResult;
  restoredCustomEquipment: {
    modulesCount: number;
    invertersCount: number;
    batteriesCount: number;
  };
  envelopeSchemaVersion: string;
  warnings: string[];
}

/**
 * Creates a versioned project transfer envelope bundling custom equipment snapshots (OFF-01).
 */
export function createProjectTransferEnvelope(params: CreateEnvelopeParams): ProjectTransferEnvelope {
  const customStore = CatalogRepository.getCustomEquipment();

  const customModulesMap = new Map<string, ModuleSpecs | EnhancedCatalogModule>();
  for (const m of customStore.modules) {
    customModulesMap.set(m.id, m);
  }
  const activeModAny = params.activeModule as any;
  if (activeModAny?.isCustom && activeModAny?.id) {
    customModulesMap.set(activeModAny.id, params.activeModule!);
  }

  const customInvertersMap = new Map<string, InverterSpecs | EnhancedCatalogInverter>();
  for (const inv of customStore.inverters) {
    customInvertersMap.set(inv.id, inv);
  }
  const activeInvAny = params.activeInverter as any;
  if (activeInvAny?.isCustom && activeInvAny?.id) {
    customInvertersMap.set(activeInvAny.id, params.activeInverter!);
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
      companyName: params.metadata?.companyName || 'SolarPV Engineering Studio',
      leadEngineer: params.metadata?.leadEngineer || 'Senior PV Engineer',
      clientName: params.metadata?.clientName || 'Valued Client',
      approvalStatus: params.metadata?.approvalStatus || 'Draft',
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
 * Restores project from JSON, handling envelope extraction, custom equipment registration,
 * and deterministic migration across legacy schema versions (OFF-01, OFF-02).
 */
export function restoreProjectTransferEnvelope(rawInput: unknown): RestoreEnvelopeResult {
  const warnings: string[] = [];
  let restoredModules = 0;
  let restoredInverters = 0;
  let restoredBatteries = 0;
  let envelopeVersion = 'legacy-unknown';

  let rawProjectPayload: any = rawInput;

  if (rawInput && typeof rawInput === 'object') {
    const obj = rawInput as Record<string, any>;

    // Case 1: Standard Versioned Envelope (OFF-01)
    if (obj.format === 'solarpv_project_envelope' && obj.projectData) {
      envelopeVersion = obj.schemaVersion || '3.1.0';
      rawProjectPayload = obj.projectData;

      // Restore custom equipment snapshots into unified CatalogRepository
      if (obj.customEquipmentSnapshots) {
        const snapshots = obj.customEquipmentSnapshots;
        if (Array.isArray(snapshots.modules)) {
          for (const mod of snapshots.modules) {
            if (mod && mod.id) {
              CatalogRepository.saveCustomModule(mod);
              restoredModules++;
            }
          }
        }
        if (Array.isArray(snapshots.inverters)) {
          for (const inv of snapshots.inverters) {
            if (inv && inv.id) {
              CatalogRepository.saveCustomInverter(inv);
              restoredInverters++;
            }
          }
        }
        if (Array.isArray(snapshots.batteries)) {
          for (const bat of snapshots.batteries) {
            if (bat && bat.id) {
              CatalogRepository.saveCustomBattery(bat);
              restoredBatteries++;
            }
          }
        }
      }
    } else if (obj.version) {
      envelopeVersion = String(obj.version);
    }
  }

  // Deterministic Project Migration via core projectMigration (OFF-02)
  const migrationResult = migrateProjectToV3(rawProjectPayload);

  if (migrationResult.warnings.length > 0) {
    warnings.push(...migrationResult.warnings);
  }

  return {
    success: migrationResult.success,
    project: migrationResult.project,
    migrationResult,
    restoredCustomEquipment: {
      modulesCount: restoredModules,
      invertersCount: restoredInverters,
      batteriesCount: restoredBatteries,
    },
    envelopeSchemaVersion: envelopeVersion,
    warnings,
  };
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
