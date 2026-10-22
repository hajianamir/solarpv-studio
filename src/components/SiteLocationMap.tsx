import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass, Layers, Sun, Thermometer, Search, Crosshair, Check } from 'lucide-react';
import { ClimateCity, IRANIAN_CLIMATE_CITIES } from '../engine/climaticData';

interface SiteLocationMapProps {
  currentCity: ClimateCity;
  onSelectLocation: (city: ClimateCity) => void;
  lang?: 'fa' | 'en';
}

// Major Iranian Industrial Parks & Key Solar Hubs with coordinates
const INDUSTRIAL_PARKS_AND_HUBS = [
  { nameFa: 'شهرک صنعتی شمس‌آباد (تهران)', nameEn: 'Shamsabad Industrial Park (Tehran)', lat: 35.3412, lng: 51.2312, psh: 5.4, minC: -5, maxC: 43 },
  { nameFa: 'شهرک صنعتی مورچه‌خورت (اصفهان)', nameEn: 'Moorchehkhoort Industrial Park (Isfahan)', lat: 33.0845, lng: 51.4821, psh: 5.7, minC: -8, maxC: 41 },
  { nameFa: 'شهرک صنعتی کاوه (ساوه)', nameEn: 'Kaveh Industrial City (Saveh)', lat: 35.0567, lng: 50.4123, psh: 5.5, minC: -6, maxC: 42 },
  { nameFa: 'منطقه ویژه اقتصادی یزد (قطب خورشیدی)', nameEn: 'Yazd Special Economic Solar Zone', lat: 31.8974, lng: 54.3569, psh: 5.9, minC: -4, maxC: 45 },
  { nameFa: 'منطقه انرژی‌های تجدیدپذیر کرمان', nameEn: 'Kerman Renewable Energy Hub', lat: 30.2839, lng: 57.0834, psh: 6.0, minC: -6, maxC: 42 },
  { nameFa: 'شهرک صنعتی بین‌المللی اروند (خوزستان)', nameEn: 'Arvand Free Zone (Khuzestan)', lat: 30.4398, lng: 48.1812, psh: 5.8, minC: 4, maxC: 51 },
  { nameFa: 'شهرک صنعتی چابهار (منطقه آزاد)', nameEn: 'Chabahar Free Trade Zone', lat: 25.2969, lng: 60.6433, psh: 5.7, minC: 12, maxC: 40 },
  { nameFa: 'سایت خورشیدی دامغان و سمنان', nameEn: 'Damghan-Semnan Solar Park', lat: 36.1683, lng: 54.3486, psh: 5.8, minC: -9, maxC: 41 },
  { nameFa: 'شهرک صنعتی سلفچگان (قم)', nameEn: 'Salafchegan Special Economic Zone', lat: 34.4821, lng: 50.4532, psh: 5.6, minC: -7, maxC: 43 },
  { nameFa: 'شهرک صنعتی کاسپین (قزوین)', nameEn: 'Caspian Industrial City (Qazvin)', lat: 36.1523, lng: 50.1874, psh: 5.1, minC: -10, maxC: 38 },
];

