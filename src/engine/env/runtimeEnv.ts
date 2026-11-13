/**
 * Cross-runtime environment flag reader.
 * Works in Node (scripts/tsx, Express) and in the browser (Vite).
 * Never throws.
 *
 * DEFAULT BEHAVIOR: Returns `true` (automatic reference database internet queries:
 * NASA POWER, PVGIS 5.3, OpenStreetMap Nominatim/Overpass).
 * Returns `false` ONLY when explicitly opted out with `REAL_INTERNET=false` (Node)
 * or `VITE_REAL_INTERNET=false` (Vite) for air-gapped / fully offline operations.
 */
export function isRealInternetEnabled(): boolean {
  // Explicit opt-out in Node / server context
  try {
    // @ts-ignore - `process` may not exist in the browser
    if (typeof process !== 'undefined') {
      if (process?.env?.REAL_INTERNET === 'false' || process?.env?.VITE_REAL_INTERNET === 'false') {
        return false;
      }
    }
  } catch {
    /* ignore */
  }
  // Explicit opt-out in Browser / Vite context
  try {
    // Direct property access so Vite statically replaces it during build
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REAL_INTERNET === 'false') {
      return false;
    }
  } catch {
    /* ignore */
  }
  // Default is true: automatic live reference data fetching
  return true;
}
