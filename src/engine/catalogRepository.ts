/**
 * SolarPV Studio v3.0 - Unified Catalog Repository
 * Single Source of Truth for Equipment Catalogs (Built-in + Custom User Equipment)
 *
 * Implements CAT-01 through CAT-06:
 * - Single source of truth for modules, inverters, and batteries
 * - Stable ID assignment with schemaVersion and origin tracking ('builtin' | 'custom')
 * - Full engineering validation with bilingual error messages (FA / EN)
 * - Reactive store subscription pattern (cross-tab real-time sync without page reload)
 * - Safe localStorage persistence with in-memory fallback
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
// Legacy v2 keys for backward compatibility migration
const LS_LEGACY_MODULES = 'solarpv_custom_modules';
const LS_LEGACY_INVERTERS = 'solarpv_custom_inverters';
const LS_LEGACY_BATTERIES = 'solarpv_custom_batteries';

export class CatalogRepository {
  private static instance: CatalogRepository | null = null;
  private listeners: Set<() => void> = new Set();

  private customModules: EnhancedCatalogModule[] = [];
  private customInverters: EnhancedCatalogInverter[] = [];
  private customBatteries: EnhancedCatalogBattery[] = [];

  private constructor() {
    this.loadFromStorage();
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

  public static saveCustomModule(mod: CatalogPvModule) {
    return CatalogRepository.getInstance().saveCustomModule(mod);
  }

  public static saveCustomInverter(inv: CatalogInverter) {
    return CatalogRepository.getInstance().saveCustomInverter(inv);
  }

  public static saveCustomBattery(bat: CatalogBattery) {
    return CatalogRepository.getInstance().saveCustomBattery(bat);
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

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('Error in catalog repository listener:', err);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      // 1. Modules
      let rawMods = localStorage.getItem(LS_CUSTOM_MODULES);
      if (!rawMods) {
        rawMods = localStorage.getItem(LS_LEGACY_MODULES);
      }
      if (rawMods) {
        const parsed = JSON.parse(rawMods);
        if (Array.isArray(parsed)) {
          this.customModules = parsed.map((m) => ({
            ...m,
            origin: 'custom' as const,
            schemaVersion: m.schemaVersion ?? 3,
            noctC: m.noctC ?? 45,
          }));
        }
      }

      // 2. Inverters
      let rawInvs = localStorage.getItem(LS_CUSTOM_INVERTERS);
      if (!rawInvs) {
        rawInvs = localStorage.getItem(LS_LEGACY_INVERTERS);
      }
      if (rawInvs) {
        const parsed = JSON.parse(rawInvs);
        if (Array.isArray(parsed)) {
          this.customInverters = parsed.map((i) => ({
            ...i,
            origin: 'custom' as const,
            schemaVersion: i.schemaVersion ?? 3,
          }));
        }
      }

      // 3. Batteries
      let rawBats = localStorage.getItem(LS_CUSTOM_BATTERIES);
      if (!rawBats) {
        rawBats = localStorage.getItem(LS_LEGACY_BATTERIES);
      }
      if (rawBats) {
        const parsed = JSON.parse(rawBats);
        if (Array.isArray(parsed)) {
          this.customBatteries = parsed.map((b) => ({
            ...b,
            origin: 'custom' as const,
            schemaVersion: b.schemaVersion ?? 3,
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load custom catalog from localStorage:', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      localStorage.setItem(LS_CUSTOM_MODULES, JSON.stringify(this.customModules));
      localStorage.setItem(LS_CUSTOM_INVERTERS, JSON.stringify(this.customInverters));
      localStorage.setItem(LS_CUSTOM_BATTERIES, JSON.stringify(this.customBatteries));
    } catch (e) {
      console.error('Failed to save custom catalog to localStorage:', e);
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
      noctC: 45,
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

  public saveCustomModule(mod: CatalogPvModule): { success: boolean; errors?: string[] } {
    const val = this.validateModule(mod);
    if (!val.isValid) {
      return { success: false, errors: val.errorsFa };
    }

    const id = mod.id && mod.id.startsWith('custom-mod-')
      ? mod.id
      : `custom-mod-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

    const existingIdx = this.customModules.findIndex((m) => m.id === id);
    const enhanced: EnhancedCatalogModule = {
      ...mod,
      id,
      origin: 'custom',
      schemaVersion: 3,
      noctC: (mod as any).noctC ?? 45,
    };

    if (existingIdx >= 0) {
      this.customModules[existingIdx] = enhanced;
    } else {
      this.customModules.push(enhanced);
    }

    this.saveToStorage();
    this.notify();
    return { success: true };
  }

  public deleteCustomModule(id: string): boolean {
    const initialLen = this.customModules.length;
    this.customModules = this.customModules.filter((m) => m.id !== id);
    if (this.customModules.length !== initialLen) {
      this.saveToStorage();
      this.notify();
      return true;
    }
    return false;
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

  public saveCustomInverter(inv: CatalogInverter): { success: boolean; errors?: string[] } {
    const val = this.validateInverter(inv);
    if (!val.isValid) {
      return { success: false, errors: val.errorsFa };
    }

    const id = inv.id && inv.id.startsWith('custom-inv-')
      ? inv.id
      : `custom-inv-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

    const existingIdx = this.customInverters.findIndex((i) => i.id === id);
    const enhanced: EnhancedCatalogInverter = {
      ...inv,
      id,
      origin: 'custom',
      schemaVersion: 3,
    };

    if (existingIdx >= 0) {
      this.customInverters[existingIdx] = enhanced;
    } else {
      this.customInverters.push(enhanced);
    }

    this.saveToStorage();
    this.notify();
    return { success: true };
  }

  public deleteCustomInverter(id: string): boolean {
    const initialLen = this.customInverters.length;
    this.customInverters = this.customInverters.filter((i) => i.id !== id);
    if (this.customInverters.length !== initialLen) {
      this.saveToStorage();
      this.notify();
      return true;
    }
    return false;
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

  public saveCustomBattery(bat: CatalogBattery): { success: boolean; errors?: string[] } {
    const val = this.validateBattery(bat);
    if (!val.isValid) {
      return { success: false, errors: val.errorsFa };
    }

    const id = bat.id && bat.id.startsWith('custom-bat-')
      ? bat.id
      : `custom-bat-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

    const existingIdx = this.customBatteries.findIndex((b) => b.id === id);
    const enhanced: EnhancedCatalogBattery = {
      ...bat,
      id,
      origin: 'custom',
      schemaVersion: 3,
    };

    if (existingIdx >= 0) {
      this.customBatteries[existingIdx] = enhanced;
    } else {
      this.customBatteries.push(enhanced);
    }

    this.saveToStorage();
    this.notify();
    return { success: true };
  }

  public deleteCustomBattery(id: string): boolean {
    const initialLen = this.customBatteries.length;
    this.customBatteries = this.customBatteries.filter((b) => b.id !== id);
    if (this.customBatteries.length !== initialLen) {
      this.saveToStorage();
      this.notify();
      return true;
    }
    return false;
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
  }): { importedModules: number; importedInverters: number; importedBatteries: number } {
    let importedModules = 0;
    let importedInverters = 0;
    let importedBatteries = 0;

    if (bundle?.modules && Array.isArray(bundle.modules)) {
      for (const m of bundle.modules) {
        if (this.saveCustomModule(m).success) {
          importedModules++;
        }
      }
    }
    if (bundle?.inverters && Array.isArray(bundle.inverters)) {
      for (const i of bundle.inverters) {
        if (this.saveCustomInverter(i).success) {
          importedInverters++;
        }
      }
    }
    if (bundle?.batteries && Array.isArray(bundle.batteries)) {
      for (const b of bundle.batteries) {
        if (this.saveCustomBattery(b).success) {
          importedBatteries++;
        }
      }
    }

    return { importedModules, importedInverters, importedBatteries };
  }

  /**
   * Clears custom equipment (useful for testing or full reset).
   */
  public clearCustomEquipment(): void {
    this.customModules = [];
    this.customInverters = [];
    this.customBatteries = [];
    this.saveToStorage();
    this.notify();
  }
}