export const SiteLocationMap: React.FC<SiteLocationMapProps> = ({
  currentCity,
  onSelectLocation,
  lang = 'fa',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initialLat = currentCity.latitude || (currentCity as any).latitudeDeg || 35.6892;
  const initialLng = currentCity.longitude || (currentCity as any).longitudeDeg || 51.3890;

  const [activeLayer, setActiveLayer] = useState<'streets' | 'satellite'>('satellite');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [estimatedPsh, setEstimatedPsh] = useState(currentCity.peakSunHours || 5.35);
  const [siteAltitudeM, setSiteAltitudeM] = useState(currentCity.elevationM || 1200);

  // Map Tile Layers
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);

  // Calculate approximate PSH and climate parameters for any coordinate in Iran/Middle East
  const calculateGeospatialSolarResource = (lat: number, lng: number) => {
    // Check if close to known cities
    let closest = IRANIAN_CLIMATE_CITIES[0];
    let minDistance = 999999;

    for (const city of IRANIAN_CLIMATE_CITIES) {
      const cityLat = city.latitude || (city as any).latitudeDeg || 35.6892;
      const cityLng = city.longitude || (city as any).longitudeDeg || 51.3890;
      const d = Math.hypot(cityLat - lat, cityLng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = city;
      }
    }

    // Solar irradiance model based on latitude & longitude in Iranian plateau
    let psh = 5.3;
    if (lat < 32 && lng > 52) {
      psh = 5.8 + (32 - lat) * 0.04;
    } else if (lat > 36) {
      psh = 4.7 + (lat - 36) * 0.05;
      if (lat > 37 && lng < 54 && lng > 48) psh = 4.2; // Caspian humid zone
    } else {
      psh = 5.4 + (lng - 50) * 0.02;
    }
    psh = Math.round(Math.min(6.4, Math.max(3.8, psh)) * 10) / 10;

    const optTilt = Math.round(Math.max(15, Math.min(36, lat - 2)));
    const tempMax = lat < 33 ? (lat < 31 && lng < 50 ? 51 : 44) : 40;
    const tempMin = lat > 34 ? (lng < 50 ? -16 : -8) : (lat < 28 ? 6 : -4);

    const safeLat = Number(lat.toFixed(4));
    const safeLng = Number(lng.toFixed(4));

    return {
      ...closest,
      id: `custom_${lat.toFixed(3)}_${lng.toFixed(3)}`,
      nameFa: minDistance < 0.6 ? closest.nameFa : `مختصات (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      nameEn: minDistance < 0.6 ? closest.nameEn : `Site (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
      provinceFa: closest.provinceFa,
      provinceEn: closest.provinceEn,
      latitude: safeLat,
      longitude: safeLng,
      latitudeDeg: safeLat,
      longitudeDeg: safeLng,
      peakSunHours: psh,
      tempMinC: tempMin,
      tempMaxC: tempMax,
      optimalTiltAnnualDeg: optTilt,
      optimalTiltWinterDeg: Math.min(60, optTilt + 15),
      optimalTiltSummerDeg: Math.max(10, optTilt - 15),
      soilingLossPct: closest.soilingLossPct || 4.0,
      albedo: closest.albedo || 0.22,
      elevationM: Math.round(1100 + (lat - 30) * 50),
      descriptionFa: minDistance < 0.6 ? closest.descriptionFa : 'سایت سفارشی انتخاب شده از روی نقشه ماهواره‌ای',
      descriptionEn: minDistance < 0.6 ? closest.descriptionEn : 'Custom site location selected from satellite map',
    };
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 7,
        zoomControl: true,
      });

      // Street OpenStreetMap layer
      streetLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      });

      // Satellite Esri World Imagery layer
      satelliteLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri',
        }
      );

      // Default to satellite layer
      satelliteLayerRef.current.addTo(map);

      // Custom Glowing Solar Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-solar-marker',
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              background: rgba(14, 165, 233, 0.35);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #0284c7;
              border: 3px solid #ffffff;
              box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            ">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle cx="12" cy="12" r="5"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      marker.bindPopup(
        `<div style="text-align:center; font-family: Vazirmatn, sans-serif; font-size:12px;">
          <strong>${currentCity.nameFa}</strong><br/>
          <span style="color:#0284c7; font-family:monospace;">${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E</span><br/>
          <span style="color:#f59e0b;">تابش: ${currentCity.peakSunHours} PSH</span>
        </div>`
      );

      markerRef.current = marker;

      // Handle map clicks
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        marker.setLatLng([lat, lng]);

        const locationData = calculateGeospatialSolarResource(lat, lng);
        setEstimatedPsh(locationData.peakSunHours);
        setSiteAltitudeM(locationData.elevationM);
        onSelectLocation(locationData);

        marker.getPopup()?.setContent(
          `<div style="text-align:center; font-family: Vazirmatn, sans-serif; font-size:12px;">
            <strong>${locationData.nameFa}</strong><br/>
            <span style="color:#0284c7; font-family:monospace;">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</span><br/>
            <span style="color:#f59e0b;">تابش: ${locationData.peakSunHours} PSH</span>
          </div>`
        );
      });

      // Handle marker drag end
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        const locationData = calculateGeospatialSolarResource(pos.lat, pos.lng);
        setEstimatedPsh(locationData.peakSunHours);
        setSiteAltitudeM(locationData.elevationM);
        onSelectLocation(locationData);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync coords with external currentCity changes
  useEffect(() => {
    const currentLat = currentCity.latitude || (currentCity as any).latitudeDeg || 35.6892;
    const currentLng = currentCity.longitude || (currentCity as any).longitudeDeg || 51.3890;
    if (
      mapInstanceRef.current &&
      markerRef.current &&
      (Math.abs(currentLat - coords.lat) > 0.0001 || Math.abs(currentLng - coords.lng) > 0.0001)
    ) {
      setCoords({ lat: currentLat, lng: currentLng });
      markerRef.current.setLatLng([currentLat, currentLng]);
      mapInstanceRef.current.panTo([currentLat, currentLng]);
    }
  }, [currentCity]);

  // Toggle map layers
  const handleToggleLayer = (layer: 'streets' | 'satellite') => {
    if (!mapInstanceRef.current) return;
    setActiveLayer(layer);
    if (layer === 'satellite') {
      if (streetLayerRef.current) mapInstanceRef.current.removeLayer(streetLayerRef.current);
      if (satelliteLayerRef.current) mapInstanceRef.current.addLayer(satelliteLayerRef.current);
    } else {
      if (satelliteLayerRef.current) mapInstanceRef.current.removeLayer(satelliteLayerRef.current);
      if (streetLayerRef.current) mapInstanceRef.current.addLayer(streetLayerRef.current);
    }
  };

  // Select industrial park or preset city
  const handleSelectPresetLocation = (targetLat: number, targetLng: number, nameFa: string, psh: number) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    mapInstanceRef.current.flyTo([targetLat, targetLng], 12, { duration: 1.2 });
    markerRef.current.setLatLng([targetLat, targetLng]);
    setCoords({ lat: targetLat, lng: targetLng });
    const locationData = calculateGeospatialSolarResource(targetLat, targetLng);
    onSelectLocation(locationData);
  };

  return (
    <div className="space-y-4">
      {/* Top Map Action & Coordinate Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-700/80">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-sky-400" />
          <div>
            <span className="text-xs text-slate-400 block">
              {lang === 'fa' ? 'محل انتخاب‌شده بر روی نقشه:' : 'Selected Geographic Coordinates:'}
            </span>
            <span className="font-bold text-sm text-white">
              {currentCity.nameFa} ({currentCity.provinceFa})
            </span>
          </div>
        </div>

        {/* Live Coordinate Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-sky-300">
            LAT: <strong className="text-white">{coords.lat.toFixed(4)}°N</strong>
          </div>
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-sky-300">
            LNG: <strong className="text-white">{coords.lng.toFixed(4)}°E</strong>
          </div>
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-amber-300 flex items-center gap-1">
            <Sun className="w-3.5 h-3.5" />
            PSH: <strong className="text-amber-400">{estimatedPsh} h/d</strong>
          </div>
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-emerald-300 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            شیب بهینه: <strong className="text-emerald-400">{currentCity.optimalTiltAnnualDeg}°</strong>
          </div>
        </div>

        {/* Layer Switcher */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700 text-xs">
          <button
            onClick={() => handleToggleLayer('satellite')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              activeLayer === 'satellite' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            ماهواره‌ای (Satellite)
          </button>
          <button
            onClick={() => handleToggleLayer('streets')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              activeLayer === 'streets' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            نقشه شهری (Streets)
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-xl" style={{ height: '420px' }}>
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Map Overlay Instructions */}
        <div className="absolute bottom-3 right-3 z-20 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none">
          <Crosshair className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>
            {lang === 'fa'
              ? 'روی هر نقطه‌ای از نقشه کلیک کنید یا نشانگر را بکشید تا مختصات و تابش اختصاصی محاسبه گردد.'
              : 'Click anywhere on the map or drag the pin to calculate custom site solar resource.'}
          </span>
        </div>
      </div>

      {/* Quick Iranian Industrial Zones & Solar Parks Selector */}
      <div className="studio-card">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          {lang === 'fa'
            ? 'مکان‌یابی سریع در شهرک‌های صنعتی و قطب‌های نیروگاه خورشیدی ایران:'
            : 'Quick Siting in Iranian Major Industrial Parks & Solar Hubs:'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {INDUSTRIAL_PARKS_AND_HUBS.map((hub) => (
            <button
              key={hub.nameFa}
              onClick={() => handleSelectPresetLocation(hub.lat, hub.lng, hub.nameFa, hub.psh)}
              className="p-2 rounded bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-sky-500/60 text-right transition-all flex flex-col justify-between"
            >
              <div className="font-semibold text-white truncate text-[11px]">{hub.nameFa}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                <span className="text-amber-400 font-bold">{hub.psh} PSH</span>
                <span>{hub.lat.toFixed(1)}°N, {hub.lng.toFixed(1)}°E</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
