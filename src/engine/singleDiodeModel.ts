// Explicit reference solving is a separate opt-in API, never a legacy fallback.
export {evaluateReferenceDiode} from './core/referenceDiodeSolver';
export type {ReferenceDiodeRequest,ReferenceDiodeInput,ReferenceDiodeResult} from '../contracts/referenceDiode';

// Legacy single-diode screening solver with De Soto-style parameter translation.
// Summary-input extraction is a heuristic, not a complete De Soto/CEC fit.
// tempCoeffPmpPct and tempCoeffVocPct are retained but unused by the bounded solver
// rather than constraining fitted beta_Voc/gamma_Pmp relations. See ADR-024/035.
// Solves: I = I_ph - I_0 * [exp((V + I*R_s)/(n*V_t)) - 1] - (V + I*R_s)/R_sh
// Incorporates bandgap energy temperature dependence Eg(T) and irradiance-scaled Rsh(G)

export interface DiodeParameters {
  iph: number;       // Photocurrent (A)
  i0: number;        // Diode saturation reverse current (A)
  rs: number;        // Series resistance (Ohms)
  rsh: number;       // Shunt resistance (Ohms)
  n: number;         // Diode ideality factor (typically 1.0 to 1.3 for modern TOPCon/PERC)
  vt: number;        // Legacy aggregate Ns*k*T/q (V), all series cells, excluding n; n*vt = nNsVth
  cellsPerModule?: number;
  moduleAreaM2?: number;
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
  solverDiagnostics?: { policy: 'legacy_extraction_bounded_roots_v1'; unroundedVocV: number; openCircuitResidualA: number; maxTraceResidualA: number };
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
  if (typeof irradianceWm2 !== 'number' || !Number.isFinite(irradianceWm2) || irradianceWm2 < 0) {
    throw new Error(`Irradiance must be a non-negative finite number (W/m²), received ${irradianceWm2}`);
  }
  if (irradianceWm2 === 0) {
    return {
      points: [
        { v: 0, i: 0, p: 0 },
        { v: 0, i: 0, p: 0 },
      ],
      voc: 0,
      isc: 0,
      vmp: 0,
      imp: 0,
      pmp: 0,
      fillFactor: 0,
      efficiencyPct: 0,
      irradianceWm2: 0,
      cellTempC,
    };
  }

  if (typeof seriesModulesCount !== 'number' || !Number.isFinite(seriesModulesCount) || seriesModulesCount < 1) {
    throw new Error(`seriesModulesCount must be a positive integer >= 1, received ${seriesModulesCount}`);
  }
  const nSeries = Math.floor(seriesModulesCount);

  const gRatio = irradianceWm2 / 1000.0;
  const deltaT = cellTempC - 25.0;
  const tempK = cellTempC + 273.15;
  const tRefK = 298.15;

  // Cells in single module and series stack
  let cellsPerModule: number;
  if (customParams?.cellsPerModule && customParams.cellsPerModule > 0) {
    cellsPerModule = Math.round(customParams.cellsPerModule);
  } else {
    const rawCells = stcVoc / 0.705;
    const standardCellCounts = [36, 48, 54, 60, 66, 72, 78, 96];
    cellsPerModule = standardCellCounts.reduce((prev, curr) =>
      Math.abs(curr - rawCells) < Math.abs(prev - rawCells) ? curr : prev
    );
  }
  const cellsInSeries = cellsPerModule * nSeries;

  // Ideality factor n
  const n = customParams?.n ?? 1.05;

  // Thermal voltage per module at reference temperature and actual cell temperature
  const aRefModule = (n * cellsPerModule * BOLTZMANN * tRefK) / ELECTRON_CHARGE;
  const aActualModule = aRefModule * (tempK / tRefK);

  // String aggregate thermal voltage
  const aActual = aActualModule * nSeries;
  const vt = (cellsInSeries * BOLTZMANN * tempK) / ELECTRON_CHARGE;

  // Reference Rs/Rsh per module: legacy summary-input extraction heuristic;
  // customParams can supply external reference values (Rs/Rsh are string totals).
  const rshRefModule = customParams?.rsh !== undefined
    ? customParams.rsh / nSeries
    : Math.max(50.0, (stcVoc / Math.max(1e-6, stcIsc - stcImp)) * 10.0);

  let rsRefModule = customParams?.rs !== undefined
    ? customParams.rs / nSeries
    : Math.max(0.01, ((stcVoc - stcVmp) / stcImp) * 0.235);

  if (customParams?.rs === undefined) {
    // Calibrate rsRefModule using Newton-Raphson so that STC MPP equation holds exactly:
    for (let it = 0; it < 30; it++) {
      const iphR = stcIsc * (1.0 + rsRefModule / rshRefModule);
      const expVoc = Math.exp(Math.min(60.0, stcVoc / aRefModule));
      const i0R = (iphR - stcVoc / rshRefModule) / Math.max(1e-12, expVoc - 1.0);

      const vMppInternal = stcVmp + stcImp * rsRefModule;
      const expMpp = Math.exp(Math.min(60.0, vMppInternal / aRefModule));
      const currentAtMpp = iphR - i0R * (expMpp - 1.0) - vMppInternal / rshRefModule;
      const f = currentAtMpp - stcImp;

      const dV_dRs = stcImp;
      const dIph_dRs = stcIsc / rshRefModule;
      const di0_dRs = dIph_dRs / Math.max(1e-12, expVoc - 1.0);
      const df_dRs = dIph_dRs - di0_dRs * (expMpp - 1.0) - i0R * expMpp * (dV_dRs / aRefModule) - dV_dRs / rshRefModule;

      if (Math.abs(df_dRs) < 1e-12) break;
      const deltaRs = f / df_dRs;
      rsRefModule -= deltaRs;
      rsRefModule = Math.max(0.001, Math.min(2.0, rsRefModule));
      if (Math.abs(deltaRs) < 1e-6) break;
    }
  }

