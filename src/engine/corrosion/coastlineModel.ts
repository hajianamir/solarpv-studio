/**
 * Global and Regional Coastline Geodesic Distance Model
 * SolarPV Studio v3.0 - Pure Leaf Geometry Module (Zero Dependencies)
 *
 * Provides high-density coastline anchor coordinates and great-circle
 * Haversine distance computation to the nearest sea or ocean shoreline.
 */

export const COASTLINE_ANCHOR_NODES: ReadonlyArray<[number, number]> = [
  // --- Caspian Sea (Northern Iran & Basin) ---
  [38.43, 48.87], // Astara
  [37.80, 48.91], // Talesh / Havigh
  [37.47, 49.46], // Bandar Anzali
  [37.43, 49.95], // Kiashahr (Sefidroud Delta)
  [37.21, 50.21], // Chamkhaleh / Lahijan coast
  [37.13, 50.31], // Rudsar
  [36.90, 50.65], // Ramsar
  [36.81, 50.88], // Tonekabon
  [36.65, 51.42], // Chaloos / Nowshahr
  [36.63, 52.26], // Mahmoodabad
  [36.70, 52.65], // Babolsar
  [36.77, 52.92], // Juybar
  [36.80, 53.11], // Farahabad (Sari coast)
  [36.85, 53.38], // Amirabad port (Behshahr)
  [36.90, 54.04], // Bandar Torkaman / Bandar Gaz
  [37.07, 54.07], // Gomishan
  [40.40, 49.86], // Baku
  [40.02, 52.96], // Turkmenbashi
  [43.65, 51.15], // Aktau
  [42.98, 47.50], // Makhachkala

  // --- Persian Gulf & Gulf of Oman (Southern Iran Coast) ---
  [30.00, 48.30], // Arvand / Abadan
  [30.43, 49.18], // Bandar Mahshahr / Bandar Imam
  [30.06, 49.71], // Hendijan
  [29.58, 50.51], // Bandar Genaveh
  [28.92, 50.83], // Bushehr Peninsula
  [28.74, 51.05], // Delvar / Tangestan
  [27.83, 52.06], // Kangan / Dayyer
  [27.47, 52.61], // Asaluyeh / Pars Special Zone
  [27.40, 52.68], // Nayband Bay
  [26.55, 54.88], // Bandar Lengeh / Charak
  [26.95, 55.58], // Bandar Khamir
  [27.18, 56.27], // Bandar Abbas / Shahid Rajaee Port
  [27.10, 56.88], // Minab coast (Tiab)
  [26.50, 57.10], // Sirik
  [25.64, 57.77], // Jask
  [25.36, 60.40], // Konarak
  [25.29, 60.64], // Chabahar
  [25.07, 61.41], // Pasabandar / Gwadar Bay
  [26.53, 53.98], // Kish Island
  [26.95, 56.27], // Qeshm Island

  // --- Arabian Peninsula / Middle East ---
  [29.37, 47.98], // Kuwait City
  [27.00, 49.66], // Jubail
  [26.43, 50.10], // Dammam / Khobar
  [26.22, 50.58], // Manama, Bahrain
  [25.28, 51.53], // Doha, Qatar
  [24.45, 54.37], // Abu Dhabi
  [25.20, 55.27], // Dubai
  [25.60, 55.90], // Ras Al Khaimah
  [25.13, 56.34], // Fujairah
  [24.35, 56.74], // Sohar, Oman
  [23.61, 58.54], // Muscat, Oman
  [22.56, 59.53], // Sur, Oman
  [17.02, 54.09], // Salalah, Oman
  [21.54, 39.17], // Jeddah (Red Sea)
  [24.08, 38.06], // Yanbu (Red Sea)
  [29.53, 35.00], // Aqaba (Red Sea)

  // --- Mediterranean & Southern Europe ---
  [31.20, 29.91], // Alexandria, Egypt
  [32.08, 34.78], // Tel Aviv
  [33.89, 35.50], // Beirut
  [36.89, 30.71], // Antalya, Turkey
  [37.98, 23.72], // Athens, Greece
  [40.85, 14.26], // Naples, Italy
  [41.73, 12.28], // Rome (Ostia)
  [44.40, 8.92],  // Genoa
  [43.29, 5.37],  // Marseille
  [43.71, 7.26],  // Nice
  [41.38, 2.17],  // Barcelona
  [39.46, -0.37], // Valencia
  [36.72, -4.42], // Malaga
  [38.72, -9.14], // Lisbon
  [35.75, -5.83], // Tangier
  [41.00, 28.97], // Istanbul (Bosporus)

  // --- Atlantic, North Sea, Americas & Oceania ---
  [51.92, 4.47],   // Rotterdam
  [53.55, 9.99],   // Hamburg
  [55.67, 12.56],  // Copenhagen
  [48.39, -4.48],  // Brest
  [25.76, -80.19], // Miami, USA
  [29.30, -94.79], // Houston / Galveston
  [32.71, -117.16],// San Diego
  [33.94, -118.40],// Los Angeles
  [37.77, -122.41],// San Francisco
  [47.60, -122.33],// Seattle
  [40.71, -74.00], // New York
  [-33.86, 151.21],// Sydney, Australia
  [-37.81, 144.96],// Melbourne
  [-31.95, 115.86],// Perth
  [1.35, 103.82],  // Singapore
  [18.92, 72.83],  // Mumbai, India
  [35.67, 139.77], // Tokyo, Japan
];

/**
 * Calculates geodesic (Haversine) great-circle distance to the nearest coastline anchor in km.
 */
export function estimateGeodesicDistanceToCoastKm(latitude: number, longitude: number): number {
  const R = 6371.0; // Earth mean radius in km
  const toRad = Math.PI / 180.0;
  const lat1 = latitude * toRad;
  const lon1 = longitude * toRad;

  let minDistanceKm = Infinity;

  for (let i = 0; i < COASTLINE_ANCHOR_NODES.length; i++) {
    const node = COASTLINE_ANCHOR_NODES[i];
    const lat2 = node[0] * toRad;
    const lon2 = node[1] * toRad;

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    const d = R * c;

    if (d < minDistanceKm) {
      minDistanceKm = d;
    }
  }

  return Number(minDistanceKm.toFixed(1));
}
