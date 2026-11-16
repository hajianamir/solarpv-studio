import { calculateThermalDerate } from './thermalDerate';
import type { InstallationEnvironment } from '../types/climateTypes';

export interface HourlyThermalModelInput {
  latitudeDeg: number;
  peakSunHours: number;
  ambientTempMinC: number;
  ambientTempMaxC: number;
  /** Annual 2 m mean temperature from a provider or an explicitly labeled site estimate. */
  ambientTempMeanC?: number;
  noctC: number;
  tempCoeffPmpPct: number;
  installationEnvironment?: InstallationEnvironment;
  /** Sensitivity perturbation only; not a confidence interval. */
  ambientBiasSensitivityC?: number;
}

export interface HourlyThermalModelResult {
  hourlySamples: number;
  annualThermalDeratePct: number;
  temperatureSensitivityRangePct: { low: number; high: number };
  temperatureSensitivityAllowanceC: number;
  ambientMeanUsedC: number;
  ambientMeanSource: 'provider_annual_mean' | 'derived_from_design_extremes';
  irradianceAnnualKwhM2: number;
  weatherProfileSource: string;
  isMeasuredHourlyWeather: false;
  methodologyNote: string;
}

function annualEnergyFactor(input: HourlyThermalModelInput, ambientBiasC: number, ambientMeanC: number): number {
  const latitudeRad = Math.max(-89.9, Math.min(89.9, input.latitudeDeg)) * Math.PI / 180;
  const irradiationWeights: number[] = [];
  const hourlyAmbient: number[] = [];
  const seasonalAmplitude = Math.min(12, Math.max(4, (input.ambientTempMaxC - input.ambientTempMinC) * 0.22));
  const dailyAmplitude = Math.min(6, Math.max(2, (input.ambientTempMaxC - input.ambientTempMinC) * 0.10));

  for (let day = 0; day < 365; day++) {
    // Cooper declination approximation; this provides solar geometry, not cloud/weather data.
    const declination = 23.44 * Math.sin((2 * Math.PI * (284 + day)) / 365) * Math.PI / 180;
    const seasonalSolar = Math.sin(latitudeRad) * Math.sin(declination)
      + Math.cos(latitudeRad) * Math.cos(declination);
    const seasonalTemperature = Math.cos((2 * Math.PI * (day - 200)) / 365);

    for (let hour = 0; hour < 24; hour++) {
      const hourAngle = ((hour + 0.5 - 12) * 15) * Math.PI / 180;
      const solarElevationProxy = Math.sin(latitudeRad) * Math.sin(declination)
        + Math.cos(latitudeRad) * Math.cos(declination) * Math.cos(hourAngle);
      // Positive horizontal-plane solar proxy. A smooth sinusoidal clear-sky profile is then
      // normalized to the supplied annual PSH; it is not a measured irradiance time series.
      const irradianceWeight = Math.max(0, solarElevationProxy) * Math.max(0.15, 0.75 + 0.25 * seasonalSolar);
      irradiationWeights.push(irradianceWeight);
      const diurnalTemperature = Math.cos((2 * Math.PI * (hour - 15)) / 24);
      const ambient = ambientMeanC + seasonalAmplitude * seasonalTemperature + dailyAmplitude * diurnalTemperature + ambientBiasC;
      hourlyAmbient.push(Math.min(input.ambientTempMaxC, Math.max(input.ambientTempMinC, ambient)));
    }
  }

  const weightSum = irradiationWeights.reduce((sum, weight) => sum + weight, 0);
  if (!(weightSum > 0) || !(input.peakSunHours > 0)) return 0;
  const annualPshKwhM2 = input.peakSunHours * 365;
  // Every one-hour sample receives an irradiance value in W/m² whose integrated daily/yearly
  // energy exactly matches annual PSH; the temporal distribution remains synthetic.
  const irradianceScale = annualPshKwhM2 * 1000 / weightSum;
  const mountingDeltaTC = calculateThermalDerate({
    module: { noctC: input.noctC, tempCoeffPmpPct: input.tempCoeffPmpPct },
    ambientTempMaxC: input.ambientTempMaxC,
    installationEnvironment: input.installationEnvironment,
  }).mountingDeltaTC;

  let referenceEnergy = 0;
  let temperatureAdjustedEnergy = 0;
  for (let i = 0; i < irradiationWeights.length; i++) {
    const irradianceWm2 = irradiationWeights[i] * irradianceScale;
    const cellTempC = hourlyAmbient[i] + mountingDeltaTC + (input.noctC - 20) * (irradianceWm2 / 800);
    const relativePower = Math.max(0, 1 + (input.tempCoeffPmpPct / 100) * (cellTempC - 25));
    referenceEnergy += irradianceWm2;
    temperatureAdjustedEnergy += irradianceWm2 * relativePower;
  }
  return referenceEnergy > 0 ? temperatureAdjustedEnergy / referenceEnergy : 0;
}

/**
 * A synthetic 8760-hour thermal-energy screen. Annual PSH is conserved exactly, but
 * hourly clouds, measured weather, wind, snow and site-specific thermal coefficients are absent.
 */
export function simulateAnnualHourlyThermalDerate(input: HourlyThermalModelInput): HourlyThermalModelResult {
  const safePsh = Number.isFinite(input.peakSunHours) ? Math.max(0, input.peakSunHours) : 0;
  const safeMin = Number.isFinite(input.ambientTempMinC) ? input.ambientTempMinC : 0;
  const safeMax = Number.isFinite(input.ambientTempMaxC) ? input.ambientTempMaxC : safeMin;
  const hasProviderMean = typeof input.ambientTempMeanC === 'number' && Number.isFinite(input.ambientTempMeanC);
  const ambientMeanUsedC = hasProviderMean
    ? input.ambientTempMeanC!
    : (safeMin + safeMax) / 2;
  const modelInput = { ...input, peakSunHours: safePsh, ambientTempMinC: safeMin, ambientTempMaxC: safeMax };
  const baseFactor = annualEnergyFactor(modelInput, 0, ambientMeanUsedC);
  const allowance = Math.max(0, input.ambientBiasSensitivityC ?? 5);
  const lowFactor = annualEnergyFactor(modelInput, -allowance, ambientMeanUsedC);
  const highFactor = annualEnergyFactor(modelInput, allowance, ambientMeanUsedC);
  const toDeratePct = (factor: number) => (1 - factor) * 100;

  return {
    hourlySamples: 365 * 24,
    annualThermalDeratePct: toDeratePct(baseFactor),
    temperatureSensitivityRangePct: {
      low: Math.min(toDeratePct(lowFactor), toDeratePct(highFactor)),
      high: Math.max(toDeratePct(lowFactor), toDeratePct(highFactor)),
    },
    temperatureSensitivityAllowanceC: allowance,
    ambientMeanUsedC,
    ambientMeanSource: hasProviderMean ? 'provider_annual_mean' : 'derived_from_design_extremes',
    irradianceAnnualKwhM2: safePsh * 365,
    weatherProfileSource: 'Synthetic clear-sky-shaped 8760 profile normalized to annual PSH; no hourly provider weather was supplied',
    isMeasuredHourlyWeather: false,
    methodologyNote: 'Temperature-weighted hourly Pmp correction using the module temperature coefficient and NOCT. Ambient seasonal/diurnal profiles are synthetic. The ±temperature band is a sensitivity to an explicit ±5°C bias (or configured amount), not a probability interval or bound on total forecast error.',
  };
}
