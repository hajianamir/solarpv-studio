// ============================================================================
// SolarPV Studio v3.0 - Physics Model Versioning & Traceability Registry (Phase 1a)
// Enforces independent SemVer for physical engines and generates audit trace IDs
// ============================================================================

export interface ModelSemverEntry {
  modelId: string;
  name: string;
  version: string; // Semantic Versioning x.y.z
  lastModified: string;
  governingStandards: string[];
  referenceLiterature: string;
  analyticalAssumptions: string[];
  validityBoundaries: string[];
}

export const PHYSICS_MODEL_REGISTRY: Record<string, ModelSemverEntry> = {
  multiphysics_bipv_fpv: {
    modelId: 'multiphysics_bipv_fpv',
    name: 'Multiphysics Electro-Thermal & FPV Engine',
    version: '3.0.0',
    lastModified: '2026-10-28',
    governingStandards: ['IEC 61215', 'DNV-RP-0584'],
    referenceLiterature: 'Payne (1972), Cogley (1979) for Cox-Munk water albedo; Faiman (2008); Duffie & Beckman (4th Ed.)',
    analyticalAssumptions: [
      'Steady-state thermal balance in BIPV air channel',
      'Water surface effective albedo follows Cox-Munk wave slope distribution',
      '2.5D hybrid ray-view factor for low-clearance ground and torque-tube shading',
    ],
    validityBoundaries: [
      'Channel depth: 40mm - 400mm',
      'Wind speed: 0.2 m/s - 32 m/s',
      'Clearance height h >= 0.25m',
    ],
  },
  climate_resilience_15min: {
    modelId: 'climate_resilience_15min',
    name: 'Probabilistic Climate Resilience & 15-Min Dispatch',
    version: '3.0.0',
    lastModified: '2026-10-28',
    governingStandards: ['ASTM E1036', 'IEC 62109', 'IEEE 1547'],
    referenceLiterature: 'Gumbel distribution for 50-year extreme gusts; Weibull for operational wind; Skartveit-Olseth clear-sky disaggregation; Kimber et al. (NREL) soiling model',
    analyticalAssumptions: [
      'Extreme gusts modeled via Fisher-Tippett (Gumbel Type I) cumulative distribution',
      'Operational wind speed characterized via 2-parameter Weibull (k=2.1)',
      'Sub-hourly 15-min variability generated via Clear-Sky Index (kt) stochastic band',
      'Inverter film capacitor aging modeled via electro-thermal power-law Arrhenius formulation',
    ],
    validityBoundaries: [
      'Ambient temperature range: -35C to +55C',
      'Hail diameter range: 10mm to 65mm',
      'Disaggregation factor limit: kt in [0.05, 1.25]',
    ],
  },
  lca_lifecycle_sustainability: {
    modelId: 'lca_lifecycle_sustainability',
    name: 'ISO 14040/44 Life Cycle Assessment & EOL Salvage Engine',
    version: '3.0.0',
    lastModified: '2026-10-28',
    governingStandards: ['ISO 14040', 'ISO 14044', 'IEA-PVPS Task 12'],
    referenceLiterature: 'IEA-PVPS Task 12 (Methodology Guidelines for Life Cycle Assessment of Photovoltaic Electricity, 2020 update); Frischknecht et al.',
    analyticalAssumptions: [
      'Cradle-to-grave system boundary: raw silicon purification, ingot/wafer, module assembly, BOS, 25-30y O&M, and decommissioning',
      'Harmonized grid electricity greenhouse gas mix (ecoinvent v3.9 methodology)',
      'Recycling credits accounted via 50/50 net avoided burden allocation rule',
    ],
    validityBoundaries: [
      'Monocrystalline TOPCon, PERC, Heterojunction (HJT) and CdTe technologies',
      'Transport logistics radius: 50 km - 15,000 km',
    ],
  },
  hydrogen_grid_stability: {
    modelId: 'hydrogen_grid_stability',
    name: 'Green Hydrogen Electrolyzer & Screening-Level Grid Stability Engine',
    version: '3.0.0',
    lastModified: '2026-10-28',
    governingStandards: ['IEEE 2800-2022', 'IEEE 1547-2018', 'ISO 19880'],
    referenceLiterature: 'Ulleberg (2003) for Alkaline; Abdin et al. (2016) for PEM electrolyzer; IEEE 2800-2022 for IBR LVRT/HVRT envelopes; IEEE PES SSR Screening Guidelines',
    analyticalAssumptions: [
      'Alkaline polarization: reversible potential + activation + ohmic overpotential (Ulleberg empirical)',
      'PEM polarization: empirical curve with temperature-dependent exchange current density (Abdin)',
      'SSR screening: heuristic vulnerability assessment based on SCR < 2.5 and series compensation proximity (screening-level, NOT EMT simulation)',
      'LVRT response: piecewise linear reactive current injection curve during zero and reduced voltage dips',
    ],
    validityBoundaries: [
      'Electrolyzer operating window: 15% - 120% nominal stack current',
      'SCR range: 1.2 - 25.0',
      'Screening scope: High-level risk classification; detailed studies require PSCAD/EMT',
    ],
  },
  civil_geotechnical_broms: {
    modelId: 'civil_geotechnical_broms',
    name: 'Civil, Broms Lateral Pile, Skin Friction Uplift & Bishop Slope Engine',
    version: '3.0.0',
    lastModified: '2026-10-28',
    governingStandards: ['ASCE 7-22', 'Eurocode 7 (EN 1997)', 'Eurocode 1 (EN 1991-1-4)'],
    referenceLiterature: 'Broms (1964) for lateral resistance; Tomlinson & Woodward for alpha/beta skin friction uplift; Bishop (1955) Modified Method of Slices for slope stability',
    analyticalAssumptions: [
      'Broms theory applied strictly to lateral shear and bending moment capacity in short/long piles',
      'Uplift resistance calculated independently using alpha-method (cohesive) and beta-method (cohesionless)',
      'Combined loading assessed via P-M interaction ratio (axial + flexural utilization)',
      'Slope stability evaluated via Bishop cylindrical slip surfaces with 20 slices',
    ],
    validityBoundaries: [
      'Pile embedded length: 1.0m - 5.5m',
      'Soil internal friction angle: 15 deg - 45 deg',
      'Slope angle: 0 deg - 40 deg',
    ],
  },
  pv_single_diode_core: {
    modelId: 'pv_single_diode_core',
    name: '5-Parameter Single-Diode Equivalent Circuit Solver',
    version: '2.4.0',
    lastModified: '2026-10-28',
    governingStandards: ['IEC 60904-1', 'IEC 60891'],
    referenceLiterature: 'De Soto et al. (2006); Sandia National Laboratories Photovoltaic Array Performance Model (SAPM)',
    analyticalAssumptions: [
      '5-parameter model (Iph, Io, Rs, Rsh, a) with temperature-dependent bandgap',
      'Lambert W function analytical formulation for transcendental resolution',
    ],
    validityBoundaries: [
      'Irradiance: 50 W/m2 - 1400 W/m2',
      'Cell temperature: -20C to +85C',
    ],
  },
};

/**
 * Generates an RFC 4122 v4 compliant UUID with millisecond timestamp prefix
 * Ensures exact traceability across project revisions, exports, and EPC reports.
 */
export function generateTraceId(prefix: string = 'SPV3'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return `${prefix}-${timestamp}-${randomPart}`;
}

export interface CalculationTraceMetadata {
  traceId: string;
  calculatedAtUtc: string;
  schemaVersion: string;
  modelVersions: Record<string, string>;
  prngSeedUsed: number;
  engineRuntimeMs: number;
}

export function createTraceMetadata(
  activeModelIds: string[],
  seed: number,
  runtimeMs: number
): CalculationTraceMetadata {
  const modelVersions: Record<string, string> = {};
  for (const id of activeModelIds) {
    if (PHYSICS_MODEL_REGISTRY[id]) {
      modelVersions[id] = PHYSICS_MODEL_REGISTRY[id].version;
    }
  }

  return {
    traceId: generateTraceId('TRACE'),
    calculatedAtUtc: new Date().toISOString(),
    schemaVersion: '3.0.0',
    modelVersions,
    prngSeedUsed: seed,
    engineRuntimeMs: Math.round(runtimeMs * 100) / 100,
  };
}
