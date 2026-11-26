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

export interface CadReservedZone {
  id: string;
  kind: 'road' | 'mv_station';
  xM: number;
  yM: number;
  lengthM: number;
  widthM: number;
}

export interface PowerplantCadLayoutResult {
  /** Input snapshot: export rejects a different parameter set. */
  layoutParameters: PowerplantCadParameters;
  requestedRowPitchM: number;
  effectiveRowPitchM: number;
  pitchAdjusted: boolean;
  collectorWidthM: number;
  projectedCollectorWidthM: number;
  /** Projected collector chord (including gaps) / effective row-center pitch; not site-area utilization. */
  gcrDefinition: 'projected_collector_width_over_effective_pitch';
  reservedZones: CadReservedZone[];
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

  for (const value of [landLengthM, landWidthM, rowPitchM, moduleWattage, moduleLengthM, moduleWidthM]) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError('CAD dimensions, pitch and power must be positive finite numbers');
  }
  if (!Number.isFinite(roadWidthM) || roadWidthM < 0 || roadWidthM > landLengthM) throw new RangeError('Invalid CAD road width');
  if (!Number.isFinite(arrayTiltDeg) || arrayTiltDeg < 0 || arrayTiltDeg > 90) throw new RangeError('Invalid CAD tilt');

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
    tableLengthM: Math.ceil(tableLengthM * 100) / 100,
    tableWidthM: Math.ceil(tableWidthM * 100) / 100,
  };

  // Conservative axis-aligned DXF footprints. This is a feasible grid filter,
  // not an optimizer or an azimuth-rotated cadastral design.
  const netLandLength = Math.max(0, landLengthM - 20);
  const netLandWidth = Math.max(0, landWidthM - 20);
  const tableSpacingAlongRowM = 3;
  const candidateColumns = Math.max(0, Math.floor((netLandLength + tableSpacingAlongRowM) / (tableLengthM + tableSpacingAlongRowM)));
  // A single centimeter-grid pitch owns placement AND all reported spacing metrics.
  // This conservative footprint includes module gaps; it is not projected-area packing optimization.
  const rowStep = Math.ceil(Math.max(rowPitchM, tableConfig.tableWidthM) * 100) / 100;
  const candidateRows = netLandWidth < tableWidthM ? 0 : Math.floor((netLandWidth - tableWidthM) / rowStep) + 1;
  if (candidateColumns * candidateRows > 200000) throw new RangeError('CAD candidate grid exceeds 200000 tables');
  const midX = landLengthM / 2;
  // Screening siting assumptions, NOT mandated civil/electrical clearances:
  // 12x8 m bays sit beside (never on) the through road, separated by 2 m;
  // consecutive bays have a 4 m gap. No turning-radius/fire/access compliance claimed.
  const effectiveRoadWidthM = Math.ceil(roadWidthM * 100) / 100;
  const roadLeft = Math.round((midX - effectiveRoadWidthM / 2) * 100) / 100;
  const roadRight = roadLeft + effectiveRoadWidthM;
  if (roadLeft < 0 || roadRight > landLengthM) throw new RangeError('Rounded CAD road does not fit inside the site');
  const stationX = roadRight + 2;
  const corridorLeft = roadLeft;
  const corridorRight = stationX + 12;
  const roadZones: CadReservedZone[] = [];
  if (landLengthM >= 20 && landWidthM >= 20) {
    // Four strips, not a solid polygon filling the site interior.
    roadZones.push(
      {id:'perimeter-south',kind:'road',xM:6,yM:6,lengthM:landLengthM-12,widthM:4},
      {id:'perimeter-north',kind:'road',xM:6,yM:landWidthM-10,lengthM:landLengthM-12,widthM:4},
      {id:'perimeter-west',kind:'road',xM:6,yM:10,lengthM:4,widthM:landWidthM-20},
      {id:'perimeter-east',kind:'road',xM:landLengthM-10,yM:10,lengthM:4,widthM:landWidthM-20},
    );
    if (effectiveRoadWidthM > 0) roadZones.push({id:'central-road',kind:'road',xM:roadLeft,yM:10,lengthM:effectiveRoadWidthM,widthM:landWidthM-20});
  }
  const tables: CadPlacedTable[] = [];
  for (let r = 0; r < candidateRows; r++) {
    for (let c = 0; c < candidateColumns; c++) {
      const table: CadPlacedTable = {
        id:`tbl-${r+1}-${c+1}`, xM:Number((10+c*(tableLengthM+tableSpacingAlongRowM)).toFixed(2)),
        yM:Number((10+r*rowStep).toFixed(2)), lengthM:Math.ceil(tableLengthM*100)/100,
        widthM:Math.ceil(tableWidthM*100)/100, row:r+1, col:c+1,
      };
      const inside = table.xM >= 10 && table.yM >= 10 && table.xM+table.lengthM <= landLengthM-10 && table.yM+table.widthM <= landWidthM-10;
      const inCorridor = table.xM < corridorRight && table.xM+table.lengthM > corridorLeft;
      if (inside && !inCorridor) tables.push(table);
    }
  }
  const totalTablesCount = tables.length;
  const totalModulesCount = totalTablesCount * totalModulesPerTable;
  const rowsCount = new Set(tables.map(table=>table.row)).size;
  const rowCounts = new Map<number,number>();
  for (const table of tables) rowCounts.set(table.row,(rowCounts.get(table.row)??0)+1);
  const tablesPerRow = [...rowCounts.values()].reduce((max, count) => Math.max(max, count), 0);

  const installedCapacityDcMwp = Math.round((totalModulesCount * moduleWattage) / 1e6 * 1000) / 1000;
  const installedCapacityAcMw = Math.round((installedCapacityDcMwp / 1.25) * 1000) / 1000;

  const totalLandAreaM2 = landLengthM * landWidthM;
  const totalLandAreaHectares = Math.round((totalLandAreaM2 / 10000.0) * 100) / 100;

  // Ground Coverage Ratio (GCR)
  // GCR = Projected collector width / Pitch
  const tiltRad = (arrayTiltDeg * Math.PI) / 180.0;
  const projectedCollectorWidth = structureType === 'single_axis_tracker' ? tableWidthM : tableWidthM * Math.cos(tiltRad);
  const groundCoverageRatioGcr = Math.round((projectedCollectorWidth / rowStep) * 1000) / 1000;

  const landUtilizationMwpPerHectare = totalLandAreaHectares > 0
    ? Math.round((installedCapacityDcMwp / totalLandAreaHectares) * 100) / 100
    : 0;

  // Shading Limit Angle: alpha_limit = arctan(H_table / (Pitch - Depth))
  const tableHeightM = tableWidthM * Math.sin(tiltRad);
  const shadowSpanM = Math.max(0.5, rowStep - tableWidthM * Math.cos(tiltRad));
  const shadingLimitAngleDeg = Math.round((Math.atan(tableHeightM / shadowSpanM) * 180.0 / Math.PI) * 10) / 10;

  // MV Skids (typically 3.125 MVA or 6.25 MVA per skid station)
  const mvPowerStationsCount = Math.ceil(installedCapacityAcMw / 3.125);
  const reservedZones: CadReservedZone[] = roadZones.filter(zone => zone.lengthM > 0 && zone.widthM > 0);
  for (let i=0;i<mvPowerStationsCount;i++) {
    const zone: CadReservedZone = {id:`mv-${i+1}`,kind:'mv_station',xM:stationX,yM:12+i*12,lengthM:12,widthM:8};
    if (zone.xM < 10 || zone.xM+zone.lengthM > landLengthM-10 || zone.yM+zone.widthM > landWidthM-10) {
      throw new RangeError('MV stations do not fit beside the access road within the site setback; revise site layout');
    }
    reservedZones.push(zone);
  }
  // DC combiner boxes (typically 1 combiner per 16 to 24 strings)
  const dcCombinerBoxesCount = totalModulesCount === 0 ? 0 : Math.max(2, Math.ceil(totalModulesCount / 400));

  // DC trench routing distance estimation
  const estimatedDcTrenchCableKm = Math.round(((totalTablesCount * 45.0) / 1000.0) * 10) / 10;

  return {
    layoutParameters: {...params},
    requestedRowPitchM: rowPitchM,
    effectiveRowPitchM: rowStep,
    pitchAdjusted: Math.abs(rowStep - rowPitchM) > 1e-9,
    collectorWidthM: tableWidthM,
    projectedCollectorWidthM: projectedCollectorWidth,
    gcrDefinition: 'projected_collector_width_over_effective_pitch',
    reservedZones,
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
 * Generates an AutoCAD-compatible ASCII DXF file representing the generated axis-aligned screening layout, not an approved civil design.
 * Includes Layers (BOUNDARY, ROADS, PV_TABLES, MV_SUBSTATION, TEXT, TITLEBLOCK),
 * closed polylines, dimensions, and north arrow (OUT-02).
 */
export function generatePowerplantDxf(
  layout: PowerplantCadLayoutResult,
  params: PowerplantCadParameters
): string {
  for (const key of Object.keys(layout.layoutParameters) as (keyof PowerplantCadParameters)[]) {
    if (params[key] !== layout.layoutParameters[key]) throw new RangeError('DXF parameters do not match the generated layout; regenerate before export');
  }
  const { landLengthM, landWidthM } = layout.layoutParameters;

  // Handles are deterministic, unique within the document, and above table handles.
  // R2000 LWPOLYLINE/TEXT entities require AcDbEntity + type subclass markers.
  let nextHandle = 0x100;
  const handle = () => (nextHandle++).toString(16).toUpperCase();
  let dxf = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1015
9
$INSUNITS
70
6
9
$MEASUREMENT
70
1
9
$HANDSEED
5
__NEXT_HANDLE__
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
5
10
100
AcDbSymbolTable
70
5
0
LAYER
5
11
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
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
5
12
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
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
5
13
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
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
5
14
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
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
5
15
100
AcDbSymbolTableRecord
100
AcDbLayerTableRecord
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
${handle()}
100
AcDbEntity
8
${layer}
100
AcDbPolyline
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
${handle()}
100
AcDbEntity
8
${layer}
100
AcDbText
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

  // 2/3. Export the same explicit road polygons used for siting and the UI.
  for (const zone of layout.reservedZones.filter(zone => zone.kind === 'road')) {
    dxf += addRect('ROADS', zone.xM, zone.yM, zone.xM+zone.lengthM, zone.yM+zone.widthM);
  }
  dxf += addText('ANNOTATION', 'SCREENING LAYOUT - NOT A CONSTRUCTION OR ACCESS-COMPLIANCE APPROVAL', 5, landWidthM + 9, 2);

  // 4. PV Tables
  for (const tbl of layout.tables) {
    dxf += addRect('PV_TABLES', tbl.xM, tbl.yM, tbl.xM + tbl.lengthM, tbl.yM + tbl.widthM);
  }

  // 5. MV Power Station Kiosks
  for (const zone of layout.reservedZones.filter(zone=>zone.kind==='mv_station')) {
    dxf += addRect('MV_SUBSTATIONS', zone.xM, zone.yM, zone.xM+zone.lengthM, zone.yM+zone.widthM);
    dxf += addText('ANNOTATION', `MV TURNKEY SKID ${zone.id} (3.125 MVA)`, zone.xM, zone.yM+zone.widthM+2, 2);
  }

  // 6. Title Block & North Arrow
  dxf += addText('ANNOTATION', `N -> TRUE NORTH`, 15, landWidthM - 15, 4.0);
  dxf += addText('ANNOTATION', `SolarPV Studio - Civil CAD Layout`, 15, landWidthM - 22, 3.0);
  dxf += addText('ANNOTATION', `Capacity: ${layout.installedCapacityDcMwp} MWp DC | Tables: ${layout.totalTablesCount} | Modules: ${layout.totalModulesCount}`, 15, landWidthM - 28, 2.5);
  dxf += addText('ANNOTATION', `GCR: ${layout.groundCoverageRatioGcr} | Effective pitch: ${layout.effectiveRowPitchM}m | Requested pitch: ${layout.requestedRowPitchM}m | Tilt: ${params.arrayTiltDeg} deg`, 15, landWidthM - 34, 2.5);

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf.replace('__NEXT_HANDLE__', nextHandle.toString(16).toUpperCase());
}
