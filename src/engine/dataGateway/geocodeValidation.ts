export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  type: string;
}

/**
 * Validate both raw Nominatim results and same-origin gateway responses.
 * Number(null), Number('') and Number(false) are zero, but none represents a
 * measured coordinate. Accept a genuine numeric zero without accepting those
 * coercions, and reject the entire malformed result instead of showing a false
 * location or treating an invalid payload as an empty search.
 */
export function parseGeocodeResults(payload: unknown): GeocodeResult[] | null {
  if (!Array.isArray(payload)) return null;
  const coordinate = (value: unknown, limit: number): number | null => {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
  };
  const results: GeocodeResult[] = [];
  for (const entry of payload) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    const lat = coordinate(item.lat, 90);
    const lon = coordinate(item.lon, 180);
    if (lat === null || lon === null) return null;
    results.push({
      lat,
      lon,
      display_name: typeof item.display_name === 'string' ? item.display_name : `${lat}, ${lon}`,
      type: typeof item.type === 'string' ? item.type : 'place',
    });
  }
  return results;
}
