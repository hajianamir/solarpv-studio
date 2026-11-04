// 5-Parameter Single-Diode Model for PV Cells, Modules & Strings (De Soto / SAM Formulation)
// Solves: I = I_ph - I_0 * [exp((V + I*R_s)/(n*V_t)) - 1] - (V + I*R_s)/R_sh
// Incorporates bandgap energy temperature dependence Eg(T) and irradiance-scaled Rsh(G)

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
  extractedParameters?: DiodeParameters;
}

const BOLTZMANN = 1.380649e-23; // J/K
const ELECTRON_CHARGE = 1.60217663e-19; // C
const EG_REF_EV = 1.121; // Bandgap energy for Silicon at 25°C (eV)
const D_EG_DT = 0.0002677; // Bandgap temperature coefficient (eV/K)

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
  seriesModulesCount: number = 1,
  customParams?: Partial<DiodeParameters>
): IvCurveResult {
  const gRatio = Math.max(0.01, irradianceWm2 / 1000.0);
  const deltaT = cellTempC - 25.0;
  const tempK = cellTempC + 273.15;
  const tRefK = 298.15;

  // Cells in series stack
  const cellsInSeries = Math.round(stcVoc / 0.68) * seriesModulesCount;

  // Ideality factor n
  const n = customParams?.n ?? 1.05;

  // Thermal voltage at reference temperature and actual cell temperature
  const aRef = (n * cellsInSeries * BOLTZMANN * tRefK) / ELECTRON_CHARGE;
  const aActual = aRef * (tempK / tRefK);
  const vt = (cellsInSeries * BOLTZMANN * tempK) / ELECTRON_CHARGE;

  // Reference Series and Shunt resistance (De Soto parameter extraction)
  const rsRef = customParams?.rs ?? Math.max(0.01, ((stcVoc - stcVmp) / stcImp) * 0.235);
  const rshRef = customParams?.rsh ?? Math.max(50.0, (stcVoc / Math.max(1e-6, stcIsc - stcImp)) * 10.0);

  // De Soto Irradiance-scaled shunt resistance: Rsh(G) = Rsh,ref * (G_ref / G)
  const rsh = rshRef / gRatio;
  const rs = rsRef;

  // Temperature-dependent bandgap energy: Eg(T) = Eg,ref * [1 - dEg/dT * (T - Tref)]
  const egRef = EG_REF_EV;
  const egActual = egRef * (1.0 - D_EG_DT * deltaT);

  // Reference photocurrent & saturation current
  const iphRef = customParams?.iph ?? (stcIsc * (1.0 + rs / rshRef));
  const i0Ref = customParams?.i0 ?? ((iphRef - stcVoc / rshRef) / Math.max(1e-12, Math.exp(stcVoc / aRef) - 1.0));

  // De Soto Scaled photocurrent: Iph(G, T) = (G / Gref) * [Iph,ref + alpha_Isc * (T - Tref)]
  const iph = gRatio * (iphRef + (tempCoeffIscPct / 100.0) * stcIsc * deltaT);

  // De Soto Scaled saturation current with bandgap temperature dependence
  const i0 = i0Ref * Math.pow(tempK / tRefK, 3.0) * Math.exp(
    (ELECTRON_CHARGE / BOLTZMANN) * (egRef / tRefK - egActual / tempK)
  );

  // Scaled open-circuit and short-circuit estimates for curve bounds
  const isc = stcIsc * gRatio * (1.0 + (tempCoeffIscPct / 100.0) * deltaT);
  const voc = Math.max(
    0.1,
    (stcVoc * seriesModulesCount + (tempCoeffVocPct / 100.0) * stcVoc * seriesModulesCount * deltaT) *
      (1.0 + 0.05 * Math.log(gRatio))
  );

  // Trace 80 points along the I-V curve using Newton-Raphson
  const points: IvPoint[] = [];
  const numSteps = 80;
  let maxP = 0;
  let vAtMaxP = 0;
  let iAtMaxP = 0;

  for (let step = 0; step <= numSteps; step++) {
    const v = (voc * step) / numSteps;
    let i = iph * (1.0 - Math.pow(step / numSteps, 3.5)); // Initial guess

    // Newton-Raphson iteration for transcendental diode equation:
    // f(I) = I_ph - I_0 * [exp((V + I*Rs) / a) - 1] - (V + I*Rs)/Rsh - I = 0
    for (let iter = 0; iter < 20; iter++) {
      const expTerm = Math.exp(Math.min(60.0, (v + i * rs) / aActual));
      const f = iph - i0 * (expTerm - 1.0) - (v + i * rs) / rsh - i;
      const df = -i0 * expTerm * (rs / aActual) - rs / rsh - 1.0;

      const deltaI = f / df;
      i -= deltaI;
      if (Math.abs(deltaI) < 1e-6) break;
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
  const nominalArea = 2.5 * seriesModulesCount; // approx 2.5 m² per 580W panel
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
    extractedParameters: {
      iph,
      i0,
      rs,
      rsh,
      n,
      vt,
    },
  };
}
