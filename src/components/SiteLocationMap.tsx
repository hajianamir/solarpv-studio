import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Layers,
  Sun,
  Search,
  Crosshair,
  Check,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ExternalLink,
  Map as MapIcon,
  Compass,
} from 'lucide-react';
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
  const isEn = lang === 'en';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initialLat = currentCity.latitude || (currentCity as any).latitudeDeg || 35.6892;
  const initialLng = currentCity.longitude || (currentCity as any).longitudeDeg || 51.3890;

  // Layer state: 'hybrid' (satellite + labels/roads), 'satellite_pure', 'streets'
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'satellite_pure' | 'streets'>('hybrid');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [estimatedPsh, setEstimatedPsh] = useState(currentCity.peakSunHours || 5.35);

  // Floating Search Dialog State
  const [searchTab, setSearchTab] = useState<'name' | 'coords'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputLat, setInputLat] = useState(initialLat.toFixed(4));
  const [inputLng, setInputLng] = useState(initialLng.toFixed(4));
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);

  // Layer references
  const hybridLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const satellitePureLayerRef = useRef<L.TileLayer | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);

  // Geospatial resource calculator
  const calculateGeospatialSolarResource = (lat: number, lng: number): ClimateCity => {
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

    const psh = Math.max(3.8, Math.min(6.5, Number((closest.peakSunHours + (33 - lat) * 0.04).toFixed(2))));
    const optTilt = Math.max(15, Math.min(42, Math.round(lat * 0.88)));
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

      // 1. Street layer
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      });
      streetLayerRef.current = streetLayer;

      // 2. Pure Satellite Esri World Imagery
      const satelliteBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri',
        }
      );
      satellitePureLayerRef.current = satelliteBase;

      // 3. Hybrid Layers: Satellite Base + Boundaries/Places + Transportation Roads
      const labelsOverlay = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      const roadsOverlay = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );

      const hybridGroup = L.layerGroup([satelliteBase, labelsOverlay, roadsOverlay]);
      hybridLayerGroupRef.current = hybridGroup;

      // Add default hybrid layer to map
      hybridGroup.addTo(map);

      // Custom Glowing Solar Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-solar-marker',
        html: `
          <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(14, 165, 233, 0.4); animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width:20px; height:20px; border-radius:50%; background:#0284c7; border:3px solid #ffffff; box-shadow:0 0 14px #38bdf8; display:flex; align-items:center; justify-content:center;">
              <div style="width:6px; height:6px; border-radius:50%; background:#ffffff;"></div>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      // Add Draggable Marker
      const marker = L.marker([coords.lat, coords.lng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      // Marker popup content updater
      const updatePopup = (latVal: number, lngVal: number, cityData: ClimateCity) => {
        marker.getPopup()?.setContent(
          `<div style="text-align:center; font-family:sans-serif; font-size:12px; padding:4px;">
            <strong style="color:#0f172a; font-size:13px;">${isEn ? cityData.nameEn : cityData.nameFa}</strong><br/>
            <span style="color:#0284c7; font-family:monospace; font-weight:bold;">${latVal.toFixed(4)}°N, ${lngVal.toFixed(4)}°E</span><br/>
            <span style="color:#f59e0b; font-weight:bold;">${isEn ? 'Solar Resource:' : 'میزان تابش:'} ${cityData.peakSunHours} PSH</span>
          </div>`
        );
      };

      marker.bindPopup(
        `<div style="text-align:center; font-family:sans-serif; font-size:12px; padding:4px;">
          <strong style="color:#0f172a; font-size:13px;">${isEn ? currentCity.nameEn : currentCity.nameFa}</strong><br/>
          <span style="color:#0284c7; font-family:monospace; font-weight:bold;">${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E</span><br/>
          <span style="color:#f59e0b; font-weight:bold;">${isEn ? 'Solar Resource:' : 'میزان تابش:'} ${currentCity.peakSunHours} PSH</span>
        </div>`
      );

      // Handle map click
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        setInputLat(lat.toFixed(4));
        setInputLng(lng.toFixed(4));
        marker.setLatLng([lat, lng]);

        const locationData = calculateGeospatialSolarResource(lat, lng);
        setEstimatedPsh(locationData.peakSunHours);
        onSelectLocation(locationData);
        updatePopup(lat, lng, locationData);
      });

      // Handle marker drag end
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        setInputLat(pos.lat.toFixed(4));
        setInputLng(pos.lng.toFixed(4));
        const locationData = calculateGeospatialSolarResource(pos.lat, pos.lng);
        setEstimatedPsh(locationData.peakSunHours);
        onSelectLocation(locationData);
        updatePopup(pos.lat, pos.lng, locationData);
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
      setInputLat(currentLat.toFixed(4));
      setInputLng(currentLng.toFixed(4));
      markerRef.current.setLatLng([currentLat, currentLng]);
      mapInstanceRef.current.panTo([currentLat, currentLng]);
    }
  }, [currentCity]);

  // Layer Switcher Handler
  const handleSwitchLayer = (layer: 'hybrid' | 'satellite_pure' | 'streets') => {
    if (!mapInstanceRef.current) return;
    setActiveLayer(layer);

    // Remove existing
    if (hybridLayerGroupRef.current) mapInstanceRef.current.removeLayer(hybridLayerGroupRef.current);
    if (satellitePureLayerRef.current) mapInstanceRef.current.removeLayer(satellitePureLayerRef.current);
    if (streetLayerRef.current) mapInstanceRef.current.removeLayer(streetLayerRef.current);

    if (layer === 'hybrid') {
      if (hybridLayerGroupRef.current) mapInstanceRef.current.addLayer(hybridLayerGroupRef.current);
    } else if (layer === 'satellite_pure') {
      if (satellitePureLayerRef.current) mapInstanceRef.current.addLayer(satellitePureLayerRef.current);
    } else {
      if (streetLayerRef.current) mapInstanceRef.current.addLayer(streetLayerRef.current);
    }
  };

  // Jump to specific coordinate
  const handleJumpToCoordinate = (targetLat: number, targetLng: number, labelName?: string) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (isNaN(targetLat) || isNaN(targetLng)) return;
    if (targetLat < -90 || targetLat > 90 || targetLng < -180 || targetLng > 180) return;

    setCoords({ lat: targetLat, lng: targetLng });
    setInputLat(targetLat.toFixed(4));
    setInputLng(targetLng.toFixed(4));

    mapInstanceRef.current.flyTo([targetLat, targetLng], 12, { duration: 1.2 });
    markerRef.current.setLatLng([targetLat, targetLng]);

    const locationData = calculateGeospatialSolarResource(targetLat, targetLng);
    if (labelName) {
      locationData.nameFa = labelName;
      locationData.nameEn = labelName;
    }
    setEstimatedPsh(locationData.peakSunHours);
    onSelectLocation(locationData);
  };

  // Online Geocoding Search via OpenStreetMap Nominatim
  const handleOnlineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingOnline(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&accept-language=${isEn ? 'en' : 'fa'}`
      );
      if (response.ok) {
        const data = await response.json();
        setOnlineResults(data || []);
      }
    } catch (err) {
      console.warn('Online geocoding service unavailable, falling back to local database.', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Filtered Local Predefined Cities & Industrial Parks
  const filteredLocalSites = searchQuery.trim()
    ? [...IRANIAN_CLIMATE_CITIES, ...INDUSTRIAL_PARKS_AND_HUBS].filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.nameFa.toLowerCase().includes(q) ||
          item.nameEn.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="space-y-4">
      {/* Top Map Action & Coordinate Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-lg border border-slate-700/80">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-sky-400 shrink-0" />
          <div>
            <span className="text-xs text-slate-400 block">
              {isEn ? 'Selected Geographic Coordinates & Site:' : 'محل انتخاب‌شده بر روی نقشه:'}
            </span>
            <span className="font-bold text-sm text-white">
              {isEn ? currentCity.nameEn : currentCity.nameFa} {currentCity.provinceEn ? `(${isEn ? currentCity.provinceEn : currentCity.provinceFa})` : ''}
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
            {isEn ? 'Opt Tilt:' : 'شیب بهینه:'} <strong className="text-emerald-400">{currentCity.optimalTiltAnnualDeg}°</strong>
          </div>
        </div>

        {/* 3-Way Layer Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => handleSwitchLayer('hybrid')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              activeLayer === 'hybrid' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title={isEn ? 'Satellite Imagery with Roads and Places labels' : 'تصاویر ماهواره‌ای به همراه اسامی اماکن، جاده‌ها و مرزها'}
          >
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>{isEn ? 'Hybrid Satellite' : 'ماهواره‌ای ترکیبی (با جاده و اسامی)'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('satellite_pure')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              activeLayer === 'satellite_pure' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title={isEn ? 'Pure Satellite without overlays' : 'تصاویر ماهواره‌ای طبیعی'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isEn ? 'Pure Satellite' : 'ماهواره‌ای خالص'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchLayer('streets')}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
              activeLayer === 'streets' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title={isEn ? 'Detailed Street Map' : 'نقشه خیابانی و معابر'}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{isEn ? 'Streets Map' : 'نقشه شهری معابر'}</span>
          </button>
        </div>
      </div>

      {/* Main Map Container with Embedded Floating Search Window */}
      <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-xl h-[360px] sm:h-[460px] md:h-[520px]">
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* FLOATING SEARCH & COORDINATES WINDOW (پنجره تعبیه شده جستجوی مکان و مختصات) */}
        <div className="absolute top-3 left-3 z-20 max-w-sm w-[92%] sm:w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/90 shadow-2xl overflow-hidden transition-all duration-200">
          {/* Header Bar */}
          <div className="flex items-center justify-between p-2.5 bg-slate-800/90 border-b border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEn ? 'Site & Coordinate Finder' : 'پنجره جستجوی مکان و مختصات'}</span>
            </div>
            <button
              onClick={() => setIsPanelExpanded(!isPanelExpanded)}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition"
              title={isPanelExpanded ? 'Collapse' : 'Expand'}
            >
              {isPanelExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isPanelExpanded && (
            <div className="p-3 space-y-3 text-xs">
              {/* Tab Selector: Location Name vs Exact Coordinates */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSearchTab('name')}
                  className={`flex-1 py-1 text-center font-semibold rounded transition ${
                    searchTab === 'name' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEn ? 'By Location Name' : 'جستجوی نام مکان'}
                </button>
                <button
                  type="button"
                  onClick={() => setSearchTab('coords')}
                  className={`flex-1 py-1 text-center font-semibold rounded transition ${
                    searchTab === 'coords' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEn ? 'By Coordinates' : 'ورود با مختصات'}
                </button>
              </div>

              {/* Tab 1: Search by Location Name */}
              {searchTab === 'name' && (
                <div className="space-y-2">
                  <form onSubmit={handleOnlineSearch} className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder={isEn ? 'City, town, industrial zone...' : 'نام شهر، شهرک صنعتی یا منطقه...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="studio-input text-xs flex-1 py-1.5"
                    />
                    <button
                      type="submit"
                      disabled={isSearchingOnline}
                      className="studio-btn-primary px-3 py-1.5 text-xs flex items-center gap-1"
                    >
                      {isSearchingOnline ? '...' : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </form>

                  {/* Search Results Dropdown List */}
                  {(filteredLocalSites.length > 0 || onlineResults.length > 0) && (
                    <div className="max-h-44 overflow-y-auto space-y-1 bg-slate-950/90 rounded border border-slate-800 p-1 divide-y divide-slate-800/60">
                      {/* Local Matches */}
                      {filteredLocalSites.slice(0, 6).map((item, idx) => (
                        <button
                          key={`loc-${idx}`}
                          type="button"
                          onClick={() => {
                            const lat = (item as any).latitude || (item as any).lat;
                            const lng = (item as any).longitude || (item as any).lng;
                            handleJumpToCoordinate(lat, lng, isEn ? item.nameEn : item.nameFa);
                            setSearchQuery('');
                          }}
                          className="w-full text-right p-1.5 rounded hover:bg-slate-800 text-[11px] flex items-center justify-between text-slate-200 transition"
                        >
                          <span className="font-semibold">{isEn ? item.nameEn : item.nameFa}</span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            {((item as any).latitude || (item as any).lat).toFixed(2)}°N
                          </span>
                        </button>
                      ))}

                      {/* Online Nominatim Geocoding Results */}
                      {onlineResults.map((item, idx) => (
                        <button
                          key={`online-${idx}`}
                          type="button"
                          onClick={() => {
                            const lat = parseFloat(item.lat);
                            const lng = parseFloat(item.lon);
                            handleJumpToCoordinate(lat, lng, item.display_name.split(',')[0]);
                            setOnlineResults([]);
                            setSearchQuery('');
                          }}
                          className="w-full text-right p-1.5 rounded hover:bg-slate-800 text-[11px] flex items-center justify-between text-sky-300 transition"
                        >
                          <span className="truncate max-w-[200px] text-left">{item.display_name}</span>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">OSM</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Search & Jump by Exact Coordinates */}
              {searchTab === 'coords' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        {isEn ? 'Latitude (°N):' : 'عرض جغرافیایی (°N):'}
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={inputLat}
                        onChange={(e) => setInputLat(e.target.value)}
                        className="studio-input text-xs font-mono py-1 w-full"
                        placeholder="35.6892"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        {isEn ? 'Longitude (°E):' : 'طول جغرافیایی (°E):'}
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={inputLng}
                        onChange={(e) => setInputLng(e.target.value)}
                        className="studio-input text-xs font-mono py-1 w-full"
                        placeholder="51.3890"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const lat = parseFloat(inputLat);
                      const lng = parseFloat(inputLng);
                      handleJumpToCoordinate(lat, lng);
                    }}
                    className="w-full studio-btn-primary py-1.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Locate & Calculate Solar Data' : 'انتقال به مختصات و محاسبه'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map Overlay Instructions */}
        <div className="absolute bottom-3 right-3 z-20 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700/80 text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none">
          <Crosshair className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
          <span>
            {isEn
              ? 'Click anywhere on the map or drag the solar pin to calculate site resource.'
              : 'روی هر نقطه‌ای از نقشه کلیک کنید یا نشانگر را بکشید تا مختصات و تابش اختصاصی محاسبه گردد.'}
          </span>
        </div>
      </div>

      {/* Quick Iranian Industrial Zones & Solar Parks Selector */}
      <div className="studio-card">
        <label className="block text-xs font-semibold text-slate-300 mb-2">
          {isEn
            ? 'Quick Siting in Iranian Major Industrial Parks & Solar Hubs:'
            : 'مکان‌یابی سریع در شهرک‌های صنعتی و قطب‌های نیروگاه خورشیدی ایران:'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {INDUSTRIAL_PARKS_AND_HUBS.map((hub) => (
            <button
              key={hub.nameFa}
              onClick={() => handleJumpToCoordinate(hub.lat, hub.lng, isEn ? hub.nameEn : hub.nameFa)}
              className="p-2 rounded bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 hover:border-sky-500/60 text-right transition-all flex flex-col justify-between"
            >
              <div className="font-semibold text-white truncate text-[11px]">{isEn ? hub.nameEn : hub.nameFa}</div>
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
export default SiteLocationMap;
