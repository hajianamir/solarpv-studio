import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  AlertTriangle,
  Box,
  Loader2,
} from 'lucide-react';
import { type ClimateCity, getClimateData, fetchClimateData } from '../engine/climaticData';
import { ExternalDataGateway } from '../engine/dataGateway/externalDataGateway';
import { formatLatitude, formatLongitude, formatCoordinates } from '../engine/geoCoordinates';
import { isRealInternetEnabled } from '../engine/env/runtimeEnv';

const OFFLINE_KNOWN_HUBS = [
  { nameEn: 'Tehran', nameFa: 'تهران', lat: 35.6892, lng: 51.3890 },
  { nameEn: 'Isfahan', nameFa: 'اصفهان', lat: 32.6546, lng: 51.6680 },
  { nameEn: 'Shiraz', nameFa: 'شیراز', lat: 29.5926, lng: 52.5836 },
  { nameEn: 'Tabriz', nameFa: 'تبریز', lat: 38.0800, lng: 46.2919 },
  { nameEn: 'Mashhad', nameFa: 'مشهد', lat: 36.2605, lng: 59.6168 },
  { nameEn: 'Ahvaz', nameFa: 'اهواز', lat: 31.3183, lng: 48.6706 },
  { nameEn: 'Yazd', nameFa: 'یزد', lat: 31.8974, lng: 54.3569 },
  { nameEn: 'Kerman', nameFa: 'کرمان', lat: 30.2839, lng: 57.0834 },
  { nameEn: 'Bandar Abbas', nameFa: 'بندرعباس', lat: 27.1832, lng: 56.2666 },
  { nameEn: 'Munich', nameFa: 'مونیخ', lat: 48.1351, lng: 11.5820 },
  { nameEn: 'Madrid', nameFa: 'مادرید', lat: 40.4168, lng: -3.7038 },
  { nameEn: 'Dubai', nameFa: 'دبی', lat: 25.2048, lng: 55.2708 },
  { nameEn: 'Riyadh', nameFa: 'ریاض', lat: 24.7136, lng: 46.6753 },
  { nameEn: 'Cairo', nameFa: 'قاهره', lat: 30.0444, lng: 31.2357 },
];

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SiteLocationMapProps {
  currentCity: ClimateCity;
  onSelectLocation: (city: ClimateCity) => void;
  onCreate3dRooftop?: (city: ClimateCity) => void;
  lang?: 'fa' | 'en';
}

