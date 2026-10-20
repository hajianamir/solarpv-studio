// 5-Parameter Single-Diode Model for PV Cells, Modules & Strings
// Solves: I = I_ph - I_0 * [exp((V + I*R_s)/(n*V_t)) - 1] - (V + I*R_s)/R_sh

export interface DiodeParameters {
  iph: number;       // Photocurrent (A)
  i0: number;        // Diode saturation reverse current (A)
  rs: number;        // Series resistance (Ohms)
  rsh: number;       // Shunt resistance (Ohms)
  n: number;         // Diode ideality factor (typically 1.0 to 1.3 for modern TOPCon/PERC)
  vt: number;        // Thermal voltage (V) = (k * T) / q
}

export interface IvPoint {
  v: number; // Voltage (V)
  i: number; // Current (A)
  p: number; // Power (W)
}

export interface IvCurveResult {
  points: IvPoint[];
  voc: number;
  isc: number;
  vmp: number;
  imp: number;
  pmp: number;
  fillFactor: number;
  efficiencyPct: number;
  irradianceWm2: number;
  cellTempC: number;
}

const BOLTZMANN = 1.380649e-23; // J/K
const ELECTRON_CHARGE = 1.60217663e-19; // C

export function calculateSingleDiodeCurve(
  stcVoc: number,
  stcIsc: number,
  stcVmp: number,
  stcImp: number,
  stcPmp: number,
  tempCoeffVocPct: number = -0.26, // %/°C
  tempCoeffIscPct: number = 0.045, // %/°C
  tempCoeffPmpPct: number = -0.30, // %/°C
  irradianceWm2: number = 1000.0,
  cellTempC: number = 25.0,
  seriesModulesCount: number = 1
): IvCurveResult {
  const gRatio = Math.max(0.01, irradianceWm2 / 1000.0);
  const deltaT = cellTempC - 25.0;

  // Thermal voltage per cell and series stack
  const cellsInSeries = Math.round(stcVoc / 0.68) * seriesModulesCount;
  const tempK = cellTempC + 273.15;
  const vt = (cellsInSeries * BOLTZMANN * tempK) / ELECTRON_CHARGE;

  // Temperature and irradiance scaled metrics
  const isc = stcIsc * gRatio * (1.0 + (tempCoeffIscPct / 100.0) * deltaT);
  const voc = Math.max(
    0.1,
    (stcVoc * seriesModulesCount + (tempCoeffVocPct / 100.0) * stcVoc * seriesModulesCount * deltaT) *
      (1.0 + 0.05 * Math.log(gRatio))
  );

  // Ideality factor n
  const n = 1.15;

  // Series and Shunt resistance approximation
  const vmpEstimated = (stcVmp * seriesModulesCount) * (1.0 + (tempCoeffVocPct / 100.0) * deltaT);
  const impEstimated = stcImp * gRatio * (1.0 + (tempCoeffIscPct / 100.0) * deltaT);

  const rs = Math.max(0.01, ((voc - vmpEstimated) / impEstimated) * 0.15);
  const rsh = Math.max(50.0, (voc / (isc - impEstimated)) * 10.0);

  // Photocurrent
  const iph = isc * (1.0 + rs / rsh);

  // Saturation current
  const i0 = (iph - voc / rsh) / Math.max(1e-12, Math.exp(voc / (n * vt)) - 1.0);

  // Trace 100 points along the I-V curve using Newton-Raphson
  const points: IvPoint[] = [];
  const numSteps = 80;
  let maxP = 0;
  let vAtMaxP = 0;
  let iAtMaxP = 0;

  for (let step = 0; step <= numSteps; step++) {
    const v = (voc * step) / numSteps;
    let i = isc * (1.0 - Math.pow(step / numSteps, 3.5)); // Good initial guess

    // Newton-Raphson iteration for transcendental diode equation
    for (let iter = 0; iter < 15; iter++) {
      const expTerm = Math.exp(Math.min(60.0, (v + i * rs) / (n * vt)));
      const f = iph - i0 * (expTerm - 1.0) - (v + i * rs) / rsh - i;
      const df = -i0 * expTerm * (rs / (n * vt)) - rs / rsh - 1.0;

      const deltaI = f / df;
      i -= deltaI;
      if (Math.abs(deltaI) < 1e-5) break;
    }

    const currentClamped = Math.max(0.0, i);
    const power = v * currentClamped;

    if (power > maxP) {
      maxP = power;
      vAtMaxP = v;
      iAtMaxP = currentClamped;
    }

    points.push({
      v: Math.round(v * 100) / 100,
      i: Math.round(currentClamped * 100) / 100,
      p: Math.round(power * 10) / 10,
    });
  }

  const fillFactor = maxP > 0 ? maxP / (voc * isc) : 0;
  const nominalArea = 2.5 * seriesModulesCount; // approx 2.5 m2 per 580W panel
  const incidentSolarPower = irradianceWm2 * nominalArea;
  const efficiencyPct = incidentSolarPower > 0 ? (maxP / incidentSolarPower) * 100.0 : 0;

  return {
    points,
    voc: Math.round(voc * 100) / 100,
    isc: Math.round(isc * 100) / 100,
    vmp: Math.round(vAtMaxP * 100) / 100,
    imp: Math.round(iAtMaxP * 100) / 100,
    pmp: Math.round(maxP * 10) / 10,
    fillFactor: Math.round(fillFactor * 1000) / 1000,
    efficiencyPct: Math.round(efficiencyPct * 10) / 10,
    irradianceWm2,
    cellTempC,
  };
}
