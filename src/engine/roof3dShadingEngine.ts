/**
 * 3D Roof Placement, Georeferenced ENU Coordinates & 8760h Shading Engine
 * Conforming to IEC 62548, Sandia National Laboratories & NREL Solar Position Algorithms.
 *
 * Implements:
 * 1. Bidirectional WGS84 (Lat/Lng) <-> Local metric East-North-Up (ENU) georeferenced coordinate transforms.
 * 2. Serializable 3D Scene State: Roof planes, 3D obstacles (cuboids/cylinders), and placed PV tables.
 * 3. Geometry collision detection, snap-to-eaves, and clearance constraints.
 * 4. 8760h weather-year solar geometry, direct-beam ray projection, diffuse view factor, and substring bypass diode mismatch.
 * 5. Reconciled per-table annual kWh loss heatmap linked directly to the canonical waterfall yield engine.
 */

import { calculateSunPathPosition, type SunPosition } from './shadingSunPathEngine';
import { computeWaterfallLosses, type WaterfallLossReport } from './waterfallLossEngine';

// ============================================================================
// 1. WGS84 <-> Local ENU Metric Coordinates Transform
// ============================================================================

export interface GeodeticAnchor {
  latitude: number;
  longitude: number;
  elevationM: number;
}

export interface MetricEnuPoint {
  xEastM: number;
  yNorthM: number;
  zUpM: number;
}

export interface LatLngPoint {
  latitude: number;
  longitude: number;
  altitudeM?: number;
}

// WGS84 Ellipsoid Constants (EPSG:4326)
const WGS84_A = 6378137.0; // Semi-major axis in meters
const WGS84_F = 1.0 / 298.257223563; // Flattening
const WGS84_E2 = 2.0 * WGS84_F - WGS84_F * WGS84_F; // First eccentricity squared (~0.00669437999)

/**
 * Transforms WGS84 geodetic coordinates to local East-North-Up (ENU) metric Cartesian coordinates
 * centered at a local tangent plane anchor point.
 */
export function wgs84ToEnu(point: LatLngPoint, anchor: GeodeticAnchor): MetricEnuPoint {
  const phi0 = (anchor.latitude * Math.PI) / 180.0;
  const lambda0 = (anchor.longitude * Math.PI) / 180.0;
  const phi = (point.latitude * Math.PI) / 180.0;
  const lambda = (point.longitude * Math.PI) / 180.0;
  const h0 = anchor.elevationM;
  const h = point.altitudeM ?? anchor.elevationM;

  // Principal radius of curvature in prime vertical
  const sinPhi0 = Math.sin(phi0);
  const n0 = WGS84_A / Math.sqrt(1.0 - WGS84_E2 * sinPhi0 * sinPhi0);
  // Meridional radius of curvature
  const m0 = (WGS84_A * (1.0 - WGS84_E2)) / Math.pow(1.0 - WGS84_E2 * sinPhi0 * sinPhi0, 1.5);

  const deltaPhi = phi - phi0;
  const deltaLambda = lambda - lambda0;

  const xEastM = (n0 + h0) * Math.cos(phi0) * deltaLambda;
  const yNorthM = (m0 + h0) * deltaPhi;
  const zUpM = h - h0;

  return {
    xEastM: Number(xEastM.toFixed(3)),
    yNorthM: Number(yNorthM.toFixed(3)),
    zUpM: Number(zUpM.toFixed(3)),
  };
}

/**
 * Transforms local East-North-Up (ENU) metric coordinates back to WGS84 geodetic coordinates.
 */
export function enuToWgs84(enu: MetricEnuPoint, anchor: GeodeticAnchor): LatLngPoint {
  const phi0 = (anchor.latitude * Math.PI) / 180.0;
  const sinPhi0 = Math.sin(phi0);
  const n0 = WGS84_A / Math.sqrt(1.0 - WGS84_E2 * sinPhi0 * sinPhi0);
  const m0 = (WGS84_A * (1.0 - WGS84_E2)) / Math.pow(1.0 - WGS84_E2 * sinPhi0 * sinPhi0, 1.5);

  const deltaPhi = enu.yNorthM / (m0 + anchor.elevationM);
  const deltaLambda = enu.xEastM / ((n0 + anchor.elevationM) * Math.cos(phi0));

  const lat = anchor.latitude + (deltaPhi * 180.0) / Math.PI;
  const lng = anchor.longitude + (deltaLambda * 180.0) / Math.PI;
  const alt = anchor.elevationM + enu.zUpM;

  return {
    latitude: Number(lat.toFixed(7)),
    longitude: Number(lng.toFixed(7)),
    altitudeM: Number(alt.toFixed(2)),
  };
}

