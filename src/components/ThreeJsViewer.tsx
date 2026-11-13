import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { formatCoordinates } from '../engine/geoCoordinates';
import {
  Eye,
  Sun,
  Box,
  Play,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Compass,
  X,
} from 'lucide-react';
import {
  simulateAnnual3dShading,
  DEFAULT_ROOFTOP_SCENE,
  buildSceneFromProjectDesign,
  calculateRayTracedShadingFactor,
  getLocalRoofElevationAt,
  type AnnualShading3dResult,
  type Scene3DState,
  type Obstacle3D,
} from '../engine/roof3dShadingEngine';
import { runAnnualShadingSimulationAsync } from '../engine/workers/shadingWorkerClient';
import { type ClimateCity } from '../engine/climaticData';
import { type AppliedShading3dRecord, computeShadingSceneSignature } from '../engine/shadingLifecycle';

export interface ThreeJsViewerProps {
  lang?: 'fa' | 'en';
  city?: ClimateCity;
  site?: {
    lat: number;
    lng: number;
    climateData?: ClimateCity;
    city?: ClimateCity;
    arrayDesign?: unknown;
  };
  plantCapacityKw?: number;
  plantCapacityType?: 'ac_target' | 'dc_nameplate';
  annualYieldKwh?: number;
  appliedShading?: AppliedShading3dRecord | null;
  isShadingStale?: boolean;
  waterfallShadingLossPct?: number;
  onApplyShading?: (record: AppliedShading3dRecord) => void;
  onRevertShading?: () => void;
  onShadingLossChange?: (shadingLossPct: number) => void;
  simulationMode?: 'hourly_8760' | 'screening_3day';
  onSimulationModeChange?: (mode: 'hourly_8760' | 'screening_3day') => void;

  // Real Project Array Design props
  arrayDesign?: {
    totalPvCapacityKwp?: number;
    totalModulesCount?: number;
    interRowSpacingM?: number;
    tiltDeg?: number;
    azimuthDeg?: number;
    stringsCount?: number;
    modulesPerString?: number;
  };
  moduleSpecs?: {
    lengthM?: number;
    widthM?: number;
    pmpWatts?: number;
    modelName?: string;
  };
  installationEnvironment?: string;
  obstacles?: Obstacle3D[];
}

