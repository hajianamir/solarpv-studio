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

export interface CadPlacedTable {
  id: string;
  xM: number;
  yM: number;
  lengthM: number;
  widthM: number;
  row: number;
  col: number;
}

export interface PowerplantCadLayoutResult {
  totalTablesCount: number;
  totalModulesCount: number;
  tablesPerRow: number;
  rowsCount: number;
  tables: CadPlacedTable[];
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

  // Generate exact physical table placement coordinates
  const tables: CadPlacedTable[] = [];
  const startXM = 10.0; // 10m setback
  const startYM = 10.0;

  for (let r = 0; r < rowsCount; r++) {
    const yM = startYM + r * rowPitchM;
    for (let c = 0; c < tablesPerRow; c++) {
      const xM = startXM + c * (tableLengthM + tableSpacingAlongRowM);
      tables.push({
        id: `tbl-${r + 1}-${c + 1}`,
        xM: Number(xM.toFixed(2)),
        yM: Number(yM.toFixed(2)),
        lengthM: Number(tableLengthM.toFixed(2)),
        widthM: Number(tableWidthM.toFixed(2)),
        row: r + 1,
        col: c + 1,
      });
    }
  }

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
    tablesPerRow,
    rowsCount,
    tables,
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

/**
 * Generates an AutoCAD-compatible ASCII DXF file representing the true physical civil layout.
 * Includes Layers (BOUNDARY, ROADS, PV_TABLES, MV_SUBSTATION, TEXT, TITLEBLOCK),
 * closed polylines, dimensions, and north arrow (OUT-02).
 */
export function generatePowerplantDxf(
  layout: PowerplantCadLayoutResult,
  params: PowerplantCadParameters
): string {
  const { landLengthM, landWidthM } = params;

  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
0
ENDSEC
0
SECTION
2
TABLES
0
TABLE
2
LAYER
0
LAYER
2
BOUNDARY
70
0
62
1
6
CONTINUOUS
0
LAYER
2
ROADS
70
0
62
3
6
CONTINUOUS
0
LAYER
2
PV_TABLES
70
0
62
4
6
CONTINUOUS
0
LAYER
2
MV_SUBSTATIONS
70
0
62
2
6
CONTINUOUS
0
LAYER
2
ANNOTATION
70
0
62
7
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
0
SECTION
2
ENTITIES
`;

  // Helper for DXF closed rectangle
  const addRect = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
    return `0
LWPOLYLINE
5
${Math.floor(Math.random() * 0xffffff).toString(16)}
8
${layer}
90
4
70
1
10
${x1.toFixed(2)}
20
${y1.toFixed(2)}
10
${x2.toFixed(2)}
20
${y1.toFixed(2)}
10
${x2.toFixed(2)}
20
${y2.toFixed(2)}
10
${x1.toFixed(2)}
20
${y2.toFixed(2)}
`;
  };

  // Helper for DXF Text
  const addText = (layer: string, text: string, x: number, y: number, height: number) => {
    return `0
TEXT
5
${Math.floor(Math.random() * 0xffffff).toString(16)}
8
${layer}
10
${x.toFixed(2)}
20
${y.toFixed(2)}
40
${height.toFixed(2)}
1
${text}
`;
  };

  // 1. Boundary
  dxf += addRect('BOUNDARY', 0, 0, landLengthM, landWidthM);
  dxf += addText('ANNOTATION', `PROJECT BOUNDARY: ${landLengthM}m x ${landWidthM}m (${layout.totalLandAreaHectares} Ha)`, 5, landWidthM + 4, 3.0);

  // 2. Perimeter Road (4m wide, 10m setback buffer)
  dxf += addRect('ROADS', 6, 6, landLengthM - 6, landWidthM - 6);

  // 3. Central Access Road
  const midX = landLengthM / 2;
  const halfRoad = params.roadWidthM / 2;
  dxf += addRect('ROADS', midX - halfRoad, 6, midX + halfRoad, landWidthM - 6);
  dxf += addText('ANNOTATION', `CENTRAL ACCESS ROAD (${params.roadWidthM}m)`, midX - 10, landWidthM / 2, 2.5);

  // 4. PV Tables
  for (const tbl of layout.tables) {
    dxf += addRect('PV_TABLES', tbl.xM, tbl.yM, tbl.xM + tbl.lengthM, tbl.yM + tbl.widthM);
  }

  // 5. MV Power Station Kiosks
  const kioskWidthM = 8.0;
  const kioskLengthM = 12.0;
  dxf += addRect('MV_SUBSTATIONS', midX - kioskLengthM / 2, 12, midX + kioskLengthM / 2, 12 + kioskWidthM);
  dxf += addText('ANNOTATION', `MV TURNKEY SKID (3.125 MVA)`, midX - 15, 12 + kioskWidthM + 2, 2.0);

  // 6. Title Block & North Arrow
  dxf += addText('ANNOTATION', `N -> TRUE NORTH`, 15, landWidthM - 15, 4.0);
  dxf += addText('ANNOTATION', `SolarPV Studio - Civil CAD Layout`, 15, landWidthM - 22, 3.0);
  dxf += addText('ANNOTATION', `Capacity: ${layout.installedCapacityDcMwp} MWp DC | Tables: ${layout.totalTablesCount} | Modules: ${layout.totalModulesCount}`, 15, landWidthM - 28, 2.5);
  dxf += addText('ANNOTATION', `GCR: ${layout.groundCoverageRatioGcr} | Pitch: ${params.rowPitchM}m | Tilt: ${params.arrayTiltDeg} deg`, 15, landWidthM - 34, 2.5);

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
}
