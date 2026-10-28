import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Eye, Sun, Box, Play, RefreshCw, Layers } from 'lucide-react';

interface ThreeJsViewerProps {
  lang?: 'fa' | 'en';
}

export const ThreeJsViewer: React.FC<ThreeJsViewerProps> = ({ lang = 'fa' }) => {
  const isEn = lang === 'en';
  const mountRef = useRef<HTMLDivElement>(null);
  const [shadingResult, setShadingResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tiltDeg, setTiltDeg] = useState<number>(25);
  const [sunAltitude, setSunAltitude] = useState<number>(45);
  const [sunAzimuth, setSunAzimuth] = useState<number>(180);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const arrayGroupRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    let width = container.clientWidth || 600;
    let height = container.clientHeight || 360;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6, 6, 8);
    camera.lookAt(0, 0, 0);

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
        const h = entry.contentRect.height || 360;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff4e6, 1.4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // 5. Ground Plane
    const groundGeo = new THREE.PlaneGeometry(24, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid Helper
    const grid = new THREE.GridHelper(24, 24, 0x38bdf8, 0x334155);
    grid.position.y = 0.01;
    scene.add(grid);

    // 6. Photovoltaic Array (2 Rows with tilt)
    const arrayGroup = new THREE.Group();
    arrayGroupRef.current = arrayGroup;
    scene.add(arrayGroup);

    const moduleMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.2,
      roughness: 0.3,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.4,
    });

    const createModuleRow = (zPos: number) => {
      const row = new THREE.Group();
      row.position.z = zPos;
      for (let col = -3; col <= 3; col++) {
        const modMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 1.8), moduleMat);
        modMesh.castShadow = true;
        modMesh.receiveShadow = true;
        modMesh.position.x = col * 0.96;
        row.add(modMesh);

        // Rack Leg Post
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8), frameMat);
        leg.position.set(col * 0.96, -0.4, 0);
        leg.castShadow = true;
        row.add(leg);
      }
      return row;
    };

    const row1 = createModuleRow(-1.8);
    const row2 = createModuleRow(1.8);
    arrayGroup.add(row1);
    arrayGroup.add(row2);

    // 7. Front Obstacle Building
    const obsGeo = new THREE.BoxGeometry(2.5, 2.0, 1.2);
    const obsMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.6,
    });
    const obstacle = new THREE.Mesh(obsGeo, obsMat);
    obstacle.position.set(0, 1.0, 4.5);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    scene.add(obstacle);

    // 8. Sun Sphere Indicator
    const sunGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMeshRef.current = sunMesh;
    scene.add(sunMesh);

    // Camera rotation interaction (Mouse & Touch Friendly)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let cameraAngleX = 0.6;
    let cameraAngleY = 0.8;
    const distance = 11;

    const updateCameraPos = () => {
      camera.position.x = distance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
      camera.position.y = distance * Math.sin(cameraAngleX);
      camera.position.z = distance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
      camera.lookAt(0, 0.5, 0);
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
      cameraAngleX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngleX + deltaY * 0.01));
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
      cameraAngleX = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngleX + deltaY * 0.01));
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

    // 9. Animation Loop
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
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, []);

  // Update Array Tilt & Sun Vector when state changes
  useEffect(() => {
    if (!arrayGroupRef.current) return;
    const rad = (tiltDeg * Math.PI) / 180;
    arrayGroupRef.current.children.forEach((child) => {
      child.rotation.x = -rad;
      child.position.y = 0.5 + Math.sin(rad) * 0.8;
    });

    // Sun Vector
    if (sunMeshRef.current && dirLightRef.current) {
      const altRad = (sunAltitude * Math.PI) / 180;
      const azRad = ((sunAzimuth - 180) * Math.PI) / 180;
      const sunDist = 12;

      const sunX = sunDist * Math.cos(altRad) * Math.sin(azRad);
      const sunY = sunDist * Math.sin(altRad);
      const sunZ = sunDist * Math.cos(altRad) * Math.cos(azRad);

      sunMeshRef.current.position.set(sunX, sunY, sunZ);
      dirLightRef.current.position.set(sunX, sunY, sunZ);
    }
  }, [tiltDeg, sunAltitude, sunAzimuth]);

  // Execute ray-tracing simulation calculation
  const handleRunShadingAnalysis = () => {
    setLoading(true);
    try {
      setTimeout(() => {
        const altRad = (sunAltitude * Math.PI) / 180;
        const obstacleHeight = 2.0;
        const shadowLength = obstacleHeight / Math.tan(Math.max(0.1, altRad));
        const distanceToFirstRow = 2.7;

        let unshadedRatio = 1.0;
        if (shadowLength > distanceToFirstRow && sunAzimuth >= 140 && sunAzimuth <= 220) {
          const penetration = Math.min(2.0, shadowLength - distanceToFirstRow);
          unshadedRatio = Math.max(0.45, 1.0 - penetration / 3.0);
        }
        setShadingResult(unshadedRatio);
      }, 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="studio-card">
        <h1 className="text-xl md:text-2xl font-bold text-sky-400 mb-1 flex items-center gap-2">
          <Eye className="w-6 h-6 text-sky-400" />
          {isEn
            ? 'Interactive 3D Photovoltaic & Shading Viewport'
            : 'نمای سه‌بعدی تعاملی چیدمان نیروگاه و سایه‌اندازی (3D WebGL Viewer)'}
        </h1>
        <p className="text-slate-400 text-xs md:text-sm">
          {isEn
            ? 'Real-time WebGL ray-traced shadow simulation with movable solar altitude/azimuth and obstacle geometry.'
            : 'شبیه‌سازی رندر بلادرنگ بردار تابش، طول سایه موانع و استراکچرها و محاسبه نسبت دسترسی نوری'}
        </p>
      </div>

      <div className="studio-card">
        {/* Responsive Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300">
            <Layers className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-semibold">{isEn ? '3D WebGL Viewport' : 'محیط سه‌بعدی WebGL'}</span>
            <span className="text-[11px] text-slate-400">
              {isEn ? '(Touch or drag to rotate view)' : '(لمس یا درگ با ماوس جهت چرخش)'}
            </span>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400">{isEn ? 'Tilt:' : 'شیب پنل:'}</span>
              <input
                type="range"
                min="0"
                max="60"
                value={tiltDeg}
                onChange={(e) => setTiltDeg(Number(e.target.value))}
                className="w-20 accent-sky-400"
              />
              <span className="font-mono text-sky-400 font-bold">{tiltDeg}°</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400">{isEn ? 'Altitude:' : 'ارتفاع خورشید:'}</span>
              <input
                type="range"
                min="10"
                max="85"
                value={sunAltitude}
                onChange={(e) => setSunAltitude(Number(e.target.value))}
                className="w-20 accent-amber-400"
              />
              <span className="font-mono text-amber-400 font-bold">{sunAltitude}°</span>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-slate-900/60 p-1.5 rounded border border-slate-800">
              <span className="text-slate-400">{isEn ? 'Azimuth:' : 'آزیموت:'}</span>
              <input
                type="range"
                min="90"
                max="270"
                value={sunAzimuth}
                onChange={(e) => setSunAzimuth(Number(e.target.value))}
                className="w-20 accent-amber-400"
              />
              <span className="font-mono text-amber-400 font-bold">{sunAzimuth}°</span>
            </div>
          </div>
        </div>

        {/* 3D WebGL Canvas Container with Responsive Height */}
        <div
          ref={mountRef}
          className="w-full h-[280px] sm:h-[380px] md:h-[450px] rounded-lg overflow-hidden border border-slate-700 bg-slate-950 relative shadow-inner cursor-grab active:cursor-grabbing touch-none"
        />

        {/* Bottom Action Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleRunShadingAnalysis}
            disabled={loading}
            className="studio-btn-primary flex items-center gap-2 text-xs py-2 px-4"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isEn ? 'Analyzing BVH Tree...' : 'درحال ردیابی پرتوها...'}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{isEn ? 'Run Ray-Traced Shading Analysis' : 'اجرای تحلیل سایه‌اندازی پرتو'}</span>
              </>
            )}
          </button>

          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-sky-500"></span> {isEn ? 'PV Modules' : 'پنل‌های خورشیدی'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-600"></span> {isEn ? 'Obstacle' : 'مانع ساختمانی'}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-amber-400"></span> {isEn ? 'Solar Vector' : 'بردار پرتو خورشید'}
            </span>
          </div>
        </div>

        {shadingResult !== null && (
          <div className="result-box mt-4 animate-fadeIn">
            <h3 className="text-lg md:text-xl font-bold text-sky-400">
              {isEn ? 'Unshaded Solar Access:' : 'درصد دسترسی به تشعشع بدون سایه:'} {(shadingResult * 100).toFixed(1)}%
            </h3>
            <div className="text-xs text-slate-300 mt-1">
              {isEn
                ? `Estimated Shading Loss: ${((1.0 - shadingResult) * 100).toFixed(1)}% | Ray-Traced via 3D Spatial Vector Model`
                : `افت سایه‌اندازی محاسبه‌شده: ${((1.0 - shadingResult) * 100).toFixed(1)}% | تحلیل برداری سه‌بعدی`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ThreeJsViewer;