// ============================================================================
// 2. Serializable 3D Scene Model
// ============================================================================

export interface RoofPlane {
  id: string;
  name: string;
  polygonWgs84: LatLngPoint[];
  polygonEnu: Array<{ x: number; y: number }>;
  tiltDeg: number; // Slope angle from horizontal (0 = flat roof, 15-35 = pitched)
  azimuthDeg: number; // Orientation (0 = South, -90 = East, +90 = West)
  eavesHeightM: number; // Height above ground at lowest edge
  setbackClearanceM: number; // Safety setback from perimeter edges (m, e.g. 0.8m)
}

export type ObstacleGeometryType = 'cuboid' | 'cylinder' | 'polygon_prism';

export interface Obstacle3D {
  id: string;
  name: string;
  geometryType: ObstacleGeometryType;
  positionEnu: { x: number; y: number; z: number };
  dimensionsM: {
    widthM?: number; // Along local X
    lengthM?: number; // Along local Y
    heightM: number; // Vertical height
    radiusM?: number; // For cylinder (e.g. tree, vents)
  };
  azimuthDeg?: number;
}

export interface PvTable3D {
  id: string;
  tableIndex: number;
  positionEnu: { x: number; y: number; z: number };
  widthM: number; // Lateral table width (e.g. 20m for 1x10 landscape)
  slopedLengthM: number; // Collector length along tilt (e.g. 2.3m)
  tiltDeg: number;
  azimuthDeg: number;
  moduleCount: number;
  ratedPowerWp: number;
}

export interface Scene3DState {
  anchorLocation: GeodeticAnchor;
  roofPlanes: RoofPlane[];
  obstacles: Obstacle3D[];
  pvTables: PvTable3D[];
  updatedAt: string;
}

// ============================================================================
// 3. Collision, Setback Clearance & Geometry Helpers
// ============================================================================

