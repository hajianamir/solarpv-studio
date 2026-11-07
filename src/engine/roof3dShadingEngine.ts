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
import { buildWaterfallArgs } from './waterfallArgs';
import { calculateShadingFactor, type Triangle, type Vec3 } from './solarPvEngine';

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
  ridgeHeightM?: number; // Height above ground at ridge edge (if pitched)
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
  rotationDeg?: number;
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
  totalPvCapacityKwp?: number;
  totalModulesCount?: number;
  tiltDeg?: number;
  azimuthDeg?: number;
  interRowSpacingM?: number;
  installationEnvironment?: string;
  albedo?: number;
  obstacleDataStatus?: 'demo_sample' | 'surveyed' | 'verified_unobstructed' | 'missing_unverified' | 'unspecified';
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

function doSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/** Computes exact Euclidean minimum distance between two 2D line segments */
function distanceBetweenSegments(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  q1: { x: number; y: number },
  q2: { x: number; y: number }
): number {
  if (doSegmentsIntersect(p1, p2, q1, q2)) {
    return 0;
  }
  return Math.min(
    distanceToSegment(p1, q1, q2),
    distanceToSegment(p2, q1, q2),
    distanceToSegment(q1, p1, p2),
    distanceToSegment(q2, p1, p2)
  );
}

