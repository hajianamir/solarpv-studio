// Advanced PV Array Engineering, String Sizing & Deratings (IEC 62548 / NEC 690.7)

import { calculateThermalDerate } from './core/thermalDerate';
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
  dcAcRatio: number;
  effectiveDeratingFactor: number;
  cellTempHotC: number;
  powerTempDeratePct: number;
  netArrayAreaM2: number;
  interRowSpacingM: number;
  grossRequiredLandAreaM2: number;
  winterSunAltitudeDeg: number;
  warnings: string[];
}

export function designPvArray(
  requiredDailyKwh: number,
  peakSunHours: number,
  module: ModuleSpecs,
  inverter: InverterSpecs,
  deratings: SiteDeratings,
  latitudeDeg: number
): PvArrayDesignResult {
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

  const effectiveDeratingFactor =
    derateTemp * derateSoiling * derateCable * derateMismatch * derateInverter * derateAvailability;

  // 4. Required DC Array power
  // Energy = P_dc * PSH * Deratings
  const psh = Math.max(2.5, peakSunHours);
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

  if (minModulesAllowed > upperLimit) {
    warnings.push("محدوده ولتاژ MPPT اینورتر برای دمای محیط انتخاب‌شده سازگار نیست (حداقل ماژول از حداکثر بیشتر است).");
  }

  // Choose optimal modules per string (aiming for middle of MPPT window, approx ~70% of VdcMax)
  let chosenModulesPerString = Math.round((minModulesAllowed + upperLimit) / 2);
  chosenModulesPerString = Math.max(1, Math.min(upperLimit, Math.max(minModulesAllowed, chosenModulesPerString)));

  // 6. Calculate total modules and parallel strings
  const singleModuleKwp = module.pmpWatts / 1000.0;
  const initialTotalModules = Math.ceil(requiredArrayKwp / singleModuleKwp);

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
  const moduleAreaM2 = module.lengthM * module.widthM;
  const netArrayAreaM2 = totalModulesCount * moduleAreaM2;

  // Inter-row pitch calculation for winter solstice noon:
  // Solar altitude angle at winter solstice: alpha = 90 - latitude - 23.45
  // Row spacing D = H * (cos(tilt) + sin(tilt) / tan(alpha))
  const tiltRad = (deratings.arrayTiltDeg * Math.PI) / 180.0;
  const panelHeightProjectedM = module.lengthM * Math.sin(tiltRad);
  const panelGroundDepthM = module.lengthM * Math.cos(tiltRad);

  // Winter-solstice noon solar altitude from site latitude (PR-2a-7-P0):
  // alpha = 90° - |latitude| - |declination(-23.45°)|, floored at 5° to avoid
  // infinite row spacing at extreme latitudes.
  const winterSolsticeDeclinationDeg = -23.45;
  const solarAltitudeWinterDeg =
    90.0 - Math.abs(latitudeDeg) - Math.abs(winterSolsticeDeclinationDeg);
  const winterSunAltitudeDeg = Math.max(5.0, solarAltitudeWinterDeg);
  const sunElevationRad = (winterSunAltitudeDeg * Math.PI) / 180.0;
  const shadowLengthM = panelHeightProjectedM / Math.tan(sunElevationRad);
  const interRowSpacingM = panelGroundDepthM + shadowLengthM;

  // Gross area incorporates maintenance walkways (+30%)
  const grossRequiredLandAreaM2 = (totalModulesCount / chosenModulesPerString) * (module.widthM * chosenModulesPerString) * interRowSpacingM * 1.30;

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
    dcAcRatio,
    effectiveDeratingFactor,
    cellTempHotC,
    powerTempDeratePct,
    netArrayAreaM2,
    interRowSpacingM,
    grossRequiredLandAreaM2,
    winterSunAltitudeDeg,
    warnings,
  };
}