export const SiteLocationMap: React.FC<SiteLocationMapProps> = ({
  currentCity,
  onSelectLocation,
  onCreate3dRooftop,
  lang = 'fa',
}) => {
  const isEn = lang === 'en';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initialLat = typeof currentCity.latitude === 'number' ? currentCity.latitude : 35.6892;
  const initialLng = typeof currentCity.longitude === 'number' ? currentCity.longitude : 51.3890;

  // Layer state: 'hybrid' (satellite + labels/roads), 'satellite_pure', 'streets', 'topo' (topography & contours)
  const [activeLayer, setActiveLayer] = useState<'hybrid' | 'satellite_pure' | 'streets' | 'topo'>('hybrid');
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
  const [onlineResults, setOnlineResults] = useState<Array<{ lat: number; lon: number; display_name: string; type: string }>>([]);
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'live' | 'offline'>('idle');
  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEmittedCityRef = useRef<ClimateCity | null>(null);
  const geocodeRequestIdRef = useRef<number>(0);
  const geocodeAbortControllerRef = useRef<AbortController | null>(null);

  const keepCurrentSite = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    activeRequestIdRef.current += 1;
    lastEmittedCityRef.current = null;
    const lat = currentCity.latitude;
    const lng = currentCity.longitude;
    setCoords({ lat, lng });
    setInputLat(lat.toFixed(4));
    setInputLng(lng.toFixed(4));
    setEstimatedPsh(currentCity.peakSunHours);
    markerRef.current?.setLatLng([lat, lng]);
    mapInstanceRef.current?.panTo([lat, lng]);
    setLiveStatus(currentCity.confidence === 'measured' ? 'live' : 'idle');
  };

  // Keep estimatedPsh strictly synchronized with external currentCity updates
  useEffect(() => {
    if (typeof currentCity.peakSunHours === 'number') {
      setEstimatedPsh(currentCity.peakSunHours);
    }
  }, [currentCity.peakSunHours]);

  // Cancel any in-flight geocode or climate requests on unmount
  useEffect(() => {
    const controllerRef = abortControllerRef;
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  // Request sequencing and cancellation to prevent out-of-order race conditions
  const requestClimateUpdate = useCallback(
    (targetLat: number, targetLng: number, labelName?: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const reqId = ++activeRequestIdRef.current;

      // In offline mode, resolve immediately using the local geospatial model without network requests
      if (!isRealInternetEnabled()) {
        const locationData = calculateGeospatialSolarResource(targetLat, targetLng);
        if (labelName) {
          locationData.nameFa = labelName;
          locationData.nameEn = labelName;
        }
        lastEmittedCityRef.current = locationData;
        onSelectLocation(locationData);
        setEstimatedPsh(locationData.peakSunHours);
        if (markerRef.current) {
          const resTitle = escapeHtml(isEn ? locationData.nameEn : locationData.nameFa);
          const resCoords = escapeHtml(formatCoordinates(targetLat, targetLng, 4));
          const resPsh = `${isEn ? 'Solar Resource:' : 'میزان تابش:'} ${escapeHtml(String(locationData.peakSunHours))} PSH`;
          markerRef.current.getPopup()?.setContent(
            `<div style="text-align:center; font-family:sans-serif; font-size:12px; padding:4px;">
              <strong style="color:#0f172a; font-size:13px;">${resTitle}</strong><br/>
              <span style="color:#0284c7; font-family:monospace; font-weight:bold;">${resCoords}</span><br/>
              <span style="color:#f59e0b; font-weight:bold;">${resPsh}</span>
            </div>`
          );
        }
        setLiveStatus('offline');
        return;
      }

      setLiveStatus('loading');
      fetchClimateData(targetLat, targetLng, { signal: controller.signal })
        .then((gwData) => {
          if (reqId !== activeRequestIdRef.current) {
            return; // Discard superseded response
          }
          if (labelName) {
            gwData.nameFa = labelName;
            gwData.nameEn = labelName;
          }
          lastEmittedCityRef.current = gwData;
          onSelectLocation(gwData);
          setEstimatedPsh(gwData.peakSunHours);
          if (markerRef.current) {
            const resTitle = escapeHtml(isEn ? gwData.nameEn : gwData.nameFa);
            const resCoords = escapeHtml(formatCoordinates(targetLat, targetLng, 4));
            const resPsh = `${isEn ? 'Solar Resource:' : 'میزان تابش:'} ${escapeHtml(String(gwData.peakSunHours))} PSH`;
            markerRef.current.getPopup()?.setContent(
              `<div style="text-align:center; font-family:sans-serif; font-size:12px; padding:4px;">
                <strong style="color:#0f172a; font-size:13px;">${resTitle}</strong><br/>
                <span style="color:#0284c7; font-family:monospace; font-weight:bold;">${resCoords}</span><br/>
                <span style="color:#f59e0b; font-weight:bold;">${resPsh}</span>
              </div>`
            );
          }
          setLiveStatus(gwData.confidence === 'analytical_estimate' ? 'offline' : 'live');
        })
        .catch((e) => {
          if ((e as Error)?.name === 'AbortError') {
            return; // Expected cancellation
          }
          if (reqId !== activeRequestIdRef.current) {
            return;
          }
          console.warn('[climate] live fetch failed:', e);
          setLiveStatus('offline');
        });
    },
    [isEn, onSelectLocation]
  );

  // Recent searches persisted in localStorage (client-side only, no API calls)
  const RECENT_SEARCHES_KEY = 'solarpv_recent_searches';
  const MAX_RECENT = 5;
  const [recentSearches, setRecentSearches] = useState<Array<{ lat: number; lng: number; label: string }>>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = (lat: number, lng: number, label: string) => {
    setRecentSearches((prev) => {
      const next = [{ lat, lng, label }, ...prev.filter((r) => r.lat !== lat || r.lng !== lng)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {
        /* localStorage unavailable in private mode — ignore */
      }
      return next;
    });
  };

  // Safe sequenced geocode search handler with cancellation and offline isolation
  const triggerGeocodeSearch = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    if (geocodeAbortControllerRef.current) {
      geocodeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    geocodeAbortControllerRef.current = controller;
    const reqId = ++geocodeRequestIdRef.current;

    setIsSearchingOnline(true);
    try {
      let results: Array<{ lat: number; lon: number; display_name: string; type: string }> = [];

      // Offline mode: search local engineering city presets without hitting network
      if (!isRealInternetEnabled()) {
        const qLower = q.toLowerCase();
        const localMatches = OFFLINE_KNOWN_HUBS
          .filter((c) => c.nameEn.toLowerCase().includes(qLower) || c.nameFa.includes(q))
          .map((c) => ({
            lat: c.lat,
            lon: c.lng,
            display_name: `${c.nameEn} (${c.nameFa})`,
            type: 'city',
          }));
        if (reqId === geocodeRequestIdRef.current) {
          setOnlineResults(localMatches);
        }
        return;
      }

      if (typeof window !== 'undefined') {
        try {
          const r = await fetch(`/api/v1/gateway/geocode?q=${encodeURIComponent(q)}`, {
            signal: controller.signal,
          });
          if (r.ok) {
            results = await r.json();
          } else {
            // Upstream proxy error (e.g. 502) or rate limit — do not bypass rate-limiting proxy
            results = [];
          }
        } catch (fetchErr) {
          if ((fetchErr as Error)?.name === 'AbortError') return;
        }
      }
      if (reqId === geocodeRequestIdRef.current) {
        setOnlineResults(results || []);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError' && reqId === geocodeRequestIdRef.current) {
        setOnlineResults([]);
      }
    } finally {
      if (reqId === geocodeRequestIdRef.current) {
        setIsSearchingOnline(false);
      }
    }
  }, []);

  // Cancel any in-flight geocode or climate requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (geocodeAbortControllerRef.current) {
        geocodeAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Layer references
  const hybridLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const satellitePureLayerRef = useRef<L.TileLayer | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const topoLayerRef = useRef<L.TileLayer | null>(null);

  // Geospatial resource calculator utilizing global climate & geotechnical gateway
  const calculateGeospatialSolarResource = (lat: number, lng: number): ClimateCity => {
    try {
      return getClimateData(lat, lng);
    } catch {
      // Fallback in case of out-of-range coordinates during drag
      const safeLat = Math.max(-89.9, Math.min(89.9, lat));
      const safeLng = Math.max(-179.9, Math.min(179.9, lng));
      return getClimateData(safeLat, safeLng);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // StrictMode idempotency guard

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

      // 4. OpenTopoMap Topographic & Elevation Contours
      const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
      });
      topoLayerRef.current = topoLayer;

      // Add default hybrid layer to map
      hybridGroup.addTo(map);

      // Custom Glowing Solar Pin Icon
      const customIcon = L.divIcon({
        className: 'custom-solar-marker',
        html: `
          <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:34px; height:34px; border-radius:50%; background:rgba(14, 165, 233, 0.4); animation:ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width:20px; height:20px; border-radius:50%; background:#0284c7; border:3px solid #ffffff; box-:0 0 14px #38bdf8; display:flex; align-items:center; justify-content:center;">
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

      // Marker popup content updater with strict HTML escaping against XSS
      const updatePopup = (latVal: number, lngVal: number, cityData: ClimateCity) => {
        const titleText = escapeHtml(isEn ? cityData.nameEn : cityData.nameFa);
        const coordText = escapeHtml(formatCoordinates(latVal, lngVal, 4));
        const pshText = `${isEn ? 'Solar Resource:' : 'میزان تابش:'} ${escapeHtml(String(cityData.peakSunHours))} PSH`;
        marker.getPopup()?.setContent(
          `<div style="text-align:center; font-family:sans-serif; font-size:12px; padding:4px;">
            <strong style="color:#0f172a; font-size:13px;">${titleText}</strong><br/>
            <span style="color:#0284c7; font-family:monospace; font-weight:bold;">${coordText}</span><br/>
            <span style="color:#f59e0b; font-weight:bold;">${pshText}</span>
          </div>`
        );
      };

      const initialTitle = escapeHtml(isEn ? currentCity.nameEn : currentCity.nameFa);
      const initialCoords = escapeHtml(formatCoordinates(coords.lat, coords.lng, 4));
      const initialPsh = `${isEn ? 'Solar Resource:' : 'میزان تابش:'} ${escapeHtml(String(currentCity.peakSunHours))} PSH`;
      marker.bindPopup(
        `<div style="text-align:center; font-family:sans-serif; font-size:12px; padding:4px;">
          <strong style="color:#0f172a; font-size:13px;">${initialTitle}</strong><br/>
          <span style="color:#0284c7; font-family:monospace; font-weight:bold;">${initialCoords}</span><br/>
          <span style="color:#f59e0b; font-weight:bold;">${initialPsh}</span>
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
        updatePopup(lat, lng, locationData);

        requestClimateUpdate(lat, lng);
      });

      // Handle marker drag end
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        setInputLat(pos.lat.toFixed(4));
        setInputLng(pos.lng.toFixed(4));
        const locationData = calculateGeospatialSolarResource(pos.lat, pos.lng);
        setEstimatedPsh(locationData.peakSunHours);
        updatePopup(pos.lat, pos.lng, locationData);

        requestClimateUpdate(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      hybridLayerGroupRef.current = null;
      satellitePureLayerRef.current = null;
      streetLayerRef.current = null;
      topoLayerRef.current = null;
      markerRef.current = null;
    };
  }, [coords.lat, coords.lng, currentCity, isEn, onSelectLocation, requestClimateUpdate]); // exhaustive-deps fix (PR-2a-7-FOLLOWUP-2)

  // Sync coords with external currentCity changes and cancel any in-flight map requests
  useEffect(() => {
    const currentLat = typeof currentCity.latitude === 'number' ? currentCity.latitude : 35.6892;
    const currentLng = typeof currentCity.longitude === 'number' ? currentCity.longitude : 51.3890;

    // Check if this currentCity change originated from the map's own internal selection
    const isInternal = currentCity === lastEmittedCityRef.current;

    if (isInternal) {
      // Internal change: do NOT abort in-flight requests or invalidate requestId!
      return;
    }

    // Truly EXTERNAL change (e.g. manual edit in ClimateTab, project load, import, preset change):
    // Invalidate and cancel any in-flight map requests for the old location
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    activeRequestIdRef.current++;
    setLiveStatus(currentCity.confidence === 'measured' ? 'live' : 'idle');

    setCoords({ lat: currentLat, lng: currentLng });
    setInputLat(currentLat.toFixed(4));
    setInputLng(currentLng.toFixed(4));
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([currentLat, currentLng]);
      mapInstanceRef.current.panTo([currentLat, currentLng]);
    }
  }, [currentCity]);

  // Layer Switcher Handler
  const handleSwitchLayer = (layer: 'hybrid' | 'satellite_pure' | 'streets' | 'topo') => {
    if (!mapInstanceRef.current) return;
    setActiveLayer(layer);

    // Remove existing
    if (hybridLayerGroupRef.current) mapInstanceRef.current.removeLayer(hybridLayerGroupRef.current);
    if (satellitePureLayerRef.current) mapInstanceRef.current.removeLayer(satellitePureLayerRef.current);
    if (streetLayerRef.current) mapInstanceRef.current.removeLayer(streetLayerRef.current);
    if (topoLayerRef.current) mapInstanceRef.current.removeLayer(topoLayerRef.current);

    if (layer === 'hybrid') {
      if (hybridLayerGroupRef.current) mapInstanceRef.current.addLayer(hybridLayerGroupRef.current);
    } else if (layer === 'satellite_pure') {
      if (satellitePureLayerRef.current) mapInstanceRef.current.addLayer(satellitePureLayerRef.current);
    } else if (layer === 'streets') {
      if (streetLayerRef.current) mapInstanceRef.current.addLayer(streetLayerRef.current);
    } else if (layer === 'topo') {
      if (topoLayerRef.current) mapInstanceRef.current.addLayer(topoLayerRef.current);
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
    requestClimateUpdate(targetLat, targetLng, labelName);
  };

  // Browser geolocation — jump map to user's measured location
  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setIsSearchingOnline(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setInputLat(latitude.toFixed(4));
        setInputLng(longitude.toFixed(4));
        addRecentSearch(latitude, longitude, isEn ? 'My Location' : 'محل من');
        handleJumpToCoordinate(latitude, longitude, isEn ? 'My Location' : 'محل من');
        setIsSearchingOnline(false);
      },
      () => {
        setIsSearchingOnline(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Map Action & Coordinate Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-industrial-surface p-3 rounded-lg border border-industrial-border/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-industrial-accent shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">
                {isEn ? 'Selected Geographic Coordinates & Site:' : 'محل انتخاب‌شده بر روی نقشه:'}
              </span>
              <span className="font-bold text-sm text-white">
                {isEn ? currentCity.nameEn : currentCity.nameFa} {currentCity.provinceEn ? `(${isEn ? currentCity.provinceEn : currentCity.provinceFa})` : ''}
              </span>
            </div>
          </div>

          {/* Explicit Data Confidence Badge & Live Status Pill */}
          {liveStatus === 'loading' ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[11px] font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isEn ? 'Resolving new site; current project site is unchanged' : 'در حال دریافت سایت جدید؛ سایت پروژه هنوز تغییر نکرده است'}</span>
              <button type="button" onClick={keepCurrentSite} className="underline text-amber-300">
                {isEn ? 'Keep Old Site' : 'حفظ سایت قبلی'}
              </button>
            </div>
          ) : (liveStatus === 'live' || (liveStatus === 'idle' && currentCity.confidence === 'measured')) ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-industrial-success/20 border border-emerald-500/40 text-industrial-success text-[11px] font-bold">
              <Check className="w-3.5 h-3.5 text-industrial-success shrink-0" />
              <span>{isEn ? 'Live Data (NASA/PVGIS)' : 'دادهٔ زنده'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-industrial-warning/20 border border-industrial-warning/40 text-industrial-warning text-[11px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-industrial-warning shrink-0" />
              <span>{isEn ? 'Analytical Model (Offline)' : 'مدل تحلیلی (بدون اینترنت)'}</span>
            </div>
          )}
        </div>

        {/* Live Coordinate Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-industrial-border text-sky-300">
            LAT: <strong className="text-white">{formatLatitude(coords.lat, 4)}</strong>
          </div>
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-industrial-border text-sky-300">
            LNG: <strong className="text-white">{formatLongitude(coords.lng, 4)}</strong>
          </div>
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-industrial-border text-industrial-warning flex items-center gap-1">
            <Sun className="w-3.5 h-3.5" />
            PSH: <strong className="text-industrial-warning">{estimatedPsh} h/d</strong>
          </div>
          <div className="bg-slate-800 px-2.5 py-1 rounded border border-industrial-border text-industrial-success flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            {isEn ? 'Opt Tilt:' : 'شیب بهینه:'} <strong className="text-industrial-success">{currentCity.optimalTiltAnnualDeg}°</strong>
          </div>
        </div>

        {/* 4-Way Layer Switcher & 3D Rooftop Action */}
        <div className="flex flex-wrap items-center gap-2">
          {onCreate3dRooftop && (
            <button
              type="button"
              onClick={() => onCreate3dRooftop(currentCity)}
              className="px-3 py-1.5 rounded bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
              title={
                isEn
                  ? 'Generate 3D rooftop and near-shading layout for this exact site'
                  : 'ایجاد مدل سه‌بعدی سقف و شبیه‌سازی سایه‌اندازی برای این نقطه'
              }
            >
              <Box className="w-4 h-4 text-white" />
              <span>
                {isEn ? 'Create 3D Rooftop from this Site' : 'ایجاد سقف سه‌بعدی از این محل'}
              </span>
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded border border-industrial-border text-xs">
            <button
              type="button"
              onClick={() => handleSwitchLayer('hybrid')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                activeLayer === 'hybrid' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title={isEn ? 'Satellite Imagery with Roads and Places labels' : 'تصاویر ماهواره‌ای به همراه اسامی اماکن، جاده‌ها و مرزها'}
            >
              <Layers className="w-3.5 h-3.5 text-industrial-warning" />
              <span>{isEn ? 'Hybrid Satellite' : 'ماهواره‌ای ترکیبی'}</span>
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
              <span>{isEn ? 'Streets Map' : 'معابر شهری'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchLayer('topo')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-all ${
                activeLayer === 'topo' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title={isEn ? 'Topographic & Elevation Contour Map' : 'نقشه توپوگرافی و تراز ارتفاعی زمین (OpenTopoMap)'}
            >
              <Compass className="w-3.5 h-3.5 text-industrial-success" />
              <span>{isEn ? 'Topography' : 'توپوگرافی و شیب'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Container with Embedded Floating Search Window */}
      <div className="relative rounded-lg overflow-hidden border border-industrial-border h-[360px] sm:h-[460px] md:h-[520px]">
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* FLOATING SEARCH & COORDINATES WINDOW (پنجره تعبیه شده جستجوی مکان و مختصات) */}
        <div className="absolute top-3 left-3 z-20 max-w-sm w-[92%] sm:w-80 bg-industrial-surface/95 rounded-xl border border-industrial-border/90 overflow-hidden transition-all duration-150">
          {/* Header Bar */}
          <div className="flex items-center justify-between p-2.5 bg-slate-800/90 border-b border-industrial-border/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-industrial-accent">
              <Search className="w-3.5 h-3.5 text-industrial-warning" />
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
              <div className="flex rounded-lg bg-industrial-bg p-1 border border-industrial-border">
                <button
                  type="button"
                  onClick={() => setSearchTab('name')}
                  className={`flex-1 py-1 text-center font-semibold rounded transition ${
                    searchTab === 'name' ? 'bg-sky-600 text-white ' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEn ? 'By Location Name' : 'جستجوی نام مکان'}
                </button>
                <button
                  type="button"
                  onClick={() => setSearchTab('coords')}
                  className={`flex-1 py-1 text-center font-semibold rounded transition ${
                    searchTab === 'coords' ? 'bg-sky-600 text-white ' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isEn ? 'By Coordinates' : 'ورود با مختصات'}
                </button>
              </div>

              {/* Tab 1: Search by Location Name */}
              {searchTab === 'name' && (
                <div className="space-y-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      triggerGeocodeSearch(searchQuery);
                    }}
                    className="flex gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder={isEn ? 'City, town, industrial zone...' : 'نام شهر، شهرک صنعتی یا منطقه...'}
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        // Instant cancellation and hiding of old results
                        if (geocodeAbortControllerRef.current) {
                          geocodeAbortControllerRef.current.abort();
                          geocodeAbortControllerRef.current = null;
                        }
                        setOnlineResults([]);
                        setIsSearchingOnline(false);
                      }}
                      className="studio-input text-xs flex-1 py-1.5"
                    />
                    <button
                      type="submit"
                      disabled={isSearchingOnline}
                      className="studio-btn-primary px-2.5 py-1.5 text-xs flex items-center gap-1"
                      title={isEn ? 'Search place name' : 'جستجوی نام مکان'}
                    >
                      {isSearchingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleGeolocate}
                      disabled={isSearchingOnline}
                      className="studio-btn-secondary px-2.5 py-1.5 text-xs flex items-center gap-1"
                      title={isEn ? 'Use browser geolocation (My Location)' : 'استفاده از مکان‌یابی مرورگر (محل من)'}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  </form>
                  <div className="text-[9px] text-slate-500 font-sans">
                    {isEn ? 'Geocoding data: © OpenStreetMap contributors (ODbL)' : 'داده‌های موقعیت‌یابی: © همکاران OpenStreetMap'}
                  </div>

                  {/* Recent Searches (localStorage) */}
                  {recentSearches.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[9px] text-slate-500 font-semibold uppercase">{isEn ? 'Recent' : 'جستارهای اخیر'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {recentSearches.map((item, idx) => (
                          <button
                            key={`recent-${idx}`}
                            type="button"
                            onClick={() => {
                              handleJumpToCoordinate(item.lat, item.lng, item.label);
                              setOnlineResults([]);
                            }}
                            className="text-right p-1.5 rounded hover:bg-slate-800 text-[10px] flex items-center gap-1.5 text-sky-300 transition"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[170px] text-left">{item.label}</span>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0 ml-1">{item.lat.toFixed(3)}, {item.lng.toFixed(3)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search Results Dropdown List (OSM Online Geocoding) */}
                  {onlineResults.length > 0 && (
                    <div className="max-h-44 overflow-y-auto space-y-1 bg-industrial-bg/90 rounded border border-industrial-border p-1 divide-y divide-slate-800/60">
                      {onlineResults.map((item, idx) => (
                        <button
                          key={`online-${idx}`}
                          type="button"
                          onClick={() => {
                            handleJumpToCoordinate(item.lat, item.lon, item.display_name.split(',')[0]);
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
                      <label htmlFor="map-coord-latitude" className="text-[10px] text-slate-400 block mb-0.5">
                        {isEn ? 'Latitude (° [-90..+90]):' : 'عرض جغرافیایی (منفی=جنوبی):'}
                      </label>
                      <input
                        id="map-coord-latitude"
                        type="number"
                        step="0.0001"
                        value={inputLat}
                        onChange={(e) => setInputLat(e.target.value)}
                        className="studio-input text-xs font-mono py-1 w-full"
                        placeholder=""
                      />
                    </div>
                    <div>
                      <label htmlFor="map-coord-longitude" className="text-[10px] text-slate-400 block mb-0.5">
                        {isEn ? 'Longitude (° [-180..+180]):' : 'طول جغرافیایی (منفی=غربی):'}
                      </label>
                      <input
                        id="map-coord-longitude"
                        type="number"
                        step="0.0001"
                        value={inputLng}
                        onChange={(e) => setInputLng(e.target.value)}
                        className="studio-input text-xs font-mono py-1 w-full"
                        placeholder=""
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
        <div className="absolute bottom-3 right-3 z-20 bg-industrial-surface/90 px-3 py-1.5 rounded-lg border border-industrial-border/80 text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none">
          <Crosshair className="w-3.5 h-3.5 text-industrial-accent" />
          <span>
            {isEn
              ? 'Click anywhere on the map or drag the solar pin to calculate site resource.'
              : 'روی هر نقطه‌ای از نقشه کلیک کنید یا نشانگر را بکشید تا مختصات و تابش اختصاصی محاسبه گردد.'}
          </span>
        </div>
      </div>
    </div>
  );
};
export default SiteLocationMap;