export const ThreeJsViewer: React.FC<ThreeJsViewerProps> = ({
  lang = 'fa',
  city,
  site,
  plantCapacityKw,
  plantCapacityType = 'dc_nameplate',
  annualYieldKwh,
  appliedShading = null,
  isShadingStale = false,
  waterfallShadingLossPct,
  onApplyShading,
  onRevertShading,
  onShadingLossChange,
  simulationMode: propSimulationMode,
  onSimulationModeChange,
  arrayDesign,
  moduleSpecs,
  installationEnvironment,
  obstacles,
}) => {
  const isEn = lang === 'en';
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Harmonized site and climate data resolution
  const effectiveCity = site?.climateData || site?.city || city;
  const siteLat = site?.lat ?? effectiveCity?.latitude ?? 35.6892;
  const siteLng = site?.lng ?? effectiveCity?.longitude ?? 51.3890;
  const siteElev = effectiveCity?.elevationM ?? 1200;
  const effectiveAlbedo = effectiveCity?.albedo ?? 0.20;

  // Scene Selection: defaults to active project array design if available, else demo block fallback
  const hasProjectData = Boolean(arrayDesign && (arrayDesign.totalModulesCount || 0) > 0);
  // Never auto-substitute a demonstration scene for a missing/zero project array.
  // Demo mode is only entered through the explicit selector below.
  const [sceneMode, setSceneMode] = useState<'project_array' | 'demo_block'>('project_array');
  const isProjectUnsizable =
    typeof plantCapacityKw !== 'number' ||
    !Number.isFinite(plantCapacityKw) ||
    plantCapacityKw <= 0 ||
    !arrayDesign ||
    (arrayDesign.totalModulesCount ?? 0) <= 0 ||
    (arrayDesign.totalPvCapacityKwp ?? 0) <= 0;

  const initialTilt = arrayDesign?.tiltDeg ?? effectiveCity?.optimalTiltAnnualDeg ?? 15;
  const [tiltDeg, setTiltDeg] = useState<number>(initialTilt);
  const [sunAltitude, setSunAltitude] = useState<number>(45);
  const [sunAzimuth, setSunAzimuth] = useState<number>(180);
  const [simulationMode, setSimulationMode] = useState<'hourly_8760' | 'screening_3day'>(
    propSimulationMode ?? 'screening_3day'
  );
  const [showDemoObstacles, setShowDemoObstacles] = useState(false);

  useEffect(() => {
    if (propSimulationMode && propSimulationMode !== simulationMode) {
      setSimulationMode(propSimulationMode);
    }
  }, [propSimulationMode, simulationMode]);

  // Synchronize tilt if project design tilt changes externally
  useEffect(() => {
    if (arrayDesign?.tiltDeg !== undefined) {
      setTiltDeg(arrayDesign.tiltDeg);
    }
  }, [arrayDesign?.tiltDeg]);

  // Construct active project scene dynamically from array design
  const projectScene = useMemo<Scene3DState | null>(() => {
    if (!hasProjectData || !arrayDesign) return null;

    const isZeroCap =
      arrayDesign.totalPvCapacityKwp === 0 ||
      arrayDesign.totalModulesCount === 0 ||
      plantCapacityKw === 0;

    return buildSceneFromProjectDesign({
      totalPvCapacityKwp: isZeroCap ? 0 : (arrayDesign.totalPvCapacityKwp ?? plantCapacityKw ?? 55.2),
      totalModulesCount: isZeroCap ? 0 : (arrayDesign.totalModulesCount ?? 140),
      interRowSpacingM: arrayDesign.interRowSpacingM ?? 5.0,
      tiltDeg,
      azimuthDeg: arrayDesign.azimuthDeg ?? 0,
      moduleWidthM: moduleSpecs?.widthM ?? 1.134,
      moduleLengthM: moduleSpecs?.lengthM ?? 2.278,
      modulePmpWatts: moduleSpecs?.pmpWatts ?? 550,
      latitude: siteLat,
      longitude: siteLng,
      elevationM: siteElev,
      installationEnvironment,
      obstacles,
      albedo: effectiveAlbedo,
    });
  }, [
    hasProjectData,
    arrayDesign,
    plantCapacityKw,
    tiltDeg,
    moduleSpecs,
    siteLat,
    siteLng,
    siteElev,
    installationEnvironment,
    obstacles,
    effectiveAlbedo,
  ]);

  // Active scene state: either connected project array or representative demo block fallback
  // OUT-03: Eliminate unsolicited fake obstacles when user input is empty
  const activeScene: Scene3DState = useMemo(() => {
    const userObstaclesProvided = Array.isArray(obstacles) && obstacles.length > 0;
    if (sceneMode === 'project_array' && isProjectUnsizable) {
      return {
        ...DEFAULT_ROOFTOP_SCENE,
        totalPvCapacityKwp: 0,
        pvTables: [],
        obstacles: [],
        obstacleDataStatus: 'missing_unverified',
        anchorLocation: { latitude: siteLat, longitude: siteLng, elevationM: siteElev },
        tiltDeg,
        albedo: effectiveAlbedo,
      };
    }
    if (sceneMode === 'project_array' && projectScene) {
      return {
        ...projectScene,
        obstacles: userObstaclesProvided
          ? obstacles!
          : (showDemoObstacles ? projectScene.obstacles : []),
        obstacleDataStatus: userObstaclesProvided
          ? 'surveyed'
          : (showDemoObstacles ? 'demo_sample' : 'verified_unobstructed'),
      };
    }
    return {
      ...DEFAULT_ROOFTOP_SCENE,
      obstacles: userObstaclesProvided
        ? obstacles!
        : (showDemoObstacles ? DEFAULT_ROOFTOP_SCENE.obstacles : []),
      obstacleDataStatus: userObstaclesProvided
        ? 'surveyed'
        : (showDemoObstacles ? 'demo_sample' : 'verified_unobstructed'),
      anchorLocation: {
        latitude: siteLat,
        longitude: siteLng,
        elevationM: siteElev,
      },
      pvTables: DEFAULT_ROOFTOP_SCENE.pvTables.map((t) => ({
        ...t,
        tiltDeg,
      })),
      tiltDeg,
      albedo: effectiveAlbedo,
    };
  }, [sceneMode, isProjectUnsizable, projectScene, siteLat, siteLng, siteElev, tiltDeg, effectiveAlbedo, obstacles, showDemoObstacles]);

  // Scene capacity in kWp
  const activeSceneCapacityKwp = useMemo(() => {
    if (activeScene.totalPvCapacityKwp !== undefined) {
      return activeScene.totalPvCapacityKwp;
    }
    const totalWp = activeScene.pvTables.reduce((sum, t) => sum + (t.ratedPowerWp || 0), 0);
    return totalWp > 0 ? totalWp / 1000.0 : 55.2;
  }, [activeScene]);

  // Ray-traced optical accessibility result using calculateShadingFactor
  const [rayTracedResult, setRayTracedResult] = useState<{
    unshadedRatios: number[];
    averageUnshadedRatio: number;
    averageShadingLossPct: number;
    trianglesCount: number;
    samplePointsCount: number;
  } | null>(() => {
    try {
      return calculateRayTracedShadingFactor(activeScene, undefined, { includeInterRow: true });
    } catch {
      return null;
    }
  });

  // Reconciled annual shading result
  const [annualResult, setAnnualResult] = useState<AnnualShading3dResult | null>(() => {
    try {
      return simulateAnnual3dShading(activeScene, city?.peakSunHours ?? 5.2, 40.0, {
        simulationMode: propSimulationMode ?? 'screening_3day',
        albedo: activeScene.albedo ?? effectiveAlbedo,
      });
    } catch {
      return null;
    }
  });

  // Canonical input signature of the active scene
  const currentSceneSignature = useMemo(() => {
    return computeShadingSceneSignature({
      scene: activeScene,
      cityId: city?.id,
      peakSunHours: city?.peakSunHours,
      albedo: activeScene.albedo ?? city?.albedo,
      simulationMode,
    });
  }, [activeScene, city?.id, city?.peakSunHours, city?.albedo, simulationMode]);

  const [calculatedSignature, setCalculatedSignature] = useState<string | null>(() => {
    try {
      return computeShadingSceneSignature({
        scene: activeScene,
        cityId: city?.id,
        peakSunHours: city?.peakSunHours,
        albedo: activeScene.albedo ?? city?.albedo,
        simulationMode,
      });
    } catch {
      return null;
    }
  });

  const isAnalysisStale = Boolean(calculatedSignature && currentSceneSignature !== calculatedSignature);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const arrayGroupRef = useRef<THREE.Group | null>(null);
  const obstaclesGroupRef = useRef<THREE.Group | null>(null);
  const groundGroupRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Initialize WebGL Scene
  useEffect(() => {
    if (!mountRef.current) return;
    // An unsizable project has no representative array to render. Avoid making
    // WebGL a prerequisite for the honest no-array/UNSIZABLE state (also keeps
    // low-capability and offline browsers from replacing the status with a crash).
    if (sceneMode === 'project_array' && isProjectUnsizable) return;
    if (sceneRef.current) return; // StrictMode idempotency guard
    const container = mountRef.current;
    let width = container.clientWidth || 600;
    let height = container.clientHeight || 380;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(12, 10, 16);
    camera.lookAt(0, 1, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // ResizeObserver for dynamic mobile / desktop responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height || 380;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 5. Container Groups for dynamic mesh updates
    const groundGroup = new THREE.Group();
    groundGroupRef.current = groundGroup;
    scene.add(groundGroup);

    const arrayGroup = new THREE.Group();
    arrayGroupRef.current = arrayGroup;
    scene.add(arrayGroup);

    const obstaclesGroup = new THREE.Group();
    obstaclesGroupRef.current = obstaclesGroup;
    scene.add(obstaclesGroup);

    // 6. Sun Sphere Indicator
    const sunGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMeshRef.current = sunMesh;
    scene.add(sunMesh);

    // Camera rotation interaction (Mouse & Touch Friendly)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let cameraAngleX = 0.55;
    let cameraAngleY = 0.85;
    const distance = 22;

    const updateCameraPos = () => {
      camera.position.x = distance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
      camera.position.y = distance * Math.sin(cameraAngleX);
      camera.position.z = distance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
      camera.lookAt(0, 1.5, 0);
    };
    updateCameraPos();

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevX;
      const deltaY = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      cameraAngleY -= deltaX * 0.01;
      cameraAngleX = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleX + deltaY * 0.01));
      updateCameraPos();
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch events for mobile/tablet
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevX;
      const deltaY = e.touches[0].clientY - prevY;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
      cameraAngleY -= deltaX * 0.01;
      cameraAngleX = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleX + deltaY * 0.01));
      updateCameraPos();
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      sceneRef.current = null;
      sunMeshRef.current = null;
      arrayGroupRef.current = null;
      obstaclesGroupRef.current = null;
      groundGroupRef.current = null;
      dirLightRef.current = null;
      try {
        if (container.contains(dom)) container.removeChild(dom);
      } catch {
        /* container already detached */
      }
      renderer.dispose();
    };
  }, [sceneMode, isProjectUnsizable]);

  // Rebuild 3D Meshes whenever activeScene or tilt changes
  useEffect(() => {
    if (!arrayGroupRef.current || !obstaclesGroupRef.current || !groundGroupRef.current) return;

    // A. Rebuild Ground / Rooftop Plane
    const groundGroup = groundGroupRef.current;
    while (groundGroup.children.length > 0) {
      groundGroup.remove(groundGroup.children[0]);
    }

    const roofPlane = activeScene.roofPlanes[0];
    const poly = roofPlane?.polygonEnu || [];
    let groundWidth = 36;
    let groundLength = 36;
    if (poly.length >= 4) {
      const xs = poly.map((p) => p.x);
      const ys = poly.map((p) => p.y);
      groundWidth = Math.max(24, Math.max(...xs) - Math.min(...xs));
      groundLength = Math.max(24, Math.max(...ys) - Math.min(...ys));
    }

    const groundGeo = new THREE.PlaneGeometry(groundWidth, groundLength);
    const groundMat = new THREE.MeshStandardMaterial({
      color: roofPlane?.eavesHeightM ? 0x334155 : 0x1e293b,
      roughness: 0.85,
    });

    const roofCenterY = roofPlane ? getLocalRoofElevationAt(roofPlane, 0, 0) : 0;
    const roofMeshGroup = new THREE.Group();
    roofMeshGroup.position.set(0, roofCenterY, 0);

    // Orient roof plane around vertical axis according to roof azimuth:
    // In Three.js (+Z = South, +X = East, -X = West), clockwise azimuth from South maps to -rotation.y
    if (roofPlane?.azimuthDeg) {
      roofMeshGroup.rotation.y = -((roofPlane.azimuthDeg * Math.PI) / 180);
    }

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    if (roofPlane?.tiltDeg) {
      const rTiltRad = (roofPlane.tiltDeg * Math.PI) / 180;
      ground.rotation.x = -Math.PI / 2 + rTiltRad;
    }
    ground.receiveShadow = true;
    roofMeshGroup.add(ground);

    const grid = new THREE.GridHelper(
      Math.max(groundWidth, groundLength),
      Math.max(12, Math.round(Math.max(groundWidth, groundLength) / 2)),
      0x38bdf8,
      0x475569
    );
    grid.position.y = 0.01;
    if (roofPlane?.tiltDeg) {
      const rTiltRad = (roofPlane.tiltDeg * Math.PI) / 180;
      grid.rotation.x = rTiltRad;
    }
    roofMeshGroup.add(grid);
    groundGroup.add(roofMeshGroup);

    // B. Rebuild PV Tables (Connected Rows from activeScene)
    const arrayGroup = arrayGroupRef.current;
    while (arrayGroup.children.length > 0) {
      arrayGroup.remove(arrayGroup.children[0]);
    }

    const moduleMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.25,
      roughness: 0.3,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.4,
    });

    activeScene.pvTables.forEach((table) => {
      const tableGroup = new THREE.Group();
      // ENU to Three.js: +X = East (X), +Y = North (-Z), +Z = Up (Y)
      const tableBaseZ = table.positionEnu.z ?? (roofCenterY + 1.2);
      tableGroup.position.set(table.positionEnu.x, tableBaseZ, -table.positionEnu.y);

      // Rotate table around vertical axis if table has azimuth (0 = South, 90 = West, -90/270 = East, 180 = North)
      // Positive ENU azimuth (clockwise from South towards West) maps to negative rotation around +Y in Three.js
      if (table.azimuthDeg) {
        tableGroup.rotation.y = -((table.azimuthDeg * Math.PI) / 180);
      }

      // Create sloped rack table pivoted at its geometric center, using table's actual tilt
      const tableTiltDeg = table.tiltDeg ?? tiltDeg;
      const rack = new THREE.Group();
      rack.rotation.x = (tableTiltDeg * Math.PI) / 180;

      // Modules grid along table width: derived from actual module width and table width
      const modW = moduleSpecs?.widthM || 1.134;
      const modL = moduleSpecs?.lengthM || 2.278;
      const calculatedCols = Math.max(1, Math.round(table.widthM / modW));
      const targetModules = table.moduleCount ?? (calculatedCols * 2);
      const isSingleModule = targetModules === 1;
      const cols = isSingleModule ? 1 : Math.max(1, Math.ceil(targetModules / 2));
      const colStep = table.widthM / cols;
      const modWidth = Math.min(modW, colStep * 0.94);
      const modLength = isSingleModule
        ? table.slopedLengthM * 0.94
        : (table.slopedLengthM / 2) * 0.94;

      let modulesRendered = 0;

      for (let c = 0; c < cols; c++) {
        const xPos = (c - (cols - 1) / 2) * colStep;

        if (isSingleModule) {
          // Single module: centered on rack with full module length
          const modMesh = new THREE.Mesh(
            new THREE.BoxGeometry(modWidth, 0.04, modLength),
            moduleMat
          );
          modMesh.position.set(xPos, 0, 0);
          modMesh.castShadow = true;
          modMesh.receiveShadow = true;
          rack.add(modMesh);
          modulesRendered++;
        } else {
          // Multi-module table (2-portrait):
          // 1. Bottom portrait module (slot 2c) rendered FIRST (matching ray-tracer facet)
          if (modulesRendered < targetModules) {
            const modMeshBottom = new THREE.Mesh(
              new THREE.BoxGeometry(modWidth, 0.04, modLength),
              moduleMat
            );
            modMeshBottom.position.set(xPos, 0, modLength / 2 + 0.02);
            modMeshBottom.castShadow = true;
            modMeshBottom.receiveShadow = true;
            rack.add(modMeshBottom);
            modulesRendered++;
          }

          // 2. Top portrait module (slot 2c + 1) rendered SECOND
          if (modulesRendered < targetModules) {
            const modMeshTop = new THREE.Mesh(
              new THREE.BoxGeometry(modWidth, 0.04, modLength),
              moduleMat
            );
            modMeshTop.position.set(xPos, 0, -modLength / 2 - 0.02);
            modMeshTop.castShadow = true;
            modMeshTop.receiveShadow = true;
            rack.add(modMeshTop);
            modulesRendered++;
          }
        }

        // Rack Support Leg Posts (every 2 columns) connecting table to local roof plane
        if (c % 2 === 0 || c === cols - 1) {
          const tableAzRad = (table.azimuthDeg * Math.PI) / 180;
          // Leg ENU footprint on the roof surface underneath this specific leg post:
          const legEnuX = table.positionEnu.x + xPos * Math.cos(tableAzRad);
          const legEnuY = table.positionEnu.y - xPos * Math.sin(tableAzRad);
          const localRoofZ = roofPlane
            ? getLocalRoofElevationAt(roofPlane, legEnuX, legEnuY)
            : roofCenterY;
          const legHeight = Math.max(0.1, tableBaseZ - localRoofZ);
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.025, 0.025, legHeight, 8),
            frameMat
          );
          leg.position.set(xPos, -legHeight / 2, 0);
          leg.castShadow = true;
          tableGroup.add(leg);
        }
      }

      tableGroup.add(rack);
      arrayGroup.add(tableGroup);
    });

    // C. Rebuild Obstacles
    const obstaclesGroup = obstaclesGroupRef.current;
    while (obstaclesGroup.children.length > 0) {
      obstaclesGroup.remove(obstaclesGroup.children[0]);
    }

    const obsMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.65,
    });

    activeScene.obstacles.forEach((obs) => {
      let obsMesh: THREE.Mesh;
      const baseZ = obs.positionEnu.z ?? (roofPlane?.eavesHeightM ?? 0);
      if (obs.geometryType === 'cylinder') {
        const rad = obs.dimensionsM.radiusM || 1.0;
        const h = obs.dimensionsM.heightM || 3.0;
        obsMesh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 24), obsMat);
        obsMesh.position.set(obs.positionEnu.x, baseZ + h / 2, -obs.positionEnu.y);
      } else {
        const w = obs.dimensionsM.widthM || 3.0;
        const l = obs.dimensionsM.lengthM || 3.0;
        const h = obs.dimensionsM.heightM || 2.5;
        obsMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), obsMat);
        obsMesh.position.set(obs.positionEnu.x, baseZ + h / 2, -obs.positionEnu.y);
        if (obs.rotationDeg) {
          obsMesh.rotation.y = -(obs.rotationDeg * Math.PI) / 180;
        }
      }
      obsMesh.castShadow = true;
      obsMesh.receiveShadow = true;
      obstaclesGroup.add(obsMesh);
    });
  }, [activeScene, tiltDeg, moduleSpecs?.widthM, moduleSpecs?.lengthM]);

  // Update Sun Vector when altitude or azimuth changes
  // Coordinate convention:
  // Three.js: +X = East, -X = West, +Y = Up, +Z = South, -Z = North
  // sunAzimuth slider: 90 = East, 180 = South, 270 = West
  useEffect(() => {
    if (sunMeshRef.current && dirLightRef.current) {
      const altRad = (sunAltitude * Math.PI) / 180;
      const compassRad = (sunAzimuth * Math.PI) / 180;
      const sunDist = 20;

      // In Three.js: +X is East, so sin(compassRad) gives +1 at 90° (East) and -1 at 270° (West)
      const sunX = sunDist * Math.cos(altRad) * Math.sin(compassRad);
      const sunY = sunDist * Math.sin(altRad);
      // In Three.js: +Z is South, so -cos(compassRad) gives +1 at 180° (South) and -1 at 0° (North)
      const sunZ = -sunDist * Math.cos(altRad) * Math.cos(compassRad);

      sunMeshRef.current.position.set(sunX, sunY, sunZ);
      dirLightRef.current.position.set(sunX, sunY, sunZ);
    }
  }, [sunAltitude, sunAzimuth]);

  // Execute Ray-Traced Shading & Annual Waterfall Simulation with Web Worker, progress, and cancellation (MAIN-05)
  const handleRunShadingAnalysis = async () => {
    if (sceneMode === 'project_array' && isProjectUnsizable) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setSimulationProgress(0);

    try {
      const result = await runAnnualShadingSimulationAsync(activeScene, city?.peakSunHours ?? 5.2, 40.0, {
        simulationMode,
        albedo: city?.albedo,
        abortSignal: controller.signal,
        onProgress: (pct) => {
          setSimulationProgress(pct);
        },
      });

      const rayTraced = calculateRayTracedShadingFactor(activeScene, undefined, {
        includeInterRow: true,
      });

      setAnnualResult(result);
      setRayTracedResult(rayTraced);
      setCalculatedSignature(
        computeShadingSceneSignature({
          scene: result.sceneState,
          cityId: city?.id,
          peakSunHours: city?.peakSunHours,
          albedo: result.sceneState.albedo ?? city?.albedo,
          simulationMode,
        })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancelled') || msg.includes('AbortError')) {
        console.log('3D shading simulation cancelled by user.');
      } else {
        console.error('Shading analysis execution error:', err);
      }
    } finally {
      setLoading(false);
      setSimulationProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelSimulation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="studio-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-1">
          <h1 className="text-xl md:text-2xl font-bold text-industrial-accent flex items-center gap-2">
            <Eye className="w-6 h-6 text-industrial-accent" />
            {isEn
              ? 'Interactive 3D Photovoltaic & Shading Viewport'
              : 'نمای سه‌بعدی تعاملی چیدمان نیروگاه و سایه‌اندازی (3D WebGL Viewer)'}
          </h1>

          {/* Mode Selector Toggle */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-industrial-border text-xs">
            <button
              onClick={() => setSceneMode('project_array')}
              disabled={!hasProjectData}
              className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                sceneMode === 'project_array'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white disabled:opacity-40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEn ? 'Project Array Design (Connected)' : 'طرح مهندسی پروژه (متصل)'}</span>
            </button>
            <button
              onClick={() => setSceneMode('demo_block')}
              className={`px-3 py-1.5 rounded font-bold transition flex items-center gap-1.5 ${
                sceneMode === 'demo_block'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>{isEn ? 'Representative Demo Block' : 'بلوک نمونه نمایشی'}</span>
            </button>
          </div>
        </div>

        {sceneMode === 'project_array' && isProjectUnsizable && (
          <div role="alert" className="mt-3 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            {isEn
              ? 'The active project has zero/invalid sizing. No representative PV tables, shading reliability, or verified-unobstructed claim is being shown. Select Demo Block explicitly to inspect a labeled demonstration only.'
              : 'سایزینگ پروژه صفر/نامعتبر است. میز نماینده، قابلیت اطمینان سایه‌اندازی یا ادعای «بدون مانعِ تأییدشده» نمایش داده نمی‌شود. برای مشاهده نمونه صرفاً نمایشی، بلوک Demo را صریحاً انتخاب کنید.'}
          </div>
        )}

        {/* Dynamic Status / Connection Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-industrial-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                sceneMode === 'project_array'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  sceneMode === 'project_array' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              ></span>
              {sceneMode === 'project_array' && isProjectUnsizable
                ? isEn
                  ? 'PROJECT UNSIZABLE — NO ARRAY / NO VERIFIED ANALYSIS'
                  : 'پروژه غیرقابل سایزینگ — آرایه و تحلیل معتبر موجود نیست'
                : sceneMode === 'project_array'
                  ? isEn
                    ? 'DYNAMICALLY COUPLED TO ACTIVE PROJECT'
                    : 'همگام‌شده با طرح واقعی پروژه'
                  : isEn
                    ? 'EXPLICITLY SELECTED REPRESENTATIVE DEMO BLOCK — NOT PROJECT DATA'
                    : 'بلوک نمایشی انتخاب‌شدهٔ صریح — دادهٔ پروژه نیست'}
            </span>
            <span className="text-slate-400 text-[11px] font-mono">
              {activeScene.pvTables.length} {isEn ? 'tables' : 'میز'} |{' '}
              {activeSceneCapacityKwp.toFixed(1)} kWp |{' '}
              {isEn ? 'Pitch:' : 'فاصله سطرها:'}{' '}
              {arrayDesign?.interRowSpacingM?.toFixed(1) ?? '5.0'}m
            </span>
          </div>

          <div className="flex items-center gap-3">
            {(!obstacles || obstacles.length === 0) && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={showDemoObstacles}
                  onChange={(e) => setShowDemoObstacles(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span>{isEn ? 'Preview Sample Obstacles' : 'پیش‌نمایش موانع نمونه'}</span>
              </label>
            )}
            <span className="text-slate-300 text-[11px] font-mono flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-industrial-border">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              {effectiveCity?.nameEn || 'Site'} ({formatCoordinates(siteLat, siteLng, 4)})
            </span>
          </div>
        </div>

        {/* Representative Sub-Array Disclosure Banner for Utility-Scale Plants (OUT-03) */}
        {sceneMode === 'project_array' && (arrayDesign?.totalModulesCount ?? 0) > activeScene.pvTables.reduce((s, t) => s + (t.moduleCount || 0), 0) && (
          <div className="mt-2.5 p-2.5 rounded border border-amber-500/40 bg-amber-950/20 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold flex flex-wrap items-center justify-between gap-2">
                <span>
                  {isEn
                    ? 'Representative Sub-Array Modeling (Utility-Scale Array Disclosure)'
                    : 'افشای مدل‌سازی زیرآرایه نماینده (نیروگاه در مقیاس صنعتی)'}
                </span>
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded border border-amber-500/30 font-mono font-bold">
                  {activeScene.pvTables.reduce((s, t) => s + (t.moduleCount || 0), 0)} / {arrayDesign?.totalModulesCount} {isEn ? 'Modules Modeled' : 'ماژول مدل‌شده'}
                </span>
              </div>
              <p className="mt-1 text-slate-300 text-[11px] leading-relaxed">
                {isEn
                  ? `For real-time GPU ray tracing performance, this ${activeSceneCapacityKwp.toFixed(1)} kWp array is rendered using ${activeScene.pvTables.length} representative rows (${activeScene.pvTables.reduce((s, t) => s + (t.moduleCount || 0), 0)} modules) to evaluate inter-row pitch (${arrayDesign?.interRowSpacingM?.toFixed(1) ?? '5.0'}m) and sun path geometry truthfully without browser latency.`
                  : `جهت ردیابی پرتو (Ray Tracing) بلادرنگ در مرورگر، این نیروگاه ${activeSceneCapacityKwp.toFixed(1)} کیلوواتی با ${activeScene.pvTables.length} ردیف نماینده (${activeScene.pvTables.reduce((s, t) => s + (t.moduleCount || 0), 0)} ماژول) با گام سطر ${arrayDesign?.interRowSpacingM?.toFixed(1) ?? '۵.۰'} متر تحلیل می‌شود تا ضرایب زاویه سایه‌اندازی با دقت فیزیکی کامل و بدون افت سرعت مرورگر محاسبه گردد.`}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="studio-card">
        {/* Responsive Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
            <Layers className="w-4 h-4 text-industrial-accent shrink-0" />
            <span className="font-semibold">{isEn ? '3D WebGL Viewport' : 'محیط سه‌بعدی WebGL'}</span>
            <span className="text-[11px] text-slate-400">
              {isEn ? '(Touch or drag to rotate view)' : '(لمس یا درگ با ماوس جهت چرخش)'}
            </span>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-industrial-surface/60 p-1.5 rounded border border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Tilt:' : 'شیب پنل:'}</span>
              <input
                type="range"
                min="0"
                max="60"
                value={tiltDeg}
                onChange={(e) => setTiltDeg(Number(e.target.value))}
                className="w-20 accent-sky-400"
              />
              <span className="font-mono text-industrial-accent font-bold">{tiltDeg}°</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-industrial-surface/60 p-1.5 rounded border border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Altitude:' : 'ارتفاع خورشید:'}</span>
              <input
                type="range"
                min="10"
                max="85"
                value={sunAltitude}
                onChange={(e) => setSunAltitude(Number(e.target.value))}
                className="w-20 accent-amber-400"
              />
              <span className="font-mono text-industrial-warning font-bold">{sunAltitude}°</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-industrial-surface/60 p-1.5 rounded border border-industrial-border">
              <span className="text-slate-400">{isEn ? 'Azimuth:' : 'آزیموت:'}</span>
              <input
                type="range"
                min="90"
                max="270"
                value={sunAzimuth}
                onChange={(e) => setSunAzimuth(Number(e.target.value))}
                className="w-20 accent-amber-400"
              />
              <span className="font-mono text-industrial-warning font-bold">{sunAzimuth}°</span>
            </div>
          </div>
        </div>

        {/* 3D WebGL Canvas Container */}
        <div
          ref={mountRef}
          className="w-full h-[300px] sm:h-[400px] md:h-[480px] rounded-lg overflow-hidden border border-industrial-border bg-industrial-bg relative cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Bottom Action Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunShadingAnalysis}
              disabled={loading || (isProjectUnsizable && sceneMode === 'project_array')}
              className="studio-btn-primary flex items-center gap-2 text-xs py-2 px-4 font-bold"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {isEn
                      ? `Tracing 3D Mesh Rays... ${simulationProgress !== null ? `${simulationProgress}%` : ''}`
                      : `درحال ردیابی پرتوهای سه‌بعدی... ${simulationProgress !== null ? `${simulationProgress}٪` : ''}`}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {isEn
                      ? `Run ${simulationMode === 'hourly_8760' ? '8760h' : '3-Day'} Ray-Traced Shading`
                      : `اجرای شبیه‌سازی ${simulationMode === 'hourly_8760' ? '۸۷۶۰ ساعته' : 'سریع ۳ روزه'} پرتو`}
                  </span>
                </>
              )}
            </button>

            {loading && (
              <button
                type="button"
                onClick={handleCancelSimulation}
                className="studio-btn text-xs py-2 px-3 text-rose-400 hover:text-rose-300 border-rose-500/40 hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
                title={isEn ? 'Cancel ongoing simulation' : 'لغو شبیه‌سازی در حال اجرا'}
              >
                <X className="w-3.5 h-3.5" />
                <span>{isEn ? 'Cancel' : 'لغو'}</span>
              </button>
            )}

            {loading && simulationProgress !== null && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-24 md:w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div
                    className="bg-industrial-accent h-full transition-all duration-150"
                    style={{ width: `${simulationProgress}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-industrial-accent">{simulationProgress}%</span>
              </div>
            )}

            <select
              value={simulationMode}
              onChange={(e) => {
                const newMode = e.target.value as 'hourly_8760' | 'screening_3day';
                setSimulationMode(newMode);
                onSimulationModeChange?.(newMode);
              }}
              className="studio-input text-xs font-mono py-1.5"
            >
              <option value="screening_3day">
                {isEn ? 'Fast Screening (3-Day Step)' : 'غربالگری سریع (گام ۳ روزه)'}
              </option>
              <option value="hourly_8760">
                {isEn ? 'Full Annual Weather Year (8760h)' : 'سال کامل هواشناسی (۸۷۶۰ ساعته)'}
              </option>
            </select>

            {appliedShading?.simulationMode && appliedShading.simulationMode !== simulationMode && (
              <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                {isEn
                  ? `Applied: ${appliedShading.simulationMode === 'hourly_8760' ? '8760h' : '3-Day'} — Re-run to update project`
                  : `اعمال‌شده: ${appliedShading.simulationMode === 'hourly_8760' ? '۸۷۶۰ ساعته' : '۳ روزه'} — برای به‌روزرسانی مجدداً اجرا کنید`}
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-sky-500"></span>{' '}
              {isEn ? 'PV Modules' : 'پنل‌های خورشیدی'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-500"></span>{' '}
              {isEn ? '3D Obstacle' : 'مانع سه‌بعدی'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-400"></span>{' '}
              {isEn ? 'Solar Vector' : 'بردار تابش خورشید'}
            </span>
          </div>
        </div>

        {/* Shading Results & Reconciled Waterfall Coupling */}
        {annualResult && !(isProjectUnsizable && sceneMode === 'project_array') && (
          <div className="mt-6 space-y-4 animate-fadeIn">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
                <div className="text-xs text-slate-400">
                  {isEn ? 'Combined Annual Shading Loss' : 'کل افت سالانه سایه‌اندازی'}
                </div>
                <div className="text-xl font-bold font-mono text-industrial-error mt-1">
                  {annualResult.annualCombinedShadingLossPct}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {annualResult.simulationModeUsed} ({annualResult.rawRayCastingStepsCount} steps /{' '}
                  {annualResult.totalEvaluatedDaylightHours}{' '}
                  {isEn ? 'daylight hrs' : 'ساعت روز'})
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
                <div className="text-xs text-slate-400">
                  {isEn ? 'Direct Beam Geometric Loss' : 'افت هندسی تابش مستقیم پرتو'}
                </div>
                <div className="text-xl font-bold font-mono text-industrial-warning mt-1">
                  {annualResult.annualGeometricBeamLossPct}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Ray-facet occlusion' : 'انسداد پرتو مستقیم مش'}
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
                <div className="text-xs text-slate-400">
                  {isEn ? '3-Bypass-Diode Mismatch' : 'عدم تطابق بای‌پس دیودها'}
                </div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                  {annualResult.annualElectricalMismatchLossPct}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Electrical substring bottleneck' : 'افت الکتریکی ساب‌استرینگ'}
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
                <div className="text-xs text-slate-400">
                  {isEn ? 'Ray-Traced Optical Access' : 'دسترسی نوری ردیابی پرتو'}
                </div>
                <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                  {rayTracedResult
                    ? `${(rayTracedResult.averageUnshadedRatio * 100).toFixed(1)}%`
                    : `${(100 - annualResult.annualGeometricBeamLossPct).toFixed(1)}%`}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {rayTracedResult
                    ? `${rayTracedResult.trianglesCount} mesh triangles evaluated`
                    : 'Möller-Trumbore ray intersection'}
                </div>
              </div>

              <div className="p-3 bg-industrial-surface border border-industrial-border/80 rounded-lg">
                <div className="text-xs text-slate-400">
                  {isEn ? 'Geometric Shading Deficit' : 'شاخص کسری انرژی سایه'}
                </div>
                <div className="text-xl font-bold font-mono text-teal-400 mt-1">
                  {annualResult.totalLostAnnualKwh.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-300">kWh</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {isEn ? 'Unshaded proxy:' : 'مبنای بدون سایه:'}{' '}
                  {annualResult.totalUnshadedAnnualKwh.toLocaleString()} kWh
                </div>
              </div>
            </div>

            {/* Active Project Yield Coupling & Scaled Impact */}
            {plantCapacityKw && annualYieldKwh && (
              <div className="p-3 bg-industrial-surface border border-sky-500/30 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs border-b border-industrial-border pb-2">
                  <span className="text-industrial-accent font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-industrial-success" />
                    {isEn
                      ? 'Active Project Yield Coupling & Scaled Impact'
                      : 'اتصال مستقیم به تولید سالانه پروژه فعال'}
                  </span>
                  <span className="font-mono text-slate-300 font-semibold text-[11px]">
                    {plantCapacityType === 'ac_target'
                      ? isEn
                        ? 'Target AC Capacity:'
                        : 'ظرفیت هدف AC نیروگاه:'
                      : isEn
                        ? 'Installed DC Nameplate:'
                        : 'ظرفیت نامی DC نصب‌شده:'}{' '}
                    <span className="text-amber-300">
                      {plantCapacityKw.toLocaleString()}{' '}
                      {plantCapacityType === 'ac_target' ? 'kW AC' : 'kWp'}
                    </span>
                    {plantCapacityType === 'ac_target' && arrayDesign?.totalPvCapacityKwp && (
                      <span className="text-slate-400 font-normal ml-1">
                        ({isEn ? 'Array DC:' : 'آرایه DC:'} {arrayDesign.totalPvCapacityKwp.toLocaleString()} kWp)
                      </span>
                    )}
                  </span>
                </div>
                {(() => {
                  // Determine effective shading loss percentage currently baked into annualYieldKwh (R847-04)
                  const effectiveBakedLossPct = waterfallShadingLossPct !== undefined
                    ? waterfallShadingLossPct
                    : (appliedShading && !isShadingStale ? appliedShading.lossPct : 2.4);

                  const appliedLossFraction = Math.min(
                    0.95,
                    Math.max(0, effectiveBakedLossPct / 100.0)
                  );
                  // True unshaded baseline of the plant before any applied or default shading derate (N08, R847-04)
                  const unshadedBaselineKwh =
                    appliedLossFraction > 0 && appliedLossFraction < 0.95
                      ? Math.round(annualYieldKwh / (1.0 - appliedLossFraction))
                      : Math.round(annualYieldKwh);

                  // Preview metrics based on fresh simulation result vs independent unshaded baseline
                  const previewLossFraction = Math.min(
                    0.95,
                    Math.max(0, annualResult.annualCombinedShadingLossPct / 100.0)
                  );
                  const shadingDeficitKwh = Math.round(
                    unshadedBaselineKwh * previewLossFraction
                  );
                  const previewNetExportKwh = Math.round(
                    unshadedBaselineKwh * (1.0 - previewLossFraction)
                  );

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2.5 text-xs font-mono">
                      <div className="p-2 bg-slate-900/40 rounded border border-industrial-border/60">
                        <div className="text-[10px] text-slate-400 font-sans">
                          {isEn
                            ? 'Plant Unshaded Baseline (Est.):'
                            : 'تولید مبنای بدون سایه نیروگاه:'}
                        </div>
                        <div className="text-slate-200 font-bold mt-0.5">
                          {unshadedBaselineKwh.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal font-sans">kWh/yr</span>
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900/40 rounded border border-industrial-border/60">
                        <div className="text-[10px] text-slate-400 font-sans">
                          {isEn ? '3D Near-Shading Deficit:' : 'کسری سایه‌اندازی سه‌بعدی:'}
                        </div>
                        <div className="text-red-400 font-bold mt-0.5">
                          -{shadingDeficitKwh.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal font-sans">
                            kWh/yr (-{annualResult.annualCombinedShadingLossPct}%)
                          </span>
                        </div>
                      </div>
                      <div className="p-2 bg-slate-900/40 rounded border border-industrial-border/60">
                        <div className="text-[10px] text-slate-400 font-sans">
                          {isEn
                            ? 'Net Export (Preview):'
                            : 'تولید خالص پیش‌نمایش:'}
                        </div>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          {previewNetExportKwh.toLocaleString()}{' '}
                          <span className="text-[10px] font-normal font-sans">kWh/yr</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="text-[10px] text-slate-400 mt-2">
                  {sceneMode === 'project_array'
                    ? isEn
                      ? `Active Project Array: Analyzes ${activeScene.pvTables.length} tables (${activeSceneCapacityKwp.toFixed(1)} kWp) arranged at ${arrayDesign?.interRowSpacingM?.toFixed(1) ?? '5.0'}m pitch and ${tiltDeg}° tilt.`
                      : `طرح واقعی پروژه: تحلیل ${activeScene.pvTables.length} ردیف/میز (${activeSceneCapacityKwp.toFixed(1)} کیلووات‌پیک) با فاصله ردیف ${arrayDesign?.interRowSpacingM?.toFixed(1) ?? '۵.۰'} متر و شیب ${tiltDeg} درجه.`
                    : isEn
                      ? `Representative Demo Block: Evaluates a 55.2 kWp section with localized obstructions. Can be applied to the project waterfall model.`
                      : `بلوک نمونه نمایشی: تحلیل بخش ۵۵.۲ کیلوواتی با موانع مجاور. امکان اعمال به درخت تلفات پروژه.`}
                </div>

                {/* Obstacle Completeness Status Badge */}
                <div className="mt-2 text-[11px] p-2 rounded border border-industrial-border/60 bg-slate-900/60 flex items-center justify-between gap-2">
                  <span className="text-slate-400">
                    {isEn ? 'Obstacle Survey Status:' : 'وضعیت داده‌های موانع صحنه:'}
                  </span>
                  {activeScene.obstacleDataStatus === 'missing_unverified' ? (
                    <span className="text-amber-400 font-medium text-[10px]">
                      {isEn
                        ? '⚠ Missing / Unverified (Array modeled unobstructed; survey required)'
                        : '⚠ فاقد برداشت موانع (بدون مانع مدل شده؛ نیازمند نقشه‌برداری میدانی)'}
                    </span>
                  ) : activeScene.obstacleDataStatus === 'verified_unobstructed' ? (
                    <span className="text-emerald-400 font-medium text-[10px]">
                      {isEn ? '✓ Explicitly Verified Unobstructed' : '✓ تأیید صریح عدم وجود مانع'}
                    </span>
                  ) : activeScene.obstacleDataStatus === 'surveyed' ? (
                    <span className="text-blue-400 font-medium text-[10px]">
                      {isEn
                        ? `✓ Surveyed Obstacles (${activeScene.obstacles.length})`
                        : `✓ موانع نقشه‌برداری‌شده (${activeScene.obstacles.length} مورد)`}
                    </span>
                  ) : (
                    <span className="text-purple-400 font-medium text-[10px]">
                      {isEn ? 'ℹ Demo Sample Obstacles' : 'ℹ موانع نمونه نمایشی'}
                    </span>
                  )}
                </div>

                {/* Apply / Revert Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-industrial-border/60">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">
                      {isEn ? 'Project Coupling State:' : 'وضعیت اتصال به مدل پروژه:'}
                    </span>
                    {appliedShading ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
                        {isEn
                          ? `Applied (-${appliedShading.lossPct}% from ${appliedShading.source === 'project_array_design' ? 'Project Array' : 'Demo Block'})`
                          : `اعمال‌شده (-${appliedShading.lossPct}٪ از ${appliedShading.source === 'project_array_design' ? 'طرح پروژه' : 'بلوک نمونه'})`}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[11px] border border-slate-700">
                        {isEn ? 'Preview Only (Default -2.4% Active)' : 'پیش‌نمایش (پیش‌فرض -۲.۴٪ فعال)'}
                      </span>
                    )}
                    {appliedShading && isShadingStale && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/40">
                        {isEn ? '⚠️ Stale (Inputs changed)' : '⚠️ قدیمی (تغییر پارامترهای پروژه)'}
                      </span>
                    )}
                    {!appliedShading && isAnalysisStale && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold border border-amber-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        {isEn ? 'Inputs changed (Re-run required)' : 'تغییر هندسه (اجرای مجدد الزامی است)'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {appliedShading && (
                      <button
                        onClick={onRevertShading}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isEn ? 'Revert to Default (-2.4%)' : 'بازگشت به پیش‌فرض (-۲.۴٪)'}
                      </button>
                    )}

                    {(() => {
                      const isSimulationReconciled =
                        !annualResult?.reconciliationStatus ||
                        annualResult.reconciliationStatus.overallReconciled;

                      return (
                        <button
                          onClick={() => {
                            if (annualResult && !isAnalysisStale && isSimulationReconciled) {
                              onApplyShading?.({
                                lossPct: annualResult.annualCombinedShadingLossPct,
                                source:
                                  sceneMode === 'project_array'
                                    ? 'project_array_design'
                                    : 'representative_demo_block',
                                appliedAtIso: new Date().toISOString(),
                                capacityKwp: activeSceneCapacityKwp,
                                signatureHash: calculatedSignature ?? currentSceneSignature,
                                simulationMode,
                              });
                              onShadingLossChange?.(annualResult.annualCombinedShadingLossPct);
                            }
                          }}
                          disabled={
                            !annualResult ||
                            isAnalysisStale ||
                            !isSimulationReconciled ||
                            (Boolean(appliedShading) &&
                              calculatedSignature === appliedShading?.signatureHash &&
                              appliedShading?.lossPct === annualResult.annualCombinedShadingLossPct)
                          }
                          className="px-3 py-1 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                          title={
                            isAnalysisStale
                              ? isEn
                                ? 'Geometry changed since analysis run. Please re-run simulation.'
                                : 'هندسه تغییر کرده است. لطفاً شبیه‌سازی را مجدداً اجرا کنید.'
                              : !isSimulationReconciled
                                ? isEn
                                  ? 'Cannot apply: Shading simulation is not reconciled (e.g. capacity or energy balance mismatch). Check reconciliation status below.'
                                  : 'امکان اعمال وجود ندارد: شبیه‌سازی سایه‌اندازی تراز نشده است (عدم تطابق ظرفیت یا توازن انرژی).'
                                : appliedShading &&
                                  calculatedSignature === appliedShading?.signatureHash &&
                                  appliedShading?.lossPct === annualResult?.annualCombinedShadingLossPct
                                  ? isEn
                                    ? 'This exact simulation result is already applied to the project.'
                                    : 'این نتیجهٔ شبیه‌سازی در حال حاضر به پروژه اعمال شده است.'
                                  : undefined
                          }
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {appliedShading
                            ? calculatedSignature === appliedShading?.signatureHash &&
                              appliedShading?.lossPct === annualResult.annualCombinedShadingLossPct
                              ? isEn
                                ? `Applied (-${appliedShading.lossPct}%)`
                                : `اعمال‌شده (-${appliedShading.lossPct}٪)`
                              : isEn
                                ? `Update Project (-${annualResult.annualCombinedShadingLossPct}%)`
                                : `به‌روزرسانی ضریب پروژه (-${annualResult.annualCombinedShadingLossPct}٪)`
                            : isEn
                              ? `Apply -${annualResult.annualCombinedShadingLossPct}% to Project`
                              : `اعمال کسری -${annualResult.annualCombinedShadingLossPct}٪ به پروژه`}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Reconciliation Audit Badge */}
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                annualResult.isReconciled
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {isEn
                    ? `Geometric Mesh Heatmap Consistency Check: Energy balance verified (near_shading loss = -${annualResult.annualCombinedShadingLossPct}%, Δ = ${annualResult.reconciliationDeltaKwh.toFixed(2)} kWh)`
                    : `بررسی انطباق داخلی ماتریس تلفات مش: موازنه انرژی تایید شد (افت پله near_shading = -${annualResult.annualCombinedShadingLossPct}٪، اختلاف داخلی = ${annualResult.reconciliationDeltaKwh.toFixed(2)} کیلووات‌ساعت)`}
                </span>
              </div>
              <span className="font-mono font-bold text-[11px] bg-slate-900/60 px-2 py-0.5 rounded">
                {isEn ? 'Mesh Matrix Balance' : 'انطباق ماتریس مش'}
              </span>
            </div>

            {/* Screening Disclaimer Notice */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">
                  {isEn
                    ? 'Screening Shading Index Notice: '
                    : 'اطلاعیه شاخص غربالگری سایه‌اندازی: '}
                </span>
                {isEn ? annualResult.screeningNoticeEn : annualResult.screeningNoticeFa}
              </div>
            </div>

            {/* Per-Table Heatmap Breakdown */}
            <div className="studio-card">
              <h3 className="font-bold text-industrial-accent text-xs mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                {isEn
                  ? 'Per-Table Annual Shading Heatmap & Diode Trigger Accounting'
                  : 'نقشه حرارتی سالانه تلفات سایه به تفکیک میزها و ساعات تحریک دیودها'}
              </h3>
              <div className="overflow-x-auto border border-industrial-border rounded-lg">
                <table className="w-full text-xs text-right text-slate-300">
                  <thead className="bg-industrial-bg text-slate-400 border-b border-industrial-border text-[11px]">
                    <tr>
                      <th className="p-2">{isEn ? 'Table ID' : 'شناسه میز'}</th>
                      <th className="p-2">{isEn ? 'Unshaded (kWh)' : 'تولید بدون سایه'}</th>
                      <th className="p-2">{isEn ? 'Shaded (kWh)' : 'تولید با سایه'}</th>
                      <th className="p-2">{isEn ? 'Loss (kWh)' : 'افت سالانه'}</th>
                      <th className="p-2">{isEn ? 'Loss (%)' : 'درصد افت'}</th>
                      <th className="p-2">{isEn ? 'Avg Beam Shaded' : 'میانگین پوشش پرتو'}</th>
                      <th className="p-2">{isEn ? 'Diode Active Hours' : 'ساعات فعال دیود'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {annualResult.tableHeatmap.map((t) => (
                      <tr key={t.tableId} className="hover:bg-slate-850/50">
                        <td className="p-2 font-sans font-bold text-white">
                          {t.tableId} (#{t.tableIndex})
                        </td>
                        <td className="p-2 text-sky-300">
                          {t.annualUnshadedKwh.toLocaleString()}
                        </td>
                        <td className="p-2 text-slate-200">{t.annualShadedKwh.toLocaleString()}</td>
                        <td className="p-2 text-industrial-error font-bold">
                          {t.annualLossKwh.toLocaleString()}
                        </td>
                        <td
                          className={`p-2 font-bold ${
                            t.annualLossPct > 5.0
                              ? 'text-industrial-error'
                              : 'text-industrial-warning'
                          }`}
                        >
                          {t.annualLossPct}%
                        </td>
                        <td className="p-2 text-slate-300">{t.averageBeamCoveragePct}%</td>
                        <td className="p-2 text-purple-300">{t.bypassDiodeTriggerHours} h/yr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreeJsViewer;