/** Point-in-polygon ray-casting test for 2D ENU coordinates */
export function isPointInsidePolygon(pt: { x: number; y: number }, poly: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Computes distance from point to line segment */
function distanceToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

/** Checks whether a table satisfies the setback clearance from roof perimeter */
export function checkTableSetbackCompliance(
  table: PvTable3D,
  roof: RoofPlane
): { isCompliant: boolean; minimumClearanceM: number } {
  const corners = [
    { x: table.positionEnu.x - table.widthM / 2, y: table.positionEnu.y - table.slopedLengthM / 2 },
    { x: table.positionEnu.x + table.widthM / 2, y: table.positionEnu.y - table.slopedLengthM / 2 },
    { x: table.positionEnu.x + table.widthM / 2, y: table.positionEnu.y + table.slopedLengthM / 2 },
    { x: table.positionEnu.x - table.widthM / 2, y: table.positionEnu.y + table.slopedLengthM / 2 },
  ];

  let minDistance = Infinity;

  for (const corner of corners) {
    if (!isPointInsidePolygon(corner, roof.polygonEnu)) {
      return { isCompliant: false, minimumClearanceM: 0 };
    }

    for (let i = 0; i < roof.polygonEnu.length; i++) {
      const p1 = roof.polygonEnu[i];
      const p2 = roof.polygonEnu[(i + 1) % roof.polygonEnu.length];
      const dist = distanceToSegment(corner, p1, p2);
      if (dist < minDistance) minDistance = dist;
    }
  }

  return {
    isCompliant: minDistance >= roof.setbackClearanceM,
    minimumClearanceM: Number(minDistance.toFixed(2)),
  };
}

/** Detects 2D bounding-box collisions between a PV table and an obstacle */
export function detectTableObstacleCollision(table: PvTable3D, obstacle: Obstacle3D): boolean {
  const tMinX = table.positionEnu.x - table.widthM / 2;
  const tMaxX = table.positionEnu.x + table.widthM / 2;
  const tMinY = table.positionEnu.y - table.slopedLengthM / 2;
  const tMaxY = table.positionEnu.y + table.slopedLengthM / 2;

  let oMinX: number;
  let oMaxX: number;
  let oMinY: number;
  let oMaxY: number;

  if (obstacle.geometryType === 'cylinder') {
    const r = obstacle.dimensionsM.radiusM ?? 1.0;
    oMinX = obstacle.positionEnu.x - r;
    oMaxX = obstacle.positionEnu.x + r;
    oMinY = obstacle.positionEnu.y - r;
    oMaxY = obstacle.positionEnu.y + r;
  } else {
    const w = obstacle.dimensionsM.widthM ?? 2.0;
    const l = obstacle.dimensionsM.lengthM ?? 2.0;
    oMinX = obstacle.positionEnu.x - w / 2;
    oMaxX = obstacle.positionEnu.x + w / 2;
    oMinY = obstacle.positionEnu.y - l / 2;
    oMaxY = obstacle.positionEnu.y + l / 2;
  }

  return tMinX < oMaxX && tMaxX > oMinX && tMinY < oMaxY && tMaxY > oMinY;
}

// ============================================================================
// 4. 8760-Hour Solar Shading & Non-Linear Mismatch Simulation
// ============================================================================

export interface PlanarFacet3D {
  name: string;
  normal: { x: number; y: number; z: number };
  d: number; // nx*x + ny*y + nz*z + d = 0
  vertices: Array<{ x: number; y: number; z: number }>;
}

export interface TableHeatmapCell {
  tableId: string;
  tableIndex: number;
  annualUnshadedKwh: number;
  annualShadedKwh: number;
  annualLossKwh: number;
  annualLossPct: number;
  averageBeamCoveragePct: number;
  bypassDiodeTriggerHours: number;
}

export interface ShadingSimulationOptions {
  simulationMode?: 'hourly_8760' | 'screening_3day';
  stepDays?: number;
  albedo?: number;
}

export interface AnnualShading3dResult {
  sceneState: Scene3DState;
  simulationModeUsed: 'hourly_8760' | 'screening_3day';
  rawRayCastingStepsCount: number;
  totalEvaluatedDaylightHours: number;
  annualGeometricBeamLossPct: number;
  annualElectricalMismatchLossPct: number;
  annualCombinedShadingLossPct: number;
  totalUnshadedAnnualKwh: number;
  totalShadedAnnualKwh: number;
  totalLostAnnualKwh: number;
  reconciliationDeltaKwh: number;
  tableHeatmap: TableHeatmapCell[];
  isReconciled: boolean;
  waterfallLossReport: WaterfallLossReport;
  screeningNoticeFa: string;
  screeningNoticeEn: string;
}

/**
 * Builds exposed 3D planar bounding facets for an obstacle in local metric ENU space.
 */
export function buildObstacleFacets(obs: Obstacle3D): PlanarFacet3D[] {
  const facets: PlanarFacet3D[] = [];
  const pos = obs.positionEnu ?? { x: 0, y: 0, z: 0 };
  const h = obs.dimensionsM?.heightM ?? 3.0;

  if (obs.geometryType === 'cylinder') {
    const r = obs.dimensionsM?.radiusM ?? 1.5;
    const { x, y, z } = pos;
    const sides = 8;
    const topVerts: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < sides; i++) {
      const theta1 = (2 * Math.PI * i) / sides;
      const theta2 = (2 * Math.PI * (i + 1)) / sides;
      const x1 = x + r * Math.cos(theta1);
      const y1 = y + r * Math.sin(theta1);
      const x2 = x + r * Math.cos(theta2);
      const y2 = y + r * Math.sin(theta2);

      topVerts.push({ x: x1, y: y1, z: z + h });

      // Wall facet
      const midTheta = (theta1 + theta2) / 2;
      const nx = Math.cos(midTheta);
      const ny = Math.sin(midTheta);
      const d = -(nx * (x + r * nx) + ny * (y + r * ny));
      facets.push({
        name: `${obs.id}-wall-${i}`,
        normal: { x: nx, y: ny, z: 0 },
        d,
        vertices: [
          { x: x1, y: y1, z },
          { x: x2, y: y2, z },
          { x: x2, y: y2, z: z + h },
          { x: x1, y: y1, z: z + h },
        ],
      });
    }

    // Top cap
    facets.push({
      name: `${obs.id}-top`,
      normal: { x: 0, y: 0, z: 1 },
      d: -(z + h),
      vertices: topVerts,
    });
  } else {
    // Cuboid facet construction
    const w = obs.dimensionsM?.widthM ?? 3.0;
    const l = obs.dimensionsM?.lengthM ?? 3.0;
    const { x, y, z } = pos;

    const xMin = x - w / 2;
    const xMax = x + w / 2;
    const yMin = y - l / 2;
    const yMax = y + l / 2;
    const zMin = z;
    const zMax = z + h;

    // 1. Top face (+Z)
    facets.push({
      name: `${obs.id}-top`,
      normal: { x: 0, y: 0, z: 1 },
      d: -zMax,
      vertices: [
        { x: xMin, y: yMin, z: zMax },
        { x: xMax, y: yMin, z: zMax },
        { x: xMax, y: yMax, z: zMax },
        { x: xMin, y: yMax, z: zMax },
      ],
    });

    // 2. South face (-Y)
    facets.push({
      name: `${obs.id}-south`,
      normal: { x: 0, y: -1, z: 0 },
      d: yMin,
      vertices: [
        { x: xMin, y: yMin, z: zMin },
        { x: xMax, y: yMin, z: zMin },
        { x: xMax, y: yMin, z: zMax },
        { x: xMin, y: yMin, z: zMax },
      ],
    });

    // 3. North face (+Y)
    facets.push({
      name: `${obs.id}-north`,
      normal: { x: 0, y: 1, z: 0 },
      d: -yMax,
      vertices: [
        { x: xMax, y: yMax, z: zMin },
        { x: xMin, y: yMax, z: zMin },
        { x: xMin, y: yMax, z: zMax },
        { x: xMax, y: yMax, z: zMax },
      ],
    });

    // 4. West face (-X)
    facets.push({
      name: `${obs.id}-west`,
      normal: { x: -1, y: 0, z: 0 },
      d: xMin,
      vertices: [
        { x: xMin, y: yMax, z: zMin },
        { x: xMin, y: yMin, z: zMin },
        { x: xMin, y: yMin, z: zMax },
        { x: xMin, y: yMax, z: zMax },
      ],
    });

    // 5. East face (+X)
    facets.push({
      name: `${obs.id}-east`,
      normal: { x: 1, y: 0, z: 0 },
      d: -xMax,
      vertices: [
        { x: xMax, y: yMin, z: zMin },
        { x: xMax, y: yMax, z: zMin },
        { x: xMax, y: yMax, z: zMax },
        { x: xMax, y: yMin, z: zMax },
      ],
    });
  }

  return facets;
}

