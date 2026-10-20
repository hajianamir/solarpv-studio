// Powerplant 2D/3D CAD Layout, Ground Coverage Ratio (GCR) & MV Skid Siting Engine

export type RackingStructureType = 'fixed_tilt' | 'single_axis_tracker' | 'east_west_rooftop';
export type TableOrientation = 'portrait_2p' | 'portrait_1p' | 'landscape_4l';

export interface TableConfig {
  orientation: TableOrientation;
  modulesWide: number;  // e.g. 28 modules
  modulesHigh: number;  // e.g. 2 modules (2P)
  totalModulesPerTable: number;
  tableLengthM: number;
  tableWidthM: number;
}

export interface PowerplantCadParameters {
  structureType: RackingStructureType;
  landLengthM: number;
  landWidthM: number;
  arrayTiltDeg: number;
  arrayAzimuthDeg: number;
  rowPitchM: number;
  moduleWattage: number; // e.g. 580 W
  moduleLengthM: number; // e.g. 2.278 m
  moduleWidthM: number;  // e.g. 1.134 m
  roadWidthM: number;    // e.g. 6.0 m
}

export interface PowerplantCadLayoutResult {
  totalTablesCount: number;
  totalModulesCount: number;
  installedCapacityDcMwp: number;
  installedCapacityAcMw: number;
  totalLandAreaM2: number;
  totalLandAreaHectares: number;
  groundCoverageRatioGcr: number;
  landUtilizationMwpPerHectare: number;
  mvPowerStationsCount: number;
  dcCombinerBoxesCount: number;
  estimatedDcTrenchCableKm: number;
  shadingLimitAngleDeg: number;
  tableConfig: TableConfig;
}

export function generatePowerplantLayout(
  params: PowerplantCadParameters
): PowerplantCadLayoutResult {
  const {
    structureType,
    landLengthM,
    landWidthM,
    arrayTiltDeg,
    rowPitchM,
    moduleWattage,
    moduleLengthM,
    moduleWidthM,
    roadWidthM,
  } = params;

  // 1. Table configuration
  let orientation: TableOrientation = 'portrait_2p';
  let modulesWide = 28;
  let modulesHigh = 2;

  if (structureType === 'single_axis_tracker') {
    orientation = 'portrait_1p';
    modulesWide = 56;
    modulesHigh = 1;
  } else if (structureType === 'east_west_rooftop') {
    orientation = 'landscape_4l';
    modulesWide = 14;
    modulesHigh = 4;
  }

  const totalModulesPerTable = modulesWide * modulesHigh;
  const tableLengthM = modulesWide * (moduleWidthM + 0.02);
  const tableWidthM = modulesHigh * (moduleLengthM + 0.02);

  const tableConfig: TableConfig = {
    orientation,
    modulesWide,
    modulesHigh,
    totalModulesPerTable,
    tableLengthM: Math.round(tableLengthM * 10) / 10,
    tableWidthM: Math.round(tableWidthM * 10) / 10,
  };

  // 2. Net usable land area considering perimeter buffer (10m setback) and central roads
  const netLandLength = Math.max(50.0, landLengthM - 20.0);
  const netLandWidth = Math.max(50.0, landWidthM - 20.0);

  // Number of tables per row (East-West axis)
  const tableSpacingAlongRowM = 3.0; // walkway between tables
  const tablesPerRow = Math.max(1, Math.floor(netLandLength / (tableLengthM + tableSpacingAlongRowM)));

  // Number of rows (North-South axis)
  const rowsCount = Math.max(1, Math.floor(netLandWidth / rowPitchM));

  const totalTablesCount = tablesPerRow * rowsCount;
  const totalModulesCount = totalTablesCount * totalModulesPerTable;
  const installedCapacityDcMwp = Math.round((totalModulesCount * moduleWattage) / 1e6 * 1000) / 1000;
  const installedCapacityAcMw = Math.round((installedCapacityDcMwp / 1.25) * 1000) / 1000;

  const totalLandAreaM2 = landLengthM * landWidthM;
  const totalLandAreaHectares = Math.round((totalLandAreaM2 / 10000.0) * 100) / 100;

  // Ground Coverage Ratio (GCR)
  // GCR = Projected collector width / Pitch
  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;
  const projectedCollectorWidth = structureType === 'single_axis_tracker' ? tableWidthM : tableWidthM * Math.cos(tiltRad);
  const groundCoverageRatioGcr = Math.round((projectedCollectorWidth / rowPitchM) * 1000) / 1000;

  const landUtilizationMwpPerHectare = totalLandAreaHectares > 0
    ? Math.round((installedCapacityDcMwp / totalLandAreaHectares) * 100) / 100
    : 0;

  // Shading Limit Angle: alpha_limit = arctan(H_table / (Pitch - Depth))
  const tableHeightM = tableWidthM * Math.sin(tiltRad);
  const shadowSpanM = Math.max(0.5, rowPitchM - tableWidthM * Math.cos(tiltRad));
  const shadingLimitAngleDeg = Math.round((Math.atan(tableHeightM / shadowSpanM) * 180.0 / Math.PI) * 10) / 10;

  // MV Skids (typically 3.125 MVA or 6.25 MVA per skid station)
  const mvPowerStationsCount = Math.max(1, Math.ceil(installedCapacityAcMw / 3.125));
  // DC combiner boxes (typically 1 combiner per 16 to 24 strings)
  const dcCombinerBoxesCount = Math.max(2, Math.ceil(totalModulesCount / 400));

  // DC trench routing distance estimation
  const estimatedDcTrenchCableKm = Math.round(((totalTablesCount * 45.0) / 1000.0) * 10) / 10;

  return {
    totalTablesCount,
    totalModulesCount,
    installedCapacityDcMwp,
    installedCapacityAcMw,
    totalLandAreaM2,
    totalLandAreaHectares,
    groundCoverageRatioGcr,
    landUtilizationMwpPerHectare,
    mvPowerStationsCount,
    dcCombinerBoxesCount,
    estimatedDcTrenchCableKm,
    shadingLimitAngleDeg,
    tableConfig,
  };
}