  // De Soto Irradiance-scaled shunt resistance & series resistance scaled to full series string
  const rsh = (rshRefModule / gRatio) * nSeries;
  const rs = rsRefModule * nSeries;

  // Temperature-dependent bandgap energy: Eg(T) = Eg,ref * [1 - dEg/dT * (T - Tref)]
  const egRef = EG_REF_EV;
  const egActual = egRef * (1.0 - D_EG_DT * deltaT);

  // Reference photocurrent & saturation current per module / series string
  const iphRef = customParams?.iph ?? (stcIsc * (1.0 + rsRefModule / rshRefModule));
  const expVocRef = Math.exp(Math.min(60.0, stcVoc / aRefModule));
  const i0Ref = customParams?.i0 ?? ((iphRef - stcVoc / rshRefModule) / Math.max(1e-12, expVocRef - 1.0));

  // De Soto Scaled photocurrent: Iph(G, T) = (G / Gref) * [Iph,ref + alpha_Isc * (T - Tref)]
  const iph = gRatio * (iphRef + (tempCoeffIscPct / 100.0) * stcIsc * deltaT);

  // De Soto Scaled saturation current with bandgap temperature dependence
  const i0 = i0Ref * Math.pow(tempK / tRefK, 3.0) * Math.exp(
    (ELECTRON_CHARGE / BOLTZMANN) * (egRef / tRefK - egActual / tempK)
  );

  // Scaled open-circuit and short-circuit estimates for curve bounds
  const isc = stcIsc * gRatio * (1.0 + (tempCoeffIscPct / 100.0) * deltaT);

  // The diode residual is monotone decreasing in V and in I for positive
  // translated parameters. Bracket every root; never return a Newton iterate
  // on exhaustion. This repairs solving, not the legacy extraction heuristic.
  if (![iph, i0, rs, rsh, aActual].every(Number.isFinite) || iph <= 0 || i0 <= 0 || rs < 0 || rsh <= 0 || aActual <= 0) {
    throw new RangeError('Legacy diode translated parameters outside generating domain');
  }
  const residual = (v: number, i: number) => iph - i0 * Math.expm1((v + i * rs) / aActual) - (v + i * rs) / rsh - i;
  const toleranceA = 1e-10 + 1e-12 * iph;
  const root = (f: (x: number) => number, lower: number, upper: number): number => {
    const flo = f(lower), fhi = f(upper);
    if (!Number.isFinite(flo) || Number.isNaN(fhi) || flo < -toleranceA || fhi > toleranceA) throw new RangeError('Legacy diode root not bracketed');
    if (Math.abs(flo) <= toleranceA) return lower;
    if (Math.abs(fhi) <= toleranceA) return upper;
    for (let iteration = 0; iteration < 128; iteration++) {
      const mid = lower + (upper - lower) / 2, value = f(mid);
      if (!Number.isFinite(value)) throw new RangeError('Legacy diode root nonfinite');
      if (Math.abs(value) <= toleranceA) return mid;
      if (value > 0) lower = mid; else upper = mid;
    }
    throw new RangeError('Legacy diode root did not converge');
  };
  const idealVoc = aActual * (Math.log(iph + i0) - Math.log(i0));
  if (!Number.isFinite(idealVoc) || idealVoc <= 0) throw new RangeError('Legacy diode invalid Voc bracket');
  const voc = root(v => residual(v, 0), 0, idealVoc);
  let maxTraceResidualA = 0;

  // Trace 80 points along the I-V curve using Newton-Raphson
  const points: IvPoint[] = [];
  const numSteps = 80;
  let maxP = 0;
  let vAtMaxP = 0;
  let iAtMaxP = 0;

  for (let step = 0; step <= numSteps; step++) {
    const v = (voc * step) / numSteps;
    // Evaluate the endpoint residual too; forcing I=0 is not a root check.
    const currentClamped = step === numSteps ? 0 : root(i => residual(v, i), 0, iph);
    maxTraceResidualA = Math.max(maxTraceResidualA, Math.abs(residual(v, currentClamped)));
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
  const singleModuleAreaM2 = (customParams?.moduleAreaM2 && customParams.moduleAreaM2 > 0)
    ? customParams.moduleAreaM2
    : (stcPmp > 0 ? stcPmp / (1000.0 * 0.2265) : 2.5);
  const nominalArea = singleModuleAreaM2 * nSeries;
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
    efficiencyPct: Math.round(efficiencyPct * 100) / 100,
    irradianceWm2,
    cellTempC,
    solverDiagnostics: { policy: 'legacy_extraction_bounded_roots_v1', unroundedVocV: voc, openCircuitResidualA: residual(voc, 0), maxTraceResidualA },
    extractedParameters: {
      iph,
      i0,
      rs,
      rsh,
      n,
      vt,
      cellsPerModule,
      moduleAreaM2: singleModuleAreaM2,
    },
  };
}