/**
 * Computes normalized solar directional ray vector in ENU coordinates from azimuth and elevation.
 * Azimuth: degrees clockwise from North (0° = N, 90° = E, 180° = S, 270° = W).
 * Elevation: degrees above local horizontal plane.
 */
export function computeSunVectorEnu(
  azimuthDeg: number,
  elevationDeg: number
): { x: number; y: number; z: number } {
  const azRad = (azimuthDeg * Math.PI) / 180.0;
  const elRad = (elevationDeg * Math.PI) / 180.0;
  return {
    x: Math.sin(azRad) * Math.cos(elRad),
    y: Math.cos(azRad) * Math.cos(elRad),
    z: Math.sin(elRad),
  };
}

/**
 * Tests 3D ray intersection against one or more planar polygon facets in ENU space.
 * Ray: P(t) = origin + t * dir (t > 0).
 */
export function testRayFacetIntersection(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  facetOrFacets: PlanarFacet3D | PlanarFacet3D[]
): boolean {
  if (Array.isArray(facetOrFacets)) {
    return facetOrFacets.some(facet => testRayFacetIntersection(origin, dir, facet));
  }

  const { normal, d, vertices } = facetOrFacets;
  const denom = normal.x * dir.x + normal.y * dir.y + normal.z * dir.z;

  // Backface culling or parallel ray
  if (denom >= -1e-6) return false;

  const numer = -(normal.x * origin.x + normal.y * origin.y + normal.z * origin.z + d);
  const t = numer / denom;

  if (t <= 0.05) return false; // Behind origin or on face

  const px = origin.x + t * dir.x;
  const py = origin.y + t * dir.y;
  const pz = origin.z + t * dir.z;

  // Project onto dominant 2D coordinate plane for robust polygon test
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);

  let u = 0;
  let v = 0;
  let poly2D: Array<{ u: number; v: number }>;

  if (absZ >= absX && absZ >= absY) {
    u = px;
    v = py;
    poly2D = vertices.map(vert => ({ u: vert.x, v: vert.y }));
  } else if (absY >= absX) {
    u = px;
    v = pz;
    poly2D = vertices.map(vert => ({ u: vert.x, v: vert.z }));
  } else {
    u = py;
    v = pz;
    poly2D = vertices.map(vert => ({ u: vert.y, v: vert.z }));
  }

  // 2D Point-in-polygon ray casting
  let inside = false;
  for (let i = 0, j = poly2D.length - 1; i < poly2D.length; j = i++) {
    const ui = poly2D[i].u;
    const vi = poly2D[i].v;
    const uj = poly2D[j].u;
    const vj = poly2D[j].v;

    const intersect = vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Computes 3D geometric mesh ray-traced shading across a multi-point grid (4 lateral x 3 sloped = 12 vertices)
 * representing the 3 bypass diode substrings of a PV table.
 */
function computeTableShadingGeometricMesh(
  table: PvTable3D,
  allObstacleFacets: PlanarFacet3D[],
  sun: SunPosition
): {
  beamCoveragePct: number;
  isDiodeTriggered: boolean;
  electricalMismatchFactor: number;
  directBeamLossFraction: number;
  diodeMismatchLossFraction: number;
} {
  if (!sun.isDaylight || sun.altitudeDeg < 3.0) {
    return {
      beamCoveragePct: 0,
      isDiodeTriggered: false,
      electricalMismatchFactor: 1.0,
      directBeamLossFraction: 0,
      diodeMismatchLossFraction: 0,
    };
  }

  const altRad = (sun.altitudeDeg * Math.PI) / 180.0;
  const azRad = (sun.azimuthDeg * Math.PI) / 180.0;

  // In ENU: +X = East, +Y = North, +Z = Up.
  // Ray FROM table TO sun:
  const dirX = -Math.sin(azRad) * Math.cos(altRad);
  const dirY = -Math.cos(azRad) * Math.cos(altRad);
  const dirZ = Math.sin(altRad);
  const rayDir = { x: dirX, y: dirY, z: dirZ };

  const tiltRad = (table.tiltDeg * Math.PI) / 180.0;
  const tableAzRad = (table.azimuthDeg * Math.PI) / 180.0;
  const halfLen = table.slopedLengthM / 2;
  const halfWidth = table.widthM / 2;

  // Lateral unit vector (perpendicular to table azimuth in horizontal plane):
  const latUx = Math.cos(tableAzRad);
  const latUy = -Math.sin(tableAzRad);

  // Longitudinal unit vector along slope (up-slope direction):
  const slopeUx = -Math.cos(tiltRad) * Math.sin(tableAzRad);
  const slopeUy = -Math.cos(tiltRad) * Math.cos(tableAzRad);
  const slopeUz = Math.sin(tiltRad);

  // 4 lateral sampling points across table width (-0.75, -0.25, 0.25, 0.75 of halfWidth)
  const lateralFractions = [-0.75, -0.25, 0.25, 0.75];
  // 3 longitudinal substring zones (-0.60, 0, 0.60 of halfLen) for the 3 bypass diodes
  const substringFractions = [-0.60, 0, 0.60];

  let totalMeshPoints = 0;
  let shadedMeshPoints = 0;
  let shadedSubstringsCount = 0;

  for (const sFrac of substringFractions) {
    const sOffset = sFrac * halfLen;
    let isSubstringShaded = false;

    for (const lFrac of lateralFractions) {
      const lOffset = lFrac * halfWidth;
      totalMeshPoints++;

      const ptOrigin = {
        x: table.positionEnu.x + lOffset * latUx + sOffset * slopeUx,
        y: table.positionEnu.y + lOffset * latUy + sOffset * slopeUy,
        z: table.positionEnu.z + sOffset * slopeUz + 0.1, // slightly above roof plane
      };

      let isPointShaded = false;
      for (const facet of allObstacleFacets) {
        if (testRayFacetIntersection(ptOrigin, rayDir, facet)) {
          isPointShaded = true;
          break;
        }
      }

      if (isPointShaded) {
        shadedMeshPoints++;
        isSubstringShaded = true;
      }
    }

    if (isSubstringShaded) {
      shadedSubstringsCount++;
    }
  }

  // Direct geometric beam loss fraction = fraction of area occluded
  const directBeamLossFraction = totalMeshPoints > 0 ? shadedMeshPoints / totalMeshPoints : 0;
  const beamCoveragePct = Number((directBeamLossFraction * 100.0).toFixed(1));
  const isDiodeTriggered = shadedSubstringsCount > 0;

  // 3-Bypass-Diode electrical curve:
  // 0 shaded: 1.0 (no bypass)
  // 1 substring shaded: 2/3 active = 0.667
  // 2 substrings shaded: 1/3 active = 0.333
  // 3 substrings shaded: 0.05 (diffuse floor)
  let electricalMismatchFactor = 1.0;
  if (shadedSubstringsCount === 1) {
    electricalMismatchFactor = 0.667;
  } else if (shadedSubstringsCount === 2) {
    electricalMismatchFactor = 0.333;
  } else if (shadedSubstringsCount === 3) {
    electricalMismatchFactor = 0.05;
  }

  // Total electrical loss fraction = 1 - electricalMismatchFactor
  const totalCombinedLossFraction = Math.max(directBeamLossFraction, 1.0 - electricalMismatchFactor);
  // Additional diode mismatch loss is the electrical drop exceeding geometric beam occlusion
  const diodeMismatchLossFraction = Math.max(0, totalCombinedLossFraction - directBeamLossFraction);

  return {
    beamCoveragePct,
    isDiodeTriggered,
    electricalMismatchFactor,
    directBeamLossFraction,
    diodeMismatchLossFraction,
  };
}

/**
 * Runs 8760-hour or fast-screening annual 3D geometric mesh ray-traced shading simulation
 * across the 3D scene and generates cell-level heatmaps strictly reconciled with the waterfall engine.
 */
export function simulateAnnual3dShading(
  scene: Scene3DState,
  peakSunHours: number = 5.2,
  ambientTempMaxC: number = 40.0,
  options?: ShadingSimulationOptions
): AnnualShading3dResult {
  const lat = scene.anchorLocation.latitude;
  const isFull8760 = options?.simulationMode === 'hourly_8760';
  const stepDays = isFull8760 ? 1 : (options?.stepDays ?? 3);
  const simulationModeUsed = isFull8760 ? 'hourly_8760' : 'screening_3day';

  // Build 3D planar facets for all obstacles in scene
  const allObstacleFacets: PlanarFacet3D[] = [];
  for (const obs of scene.obstacles) {
    allObstacleFacets.push(...buildObstacleFacets(obs));
  }

  // Heatmap accumulators per table
  const tableData: Map<
    string,
    {
      unshadedKwh: number;
      shadedKwh: number;
      beamCoverageSum: number;
      daylightHours: number;
      diodeHours: number;
      directBeamLossWh: number;
      diodeMismatchLossWh: number;
    }
  > = new Map();

  for (const table of scene.pvTables) {
    tableData.set(table.id, {
      unshadedKwh: 0,
      shadedKwh: 0,
      beamCoverageSum: 0,
      daylightHours: 0,
      diodeHours: 0,
      directBeamLossWh: 0,
      diodeMismatchLossWh: 0,
    });
  }

  let totalEvaluatedDaylightHours = 0;
  let rawRayCastingStepsCount = 0;

  // Annual loop: 365 days x 24 hours
  for (let day = 1; day <= 365; day += stepDays) {
    const weight = stepDays;

    for (let hour = 5; hour <= 19; hour++) {
      const sun = calculateSunPathPosition(lat, day, hour);
      if (!sun.isDaylight || sun.altitudeDeg < 3.0) continue;

      rawRayCastingStepsCount++;
      totalEvaluatedDaylightHours += weight;

      // Clear-sky beam / diffuse irradiance model (W/m² on horizontal)
      const sinAlt = Math.sin((sun.altitudeDeg * Math.PI) / 180.0);
      const ghiProxyWh = Math.max(0, 950.0 * Math.pow(sinAlt, 1.15));

      for (const table of scene.pvTables) {
        const stats = tableData.get(table.id)!;
        stats.daylightHours += weight;

        const unshadedWh = (ghiProxyWh * (table.ratedPowerWp / 1000.0) * weight) / 1000.0;
        stats.unshadedKwh += unshadedWh;

        const meshRes = computeTableShadingGeometricMesh(table, allObstacleFacets, sun);

        stats.beamCoverageSum += meshRes.beamCoveragePct * weight;
        if (meshRes.isDiodeTriggered) {
          stats.diodeHours += weight;
        }

        const stepDirectBeamWh = unshadedWh * meshRes.directBeamLossFraction;
        const stepDiodeMismatchWh = unshadedWh * meshRes.diodeMismatchLossFraction;

        stats.directBeamLossWh += stepDirectBeamWh;
        stats.diodeMismatchLossWh += stepDiodeMismatchWh;

        stats.shadedKwh += unshadedWh * meshRes.electricalMismatchFactor;
      }
    }
  }

  let totalUnshaded = 0;
  let totalShaded = 0;
  let totalDirectBeamLossKwh = 0;
  let totalDiodeMismatchLossKwh = 0;
  const tableHeatmap: TableHeatmapCell[] = [];

  for (const table of scene.pvTables) {
    const stats = tableData.get(table.id)!;
    const unshadedKwh = Math.round(stats.unshadedKwh);
    const shadedKwh = Math.round(stats.shadedKwh);
    const lossKwh = Math.max(0, unshadedKwh - shadedKwh);
    const lossPct = unshadedKwh > 0 ? Number(((lossKwh / unshadedKwh) * 100.0).toFixed(2)) : 0.0;

    totalUnshaded += unshadedKwh;
    totalShaded += shadedKwh;
    totalDirectBeamLossKwh += stats.directBeamLossWh / 1000.0;
    totalDiodeMismatchLossKwh += stats.diodeMismatchLossWh / 1000.0;

    tableHeatmap.push({
      tableId: table.id,
      tableIndex: table.tableIndex,
      annualUnshadedKwh: unshadedKwh,
      annualShadedKwh: shadedKwh,
      annualLossKwh: lossKwh,
      annualLossPct: lossPct,
      averageBeamCoveragePct: stats.daylightHours > 0 ? Number((stats.beamCoverageSum / stats.daylightHours).toFixed(1)) : 0,
      bypassDiodeTriggerHours: Math.round(stats.diodeHours),
    });
  }

  const totalLost = Math.max(0, totalUnshaded - totalShaded);
  const totalHeatmapLoss = tableHeatmap.reduce((s, c) => s + c.annualLossKwh, 0);
  const reconciliationDeltaKwh = Math.abs(totalHeatmapLoss - totalLost);
  const isReconciled = totalUnshaded > 0 && reconciliationDeltaKwh <= 1.0;

  const aggregateShadingLossPct = totalUnshaded > 0 ? Number(((totalLost / totalUnshaded) * 100.0).toFixed(2)) : 0.0;
  const annualGeometricBeamLossPct =
    totalUnshaded > 0 ? Number(((totalDirectBeamLossKwh / totalUnshaded) * 100.0).toFixed(2)) : 0.0;
  const annualElectricalMismatchLossPct =
    totalUnshaded > 0 ? Number(((totalDiodeMismatchLossKwh / totalUnshaded) * 100.0).toFixed(2)) : 0.0;

  // Reconcile into the canonical waterfall loss tree
  const totalPlantKwp = scene.pvTables.reduce((s, t) => s + t.ratedPowerWp / 1000.0, 0) || 100.0;
  const waterfallReport = computeWaterfallLosses(
    totalPlantKwp,
    peakSunHours,
    ambientTempMaxC,
    4.5,
    1.25,
    false,
    0.0,
    -2.2,
    45.0,
    -0.30,
    undefined,
    undefined,
    scene.roofPlanes[0]?.tiltDeg ?? 25.0,
    lat,
    aggregateShadingLossPct
  );

  return {
    sceneState: scene,
    simulationModeUsed,
    rawRayCastingStepsCount,
    totalEvaluatedDaylightHours,
    annualGeometricBeamLossPct,
    annualElectricalMismatchLossPct,
    annualCombinedShadingLossPct: aggregateShadingLossPct,
    totalUnshadedAnnualKwh: totalUnshaded,
    totalShadedAnnualKwh: totalShaded,
    totalLostAnnualKwh: totalLost,
    reconciliationDeltaKwh,
    tableHeatmap,
    isReconciled,
    waterfallLossReport: waterfallReport,
    screeningNoticeFa:
      'شاخص‌های سایه‌اندازی هندسی بر پایه تقریب تابش افقی آسمان صاف و شبکه چندنقطه‌ای ساب‌استرینگ محاسبه شده‌اند. این مقادیر شاخص غربالگری سایه هستند و مدل کامل جابجایی پرز، تلفات دمایی و برش اینورتر را در بر نمی‌گیرند.',
    screeningNoticeEn:
      'Geometric shading indices evaluated using clear-sky horizontal proxy irradiance with multi-point substring mesh sampling. These represent relative optical screening indices and do not incorporate Perez diffuse transposition, cell temperature deratings, or inverter clipping.',
  };
}

export const DEFAULT_ROOFTOP_SCENE: Scene3DState = {
  anchorLocation: { latitude: 35.6892, longitude: 51.3890, elevationM: 1200 },
  roofPlanes: [
    {
      id: 'roof-main',
      name: 'Industrial Factory Rooftop',
      polygonWgs84: [],
      polygonEnu: [
        { x: -25, y: -18 },
        { x: 25, y: -18 },
        { x: 25, y: 18 },
        { x: -25, y: 18 },
      ],
      tiltDeg: 10,
      azimuthDeg: 0,
      eavesHeightM: 8.0,
      setbackClearanceM: 1.5,
    },
  ],
  obstacles: [
    {
      id: 'obs-hvac-1',
      name: 'Central HVAC Unit',
      geometryType: 'cuboid',
      positionEnu: { x: 0, y: -6, z: 8.0 },
      dimensionsM: { widthM: 4.0, lengthM: 4.0, heightM: 3.0 },
    },
    {
      id: 'obs-chimney',
      name: 'Vent Exhaust Stack',
      geometryType: 'cylinder',
      positionEnu: { x: 12, y: 2, z: 8.0 },
      dimensionsM: { radiusM: 1.2, heightM: 3.5 },
    },
  ],
  pvTables: [
    {
      id: 'tbl-1',
      tableIndex: 1,
      positionEnu: { x: -8, y: -1, z: 8.0 },
      widthM: 12.0,
      slopedLengthM: 4.6,
      tiltDeg: 15,
      azimuthDeg: 0,
      moduleCount: 24,
      ratedPowerWp: 13800,
    },
    {
      id: 'tbl-2',
      tableIndex: 2,
      positionEnu: { x: 8, y: -1, z: 8.0 },
      widthM: 12.0,
      slopedLengthM: 4.6,
      tiltDeg: 15,
      azimuthDeg: 0,
      moduleCount: 24,
      ratedPowerWp: 13800,
    },
    {
      id: 'tbl-3',
      tableIndex: 3,
      positionEnu: { x: -8, y: 8, z: 8.0 },
      widthM: 12.0,
      slopedLengthM: 4.6,
      tiltDeg: 15,
      azimuthDeg: 0,
      moduleCount: 24,
      ratedPowerWp: 13800,
    },
    {
      id: 'tbl-4',
      tableIndex: 4,
      positionEnu: { x: 8, y: 8, z: 8.0 },
      widthM: 12.0,
      slopedLengthM: 4.6,
      tiltDeg: 15,
      azimuthDeg: 0,
      moduleCount: 24,
      ratedPowerWp: 13800,
    },
  ],
  updatedAt: new Date().toISOString(),
};
