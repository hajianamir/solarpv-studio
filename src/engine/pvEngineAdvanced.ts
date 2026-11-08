// Advanced PV Array Engineering, String Sizing & Deratings (IEC 62548 / NEC 690.7)

import { calculateThermalDerate } from './core/thermalDerate';
import { calculateWinterSolsticeNoonAltitudeDeg } from './core/solarGeometryContract';
import type { InstallationEnvironment } from './types/climateTypes';

export interface ModuleSpecs {
  modelName: string;
  manufacturer: string;
  pmpWatts: number;
  vocVolts: number;
  vmpVolts: number;
  iscAmps: number;
  impAmps: number;
  tempCoeffVocPct: number;  // e.g. -0.28 %/°C
  tempCoeffPmpPct: number;  // e.g. -0.32 %/°C
  tempCoeffIscPct?: number; // e.g. +0.045 %/°C (IEC 60891 semiconductor current coefficient)
  tempCoeffVmpPct?: number; // e.g. -0.36 %/°C (or derived gamma_Pmp - alpha_Isc)
  noctC: number;            // e.g. 45 °C
  lengthM: number;          // e.g. 2.278 m
  widthM: number;           // e.g. 1.134 m
  bifacialityFactor?: number; // e.g. 0.70
}

export interface InverterSpecs {
  modelName: string;
  manufacturer: string;
  pnomAcKw: number;
  vdcMaxVolts: number;
  vmpptMinVolts: number;
  vmpptMaxVolts: number;
  iscMaxAmpsPerMppt: number;
  imppMaxAmpsPerMppt: number;
  mpptChannelsCount: number;
  efficiencyMaxPct: number;
  isThreePhase: boolean;
}

export interface SiteDeratings {
  ambientTempMinC: number;
  ambientTempMaxC: number;
  soilingLossPct: number;       // e.g. 4.0%
  dcCableLossPct: number;       // e.g. 1.5%
  mismatchAndLidLossPct: number;// e.g. 2.0%
  inverterClippingLossPct: number; // e.g. 1.0%
  systemAvailabilityPct: number;// e.g. 99.0%
  groundAlbedo: number;         // e.g. 0.20
  arrayTiltDeg: number;         // e.g. 30°
  installationEnvironment?: InstallationEnvironment;
}

export interface PvArrayDesignResult {
  totalPvCapacityKwp: number;
  totalModulesCount: number;
  modulesPerString: number;
  parallelStringsCount: number;
  minModulesPerStringAllowed: number;
  maxModulesPerStringAllowed: number;
  stringVocMaxColdVolts: number;
  stringVmpMinHotVolts: number;
  maxMpptOperatingCurrentAmps: number;
  maxMpptShortCircuitCurrentAmps: number;
  isMpptCurrentCompliant: boolean;
  isVoltageFeasible: boolean;
  isDesignFeasible: boolean;
  dcAcRatio: number;
  effectiveDeratingFactor: number;
  cellTempHotC: number;
  powerTempDeratePct: number;
  netArrayAreaM2: number;
  interRowSpacingM: number;
  grossRequiredLandAreaM2: number;
  winterSunAltitudeDeg: number;
  warnings: string[];
  estimatedAnnualYieldKwh?: number;
  specificYieldKwhPerKwp?: number;
}

