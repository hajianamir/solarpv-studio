/**
 * SolarPV Studio v3.0 - Unified Catalog Repository
 * Single Source of Truth for Equipment Catalogs (Built-in + Custom User Equipment)
 *
 * Implements CAT-01 through CAT-06:
 * - Single source of truth for modules, inverters, and batteries
 * - Stable ID assignment with schemaVersion and origin tracking ('builtin' | 'custom')
 * - Full engineering validation with bilingual error messages (FA / EN)
 * - Reactive store subscription pattern with cross-tab storage-event refresh
 * - Persistence failures are returned to callers; browser writes do not claim success while memory-only
 */

import {
  CATALOG_MODULES,
  CATALOG_INVERTERS,
  CATALOG_BATTERIES,
  type CatalogPvModule,
  type CatalogInverter,
  type CatalogBattery,
} from './equipmentCatalogData';

export interface CatalogValidationResult {
  isValid: boolean;
  errorsFa: string[];
  errorsEn: string[];
}

export type CatalogEquipmentOrigin = 'builtin' | 'custom';

export interface EnhancedCatalogModule extends CatalogPvModule {
  origin: CatalogEquipmentOrigin;
  schemaVersion: number;
  noctC?: number;
}

export interface EnhancedCatalogInverter extends CatalogInverter {
  origin: CatalogEquipmentOrigin;
  schemaVersion: number;
}

export interface EnhancedCatalogBattery extends CatalogBattery {
  origin: CatalogEquipmentOrigin;
  schemaVersion: number;
}

const LS_CUSTOM_MODULES = 'solarpv_custom_modules_v3';
const LS_CUSTOM_INVERTERS = 'solarpv_custom_inverters_v3';
const LS_CUSTOM_BATTERIES = 'solarpv_custom_batteries_v3';
const LS_CUSTOM_CATALOG_V4 = 'solarpv_custom_catalog_v4';
// Legacy v2 keys for backward compatibility migration
const LS_LEGACY_MODULES = 'solarpv_custom_modules';
const LS_LEGACY_INVERTERS = 'solarpv_custom_inverters';
const LS_LEGACY_BATTERIES = 'solarpv_custom_batteries';