/** Checks whether a table satisfies the setback clearance from roof perimeter */
export function checkTableSetbackCompliance(
  table: PvTable3D,
  roof: RoofPlane
): { isCompliant: boolean; minimumClearanceM: number } {
  const tiltRad = ((table.tiltDeg ?? 0) * Math.PI) / 180.0;
  const tableAzRad = ((table.azimuthDeg ?? 0) * Math.PI) / 180.0;
  const halfLen = table.slopedLengthM / 2;
  const halfWidth = table.widthM / 2;

  const latUx = Math.cos(tableAzRad);
  const latUy = -Math.sin(tableAzRad);

  const slopeUx = Math.sin(tableAzRad) * Math.cos(tiltRad);
  const slopeUy = Math.cos(tableAzRad) * Math.cos(tiltRad);

  // Exact 4 corners of the table projected on horizontal (ENU X-Y) plane
  const corners = [
    {
      x: table.positionEnu.x - halfWidth * latUx - halfLen * slopeUx,
      y: table.positionEnu.y - halfWidth * latUy - halfLen * slopeUy,
    },
    {
      x: table.positionEnu.x + halfWidth * latUx - halfLen * slopeUx,
      y: table.positionEnu.y + halfWidth * latUy - halfLen * slopeUy,
    },
    {
      x: table.positionEnu.x + halfWidth * latUx + halfLen * slopeUx,
      y: table.positionEnu.y + halfWidth * latUy + halfLen * slopeUy,
    },
    {
      x: table.positionEnu.x - halfWidth * latUx + halfLen * slopeUx,
      y: table.positionEnu.y - halfWidth * latUy + halfLen * slopeUy,
    },
  ];

  // Fix M13: Comprehensive polygon containment check for concave / irregular roof geometries.
  // 1. Any intersection between table edges and roof boundary segments is an immediate breach.
  for (let c = 0; c < 4; c++) {
    const c1 = corners[c];
    const c2 = corners[(c + 1) % 4];
    for (let r = 0; r < roof.polygonEnu.length; r++) {
      const r1 = roof.polygonEnu[r];
      const r2 = roof.polygonEnu[(r + 1) % roof.polygonEnu.length];
      if (doSegmentsIntersect(c1, c2, r1, r2)) {
        return { isCompliant: false, minimumClearanceM: 0 };
      }
    }
  }

  // 2. Center point and all corners must be strictly inside roof polygon
  if (!isPointInsidePolygon({ x: table.positionEnu.x, y: table.positionEnu.y }, roof.polygonEnu)) {
    return { isCompliant: false, minimumClearanceM: 0 };
  }
  for (const corner of corners) {
    if (!isPointInsidePolygon(corner, roof.polygonEnu)) {
      return { isCompliant: false, minimumClearanceM: 0 };
    }
  }

  // Also check edge midpoints to catch concave polygon cutouts
  for (let c = 0; c < 4; c++) {
    const c1 = corners[c];
    const c2 = corners[(c + 1) % 4];
    const mid = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
    if (!isPointInsidePolygon(mid, roof.polygonEnu)) {
      return { isCompliant: false, minimumClearanceM: 0 };
    }
  }

  // 3. Exact continuous segment-to-segment distance calculation (no sample point misses)
  let minDistance = Infinity;
  for (let c = 0; c < 4; c++) {
    const c1 = corners[c];
    const c2 = corners[(c + 1) % 4];
    for (let r = 0; r < roof.polygonEnu.length; r++) {
      const r1 = roof.polygonEnu[r];
      const r2 = roof.polygonEnu[(r + 1) % roof.polygonEnu.length];
      const segDist = distanceBetweenSegments(c1, c2, r1, r2);
      if (segDist < minDistance) minDistance = segDist;
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

export interface ShadingReconciliationStatus {
  isArithmeticBalanceOk: boolean;
  isHeatmapAggregationConsistent: boolean;
  isComponentEnergyConsistent: boolean;
  isProjectSnapshotConsistent: boolean;
  overallReconciled: boolean;
  reconciliationNotes: string;
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
  reconciliationStatus?: ShadingReconciliationStatus;
  waterfallLossReport: WaterfallLossReport;
  methodologyDescription?: string;
  weatherDataSource?: string;
  diffuseTranspositionAssumption?: string;
  targetAnnualHorizontalIrradiationKwhM2?: number;
  simulatedAnnualHorizontalIrradiationKwhM2?: number;
  pshIntegralConservationErrorPct?: number;
  isEnergyConservationPreserved?: boolean;
  energyBalanceNote?: string;
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
      const d = -(nx * x1 + ny * y1);
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
    // Cuboid facet construction with optional planar rotation around Z axis
    const w = obs.dimensionsM?.widthM ?? 3.0;
    const l = obs.dimensionsM?.lengthM ?? 3.0;
    const { x, y, z } = pos;

    const xMin = x - w / 2;
    const xMax = x + w / 2;
    const yMin = y - l / 2;
    const yMax = y + l / 2;
    const zMin = z;
    const zMax = z + h;

    const rotRad = ((obs.rotationDeg ?? 0) * Math.PI) / 180.0;
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);

    const rotPt = (px: number, py: number, pz: number) => {
      const dx = px - x;
      const dy = py - y;
      return {
        x: x + dx * cosR - dy * sinR,
        y: y + dx * sinR + dy * cosR,
        z: pz,
      };
    };

    const rotNorm = (nx: number, ny: number, nz: number) => ({
      x: nx * cosR - ny * sinR,
      y: nx * sinR + ny * cosR,
      z: nz,
    });

    const makeFacet = (
      name: string,
      rawNormal: { x: number; y: number; z: number },
      rawVerts: Array<{ x: number; y: number; z: number }>
    ): PlanarFacet3D => {
      const normal = rotNorm(rawNormal.x, rawNormal.y, rawNormal.z);
      const vertices = rawVerts.map(v => rotPt(v.x, v.y, v.z));
      const d = -(normal.x * vertices[0].x + normal.y * vertices[0].y + normal.z * vertices[0].z);
      return { name, normal, d, vertices };
    };

    // 1. Top face (+Z)
    facets.push(
      makeFacet(`${obs.id}-top`, { x: 0, y: 0, z: 1 }, [
        { x: xMin, y: yMin, z: zMax },
        { x: xMax, y: yMin, z: zMax },
        { x: xMax, y: yMax, z: zMax },
        { x: xMin, y: yMax, z: zMax },
      ])
    );

    // 2. South face (-Y)
    facets.push(
      makeFacet(`${obs.id}-south`, { x: 0, y: -1, z: 0 }, [
        { x: xMin, y: yMin, z: zMin },
        { x: xMax, y: yMin, z: zMin },
        { x: xMax, y: yMin, z: zMax },
        { x: xMin, y: yMin, z: zMax },
      ])
    );

    // 3. North face (+Y)
    facets.push(
      makeFacet(`${obs.id}-north`, { x: 0, y: 1, z: 0 }, [
        { x: xMax, y: yMax, z: zMin },
        { x: xMin, y: yMax, z: zMin },
        { x: xMin, y: yMax, z: zMax },
        { x: xMax, y: yMax, z: zMax },
      ])
    );

    // 4. West face (-X)
    facets.push(
      makeFacet(`${obs.id}-west`, { x: -1, y: 0, z: 0 }, [
        { x: xMin, y: yMax, z: zMin },
        { x: xMin, y: yMin, z: zMin },
        { x: xMin, y: yMin, z: zMax },
        { x: xMin, y: yMax, z: zMax },
      ])
    );

    // 5. East face (+X)
    facets.push(
      makeFacet(`${obs.id}-east`, { x: 1, y: 0, z: 0 }, [
        { x: xMax, y: yMin, z: zMin },
        { x: xMax, y: yMax, z: zMin },
        { x: xMax, y: yMax, z: zMax },
        { x: xMax, y: yMin, z: zMax },
      ])
    );
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

  // Parallel ray check (double-sided: handles both thick obstacle walls and thin PV tables)
  if (Math.abs(denom) <= 1e-6) return false;

  const numer = -(normal.x * origin.x + normal.y * origin.y + normal.z * origin.z + d);
  const t = numer / denom;

  if (t <= 0.05) return false; // Behind origin or on face

  const px = origin.x + t * dir.x;
  const py = origin.y + t * dir.y;
  const pz = origin.z + t * dir.z;

  // Project onto dominant 2D coordinate plane for robust polygon test without array allocations (MAIN-05)
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);

  const numVerts = vertices.length;
  let inside = false;

  if (absZ >= absX && absZ >= absY) {
    for (let i = 0, j = numVerts - 1; i < numVerts; j = i++) {
      const vi = vertices[i].y;
      const vj = vertices[j].y;
      if ((vi > py) !== (vj > py)) {
        const ui = vertices[i].x;
        const uj = vertices[j].x;
        if (px < ((uj - ui) * (py - vi)) / (vj - vi) + ui) {
          inside = !inside;
        }
      }
    }
  } else if (absY >= absX) {
    for (let i = 0, j = numVerts - 1; i < numVerts; j = i++) {
      const vi = vertices[i].z;
      const vj = vertices[j].z;
      if ((vi > pz) !== (vj > pz)) {
        const ui = vertices[i].x;
        const uj = vertices[j].x;
        if (px < ((uj - ui) * (pz - vi)) / (vj - vi) + ui) {
          inside = !inside;
        }
      }
    }
  } else {
    for (let i = 0, j = numVerts - 1; i < numVerts; j = i++) {
      const vi = vertices[i].z;
      const vj = vertices[j].z;
      if ((vi > pz) !== (vj > pz)) {
        const ui = vertices[i].y;
        const uj = vertices[j].y;
        if (py < ((uj - ui) * (pz - vi)) / (vj - vi) + ui) {
          inside = !inside;
        }
      }
    }
  }

  return inside;
}

function isPointInActiveTable(table: PvTable3D, lOffset: number, sOffset: number): boolean {
  const modCount = table.moduleCount;
  if (!modCount || modCount <= 0) return false;
  if (modCount === 1) return true;
  const cols = Math.max(1, Math.ceil(modCount / 2));
  const colWidth = table.widthM / cols;
  const halfWidth = table.widthM / 2;

  // Determine which column this sample offset falls into
  const c = Math.min(cols - 1, Math.max(0, Math.floor((lOffset + halfWidth) / colWidth)));
  // Bottom module slot is sOffset <= 0, top module slot is sOffset > 0
  const isBottom = sOffset <= 0;
  const slotIdx = isBottom ? 2 * c : 2 * c + 1;
  return slotIdx < modCount;
}

/**
 * Computes 3D geometric mesh ray-traced shading across a multi-point grid
 * representing the active module columns and 3 bypass diode substrings of a PV table.
 */
export function computeTableShadingGeometricMesh(
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

  // Fast-path: When there are zero occluding facets in the scene, table has 0% shaded occlusion (MAIN-05)
  if (allObstacleFacets.length === 0) {
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
  const slopeUx = Math.sin(tableAzRad) * Math.cos(tiltRad);
  const slopeUy = Math.cos(tableAzRad) * Math.cos(tiltRad);
  const slopeUz = Math.sin(tiltRad);

  // Normal vector:
  const normX = -Math.sin(tableAzRad) * Math.sin(tiltRad);
  const normY = -Math.cos(tableAzRad) * Math.sin(tiltRad);
  const normZ = Math.cos(tiltRad);

  // Sample across active module slots and 3 bypass diode substrings per module
  const modCount = table.moduleCount ?? 1;
  const cols = modCount === 1 ? 1 : Math.max(1, Math.ceil(modCount / 2));
  const colWidth = table.widthM / cols;

  let totalMeshPoints = 0;
  let shadedMeshPoints = 0;
  let zone0Shaded = false;
  let zone1Shaded = false;
  let zone2Shaded = false;

  for (let c = 0; c < cols; c++) {
    const lOffset = -halfWidth + (c + 0.5) * colWidth;
    const rows = modCount === 1 ? [0] : [0, 1];

    for (const r of rows) {
      const slotIdx = modCount === 1 ? 0 : 2 * c + r;
      if (slotIdx >= modCount) {
        continue;
      }

      // 3 longitudinal bypass diode substrings per active module, ensuring exact uniform quadrature area-weighting:
      // If modCount === 1: module spans [-halfLen, +halfLen], substrings at [-2/3, 0, 2/3] * halfLen
      // If modCount > 1:
      //   row 0 (bottom) spans [-halfLen, 0], substrings at [-5/6, -3/6, -1/6] * halfLen
      //   row 1 (top) spans [0, +halfLen], substrings at [+1/6, +3/6, +5/6] * halfLen
      const subFracs =
        modCount === 1
          ? [-2 / 3, 0, 2 / 3]
          : r === 0
            ? [-5 / 6, -3 / 6, -1 / 6]
            : [1 / 6, 3 / 6, 5 / 6];

      for (let sIdx = 0; sIdx < subFracs.length; sIdx++) {
        const sOffset = subFracs[sIdx] * halfLen;
        totalMeshPoints++;

        const ptOrigin = {
          x: table.positionEnu.x + lOffset * latUx + sOffset * slopeUx + 0.04 * normX,
          y: table.positionEnu.y + lOffset * latUy + sOffset * slopeUy + 0.04 * normY,
          z: table.positionEnu.z + sOffset * slopeUz + 0.04 * normZ,
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
          if (sOffset < -0.33 * halfLen) {
            zone0Shaded = true;
          } else if (sOffset <= 0.33 * halfLen) {
            zone1Shaded = true;
          } else {
            zone2Shaded = true;
          }
        }
      }
    }
  }

  const shadedSubstringsCount = (zone0Shaded ? 1 : 0) + (zone1Shaded ? 1 : 0) + (zone2Shaded ? 1 : 0);

  // Direct geometric beam loss fraction = fraction of area occluded (exact area-weighted)
  const directBeamLossFraction = totalMeshPoints > 0 ? shadedMeshPoints / totalMeshPoints : 0;
  const beamCoveragePct = Number((directBeamLossFraction * 100.0).toFixed(1));
  const isDiodeTriggered = shadedSubstringsCount > 0;

  // 3-Bypass-Diode electrical curve:
  // Evaluates table substring zone occlusion across bypass diode string channels
  let electricalMismatchFactor = 1.0;
  if (shadedSubstringsCount === 1) {
    electricalMismatchFactor = 0.667;
  } else if (shadedSubstringsCount === 2) {
    electricalMismatchFactor = 0.333;
  } else if (shadedSubstringsCount >= 3) {
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
  if (typeof peakSunHours !== 'number' || !isFinite(peakSunHours) || peakSunHours <= 0) {
    throw new Error(
      `simulateAnnual3dShading: peakSunHours must be a finite positive number (> 0), received ${peakSunHours}`
    );
  }

  const lat = scene.anchorLocation.latitude;
  const isFull8760 = options?.simulationMode === 'hourly_8760';
  const stepDays = isFull8760 ? 1 : (options?.stepDays ?? 3);
  const simulationModeUsed = isFull8760 ? 'hourly_8760' : 'screening_3day';
  const resolvedAlbedo = options?.albedo ?? scene.albedo ?? 0.20;

  // Build 3D planar facets for all obstacles in scene
  const allObstacleFacets: PlanarFacet3D[] = [];
  for (const obs of scene.obstacles) {
    allObstacleFacets.push(...buildObstacleFacets(obs));
  }

  // Pre-build planar facets for all PV tables to support inter-row self-shading
  const tableFacetsMap = new Map<string, PlanarFacet3D[]>();
  for (const table of scene.pvTables) {
    tableFacetsMap.set(table.id, buildTableFacets(table));
  }

  // Pre-build combined occlusion facets per table (all obstacles + other tables)
  // to avoid re-allocating and concatenating arrays on every single hourly time step (P3-05 optimization)
  const occlusionFacetsByTable = new Map<string, PlanarFacet3D[]>();
  for (const table of scene.pvTables) {
    const tableOcclusion: PlanarFacet3D[] = [...allObstacleFacets];
    for (const [id, f] of tableFacetsMap.entries()) {
      if (id !== table.id) {
        tableOcclusion.push(...f);
      }
    }
    occlusionFacetsByTable.set(table.id, tableOcclusion);
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
      directBeamLossKwh: number;
      diodeMismatchLossKwh: number;
    }
  > = new Map();

  for (const table of scene.pvTables) {
    tableData.set(table.id, {
      unshadedKwh: 0,
      shadedKwh: 0,
      beamCoverageSum: 0,
      daylightHours: 0,
      diodeHours: 0,
      directBeamLossKwh: 0,
      diodeMismatchLossKwh: 0,
    });
  }

  let totalEvaluatedDaylightHours = 0;
  let rawRayCastingStepsCount = 0;

  // 1. Calculate diurnal profile shape integral across the 365-day weighted cycle
  // to guarantee that the annual weighted integral of horizontal irradiance
  // strictly equals peakSunHours * 365 * 1000 Wh/m² (exact PSH energy conservation).
  const safeStepDays = Math.max(1, Math.min(365, Math.round(Number(stepDays) || 3)));
  let diurnalShapeIntegral = 0;
  for (let day = 1; day <= 365; day += safeStepDays) {
    const weight = Math.min(safeStepDays, 365 - day + 1);
    for (let hour = 0; hour < 24; hour++) {
      const sun = calculateSunPathPosition(lat, day, hour);
      if (!sun.isDaylight || sun.altitudeDeg < 1.0) continue;
      const altRad = (sun.altitudeDeg * Math.PI) / 180.0;
      diurnalShapeIntegral += weight * Math.pow(Math.sin(altRad), 1.15);
    }
  }

  const targetAnnualHorizontalIrradiationWhM2 = peakSunHours * 365.0 * 1000.0;
  let simulatedHorizontalIrradiationWhM2 = 0;

  // Annual loop: 365 days partitioned by safe stepDays (sum of weights strictly = 365 days)
  for (let day = 1; day <= 365; day += safeStepDays) {
    const weight = Math.min(safeStepDays, 365 - day + 1);

    for (let hour = 0; hour < 24; hour++) {
      const sun = calculateSunPathPosition(lat, day, hour);
      if (!sun.isDaylight || sun.altitudeDeg < 1.0) continue;

      rawRayCastingStepsCount++;
      totalEvaluatedDaylightHours += weight;

      const altRad = (sun.altitudeDeg * Math.PI) / 180.0;
      const azRad = (sun.azimuthDeg * Math.PI) / 180.0;
      const sinAlt = Math.sin(altRad);

      // Ray direction vector pointing TO the sun in ENU
      const sunDir = {
        x: -Math.sin(azRad) * Math.cos(altRad),
        y: -Math.cos(azRad) * Math.cos(altRad),
        z: sinAlt,
      };

      // Rigorous PSH normalization: weighted integral of horizontal irradiance strictly equals target PSH * 365 * 1000 Wh/m²
      const ghiProxyWh =
        diurnalShapeIntegral > 0
          ? (targetAnnualHorizontalIrradiationWhM2 * Math.pow(sinAlt, 1.15)) / diurnalShapeIntegral
          : 0;
      simulatedHorizontalIrradiationWhM2 += weight * ghiProxyWh;
      const dhiProxyWh = 0.18 * ghiProxyWh;
      const dniProxyWh = sinAlt > 0.05 ? Math.max(0, (ghiProxyWh - dhiProxyWh) / sinAlt) : 0;
      const albedo = resolvedAlbedo;

      for (const table of scene.pvTables) {
        const stats = tableData.get(table.id)!;
        stats.daylightHours += weight;

        // Plane of Array (POA) irradiance accounting for table tilt and azimuth
        const tTiltRad = (table.tiltDeg * Math.PI) / 180.0;
        const tAzRad = (table.azimuthDeg * Math.PI) / 180.0;
        const normX = -Math.sin(tAzRad) * Math.sin(tTiltRad);
        const normY = -Math.cos(tAzRad) * Math.sin(tTiltRad);
        const normZ = Math.cos(tTiltRad);

        // cos(AOI) = dot(normal, sunDir)
        const cosAoi = Math.max(0, normX * sunDir.x + normY * sunDir.y + normZ * sunDir.z);

        const poaBeamWh = dniProxyWh * cosAoi;
        const poaDiffWh = dhiProxyWh * ((1.0 + Math.cos(tTiltRad)) / 2.0);
        const poaGndWh = ghiProxyWh * albedo * ((1.0 - Math.cos(tTiltRad)) / 2.0);

        const scale = ((table.ratedPowerWp / 1000.0) * weight) / 1000.0;
        const stepBeamUnshadedKwh = poaBeamWh * scale;
        const stepDiffUnshadedKwh = poaDiffWh * scale;
        const stepGndUnshadedKwh = poaGndWh * scale;
        const stepUnshadedKwh = stepBeamUnshadedKwh + stepDiffUnshadedKwh + stepGndUnshadedKwh;
        stats.unshadedKwh += stepUnshadedKwh;

        // Use pre-computed occlusion facets for this table (P3-05 optimization)
        const occlusionFacetsForTable = occlusionFacetsByTable.get(table.id) || allObstacleFacets;

        const meshRes = computeTableShadingGeometricMesh(table, occlusionFacetsForTable, sun);

        stats.beamCoverageSum += meshRes.beamCoveragePct * weight;
        if (meshRes.isDiodeTriggered) {
          stats.diodeHours += weight;
        }

        // Direct geometric beam loss (kWh) from line-of-sight occlusion strictly affects direct beam
        const stepDirectBeamKwh = stepBeamUnshadedKwh * meshRes.directBeamLossFraction;

        // Substring diode mismatch loss occurs on substrings with active cell occlusion
        const remainingTableKwh = Math.max(0, stepUnshadedKwh - stepDirectBeamKwh);
        const stepDiodeMismatchKwh = remainingTableKwh * meshRes.diodeMismatchLossFraction;

        const stepTotalLostKwh = Math.min(stepUnshadedKwh, stepDirectBeamKwh + stepDiodeMismatchKwh);
        const stepShadedKwh = Math.max(0, stepUnshadedKwh - stepTotalLostKwh);

        stats.directBeamLossKwh += stepDirectBeamKwh;
        stats.diodeMismatchLossKwh += stepDiodeMismatchKwh;
        stats.shadedKwh += stepShadedKwh;
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
    totalDirectBeamLossKwh += stats.directBeamLossKwh;
    totalDiodeMismatchLossKwh += stats.diodeMismatchLossKwh;

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

  const aggregateShadingLossPct = totalUnshaded > 0 ? Number(((totalLost / totalUnshaded) * 100.0).toFixed(2)) : 0.0;
  const annualGeometricBeamLossPct =
    totalUnshaded > 0 ? Number(((totalDirectBeamLossKwh / totalUnshaded) * 100.0).toFixed(2)) : 0.0;
  const annualElectricalMismatchLossPct =
    totalUnshaded > 0 ? Number(((totalDiodeMismatchLossKwh / totalUnshaded) * 100.0).toFixed(2)) : 0.0;

  const isArithmeticBalanceOk = Math.abs(totalUnshaded - (totalShaded + totalLost)) <= 1.0;
  const isHeatmapAggregationConsistent =
    (totalUnshaded > 0 && reconciliationDeltaKwh <= 1.0) || (totalUnshaded === 0 && totalLost === 0);
  const isComponentEnergyConsistent =
    Math.abs(annualGeometricBeamLossPct + annualElectricalMismatchLossPct - aggregateShadingLossPct) <= 0.05 ||
    Math.abs(totalDirectBeamLossKwh + totalDiodeMismatchLossKwh - totalLost) <= Math.max(5.0, totalUnshaded * 0.001) ||
    totalUnshaded === 0;

  const sumTablesWatts = scene.pvTables.reduce((s, t) => s + (t.ratedPowerWp || 0), 0);
  const sumTablesKwp = sumTablesWatts / 1000.0;
  const sumTablesModules = scene.pvTables.reduce((s, t) => s + (t.moduleCount || 0), 0);

  const isCapacityConsistent =
    scene.totalPvCapacityKwp === undefined ||
    (scene.totalPvCapacityKwp === 0 && sumTablesKwp === 0) ||
    (scene.totalPvCapacityKwp > 0 &&
      sumTablesKwp > 0 &&
      Math.abs(scene.totalPvCapacityKwp - sumTablesKwp) <= Math.max(0.02, scene.totalPvCapacityKwp * 0.01));

  const isModulesConsistent =
    scene.totalModulesCount === undefined ||
    (scene.totalModulesCount === 0 && sumTablesModules === 0) ||
    (scene.totalModulesCount > 0 &&
      sumTablesModules > 0 &&
      scene.totalModulesCount === sumTablesModules);

  const isTablesModuleCountValid =
    scene.pvTables.length === 0 || scene.pvTables.every(t => t.moduleCount > 0);

  const isProjectSnapshotConsistent =
    isCapacityConsistent && isModulesConsistent && isTablesModuleCountValid;

  const isReconciled =
    isArithmeticBalanceOk &&
    isHeatmapAggregationConsistent &&
    isComponentEnergyConsistent &&
    isProjectSnapshotConsistent;

  const reconciliationNotes = [
    'Arithmetic balance verified across generation, unshaded baseline, and lost kWh. Diffuse and ground view factors are modeled under unobstructed hemispherical screening assumptions.',
    !isCapacityConsistent
      ? `Capacity mismatch: declared ${scene.totalPvCapacityKwp} kWp vs table sum ${sumTablesKwp.toFixed(2)} kWp.`
      : '',
    !isModulesConsistent
      ? `Module count mismatch: declared ${scene.totalModulesCount} vs table sum ${sumTablesModules}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const reconciliationStatus: ShadingReconciliationStatus = {
    isArithmeticBalanceOk,
    isHeatmapAggregationConsistent,
    isComponentEnergyConsistent,
    isProjectSnapshotConsistent,
    overallReconciled: isReconciled,
    reconciliationNotes,
  };

  const targetAnnualHorizontalIrradiationKwhM2 = Number((targetAnnualHorizontalIrradiationWhM2 / 1000.0).toFixed(2));
  const simulatedAnnualHorizontalIrradiationKwhM2 = Number((simulatedHorizontalIrradiationWhM2 / 1000.0).toFixed(2));
  const pshIntegralConservationErrorPct =
    targetAnnualHorizontalIrradiationKwhM2 > 0
      ? Number(
          (
            (Math.abs(simulatedAnnualHorizontalIrradiationKwhM2 - targetAnnualHorizontalIrradiationKwhM2) /
              targetAnnualHorizontalIrradiationKwhM2) *
            100.0
          ).toFixed(4)
        )
      : 0.0;
  const isEnergyConservationPreserved = isArithmeticBalanceOk;

  // Reconcile into the canonical waterfall loss tree (0 kWp yields 0 MWh instead of fake 100 kWp plant)
  const totalPlantKwp =
    scene.totalPvCapacityKwp !== undefined
      ? scene.totalPvCapacityKwp
      : scene.pvTables.reduce((s, t) => s + t.ratedPowerWp / 1000.0, 0);

  // Array tilt (not flat roof pitch) is passed to waterfall POA transposition
  const resolvedArrayTiltDeg = scene.tiltDeg ?? scene.pvTables[0]?.tiltDeg ?? 25.0;

  const waterfallReport = computeWaterfallLosses(
    ...buildWaterfallArgs({
      installedCapacityKwp: totalPlantKwp,
      peakSunHours,
      ambientTempMaxC,
      soilingLossPct: 4.5,
      dcAcRatio: 1.25,
      hasTracker: false,
      snowLossPct: 0.0,
      iamLossPct: -2.2,
      noctC: 45.0,
      tempCoeffPmpPct: -0.30,
      fixedTiltDeg: resolvedArrayTiltDeg,
      latitudeDeg: lat,
      shadingLossOverridePct: aggregateShadingLossPct,
    })
  );

  return {
    sceneState: {
      ...scene,
      albedo: resolvedAlbedo,
    },
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
    reconciliationStatus,
    waterfallLossReport: waterfallReport,
    methodologyDescription:
      'Annual clear-sky optical ray-tracing screening proxy (isotropic diffuse and albedo transposition with multi-point substring mesh line-of-sight occlusion)',
    weatherDataSource:
      'Estimated clear-sky proxy calibrated to site annual peak sun hours (PSH); not an empirical 8760-hour measured satellite TMY dataset',
    diffuseTranspositionAssumption:
      'Sky diffuse and ground-reflected radiation assume unobstructed hemispherical view factor; geometric ray-tracing evaluates direct beam line-of-sight occlusion',
    targetAnnualHorizontalIrradiationKwhM2,
    simulatedAnnualHorizontalIrradiationKwhM2,
    pshIntegralConservationErrorPct,
    isEnergyConservationPreserved,
    energyBalanceNote:
      'Energy accounting balance (E_unshaded = E_shaded + E_lost) verifies algorithmic arithmetic conservation only. It does not validate empirical transposition accuracy, circumsolar diffuse anisotropy, or non-linear multi-string mismatch behavior.',
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
      positionEnu: { x: -8, y: -1, z: 8.95 },
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
      positionEnu: { x: 8, y: -1, z: 8.95 },
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
      positionEnu: { x: -8, y: 8, z: 8.95 },
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
      positionEnu: { x: 8, y: 8, z: 8.95 },
      widthM: 12.0,
      slopedLengthM: 4.6,
      tiltDeg: 15,
      azimuthDeg: 0,
      moduleCount: 24,
      ratedPowerWp: 13800,
    },
  ],
  totalPvCapacityKwp: 55.2,
  totalModulesCount: 96,
  tiltDeg: 15,
  interRowSpacingM: 9.0,
  installationEnvironment: 'rooftop_industrial',
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// 6. Dynamic Project-Coupled 3D Rooftop Scene Generator & Ray-Traced Shading
// ============================================================================

export interface ProjectArrayDesignInputs {
  totalPvCapacityKwp: number;
  totalModulesCount: number;
  interRowSpacingM?: number;
  tiltDeg?: number;
  azimuthDeg?: number;
  moduleWidthM?: number;
  moduleLengthM?: number;
  modulePmpWatts?: number;
  latitude?: number;
  longitude?: number;
  elevationM?: number;
  installationEnvironment?: string;
  obstacles?: Obstacle3D[];
  isDemoMode?: boolean;
  includeDefaultObstacles?: boolean;
  isObstacleFreeVerified?: boolean;
  albedo?: number;
}

/**
 * Builds a dynamic 3D rooftop/ground scene accurately connected to active project design props
 * (capacity, module count, row pitch spacing, tilt, obstacles, geodetic coordinates).
 */
export function buildSceneFromProjectDesign(inputs: ProjectArrayDesignInputs): Scene3DState {
  const lat = inputs.latitude ?? 35.6892;
  const lng = inputs.longitude ?? 51.3890;
  const elev = inputs.elevationM ?? 1200;

  const tiltDeg = Math.max(0, Math.min(60, inputs.tiltDeg ?? 25));
  const azimuthDeg = inputs.azimuthDeg ?? 0;
  const pitchM = Math.max(1.8, inputs.interRowSpacingM || 5.0);

  const env = inputs.installationEnvironment?.toLowerCase() || '';
  const isRooftop =
    !env || env.includes('rooftop') || env.includes('shed') || env.includes('concrete');
  const eavesHeightM = isRooftop ? 8.0 : 0.0;
  const clearanceM = isRooftop ? 0.35 : 0.8;
  const tiltRad = (tiltDeg * Math.PI) / 180.0;

  // Zero-capacity or zero-panel guard: generate empty scene without fabricating panels
  if (inputs.totalModulesCount === 0 || inputs.totalPvCapacityKwp === 0) {
    return {
      anchorLocation: { latitude: lat, longitude: lng, elevationM: elev },
      roofPlanes: [
        {
          id: 'roof-project-empty',
          name: isRooftop ? 'Empty Rooftop Plane' : 'Empty Ground Footprint',
          polygonWgs84: [],
          polygonEnu: [
            { x: -10, y: -10 },
            { x: 10, y: -10 },
            { x: 10, y: 10 },
            { x: -10, y: 10 },
          ],
          tiltDeg: 0,
          azimuthDeg: 0,
          eavesHeightM,
          setbackClearanceM: 1.5,
        },
      ],
      pvTables: [],
      obstacles: inputs.obstacles ?? [],
      totalPvCapacityKwp: 0,
      totalModulesCount: 0,
      tiltDeg,
      azimuthDeg,
      interRowSpacingM: pitchM,
      albedo: inputs.albedo ?? 0.20,
      updatedAt: new Date().toISOString(),
    };
  }

  const totalModules = Math.max(1, inputs.totalModulesCount || 140);
  const modWidth = Math.max(0.8, inputs.moduleWidthM || 1.134);
  const modLength = Math.max(1.2, inputs.moduleLengthM || 2.278);

  // Canonical physical Pmp per module (N07)
  const modPmp = inputs.modulePmpWatts && inputs.modulePmpWatts > 0
    ? inputs.modulePmpWatts
    : (inputs.totalPvCapacityKwp > 0 ? (inputs.totalPvCapacityKwp * 1000) / totalModules : 550);

  // Canonical physical table power is strictly derived from N * Pmp (never artificially redistributed)
  const canonicalKwp = Number(((totalModules * modPmp) / 1000.0).toFixed(4));
  const totalWatts = Math.round(canonicalKwp * 1000);

  // Declared project capacity is preserved as totalPvCapacityKwp for reconciliation mismatch detection
  const totalKwp = inputs.totalPvCapacityKwp > 0 ? inputs.totalPvCapacityKwp : canonicalKwp;

  // Determine realistic table/row layout based on module count
  let numRows: number;
  if (totalModules === 1) {
    numRows = 1;
  } else if (totalModules <= 28) {
    numRows = 1;
  } else if (totalModules <= 84) {
    numRows = Math.min(3, Math.max(2, Math.ceil(totalModules / 28)));
  } else if (totalModules <= 200) {
    numRows = Math.min(6, Math.max(3, Math.ceil(totalModules / 28)));
  } else {
    // Large commercial / utility array: scale into 4 to 8 rows
    numRows = Math.min(8, Math.max(4, Math.round(totalModules / 250)));
  }

  // Exact conservation partition of modules and rated Watts across tables
  const baseModules = Math.floor(totalModules / numRows);
  const remModules = totalModules % numRows;
  const baseWatts = Math.floor(totalWatts / numRows);
  const remWatts = totalWatts % numRows;

  // Construct roof plane (or site footprint boundary) with setbacks
  const maxTableCols = Math.max(1, Math.ceil(baseModules / 2));
  const estimatedMaxTableWidthM = Number((maxTableCols * modWidth).toFixed(2));
  const setbackM = 1.5;
  const halfRoofWidth = Math.max(12, estimatedMaxTableWidthM / 2 + setbackM + 2.0);
  const halfRoofLength = Math.max(12, (numRows * pitchM) / 2 + setbackM + 2.0);
  const roofTiltDeg = isRooftop ? Math.min(5, tiltDeg) : 0;

  const roofPlanes: RoofPlane[] = [
    {
      id: 'roof-project-main',
      name: isRooftop ? 'Active Project Rooftop Plane' : 'Active Project Ground Footprint',
      polygonWgs84: [],
      polygonEnu: [
        { x: -halfRoofWidth, y: -halfRoofLength },
        { x: halfRoofWidth, y: -halfRoofLength },
        { x: halfRoofWidth, y: halfRoofLength },
        { x: -halfRoofWidth, y: halfRoofLength },
      ],
      tiltDeg: roofTiltDeg,
      azimuthDeg: 0,
      eavesHeightM,
      setbackClearanceM: setbackM,
    },
  ];

  // Generate PV tables spaced along Y (North-South in ENU)
  const pvTables: PvTable3D[] = [];
  const yStart = -((numRows - 1) * pitchM) / 2;

  for (let r = 0; r < numRows; r++) {
    const yPos = Number((yStart + r * pitchM).toFixed(2));
    const tableModules = baseModules + (r < remModules ? 1 : 0);
    const tableWatts = baseWatts + (r < remWatts ? 1 : 0);
    const tableCols = Math.max(1, Math.ceil(tableModules / 2));
    const tableWidthM = Number((tableCols * modWidth).toFixed(2));
    const tableSlopedLengthM = tableModules === 1 ? modLength : Number((2 * modLength).toFixed(2));

    // Local roof surface elevation directly under table center
    const localRoofAtCenter = isRooftop && roofTiltDeg > 0
      ? getLocalRoofElevationAt(roofPlanes[0], 0, yPos)
      : eavesHeightM;

    // Initial center elevation Z ensuring lowest edge clears center elevation
    let tableCenterZM = Number(
      (localRoofAtCenter + clearanceM + (tableSlopedLengthM / 2.0) * Math.sin(tiltRad)).toFixed(3)
    );

    // Rigorous 4-corner local clearance evaluation against sloped/pitched roof surface (R11)
    const tempTable: PvTable3D = {
      id: `tbl-proj-${r + 1}`,
      tableIndex: r + 1,
      positionEnu: { x: 0, y: yPos, z: tableCenterZM },
      widthM: tableWidthM,
      slopedLengthM: tableSlopedLengthM,
      tiltDeg,
      azimuthDeg,
      moduleCount: tableModules,
      ratedPowerWp: tableWatts,
    };

    const clearanceCheck = checkTableRoofClearance(tempTable, roofPlanes[0]);
    if (clearanceCheck.minClearanceM < clearanceM) {
      const shortfall = Number((clearanceM - clearanceCheck.minClearanceM).toFixed(3));
      tableCenterZM = Number((tableCenterZM + shortfall).toFixed(3));
    }

    pvTables.push({
      id: `tbl-proj-${r + 1}`,
      tableIndex: r + 1,
      positionEnu: { x: 0, y: yPos, z: tableCenterZM },
      widthM: tableWidthM,
      slopedLengthM: tableSlopedLengthM,
      tiltDeg,
      azimuthDeg,
      moduleCount: tableModules,
      ratedPowerWp: tableWatts,
    });
  }

  const maxTableWidthM = pvTables.length > 0 ? Math.max(...pvTables.map(t => t.widthM)) : estimatedMaxTableWidthM;

  // Obstacle modeling & data status resolution:
  // 1. Array of obstacles provided (> 0 items) -> 'surveyed'
  // 2. Array of obstacles explicitly empty ([]) OR isObstacleFreeVerified === true -> 'verified_unobstructed'
  // 3. Explicit demo mode (isDemoMode === true || includeDefaultObstacles === true) -> 'demo_sample'
  // 4. Default for real project with inputs.obstacles undefined -> 'missing_unverified' (array clean, no fake obstacles)
  let obstacles: Obstacle3D[] = [];
  let obstacleDataStatus: 'demo_sample' | 'surveyed' | 'verified_unobstructed' | 'missing_unverified' =
    'missing_unverified';

  if (Array.isArray(inputs.obstacles)) {
    obstacles = inputs.obstacles;
    obstacleDataStatus = obstacles.length > 0 ? 'surveyed' : 'verified_unobstructed';
  } else if (inputs.isObstacleFreeVerified === true) {
    obstacles = [];
    obstacleDataStatus = 'verified_unobstructed';
  } else if (inputs.isDemoMode === true || inputs.includeDefaultObstacles === true) {
    obstacleDataStatus = 'demo_sample';
    if (isRooftop) {
      // Standard rooftop obstructions for explicit demo/screening mode only
      obstacles = [
        {
          id: 'obs-proj-hvac',
          name: 'Rooftop HVAC Chiller Unit',
          geometryType: 'cuboid',
          positionEnu: { x: 0, y: Number((yStart - 4.5).toFixed(2)), z: eavesHeightM },
          dimensionsM: { widthM: 3.8, lengthM: 3.8, heightM: 2.8 },
        },
        {
          id: 'obs-proj-chimney',
          name: 'Rooftop Vent Exhaust Stack',
          geometryType: 'cylinder',
          positionEnu: { x: Number((maxTableWidthM / 2 + 2.2).toFixed(2)), y: 0, z: eavesHeightM },
          dimensionsM: { radiusM: 0.9, heightM: 3.2 },
        },
      ];
    } else {
      // Ground mount substation kiosk for explicit demo/screening mode only
      obstacles = [
        {
          id: 'obs-proj-inverter-kiosk',
          name: 'Central Inverter & MV Substation Kiosk',
          geometryType: 'cuboid',
          positionEnu: { x: Number((maxTableWidthM / 2 + 3.2).toFixed(2)), y: 0, z: 0.0 },
          dimensionsM: { widthM: 4.2, lengthM: 3.2, heightM: 2.8 },
        },
      ];
    }
  } else {
    // Real projects without specified obstacles have clean unobstructed arrays
    obstacles = [];
    obstacleDataStatus = 'missing_unverified';
  }

  return {
    anchorLocation: {
      latitude: lat,
      longitude: lng,
      elevationM: elev,
    },
    roofPlanes,
    obstacles,
    pvTables,
    totalPvCapacityKwp: totalKwp,
    totalModulesCount: totalModules,
    tiltDeg,
    azimuthDeg,
    interRowSpacingM: pitchM,
    installationEnvironment: env,
    obstacleDataStatus,
    albedo: inputs.albedo ?? 0.20,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Converts 3D obstacles (cuboids, cylinders, polygons) into 3D Triangles
 * compatible with the canonical ray-tracing engine (calculateShadingFactor).
 */
export function convertObstaclesToTriangles(obstacles: Obstacle3D[]): Triangle[] {
  const triangles: Triangle[] = [];

  for (const obs of obstacles) {
    const facets = buildObstacleFacets(obs);
    for (const facet of facets) {
      const v = facet.vertices;
      if (v.length < 3) continue;

      // Triangulate convex planar polygon as triangle fan
      for (let i = 1; i < v.length - 1; i++) {
        triangles.push({
          v0: { x: v[0].x, y: v[0].y, z: v[0].z },
          v1: { x: v[i].x, y: v[i].y, z: v[i].z },
          v2: { x: v[i + 1].x, y: v[i + 1].y, z: v[i + 1].z },
        });
      }
    }
  }

  return triangles;
}

export interface ActiveTableSubRect {
  centerOffsetLat: number;   // lateral offset from table center
  centerOffsetSlope: number; // sloped offset from table center
  width: number;
  slopedLength: number;
  moduleSlotIndex: number;
}

/**
 * Decomposes a PV table into active rectangular module zones.
 * For odd module counts (e.g. 27 modules on a 14-col x 2-row table), the empty slot is
 * excluded so neither receiving facets nor occluding triangles are generated for it.
 */
export function getActiveTableSubRects(table: PvTable3D): ActiveTableSubRect[] {
  const modCount = table.moduleCount;
  if (!modCount || modCount <= 0) return [];
  if (modCount === 1) {
    return [
      {
        centerOffsetLat: 0,
        centerOffsetSlope: 0,
        width: table.widthM,
        slopedLength: table.slopedLengthM,
        moduleSlotIndex: 0,
      },
    ];
  }

  const cols = Math.max(1, Math.ceil(modCount / 2));
  const isOdd = modCount % 2 !== 0;

  // Complete even module count: table forms a single continuous rectangular surface
  if (!isOdd) {
    return [
      {
        centerOffsetLat: 0,
        centerOffsetSlope: 0,
        width: table.widthM,
        slopedLength: table.slopedLengthM,
        moduleSlotIndex: 0,
      },
    ];
  }

  // Odd module count: partition into (cols - 1) full columns + 1 half-length odd column
  const colWidth = table.widthM / cols;
  const halfLen = table.slopedLengthM / 2;
  const rects: ActiveTableSubRect[] = [];

  if (cols > 1) {
    const fullColsWidth = (cols - 1) * colWidth;
    const fullColsCenterLat = -table.widthM / 2 + fullColsWidth / 2;
    rects.push({
      centerOffsetLat: fullColsCenterLat,
      centerOffsetSlope: 0,
      width: fullColsWidth,
      slopedLength: table.slopedLengthM,
      moduleSlotIndex: 0,
    });
  }

  const oddColCenterLat = table.widthM / 2 - colWidth / 2;
  rects.push({
    centerOffsetLat: oddColCenterLat,
    centerOffsetSlope: -halfLen / 2,
    width: colWidth,
    slopedLength: halfLen,
    moduleSlotIndex: modCount - 1,
  });

  return rects;
}

/**
 * Calculates active collector area (m²) strictly summing active module surfaces.
 */
export function calculateTableActiveCollectorAreaM2(table: PvTable3D): number {
  const subRects = getActiveTableSubRects(table);
  return subRects.reduce((sum, sr) => sum + sr.width * sr.slopedLength, 0);
}

/**
 * Builds planar bounding facet representation of a PV table surface in ENU coordinates.
 * Excludes phantom module slots for odd module counts (R01, R10).
 */
export function buildTableFacets(table: PvTable3D): PlanarFacet3D[] {
  const tiltRad = (table.tiltDeg * Math.PI) / 180.0;
  const tableAzRad = (table.azimuthDeg * Math.PI) / 180.0;

  const latUx = Math.cos(tableAzRad);
  const latUy = -Math.sin(tableAzRad);

  const slopeUx = Math.sin(tableAzRad) * Math.cos(tiltRad);
  const slopeUy = Math.cos(tableAzRad) * Math.cos(tiltRad);
  const slopeUz = Math.sin(tiltRad);

  const nx = -Math.sin(tableAzRad) * Math.sin(tiltRad);
  const ny = -Math.cos(tableAzRad) * Math.sin(tiltRad);
  const nz = Math.cos(tiltRad);

  const subRects = getActiveTableSubRects(table);
  if (subRects.length === 0) return [];

  const facets: PlanarFacet3D[] = [];

  for (let i = 0; i < subRects.length; i++) {
    const sr = subRects[i];
    const cx = table.positionEnu.x + sr.centerOffsetLat * latUx + sr.centerOffsetSlope * slopeUx;
    const cy = table.positionEnu.y + sr.centerOffsetLat * latUy + sr.centerOffsetSlope * slopeUy;
    const cz = table.positionEnu.z + sr.centerOffsetSlope * slopeUz;

    const hw = sr.width / 2;
    const hl = sr.slopedLength / 2;

    const c0 = {
      x: cx - hw * latUx - hl * slopeUx,
      y: cy - hw * latUy - hl * slopeUy,
      z: cz - hl * slopeUz,
    };
    const c1 = {
      x: cx + hw * latUx - hl * slopeUx,
      y: cy + hw * latUy - hl * slopeUy,
      z: cz - hl * slopeUz,
    };
    const c2 = {
      x: cx + hw * latUx + hl * slopeUx,
      y: cy + hw * latUy + hl * slopeUy,
      z: cz + hl * slopeUz,
    };
    const c3 = {
      x: cx - hw * latUx + hl * slopeUx,
      y: cy - hw * latUy + hl * slopeUy,
      z: cz + hl * slopeUz,
    };

    const d = -(nx * c0.x + ny * c0.y + nz * c0.z);

    facets.push({
      name: `${table.id}-surface-${i}`,
      normal: { x: nx, y: ny, z: nz },
      d,
      vertices: [c0, c1, c2, c3],
    });
  }

  return facets;
}

/**
 * Converts PV table surfaces into 3D Triangles to support inter-row self-shading ray tracing.
 * Accurately excludes empty slots for odd module counts.
 */
export function convertPvTablesToTriangles(tables: PvTable3D[]): Triangle[] {
  const triangles: Triangle[] = [];

  for (const table of tables) {
    const facets = buildTableFacets(table);
    for (const facet of facets) {
      const v = facet.vertices;
      if (v.length >= 4) {
        triangles.push({ v0: v[0], v1: v[1], v2: v[2] });
        triangles.push({ v0: v[0], v1: v[2], v2: v[3] });
      }
    }
  }

  return triangles;
}

function generateSubRectGridPoints(
  sr: ActiveTableSubRect,
  targetCount: number,
  table: PvTable3D,
  latUx: number,
  latUy: number,
  slopeUx: number,
  slopeUy: number,
  slopeUz: number,
  normX: number,
  normY: number,
  normZ: number,
  normalOffset: number
): Vec3[] {
  if (targetCount <= 0) return [];
  const cx = table.positionEnu.x + sr.centerOffsetLat * latUx + sr.centerOffsetSlope * slopeUx;
  const cy = table.positionEnu.y + sr.centerOffsetLat * latUy + sr.centerOffsetSlope * slopeUy;
  const cz = table.positionEnu.z + sr.centerOffsetSlope * slopeUz;

  if (targetCount === 1) {
    return [
      {
        x: cx + normalOffset * normX,
        y: cy + normalOffset * normY,
        z: cz + normalOffset * normZ,
      },
    ];
  }

  const hw = sr.width / 2;
  const hl = sr.slopedLength / 2;
  const aspect = Math.max(0.2, sr.width / sr.slopedLength);

  let bestL = 1;
  let bestS = targetCount;
  let bestErr = Infinity;
  let bestAspectDiff = Infinity;

  for (let l = 1; l <= targetCount; l++) {
    const s = Math.max(1, Math.ceil(targetCount / l));
    const prod = l * s;
    const err = prod - targetCount;
    if (err < 0) continue;
    const aspectDiff = Math.abs(l / s - aspect);
    if (err < bestErr || (err === bestErr && aspectDiff < bestAspectDiff)) {
      bestErr = err;
      bestAspectDiff = aspectDiff;
      bestL = l;
      bestS = s;
    }
  }

  const rawGrid: Vec3[] = [];
  for (let r = 0; r < bestS; r++) {
    const sFrac = bestS === 1 ? 0 : -0.5 + (r / (bestS - 1));
    const sOffset = sFrac * hl * 2 * 0.9;
    for (let c = 0; c < bestL; c++) {
      const lFrac = bestL === 1 ? 0 : -0.5 + (c / (bestL - 1));
      const lOffset = lFrac * hw * 2 * 0.9;
      rawGrid.push({
        x: cx + lOffset * latUx + sOffset * slopeUx + normalOffset * normX,
        y: cy + lOffset * latUy + sOffset * slopeUy + normalOffset * normY,
        z: cz + sOffset * slopeUz + normalOffset * normZ,
      });
    }
  }

  if (rawGrid.length === targetCount) {
    return rawGrid;
  }

  // Sample evenly without duplicate coordinates (P3)
  const sampled: Vec3[] = [];
  const step = rawGrid.length / targetCount;
  for (let i = 0; i < targetCount; i++) {
    sampled.push(rawGrid[Math.min(rawGrid.length - 1, Math.floor(i * step))]);
  }
  return sampled;
}

/**
 * Generates sample target vertices across a PV table surface for ray-intersection evaluation.
 * Points are placed exclusively inside active module zones.
 */
export function generateTableMeshSamplePoints(
  table: PvTable3D,
  lateralCount: number = 4,
  slopedCount: number = 3,
  exactTargetCount?: number
): Vec3[] {
  const tiltRad = (table.tiltDeg * Math.PI) / 180.0;
  const tableAzRad = (table.azimuthDeg * Math.PI) / 180.0;

  const latUx = Math.cos(tableAzRad);
  const latUy = -Math.sin(tableAzRad);

  const slopeUx = Math.sin(tableAzRad) * Math.cos(tiltRad);
  const slopeUy = Math.cos(tableAzRad) * Math.cos(tiltRad);
  const slopeUz = Math.sin(tiltRad);

  const normX = -Math.sin(tableAzRad) * Math.sin(tiltRad);
  const normY = -Math.cos(tableAzRad) * Math.sin(tiltRad);
  const normZ = Math.cos(tiltRad);

  const normalOffset = 0.05; // 5 cm above panel surface along normal vector to guard against numerical coplanar self-intersection

  // Exact 1-point request: table centroid (R847-08)
  if (exactTargetCount === 1) {
    return [
      {
        x: table.positionEnu.x + normalOffset * normX,
        y: table.positionEnu.y + normalOffset * normY,
        z: table.positionEnu.z + normalOffset * normZ,
      },
    ];
  }

  const subRects = getActiveTableSubRects(table);
  const points: Vec3[] = [];

  if (subRects.length === 0) return points;

  // When exactTargetCount is supplied, distribute sample points continuously across sub-rects without duplicate points (P3)
  if (exactTargetCount !== undefined && exactTargetCount > 0) {
    const totalArea = subRects.reduce((sum, sr) => sum + sr.width * sr.slopedLength, 0);
    let remainingPoints = exactTargetCount;
    const subRectPoints: Vec3[] = [];

    for (let i = 0; i < subRects.length; i++) {
      const sr = subRects[i];
      const area = sr.width * sr.slopedLength;
      const isLast = i === subRects.length - 1;
      const srTarget = isLast
        ? remainingPoints
        : Math.min(remainingPoints, Math.max(1, Math.round(exactTargetCount * (area / totalArea))));
      remainingPoints -= srTarget;

      const pts = generateSubRectGridPoints(
        sr,
        srTarget,
        table,
        latUx,
        latUy,
        slopeUx,
        slopeUy,
        slopeUz,
        normX,
        normY,
        normZ,
        normalOffset
      );
      subRectPoints.push(...pts);
    }

    return subRectPoints;
  }

  // Single sub-rect (even module counts or single-module tables):
  // Generate lateralCount x slopedCount regular grid
  if (subRects.length === 1) {
    const sr = subRects[0];
    const cx = table.positionEnu.x + sr.centerOffsetLat * latUx + sr.centerOffsetSlope * slopeUx;
    const cy = table.positionEnu.y + sr.centerOffsetLat * latUy + sr.centerOffsetSlope * slopeUy;
    const cz = table.positionEnu.z + sr.centerOffsetSlope * slopeUz;

    const hw = sr.width / 2;
    const hl = sr.slopedLength / 2;

    const lCols = Math.max(1, lateralCount);
    const sRows = Math.max(1, slopedCount);

    for (let r = 0; r < sRows; r++) {
      const sFrac = sRows === 1 ? 0 : -0.5 + (r / (sRows - 1)) * 1.0;
      const sOffset = sFrac * hl;
      for (let c = 0; c < lCols; c++) {
        const lFrac = lCols === 1 ? 0 : -0.5 + (c / (lCols - 1)) * 1.0;
        const lOffset = lFrac * hw;
        points.push({
          x: cx + lOffset * latUx + sOffset * slopeUx + normalOffset * normX,
          y: cy + lOffset * latUy + sOffset * slopeUy + normalOffset * normY,
          z: cz + sOffset * slopeUz + normalOffset * normZ,
        });
      }
    }
    return points;
  }

  // Multi-subrect (odd module count):
  // Distribute sample points with area-weighted / module-uniform density across active modules.
  // Each active module receives equal sampling density so an odd module (e.g. 1/27 = 3.7% area)
  // does not receive 50% of the sample points.
  const modCount = table.moduleCount;
  const cols = Math.max(1, Math.ceil(modCount / 2));
  const fullCols = cols - 1;

  for (const sr of subRects) {
    const cx = table.positionEnu.x + sr.centerOffsetLat * latUx + sr.centerOffsetSlope * slopeUx;
    const cy = table.positionEnu.y + sr.centerOffsetLat * latUy + sr.centerOffsetSlope * slopeUy;
    const cz = table.positionEnu.z + sr.centerOffsetSlope * slopeUz;

    const hw = sr.width / 2;
    const hl = sr.slopedLength / 2;

    const isOddColSubRect = sr.slopedLength < table.slopedLengthM * 0.75;
    const lCols = isOddColSubRect ? 1 : Math.max(1, fullCols);
    const sRows = isOddColSubRect ? 1 : 2;

    for (let r = 0; r < sRows; r++) {
      const sFrac = sRows === 1 ? 0 : -0.25 + r * 0.5;
      const sOffset = sFrac * hl * 2;
      for (let c = 0; c < lCols; c++) {
        const lFrac = lCols === 1 ? 0 : -0.5 + (c + 0.5) / lCols;
        const lOffset = lFrac * hw * 2;
        points.push({
          x: cx + lOffset * latUx + sOffset * slopeUx + normalOffset * normX,
          y: cy + lOffset * latUy + sOffset * slopeUy + normalOffset * normY,
          z: cz + sOffset * slopeUz + normalOffset * normZ,
        });
      }
    }
  }

  // Exact target count post-processing (R847-08)
  if (exactTargetCount !== undefined && exactTargetCount > 0 && points.length !== exactTargetCount) {
    if (points.length > exactTargetCount) {
      const step = points.length / exactTargetCount;
      const sampled: Vec3[] = [];
      for (let i = 0; i < exactTargetCount; i++) {
        sampled.push(points[Math.min(points.length - 1, Math.floor(i * step))]);
      }
      return sampled;
    } else if (points.length < exactTargetCount && points.length > 0) {
      const res = [...points];
      while (res.length < exactTargetCount) {
        res.push(points[res.length % points.length]);
      }
      return res;
    }
  }

  return points;
}

/**
 * Computes local roof surface elevation Z at coordinates (x, y) ENU.
 * For flat roofs, this returns eavesHeightM.
 * For pitched roofs, this evaluates the planar elevation based on roof pitch and slope azimuth.
 */
export function getLocalRoofElevationAt(roofPlane: RoofPlane, x: number, y: number): number {
  const baseZ = roofPlane.eavesHeightM;
  if (!roofPlane.tiltDeg || roofPlane.tiltDeg === 0) {
    return baseZ;
  }

  const pitchRad = (roofPlane.tiltDeg * Math.PI) / 180.0;
  const azRad = ((roofPlane.azimuthDeg || 0) * Math.PI) / 180.0;

  // Unit vector in direction of ascending roof slope:
  // In ENU (+X=East, +Y=North, +Z=Up):
  // Azimuth 0 = faces South, slopes Up toward North (+Y)
  // Azimuth 90 = faces West, slopes Up toward East (+X)
  // Azimuth 180 = faces North, slopes Up toward South (-Y)
  // Azimuth 270/-90 = faces East, slopes Up toward West (-X)
  const riseDirX = Math.sin(azRad);
  const riseDirY = Math.cos(azRad);

  let refRise = 0;
  if (roofPlane.polygonEnu && roofPlane.polygonEnu.length > 0) {
    const rises = roofPlane.polygonEnu.map(p => p.x * riseDirX + p.y * riseDirY);
    refRise = Math.min(...rises);
  }

  const currentRise = x * riseDirX + y * riseDirY;
  const distAlongSlope = Math.max(0, currentRise - refRise);
  const deltaZ = distAlongSlope * Math.tan(pitchRad);

  if (roofPlane.ridgeHeightM !== undefined && roofPlane.ridgeHeightM > baseZ) {
    return Math.min(roofPlane.ridgeHeightM, baseZ + deltaZ);
  }

  return baseZ + deltaZ;
}

/**
 * Checks all 3D corners of all active PV tables against the local roof surface underneath them.
 * Returns the minimum physical clearance across all corners and tables.
 */
export function checkTableRoofClearance(
  table: PvTable3D,
  roofPlane: RoofPlane
): {
  minClearanceM: number;
  cornerClearances: { corner: string; clearanceM: number; tableZ: number; roofZ: number }[];
  isNonPenetrating: boolean;
} {
  const tiltRad = (table.tiltDeg * Math.PI) / 180.0;
  const tableAzRad = (table.azimuthDeg * Math.PI) / 180.0;
  const halfLen = table.slopedLengthM / 2;
  const halfWidth = table.widthM / 2;

  const latUx = Math.cos(tableAzRad);
  const latUy = -Math.sin(tableAzRad);

  const slopeUx = Math.sin(tableAzRad) * Math.cos(tiltRad);
  const slopeUy = Math.cos(tableAzRad) * Math.cos(tiltRad);
  const slopeUz = Math.sin(tiltRad);

  const corners: { name: string; pos: Vec3 }[] = [
    {
      name: 'South-West (Lower-Left)',
      pos: {
        x: table.positionEnu.x - halfWidth * latUx - halfLen * slopeUx,
        y: table.positionEnu.y - halfWidth * latUy - halfLen * slopeUy,
        z: table.positionEnu.z - halfLen * slopeUz,
      },
    },
    {
      name: 'South-East (Lower-Right)',
      pos: {
        x: table.positionEnu.x + halfWidth * latUx - halfLen * slopeUx,
        y: table.positionEnu.y + halfWidth * latUy - halfLen * slopeUy,
        z: table.positionEnu.z - halfLen * slopeUz,
      },
    },
    {
      name: 'North-East (Upper-Right)',
      pos: {
        x: table.positionEnu.x + halfWidth * latUx + halfLen * slopeUx,
        y: table.positionEnu.y + halfWidth * latUy + halfLen * slopeUy,
        z: table.positionEnu.z + halfLen * slopeUz,
      },
    },
    {
      name: 'North-West (Upper-Left)',
      pos: {
        x: table.positionEnu.x - halfWidth * latUx + halfLen * slopeUx,
        y: table.positionEnu.y - halfWidth * latUy + halfLen * slopeUy,
        z: table.positionEnu.z + halfLen * slopeUz,
      },
    },
  ];

  const cornerClearances = corners.map(c => {
    const roofZ = getLocalRoofElevationAt(roofPlane, c.pos.x, c.pos.y);
    const clearanceM = Number((c.pos.z - roofZ).toFixed(3));
    return {
      corner: c.name,
      clearanceM,
      tableZ: Number(c.pos.z.toFixed(3)),
      roofZ: Number(roofZ.toFixed(3)),
    };
  });

  const minClearanceM = Math.min(...cornerClearances.map(c => c.clearanceM));

  return {
    minClearanceM,
    cornerClearances,
    isNonPenetrating: minClearanceM > 0,
  };
}

/**
 * Generates representative daylight sun direction vectors (ENU unit vectors pointing TO the sun)
 * across key seasonal days (winter solstice, equinox, summer solstice).
 */
export function generateDaylightSunDirections(
  latitude: number,
  hoursCount: number = 12
): Vec3[] {
  const directions: Vec3[] = [];
  const sampleDays = [80, 172, 355]; // Equinox, Summer Solstice, Winter Solstice

  for (const day of sampleDays) {
    for (let h = 7; h <= 18; h += Math.max(1, Math.round(12 / hoursCount))) {
      const sun = calculateSunPathPosition(latitude, day, h);
      if (!sun.isDaylight || sun.altitudeDeg < 5.0) continue;

      const altRad = (sun.altitudeDeg * Math.PI) / 180.0;
      const azRad = (sun.azimuthDeg * Math.PI) / 180.0;

      // Unit vector FROM point TO sun in ENU:
      directions.push({
        x: -Math.sin(azRad) * Math.cos(altRad),
        y: -Math.cos(azRad) * Math.cos(altRad),
        z: Math.sin(altRad),
      });
    }
  }

  return directions;
}

/**
 * Executes ray-traced shading analysis directly using `calculateShadingFactor` from solarPvEngine.ts.
 * Evaluates obstacle occlusion and inter-row shading against target sample points on the array.
 */
export function calculateRayTracedShadingFactor(
  scene: Scene3DState,
  sunDirs?: Vec3[],
  options?: { includeInterRow?: boolean; samplePointsPerTable?: number }
): {
  unshadedRatios: number[];
  averageUnshadedRatio: number;
  averageShadingLossPct: number;
  trianglesCount: number;
  samplePointsCount: number;
} {
  const obstacleTriangles = convertObstaclesToTriangles(scene.obstacles);
  const tableTriangles = options?.includeInterRow ? convertPvTablesToTriangles(scene.pvTables) : [];
  const allTriangles = [...obstacleTriangles, ...tableTriangles];

  const effectiveSunDirs =
    sunDirs && sunDirs.length > 0
      ? sunDirs
      : generateDaylightSunDirections(scene.anchorLocation.latitude, 12);

  const allTargetPoints: Vec3[] = [];
  let totalWeightedUnshadedRatio = 0;
  let totalArrayWeight = 0;

  for (const table of scene.pvTables) {
    let tablePoints: Vec3[];
    if (options?.samplePointsPerTable) {
      const target = Math.max(1, Math.round(options.samplePointsPerTable));
      if (target === 1) {
        tablePoints = generateTableMeshSamplePoints(table, 1, 1, 1);
      } else {
        // Optimal grid search for best aspect ratio (4/3) matching target (R847-08)
        let bestL = 1;
        let bestS = target;
        let bestErr = Infinity;
        let bestAspectDiff = Infinity;
        const targetAspect = 4 / 3;

        for (let l = 1; l <= target; l++) {
          const s = Math.max(1, Math.round(target / l));
          const prod = l * s;
          const err = Math.abs(prod - target);
          const aspectDiff = Math.abs(l / s - targetAspect);
          if (err < bestErr || (err === bestErr && aspectDiff < bestAspectDiff)) {
            bestErr = err;
            bestAspectDiff = aspectDiff;
            bestL = l;
            bestS = s;
          }
        }
        tablePoints = generateTableMeshSamplePoints(table, bestL, bestS, target);
      }
    } else {
      tablePoints = generateTableMeshSamplePoints(table, 4, 3);
    }
    allTargetPoints.push(...tablePoints);

    if (tablePoints.length > 0) {
      const tableUnshadedRatios = calculateShadingFactor(allTriangles, tablePoints, effectiveSunDirs);
      const tableAvgUnshaded =
        tableUnshadedRatios.reduce((sum, r) => sum + r, 0) / tableUnshadedRatios.length;
      const weight = table.ratedPowerWp || (table.moduleCount ? table.moduleCount * 550 : 0) || 1;
      totalWeightedUnshadedRatio += tableAvgUnshaded * weight;
      totalArrayWeight += weight;
    }
  }

  const unshadedRatios =
    allTargetPoints.length > 0
      ? calculateShadingFactor(allTriangles, allTargetPoints, effectiveSunDirs)
      : [];

  const averageUnshadedRatio =
    totalArrayWeight > 0 ? totalWeightedUnshadedRatio / totalArrayWeight : 1.0;

  const averageShadingLossPct = Number(((1.0 - averageUnshadedRatio) * 100.0).toFixed(2));

  return {
    unshadedRatios,
    averageUnshadedRatio: Number(averageUnshadedRatio.toFixed(4)),
    averageShadingLossPct,
    trianglesCount: allTriangles.length,
    samplePointsCount: allTargetPoints.length,
  };
}