export function designPvArray(
  requiredDailyKwh: number,
  peakSunHours: number,
  module: ModuleSpecs,
  inverter: InverterSpecs,
  deratings: SiteDeratings,
  latitudeDeg: number
): PvArrayDesignResult {
  // Input Validation Layer (Z-01 remediation)
  if (!Number.isFinite(requiredDailyKwh) || requiredDailyKwh <= 0) {
    throw new RangeError(`Invalid requiredDailyKwh: value must be a strictly positive finite number, got ${requiredDailyKwh}`);
  }
  if (!Number.isFinite(peakSunHours) || peakSunHours <= 0) {
    throw new RangeError(`Invalid peakSunHours: value must be strictly positive and finite, got ${peakSunHours}`);
  }
  if (!module || typeof module !== 'object') {
    throw new TypeError('Invalid module: module specifications object is required');
  }
  if (!Number.isFinite(module.pmpWatts) || module.pmpWatts <= 0) {
    throw new RangeError(`Invalid module pmpWatts: must be a positive finite number, got ${module?.pmpWatts}`);
  }
  if (!Number.isFinite(module.vocVolts) || module.vocVolts <= 0) {
    throw new RangeError(`Invalid module vocVolts: must be a positive finite number, got ${module?.vocVolts}`);
  }
  if (!Number.isFinite(module.vmpVolts) || module.vmpVolts <= 0) {
    throw new RangeError(`Invalid module vmpVolts: must be a positive finite number, got ${module?.vmpVolts}`);
  }
  if (!inverter || typeof inverter !== 'object') {
    throw new TypeError('Invalid inverter: inverter specifications object is required');
  }
  if (!Number.isFinite(inverter.pnomAcKw) || inverter.pnomAcKw <= 0) {
    throw new RangeError(`Invalid inverter pnomAcKw: must be a positive finite number, got ${inverter?.pnomAcKw}`);
  }
  if (!Number.isFinite(inverter.vdcMaxVolts) || inverter.vdcMaxVolts <= 0) {
    throw new RangeError(`Invalid inverter vdcMaxVolts: must be a positive finite number, got ${inverter?.vdcMaxVolts}`);
  }
  if (!Number.isFinite(inverter.vmpptMinVolts) || inverter.vmpptMinVolts <= 0) {
    throw new RangeError(`Invalid inverter vmpptMinVolts: must be a positive finite number, got ${inverter?.vmpptMinVolts}`);
  }
  if (!Number.isFinite(inverter.vmpptMaxVolts) || inverter.vmpptMaxVolts <= 0) {
    throw new RangeError(`Invalid inverter vmpptMaxVolts: must be a positive finite number, got ${inverter?.vmpptMaxVolts}`);
  }
  if (!deratings || typeof deratings !== 'object') {
    throw new TypeError('Invalid deratings: site deratings object is required');
  }
  if (!Number.isFinite(deratings.ambientTempMaxC)) {
    throw new RangeError(`Invalid deratings ambientTempMaxC: must be a finite number, got ${deratings?.ambientTempMaxC}`);
  }
  if (!Number.isFinite(deratings.ambientTempMinC)) {
    throw new RangeError(`Invalid deratings ambientTempMinC: must be a finite number, got ${deratings?.ambientTempMinC}`);
  }
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
    throw new RangeError(`Invalid latitudeDeg: must be a finite number between -90 and 90, got ${latitudeDeg}`);
  }

  const warnings: string[] = [];

  // 1. Cell temperature in hot design conditions — unified thermal model (PR-2a-7-P0)
  // G_poa ≈ 1000 W/m² at peak noon; single source of truth: thermalDerate.ts
  const thermal = calculateThermalDerate({
    module: { noctC: module.noctC, tempCoeffPmpPct: module.tempCoeffPmpPct },
    ambientTempMaxC: deratings.ambientTempMaxC,
    installationEnvironment: deratings.installationEnvironment,
  });
  const cellTempHotC = thermal.cellTempHotC;

  // 2. Power loss due to temperature
  const powerTempDeratePct = thermal.deratePct;

  // 3. Overall combined system derating factor
  const derateTemp = 1.0 - (powerTempDeratePct / 100.0);
  const derateSoiling = 1.0 - (deratings.soilingLossPct / 100.0);
  const derateCable = 1.0 - (deratings.dcCableLossPct / 100.0);
  const derateMismatch = 1.0 - (deratings.mismatchAndLidLossPct / 100.0);
  const derateInverter = inverter.efficiencyMaxPct / 100.0;
  const derateAvailability = deratings.systemAvailabilityPct / 100.0;
  const derateClipping = 1.0 - ((deratings.inverterClippingLossPct ?? 0.0) / 100.0);

  const effectiveDeratingFactor =
    derateTemp * derateSoiling * derateCable * derateMismatch * derateInverter * derateAvailability * derateClipping;

  // 4. Required DC Array power
  // Energy = P_dc * PSH * Deratings
  const psh = peakSunHours;
  const requiredArrayKwp = requiredDailyKwh / (psh * effectiveDeratingFactor);

  // 5. String Sizing per IEC 62548 / NEC 690.7
  // Cold condition Voc_max:
  const vocTempCoeffDec = module.tempCoeffVocPct / 100.0; // negative number
  const singleModuleVocMaxCold = module.vocVolts * (1.0 + vocTempCoeffDec * (deratings.ambientTempMinC - 25.0));

  // Hot condition Vmp_min:
  // IEC 60891 & IEC 62548 semiconductor physics:
  // gamma_Pmp ≈ gamma_Vmp + alpha_Isc => gamma_Vmp = gamma_Pmp - alpha_Isc
  // Evaluated at cell temperature (cellTempHotC via unified NOCT model).
  // When tempCoeffVmpPct is explicitly specified, use it.
  // When tempCoeffIscPct is provided, decouple via (gamma_Pmp - alpha_Isc).
  // Otherwise, default to tempCoeffPmpPct for benchmark baseline compatibility.
  const vmpTempCoeffPct = module.tempCoeffVmpPct ?? (
    module.tempCoeffIscPct !== undefined
      ? module.tempCoeffPmpPct - module.tempCoeffIscPct
      : module.tempCoeffPmpPct
  );
  const vmpTempCoeffDec = vmpTempCoeffPct / 100.0;
  const singleModuleVmpMinHot = module.vmpVolts * (1.0 + vmpTempCoeffDec * (cellTempHotC - 25.0));

  // Max series modules limited by Inverter Max Vdc
  const maxModulesAllowed = Math.floor(inverter.vdcMaxVolts / singleModuleVocMaxCold);
  // Max series modules limited by MPPT Max
  // IEC 62548 §7.2: MPPT upper-bound from coldest-day Vmp.
  const singleModuleVmpMaxCold =
    module.vmpVolts * (1.0 + vmpTempCoeffDec * (deratings.ambientTempMinC - 25.0));
  const maxModulesMppt = Math.floor(inverter.vmpptMaxVolts / singleModuleVmpMaxCold);
  const upperLimit = Math.min(maxModulesAllowed, maxModulesMppt);

  // Min series modules limited by MPPT Min
  const minModulesAllowed = Math.ceil(inverter.vmpptMinVolts / singleModuleVmpMinHot);
  const isVoltageFeasible = minModulesAllowed <= upperLimit && minModulesAllowed > 0;

  if (!isVoltageFeasible) {
    warnings.push(
      "محدوده ولتاژ MPPT اینورتر برای دمای محیط انتخاب‌شده سازگار نیست (طراحی ولتاژ ناممکن است؛ حداقل ماژول بیش از حداکثر است)."
    );
  }

  // Choose optimal modules per string (aiming for middle of MPPT window, approx ~70% of VdcMax)
  let chosenModulesPerString = Math.round((minModulesAllowed + upperLimit) / 2);
  chosenModulesPerString = Math.max(1, Math.min(upperLimit, Math.max(minModulesAllowed, chosenModulesPerString)));

  // 6. Calculate total modules and parallel strings
  const singleModuleKwp = module.pmpWatts / 1000.0;
  const initialTotalModules = Math.ceil(requiredArrayKwp / singleModuleKwp);

  // Eliminate false 20-module floor for small residential/commercial systems (e.g. G-2 with 3 kWh/day).
  // When the required module count is smaller than the utility string length,
  // size the string to initialTotalModules to ensure strict sizing monotonicity.
  if (initialTotalModules < chosenModulesPerString) {
    if (initialTotalModules < minModulesAllowed) {
      warnings.push(
        "تعداد ماژول‌های مورد نیاز بار کمتر از حداقل پنجره ولتاژ MPPT اینورتر است؛ سایزینگ بر اساس تعداد واقعی ماژول‌های بار انجام شد و استفاده از اینورتر متناسب یا میکرواینورتر توصیه می‌شود."
      );
    }
    chosenModulesPerString = Math.max(1, initialTotalModules);
  }

  let parallelStrings = Math.ceil(initialTotalModules / chosenModulesPerString);
  if (parallelStrings < 1) parallelStrings = 1;

  const totalModulesCount = parallelStrings * chosenModulesPerString;
  const totalPvCapacityKwp = totalModulesCount * singleModuleKwp;

  const stringVocMaxColdVolts = chosenModulesPerString * singleModuleVocMaxCold;
  const stringVmpMinHotVolts = chosenModulesPerString * singleModuleVmpMinHot;

  if (stringVocMaxColdVolts > inverter.vdcMaxVolts) {
    warnings.push(`ولتاژ مدار باز در سردترین روز (${stringVocMaxColdVolts.toFixed(1)}V) از ولتاژ نامی اینورتر (${inverter.vdcMaxVolts}V) بیشتر است! خطر آسیب به اینورتر.`);
  }

  // 7. MPPT Current & Short-Circuit Constraints (IEC 62548 §7.3.3 & NEC 690.8)
  const stringsPerMppt = Math.ceil(parallelStrings / Math.max(1, inverter.mpptChannelsCount));
  const maxMpptOperatingCurrentAmps = Number((stringsPerMppt * module.impAmps).toFixed(2));
  // 1.25 safety factor for cloud-enhancement / bifacial surge over STC
  const maxMpptShortCircuitCurrentAmps = Number((stringsPerMppt * module.iscAmps * 1.25).toFixed(2));

  let isMpptCurrentCompliant = true;
  if (inverter.imppMaxAmpsPerMppt > 0 && maxMpptOperatingCurrentAmps > inverter.imppMaxAmpsPerMppt) {
    isMpptCurrentCompliant = false;
    warnings.push(
      `جریان کارکرد MPPT (${maxMpptOperatingCurrentAmps.toFixed(1)}A با ${stringsPerMppt} رشته/MPPT) از سقف مجاز اینورتر (${inverter.imppMaxAmpsPerMppt}A) فراتر است. خطر برش جریان (Clipping).`
    );
  }

  if (inverter.iscMaxAmpsPerMppt > 0 && maxMpptShortCircuitCurrentAmps > inverter.iscMaxAmpsPerMppt) {
    isMpptCurrentCompliant = false;
    warnings.push(
      `جریان اتصال کوتاه MPPT (${maxMpptShortCircuitCurrentAmps.toFixed(1)}A با ضریب ۱.۲۵) از سقف اتصال کوتاه اینورتر (${inverter.iscMaxAmpsPerMppt}A) فراتر است! خطر آسیب به کلیدهای قدرت اینورتر.`
    );
  }

  const dcAcRatio = totalPvCapacityKwp / inverter.pnomAcKw;
  if (dcAcRatio > 1.4) {
    warnings.push(`نسبت DC به AC برابر ${dcAcRatio.toFixed(2)} است که بالاتر از سقف بهینه (۱.۳۵) بوده و ممکن است باعث تلفات برش توان (Clipping Loss) شود.`);
  }

  // 7. Area & Inter-row shading distance
  const modLength = (Number.isFinite(module.lengthM) && module.lengthM > 0) ? module.lengthM : 2.278;
  const modWidth = (Number.isFinite(module.widthM) && module.widthM > 0) ? module.widthM : 1.134;
  const moduleAreaM2 = modLength * modWidth;
  const netArrayAreaM2 = totalModulesCount * moduleAreaM2;

  // Inter-row pitch calculation for winter solstice noon:
  // Solar altitude angle at winter solstice: alpha = 90 - |latitude| - |delta|
  // Row spacing D = H * (cos(tilt) + sin(tilt) / tan(alpha))
  const tiltRad = (deratings.arrayTiltDeg * Math.PI) / 180.0;
  const panelHeightProjectedM = modLength * Math.sin(tiltRad);
  const panelGroundDepthM = modLength * Math.cos(tiltRad);

  // Winter-solstice noon solar altitude from site latitude (unified solarGeometryContract):
  const winterSolstice = calculateWinterSolsticeNoonAltitudeDeg(latitudeDeg);
  const winterSunAltitudeDeg = winterSolstice.clampedAltitudeDeg;
  const sunElevationRad = (winterSunAltitudeDeg * Math.PI) / 180.0;
  const shadowLengthM = panelHeightProjectedM / Math.tan(sunElevationRad);
  const interRowSpacingM = panelGroundDepthM + shadowLengthM;

  // Gross area incorporates maintenance walkways (+30%)
  const grossRequiredLandAreaM2 = (totalModulesCount / chosenModulesPerString) * (modWidth * chosenModulesPerString) * interRowSpacingM * 1.30;

  const estimatedAnnualYieldKwh = Number((totalPvCapacityKwp * peakSunHours * effectiveDeratingFactor * 365.0).toFixed(2));
  const specificYieldKwhPerKwp = totalPvCapacityKwp > 0 ? Number((peakSunHours * effectiveDeratingFactor * 365.0).toFixed(2)) : 0;

  return {
    totalPvCapacityKwp,
    totalModulesCount,
    modulesPerString: chosenModulesPerString,
    parallelStringsCount: parallelStrings,
    minModulesPerStringAllowed: minModulesAllowed,
    maxModulesPerStringAllowed: upperLimit,
    stringVocMaxColdVolts,
    stringVmpMinHotVolts,
    maxMpptOperatingCurrentAmps,
    maxMpptShortCircuitCurrentAmps,
    isMpptCurrentCompliant,
    isVoltageFeasible,
    isDesignFeasible: isVoltageFeasible && isMpptCurrentCompliant,
    dcAcRatio,
    effectiveDeratingFactor,
    cellTempHotC,
    powerTempDeratePct,
    netArrayAreaM2,
    interRowSpacingM,
    grossRequiredLandAreaM2,
    winterSunAltitudeDeg,
    warnings,
    estimatedAnnualYieldKwh,
    specificYieldKwhPerKwp,
  };
}