// Ignore repository bookkeeping when comparing a caller's snapshot with the
// latest durable record. Catalog records are flat engineering specifications.
function sameCatalogRecord(left: object, right: object): boolean {
  const normalize = (record: object) => Object.fromEntries(
    Object.entries(record)
      .filter(([key, value]) => key !== 'origin' && key !== 'schemaVersion' && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

export class CatalogRepository {
  private static instance: CatalogRepository | null = null;
  private listeners: Set<() => void> = new Set();
  // A browser mutation must occur synchronously inside the cross-tab lock.
  private writeLockHeld = false;

  private customModules: EnhancedCatalogModule[] = [];
  private customInverters: EnhancedCatalogInverter[] = [];
  private customBatteries: EnhancedCatalogBattery[] = [];

  private constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key !== LS_CUSTOM_CATALOG_V4 && event.key !== null) return;
        this.loadFromStorage();
        this.notify();
      });
    }
  }

  public static getInstance(): CatalogRepository {
    if (!CatalogRepository.instance) {
      CatalogRepository.instance = new CatalogRepository();
    }
    return CatalogRepository.instance;
  }

  public static getCustomEquipment() {
    return CatalogRepository.getInstance().exportCustomCatalog();
  }

  public static saveCustomModule(mod: CatalogPvModule, expected?: CatalogPvModule) {
    return CatalogRepository.getInstance().saveCustomModule(mod, expected);
  }

  public static saveCustomInverter(inv: CatalogInverter, expected?: CatalogInverter) {
    return CatalogRepository.getInstance().saveCustomInverter(inv, expected);
  }

  public static saveCustomBattery(bat: CatalogBattery, expected?: CatalogBattery) {
    return CatalogRepository.getInstance().saveCustomBattery(bat, expected);
  }

  /**
   * Subscribe to catalog changes. Returns an unsubscribe function.
   * Enables zero-reload reactivity across tabs and components.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Serialize synchronous browser mutations across cooperating same-origin tabs. */
  public async withCrossTabWriteLock<T>(operation: () => T): Promise<T> {
    if (typeof window === 'undefined') return operation();
    const lockManager = window.navigator?.locks;
    if (!lockManager) {
      throw new Error('This browser cannot safely serialize cross-tab catalog writes; no change was applied.');
    }
    return await lockManager.request('solarpv-custom-catalog-v4-write', () => {
      if (!this.loadFromStorage()) {
        throw new Error('The current catalog could not be read safely; no catalog write was attempted.');
      }
      this.notify();
      this.writeLockHeld = true;
      try {
        // The callback must not await: only its synchronous portion holds the
        // repository capability. Public mutations reject outside this scope.
        return operation();
      } finally {
        this.writeLockHeld = false;
      }
    });
  }

  private writeRequiresLock(): boolean {
    return typeof window !== 'undefined' && !this.writeLockHeld;
  }

  private nextCustomId(prefix: string, current: Array<{ id: string }>): string {
    // Identifiers are not security tokens. Resolve collisions against the latest
    // catalog while holding the lock; works even on non-secure HTTP origins.
    let id: string;
    do {
      id = `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    } while (current.some((item) => item.id === id));
    return id;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in catalog repository listener:', err);
      }
    }
  }

  private loadFromStorage(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      const storage = window.localStorage;
      // Prefer one atomic v4 envelope. A malformed envelope is never treated as
      // an empty catalog, because a subsequent write would destroy its contents.
      const catalogEnvelope = storage.getItem(LS_CUSTOM_CATALOG_V4);
      if (catalogEnvelope !== null) {
        const parsed = JSON.parse(catalogEnvelope);
        if (parsed?.version !== 4 || !parsed.custom || typeof parsed.custom !== 'object' ||
            !Array.isArray(parsed.custom.modules) || !Array.isArray(parsed.custom.inverters) ||
            !Array.isArray(parsed.custom.batteries)) {
          throw new Error('Invalid v4 catalog envelope');
        }
        this.customModules = parsed.custom.modules;
        this.customInverters = parsed.custom.inverters;
        this.customBatteries = parsed.custom.batteries;
        return true;
      }

      const readLegacy = (key: string, legacyKey: string): any[] => {
        const raw = storage.getItem(key) ?? storage.getItem(legacyKey);
        if (raw === null) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error(`Invalid legacy catalog array: ${key}`);
        return parsed;
      };
      // Read all arrays before replacing memory so a partial read cannot be saved.
      const modules = readLegacy(LS_CUSTOM_MODULES, LS_LEGACY_MODULES).map((item) => ({
        ...item, origin: 'custom' as const, schemaVersion: item.schemaVersion ?? 3, noctC: item.noctC ?? 45,
      }));
      const inverters = readLegacy(LS_CUSTOM_INVERTERS, LS_LEGACY_INVERTERS).map((item) => ({
        ...item, origin: 'custom' as const, schemaVersion: item.schemaVersion ?? 3,
      }));
      const batteries = readLegacy(LS_CUSTOM_BATTERIES, LS_LEGACY_BATTERIES).map((item) => ({
        ...item, origin: 'custom' as const, schemaVersion: item.schemaVersion ?? 3,
      }));
      this.customModules = modules;
      this.customInverters = inverters;
      this.customBatteries = batteries;
      return true;
    } catch (error) {
      console.warn('Failed to load custom catalog from localStorage:', error);
      return false;
    }
  }

  private saveToStorage(
    modules: EnhancedCatalogModule[] = this.customModules,
    inverters: EnhancedCatalogInverter[] = this.customInverters,
    batteries: EnhancedCatalogBattery[] = this.customBatteries,
  ): boolean {
    // Non-browser tests and server-side import tools have no durable browser store.
    // In a browser, inaccessible/quota-exceeded storage is a hard failure.
    if (typeof window === 'undefined') return true;
    try {
      window.localStorage.setItem(LS_CUSTOM_CATALOG_V4, JSON.stringify({
        version: 4,
        custom: { modules, inverters, batteries },
      }));
      return true;
    } catch (error) {
      console.error('Failed to persist custom catalog; catalog state was not committed:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // PV Modules API
  // --------------------------------------------------------------------------

  public getModules(): EnhancedCatalogModule[] {
    const builtin: EnhancedCatalogModule[] = CATALOG_MODULES.map((m) => ({
      ...m,
      origin: 'builtin',
      schemaVersion: 3,
      noctC: m.noctC ?? 45,
    }));
    return [...builtin, ...this.customModules];
  }

  public getModuleById(id: string): EnhancedCatalogModule | undefined {
    return this.getModules().find((m) => m.id === id);
  }

  public findModuleByModelName(name: string): EnhancedCatalogModule | undefined {
    return this.getModules().find(
      (m) => m.modelName.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  public validateModule(mod: Partial<CatalogPvModule>): CatalogValidationResult {
    const errorsFa: string[] = [];
    const errorsEn: string[] = [];

    if (!mod.modelName || typeof mod.modelName !== 'string' || !mod.modelName.trim()) {
      errorsFa.push('نام مدل پنل نمی‌تواند خالی باشد.');
      errorsEn.push('Module model name cannot be empty.');
    }
    if (!mod.pmpWatts || mod.pmpWatts <= 0) {
      errorsFa.push('توان نامی STC (Pmp) باید عددی مثبت باشد.');
      errorsEn.push('Nominal STC power (Pmp) must be a positive number.');
    }
    if (!mod.vocVolts || mod.vocVolts <= 0) {
      errorsFa.push('ولتاژ مدار باز (Voc) باید عددی مثبت باشد.');
      errorsEn.push('Open-circuit voltage (Voc) must be positive.');
    }
    if (!mod.vmpVolts || mod.vmpVolts <= 0) {
      errorsFa.push('ولتاژ نقطه بیشینه توان (Vmp) باید عددی مثبت باشد.');
      errorsEn.push('Maximum power point voltage (Vmp) must be positive.');
    }
    if (mod.vmpVolts && mod.vocVolts && mod.vmpVolts >= mod.vocVolts) {
      errorsFa.push(`ولتاژ Vmp (${mod.vmpVolts}V) باید کمتر از ولتاژ مدار باز Voc (${mod.vocVolts}V) باشد.`);
      errorsEn.push(`Vmp (${mod.vmpVolts}V) must be strictly less than Voc (${mod.vocVolts}V).`);
    }
    if (!mod.iscAmps || mod.iscAmps <= 0) {
      errorsFa.push('جریان اتصال کوتاه (Isc) باید عددی مثبت باشد.');
      errorsEn.push('Short-circuit current (Isc) must be positive.');
    }
    if (!mod.impAmps || mod.impAmps <= 0) {
      errorsFa.push('جریان نقطه بیشینه توان (Imp) باید عددی مثبت باشد.');
      errorsEn.push('Maximum power point current (Imp) must be positive.');
    }
    if (mod.impAmps && mod.iscAmps && mod.impAmps >= mod.iscAmps) {
      errorsFa.push(`جریان Imp (${mod.impAmps}A) باید کمتر از جریان اتصال کوتاه Isc (${mod.iscAmps}A) باشد.`);
      errorsEn.push(`Imp (${mod.impAmps}A) must be strictly less than Isc (${mod.iscAmps}A).`);
    }
    if (!mod.lengthMm || mod.lengthMm <= 0 || !mod.widthMm || mod.widthMm <= 0) {
      errorsFa.push('طول و عرض پنل باید مقادیر مثبت باشند.');
      errorsEn.push('Module length and width must be positive values.');
    }
    if (!mod.weightKg || mod.weightKg <= 0) {
      errorsFa.push('وزن پنل باید مقداری مثبت باشد.');
      errorsEn.push('Module weight must be a positive value.');
    }
    if (mod.bifacial && mod.bifacialityFactor !== undefined) {
      if (mod.bifacialityFactor <= 0 || mod.bifacialityFactor > 1.0) {
        errorsFa.push('ضریب دوطرفه بودن (Bifaciality Factor) باید بین ۰ و ۱ باشد.');
        errorsEn.push('Bifaciality factor must be between 0 and 1.0.');
      }
    }

    return {
      isValid: errorsFa.length === 0,
      errorsFa,
      errorsEn,
    };
  }

  public saveCustomModule(mod: CatalogPvModule, expected?: CatalogPvModule): { success: boolean; errors?: string[] } {
    if (this.writeRequiresLock()) return { success: false, errors: ['Catalog write rejected: use withCrossTabWriteLock; no write was attempted.'] };
    const val = this.validateModule(mod);
    if (!val.isValid) {
      return { success: false, errors: val.errorsFa };
    }

    // Supplying an expected snapshot means update, never insert. In particular,
    // a record deleted by another tab must not be silently resurrected.
    if (expected && (!mod.id?.startsWith('custom-mod-') || expected.id !== mod.id)) {
      return { success: false, errors: ['Catalog module update has an invalid or mismatched expected ID; no write was attempted.'] };
    }
    const id = mod.id && mod.id.startsWith('custom-mod-')
      ? mod.id
      : this.nextCustomId('custom-mod-', this.customModules);

    const nextModules = [...this.customModules];
    const existingIdx = nextModules.findIndex((m) => m.id === id);
    const enhanced: EnhancedCatalogModule = {
      ...mod,
      id,
      origin: 'custom',
      schemaVersion: 3,
      noctC: (mod as any).noctC ?? 45,
    };

    if (existingIdx >= 0) {
      const current = nextModules[existingIdx];
      const expectedRecord = expected && { ...expected, noctC: expected.noctC ?? 45 };
      if (expectedRecord && !sameCatalogRecord(current, expectedRecord)) {
        return { success: false, errors: ['Catalog module changed; reload before updating it.'] };
      }
      if (sameCatalogRecord(current, enhanced)) return { success: true };
      if (!expectedRecord) {
        return { success: false, errors: ['Catalog module ID already exists; reload and provide the expected current record before replacing it.'] };
      }
      nextModules[existingIdx] = enhanced;
    } else {
      if (expected) return { success: false, errors: ['Catalog module was deleted or is missing; reload before updating it.'] };
      nextModules.push(enhanced);
    }

    if (!this.saveToStorage(nextModules, this.customInverters, this.customBatteries)) {
      return { success: false, errors: ['Could not persist the custom module; the in-memory catalog was not committed; check durable storage before retrying.'] };
    }
    this.customModules = nextModules;
    this.notify();
    return { success: true };
  }

  public deleteCustomModule(id: string, expected?: CatalogPvModule): boolean {
    if (this.writeRequiresLock()) return false;
    const current = this.customModules.find((item) => item.id === id);
    if (typeof window !== 'undefined' && (!current || !expected || expected.id !== id ||
      !sameCatalogRecord(current, { ...expected, noctC: expected.noctC ?? 45 }))) return false;
    const nextModules = this.customModules.filter((m) => m.id !== id);
    if (nextModules.length === this.customModules.length) return false;
    if (!this.saveToStorage(nextModules, this.customInverters, this.customBatteries)) return false;
    this.customModules = nextModules;
    this.notify();
    return true;
  }

  // --------------------------------------------------------------------------
  // Inverters API
  // --------------------------------------------------------------------------

  public getInverters(): EnhancedCatalogInverter[] {
    const builtin: EnhancedCatalogInverter[] = CATALOG_INVERTERS.map((i) => ({
      ...i,
      origin: 'builtin',
      schemaVersion: 3,
    }));
    return [...builtin, ...this.customInverters];
  }

  public getInverterById(id: string): EnhancedCatalogInverter | undefined {
    return this.getInverters().find((i) => i.id === id);
  }

  public findInverterByModelName(name: string): EnhancedCatalogInverter | undefined {
    return this.getInverters().find(
      (i) => i.modelName.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  public validateInverter(inv: Partial<CatalogInverter>): CatalogValidationResult {
    const errorsFa: string[] = [];
    const errorsEn: string[] = [];

    if (!inv.modelName || typeof inv.modelName !== 'string' || !inv.modelName.trim()) {
      errorsFa.push('نام مدل اینورتر نمی‌تواند خالی باشد.');
      errorsEn.push('Inverter model name cannot be empty.');
    }
    if (!inv.pnomKw || inv.pnomKw <= 0) {
      errorsFa.push('توان نامی خروجی (Pnom) باید عددی مثبت باشد.');
      errorsEn.push('Nominal AC output power (Pnom) must be positive.');
    }
    if (!inv.maxPvInputKw || inv.maxPvInputKw <= 0) {
      errorsFa.push('حداکثر توان ورودی DC باید عددی مثبت باشد.');
      errorsEn.push('Maximum DC input power must be positive.');
    }
    if (!inv.vdcMaxVolts || inv.vdcMaxVolts <= 0) {
      errorsFa.push('حداکثر ولتاژ ورودی DC (VdcMax) باید عددی مثبت باشد.');
      errorsEn.push('Maximum DC input voltage (VdcMax) must be positive.');
    }
    if (!inv.vmpptMinVolts || inv.vmpptMinVolts <= 0 || !inv.vmpptMaxVolts || inv.vmpptMaxVolts <= 0) {
      errorsFa.push('محدوده ولتاژ MPPT باید مقادیر مثبت باشند.');
      errorsEn.push('MPPT voltage limits must be positive values.');
    }
    if (inv.vmpptMinVolts && inv.vmpptMaxVolts && inv.vmpptMinVolts >= inv.vmpptMaxVolts) {
      errorsFa.push(`حداقل ولتاژ MPPT (${inv.vmpptMinVolts}V) باید کمتر از حداکثر (${inv.vmpptMaxVolts}V) باشد.`);
      errorsEn.push(`Minimum MPPT voltage (${inv.vmpptMinVolts}V) must be strictly less than maximum (${inv.vmpptMaxVolts}V).`);
    }
    if (inv.vmpptMaxVolts && inv.vdcMaxVolts && inv.vmpptMaxVolts > inv.vdcMaxVolts) {
      errorsFa.push(`سقف ولتاژ MPPT (${inv.vmpptMaxVolts}V) نمی‌تواند بیش از حداکثر ولتاژ مجاز ورودی (${inv.vdcMaxVolts}V) باشد.`);
      errorsEn.push(`Maximum MPPT voltage (${inv.vmpptMaxVolts}V) cannot exceed max DC input voltage (${inv.vdcMaxVolts}V).`);
    }
    if (!inv.mpptCount || inv.mpptCount < 1) {
      errorsFa.push('تعداد MPPT باید حداقل ۱ باشد.');
      errorsEn.push('MPPT count must be at least 1.');
    }
    if (!inv.efficiencyMaxPct || inv.efficiencyMaxPct <= 0 || inv.efficiencyMaxPct > 100) {
      errorsFa.push('بازده بیشینه باید عددی بین ۱ تا ۱۰۰ درصد باشد.');
      errorsEn.push('Maximum efficiency must be between 1 and 100%.');
    }

    return {
      isValid: errorsFa.length === 0,
      errorsFa,
      errorsEn,
    };
  }

  public saveCustomInverter(inv: CatalogInverter, expected?: CatalogInverter): { success: boolean; errors?: string[] } {
    if (this.writeRequiresLock()) return { success: false, errors: ['Catalog write rejected: use withCrossTabWriteLock; no write was attempted.'] };
    const val = this.validateInverter(inv);
    if (!val.isValid) {
      return { success: false, errors: val.errorsFa };
    }

    if (expected && (!inv.id?.startsWith('custom-inv-') || expected.id !== inv.id)) {
      return { success: false, errors: ['Catalog inverter update has an invalid or mismatched expected ID; no write was attempted.'] };
    }
    const id = inv.id && inv.id.startsWith('custom-inv-')
      ? inv.id
      : this.nextCustomId('custom-inv-', this.customInverters);

    const nextInverters = [...this.customInverters];
    const existingIdx = nextInverters.findIndex((i) => i.id === id);
    const enhanced: EnhancedCatalogInverter = {
      ...inv,
      id,
      origin: 'custom',
      schemaVersion: 3,
    };

    if (existingIdx >= 0) {
      const current = nextInverters[existingIdx];
      if (expected && !sameCatalogRecord(current, expected)) {
        return { success: false, errors: ['Catalog inverter changed; reload before updating it.'] };
      }
      if (sameCatalogRecord(current, enhanced)) return { success: true };
      if (!expected) {
        return { success: false, errors: ['Catalog inverter ID already exists; reload and provide the expected current record before replacing it.'] };
      }
      nextInverters[existingIdx] = enhanced;
    } else {
      if (expected) return { success: false, errors: ['Catalog inverter was deleted or is missing; reload before updating it.'] };
      nextInverters.push(enhanced);
    }

    if (!this.saveToStorage(this.customModules, nextInverters, this.customBatteries)) {
      return { success: false, errors: ['Could not persist the custom inverter; the in-memory catalog was not committed; check durable storage before retrying.'] };
    }
    this.customInverters = nextInverters;
    this.notify();
    return { success: true };
  }

  public deleteCustomInverter(id: string, expected?: CatalogInverter): boolean {
    if (this.writeRequiresLock()) return false;
    const current = this.customInverters.find((item) => item.id === id);
    if (typeof window !== 'undefined' && (!current || !expected || expected.id !== id || !sameCatalogRecord(current, expected))) return false;
    const nextInverters = this.customInverters.filter((i) => i.id !== id);
    if (nextInverters.length === this.customInverters.length) return false;
    if (!this.saveToStorage(this.customModules, nextInverters, this.customBatteries)) return false;
    this.customInverters = nextInverters;
    this.notify();
    return true;
  }

  // --------------------------------------------------------------------------
  // Batteries API
  // --------------------------------------------------------------------------

  public getBatteries(): EnhancedCatalogBattery[] {
    const builtin: EnhancedCatalogBattery[] = CATALOG_BATTERIES.map((b) => ({
      ...b,
      origin: 'builtin',
      schemaVersion: 3,
    }));
    return [...builtin, ...this.customBatteries];
  }

  public getBatteryById(id: string): EnhancedCatalogBattery | undefined {
    return this.getBatteries().find((b) => b.id === id);
  }

  public findBatteryByModelName(name: string): EnhancedCatalogBattery | undefined {
    return this.getBatteries().find(
      (b) => b.modelName.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  public validateBattery(bat: Partial<CatalogBattery>): CatalogValidationResult {
    const errorsFa: string[] = [];
    const errorsEn: string[] = [];

    if (!bat.modelName || typeof bat.modelName !== 'string' || !bat.modelName.trim()) {
      errorsFa.push('نام مدل باتری نمی‌تواند خالی باشد.');
      errorsEn.push('Battery model name cannot be empty.');
    }
    if (!bat.capacityKwh || bat.capacityKwh <= 0) {
      errorsFa.push('ظرفیت ذخیره انرژی (kWh) باید عددی مثبت باشد.');
      errorsEn.push('Battery capacity (kWh) must be positive.');
    }
    if (!bat.nominalVoltageVolts || bat.nominalVoltageVolts <= 0) {
      errorsFa.push('ولتاژ نامی باتری (V) باید عددی مثبت باشد.');
      errorsEn.push('Nominal voltage (V) must be positive.');
    }
    if (!bat.nominalCapacityAh || bat.nominalCapacityAh <= 0) {
      errorsFa.push('ظرفیت آمپر-ساعت (Ah) باید عددی مثبت باشد.');
      errorsEn.push('Nominal capacity (Ah) must be positive.');
    }
    // Cross-check: capacityKwh vs V * Ah / 1000
    if (bat.capacityKwh && bat.nominalVoltageVolts && bat.nominalCapacityAh) {
      const calculatedKwh = (bat.nominalVoltageVolts * bat.nominalCapacityAh) / 1000.0;
      const ratio = Math.abs(calculatedKwh - bat.capacityKwh) / bat.capacityKwh;
      if (ratio > 0.25) {
        errorsFa.push(
          `عدم انطباق فیزیکی: حاصلضرب ولتاژ در آمپر‌ساعت (${calculatedKwh.toFixed(2)} kWh) با ظرفیت اعلام‌شده (${bat.capacityKwh} kWh) بیش از ۲۵٪ اختلاف دارد.`
        );
        errorsEn.push(
          `Inconsistent energy capacity: V × Ah / 1000 (${calculatedKwh.toFixed(2)} kWh) diverges from capacity (${bat.capacityKwh} kWh) by over 25%.`
        );
      }
    }
    if (!bat.recommendedDoDPct || bat.recommendedDoDPct <= 0 || bat.recommendedDoDPct > 100) {
      errorsFa.push('عمق مجاز دشارژ (DoD) باید بین ۱ تا ۱۰۰ درصد باشد.');
      errorsEn.push('Recommended depth of discharge (DoD) must be between 1 and 100%.');
    }
    if (!bat.maxContinuousDischargeA || bat.maxContinuousDischargeA <= 0) {
      errorsFa.push('حداکثر جریان دشارژ پیوسته (A) باید عددی مثبت باشد.');
      errorsEn.push('Max continuous discharge current (A) must be positive.');
    }
    if (!bat.cycleLifeAt80DoD || bat.cycleLifeAt80DoD <= 0) {
      errorsFa.push('تعداد سیکل طول عمر باید عددی مثبت باشد.');
      errorsEn.push('Cycle life must be a positive integer.');
    }

    return {
      isValid: errorsFa.length === 0,
      errorsFa,
      errorsEn,
    };
  }

  public saveCustomBattery(bat: CatalogBattery, expected?: CatalogBattery): { success: boolean; errors?: string[] } {
    if (this.writeRequiresLock()) return { success: false, errors: ['Catalog write rejected: use withCrossTabWriteLock; no write was attempted.'] };
    const val = this.validateBattery(bat);
    if (!val.isValid) {
      return { success: false, errors: val.errorsFa };
    }

    if (expected && (!bat.id?.startsWith('custom-bat-') || expected.id !== bat.id)) {
      return { success: false, errors: ['Catalog battery update has an invalid or mismatched expected ID; no write was attempted.'] };
    }
    const id = bat.id && bat.id.startsWith('custom-bat-')
      ? bat.id
      : this.nextCustomId('custom-bat-', this.customBatteries);

    const nextBatteries = [...this.customBatteries];
    const existingIdx = nextBatteries.findIndex((b) => b.id === id);
    const enhanced: EnhancedCatalogBattery = {
      ...bat,
      id,
      origin: 'custom',
      schemaVersion: 3,
    };

    if (existingIdx >= 0) {
      const current = nextBatteries[existingIdx];
      if (expected && !sameCatalogRecord(current, expected)) {
        return { success: false, errors: ['Catalog battery changed; reload before updating it.'] };
      }
      if (sameCatalogRecord(current, enhanced)) return { success: true };
      if (!expected) {
        return { success: false, errors: ['Catalog battery ID already exists; reload and provide the expected current record before replacing it.'] };
      }
      nextBatteries[existingIdx] = enhanced;
    } else {
      if (expected) return { success: false, errors: ['Catalog battery was deleted or is missing; reload before updating it.'] };
      nextBatteries.push(enhanced);
    }

    if (!this.saveToStorage(this.customModules, this.customInverters, nextBatteries)) {
      return { success: false, errors: ['Could not persist the custom battery; the in-memory catalog was not committed; check durable storage before retrying.'] };
    }
    this.customBatteries = nextBatteries;
    this.notify();
    return { success: true };
  }

  public deleteCustomBattery(id: string, expected?: CatalogBattery): boolean {
    if (this.writeRequiresLock()) return false;
    const current = this.customBatteries.find((item) => item.id === id);
    if (typeof window !== 'undefined' && (!current || !expected || expected.id !== id || !sameCatalogRecord(current, expected))) return false;
    const nextBatteries = this.customBatteries.filter((b) => b.id !== id);
    if (nextBatteries.length === this.customBatteries.length) return false;
    if (!this.saveToStorage(this.customModules, this.customInverters, nextBatteries)) return false;
    this.customBatteries = nextBatteries;
    this.notify();
    return true;
  }

  // --------------------------------------------------------------------------
  // Bulk Export / Import (for Project Bundles - OFF-01)
  // --------------------------------------------------------------------------

  public exportCustomCatalog(): {
    modules: EnhancedCatalogModule[];
    inverters: EnhancedCatalogInverter[];
    batteries: EnhancedCatalogBattery[];
  } {
    return {
      modules: [...this.customModules],
      inverters: [...this.customInverters],
      batteries: [...this.customBatteries],
    };
  }

  public importCustomCatalog(bundle?: {
    modules?: CatalogPvModule[];
    inverters?: CatalogInverter[];
    batteries?: CatalogBattery[];
  }): { importedModules: number; importedInverters: number; importedBatteries: number; errors: string[] } {
    const result = this.restoreCustomEquipmentSnapshots(bundle ?? {});
    return {
      importedModules: result.counts.modules,
      importedInverters: result.counts.inverters,
      importedBatteries: result.counts.batteries,
      errors: result.errors,
    };
  }

  /** Validate and persist all imported equipment as one batch. No memory/storage mutation occurs on validation or persistence failure. */
  public restoreCustomEquipmentSnapshots(snapshots: {
    modules?: unknown[];
    inverters?: unknown[];
    batteries?: unknown[];
  }, options: { persist?: boolean } = {}): { success: boolean; counts: { modules: number; inverters: number; batteries: number }; errors: string[] } {
    const errors: string[] = [];
    const modules: EnhancedCatalogModule[] = [];
    const inverters: EnhancedCatalogInverter[] = [];
    const batteries: EnhancedCatalogBattery[] = [];
    const ids = new Set<string>();
    const validateSnapshotId = (rawId: unknown, prefix: string, group: string, index: number): string => {
      if (typeof rawId !== 'string' || !rawId.startsWith(prefix)) {
        errors.push(`${group} snapshot ${index + 1} has no valid custom catalog ID.`);
        return '';
      }
      if (ids.has(`${group}:${rawId}`)) errors.push(`Duplicate ${group} snapshot ID: ${rawId}`);
      ids.add(`${group}:${rawId}`);
      return rawId;
    };

    for (const [index, raw] of (snapshots.modules ?? []).entries()) {
      if (!raw || typeof raw !== 'object') { errors.push(`Module snapshot ${index + 1} is not an object.`); continue; }
      const item = raw as CatalogPvModule;
      const validation = this.validateModule(item);
      const id = validateSnapshotId(item.id, 'custom-mod-', 'module', index);
      if (!item.id || !validation.isValid) { errors.push(`Invalid module snapshot ${index + 1}: ${(validation.errorsEn ?? []).join('; ')}`); continue; }
      if (id) modules.push({ ...item, id, origin: 'custom', schemaVersion: 3, noctC: (item as any).noctC ?? 45 });
    }
    for (const [index, raw] of (snapshots.inverters ?? []).entries()) {
      if (!raw || typeof raw !== 'object') { errors.push(`Inverter snapshot ${index + 1} is not an object.`); continue; }
      const item = raw as CatalogInverter;
      const validation = this.validateInverter(item);
      const id = validateSnapshotId(item.id, 'custom-inv-', 'inverter', index);
      if (!item.id || !validation.isValid) { errors.push(`Invalid inverter snapshot ${index + 1}: ${(validation.errorsEn ?? []).join('; ')}`); continue; }
      if (id) inverters.push({ ...item, id, origin: 'custom', schemaVersion: 3 });
    }
    for (const [index, raw] of (snapshots.batteries ?? []).entries()) {
      if (!raw || typeof raw !== 'object') { errors.push(`Battery snapshot ${index + 1} is not an object.`); continue; }
      const item = raw as CatalogBattery;
      const validation = this.validateBattery(item);
      const id = validateSnapshotId(item.id, 'custom-bat-', 'battery', index);
      if (!item.id || !validation.isValid) { errors.push(`Invalid battery snapshot ${index + 1}: ${(validation.errorsEn ?? []).join('; ')}`); continue; }
      if (id) batteries.push({ ...item, id, origin: 'custom', schemaVersion: 3 });
    }
    const rejectConflictingIds = <T extends { id: string }>(current: T[], incoming: T[], group: string) => {
      const existingById = new Map(current.map((item) => [item.id, item]));
      for (const item of incoming) {
        const existing = existingById.get(item.id);
        if (existing && !sameCatalogRecord(existing, item)) {
          errors.push(`${group} snapshot ID ${item.id} conflicts with an existing catalog record.`);
        }
      }
    };
    rejectConflictingIds(this.customModules, modules, 'Module');
    rejectConflictingIds(this.customInverters, inverters, 'Inverter');
    rejectConflictingIds(this.customBatteries, batteries, 'Battery');
    if (errors.length) return { success: false, counts: { modules: 0, inverters: 0, batteries: 0 }, errors };
    if (options.persist === false) {
      return { success: true, counts: { modules: modules.length, inverters: inverters.length, batteries: batteries.length }, errors: [] };
    }
    if (this.writeRequiresLock()) {
      return { success: false, counts: { modules: 0, inverters: 0, batteries: 0 }, errors: ['Catalog write rejected: use withCrossTabWriteLock; no write was attempted.'] };
    }

    const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      for (const item of incoming) merged.set(item.id, item);
      return Array.from(merged.values());
    };
    const nextModules = mergeById(this.customModules, modules);
    const nextInverters = mergeById(this.customInverters, inverters);
    const nextBatteries = mergeById(this.customBatteries, batteries);

    if (typeof window !== 'undefined') {
      let storage: Storage | undefined;
      const key = LS_CUSTOM_CATALOG_V4;
      let prior: string | null | undefined;
      try {
        storage = window.localStorage;
        prior = storage.getItem(key);
        storage.setItem(key, JSON.stringify({
          version: 4,
          custom: { modules: nextModules, inverters: nextInverters, batteries: nextBatteries },
        }));
      } catch (error) {
        const errors = [`Could not persist imported equipment atomically: ${String(error)}`];
        // Native localStorage.setItem is atomic, but injected/nonconforming
        // storage can throw after modifying the key. Check before attempting a
        // rollback, and never claim success if that check or rollback fails.
        if (prior === undefined || !storage) {
          errors.push('Catalog storage outcome could not be verified; inspect durable storage before retrying.');
        } else {
          try {
            if (storage.getItem(key) !== prior) {
              if (prior === null) storage.removeItem(key);
              else storage.setItem(key, prior);
            }
            if (storage.getItem(key) !== prior) throw new Error('rollback read-back differs from the prior value');
            errors.push('Catalog storage was verified unchanged.');
          } catch (rollbackError) {
            errors.push(`Catalog storage rollback was incomplete or could not be verified; manual recovery may be required: ${String(rollbackError)}`);
          }
        }
        return { success: false, counts: { modules: 0, inverters: 0, batteries: 0 }, errors };
      }
    }

    this.customModules = nextModules;
    this.customInverters = nextInverters;
    this.customBatteries = nextBatteries;
    this.notify();
    return { success: true, counts: { modules: modules.length, inverters: inverters.length, batteries: batteries.length }, errors: [] };
  }

  /**
   * Clears custom equipment (useful for testing or full reset).
   */
  public clearCustomEquipment(): boolean {
    if (this.writeRequiresLock()) return false;
    if (!this.saveToStorage([], [], [])) return false;
    this.customModules = [];
    this.customInverters = [];
    this.customBatteries = [];
    this.notify();
    return true;
  }
}
