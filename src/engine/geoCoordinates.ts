/**
 * Geographic Coordinates and Solar Geometry Helpers (Southern/Northern Hemisphere Aware)
 * SolarPV Studio v3.0 - Planetary Multi-Region Architecture
 */

/**
 * Formats latitude with absolute value and correct hemisphere indicator (N/S).
 * E.g., 35.6892 -> "35.69°N", -33.8688 -> "33.87°S"
 */
export function formatLatitude(lat: number, precision: number = 2): string {
  const safeLat = Number(lat) || 0;
  const abs = Math.abs(safeLat).toFixed(precision);
  const dir = safeLat >= 0 ? 'N' : 'S';
  return `${abs}° ${dir}`;
}

/**
 * Formats longitude with absolute value and correct hemisphere indicator (E/W).
 * E.g., 51.389 -> "51.39° E", -78.4678 -> "78.47° W"
 */
export function formatLongitude(lng: number, precision: number = 2): string {
  const safeLng = Number(lng) || 0;
  const abs = Math.abs(safeLng).toFixed(precision);
  const dir = safeLng >= 0 ? 'E' : 'W';
  return `${abs}° ${dir}`;
}

/**
 * Formats full coordinate pair with correct hemisphere tags.
 * E.g., (-33.8688, 151.2093) -> "33.87°S, 151.21°E"
 */
export function formatCoordinates(lat: number, lng: number, precision: number = 2): string {
  return `${formatLatitude(lat, precision)}, ${formatLongitude(lng, precision)}`;
}

/**
 * Validates geographical coordinates within physical Earth bounds.
 */
export function validateCoordinates(
  lat: number,
  lng: number
): { isValid: boolean; errorFa?: string; errorEn?: string } {
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return {
      isValid: false,
      errorFa: 'عرض جغرافیایی باید عددی معتبر بین ۹۰- (قطب جنوب) تا ۹۰+ (قطب شمال) باشد.',
      errorEn: 'Latitude must be a valid number between -90° (South Pole) and +90° (North Pole).',
    };
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return {
      isValid: false,
      errorFa: 'طول جغرافیایی باید عددی معتبر بین ۱۸۰- (غرب) تا ۱۸۰+ (شرق) باشد.',
      errorEn: 'Longitude must be a valid number between -180° (West) and +180° (East).',
    };
  }
  return { isValid: true };
}

export interface SolsticeSolarGeometry {
  isNorthernHemisphere: boolean;
  solsticeDateEn: string;
  solsticeDateFa: string;
  solarDeclinationDeg: number;
  noonSolarElevationDeg: number;
  isPolarNight: boolean;
  isMidnightSun: boolean;
  narrativeEn: string;
  narrativeFa: string;
}

/**
 * Computes physically sound solar noon elevation at the local winter solstice
 * (the critical screening window for inter-row shading).
 *
 * Northern Hemisphere: Winter Solstice is approx Dec 21 with declination delta = -23.44°
 * Southern Hemisphere: Winter Solstice is approx Jun 21 with declination delta = +23.44°
 * True noon solar altitude alpha = 90 - |lat - delta|
 */
export function calculateSolsticeSolarGeometry(latitude: number): SolsticeSolarGeometry {
  const safeLat = Math.max(-90, Math.min(90, Number(latitude) || 0));
  const isNorthern = safeLat >= 0;

  // At local winter solstice, declination has opposite sign to latitude:
  // North (lat >= 0): declination = -23.44° (December 21)
  // South (lat < 0):  declination = +23.44° (June 21)
  const declinationDeg = isNorthern ? -23.44 : 23.44;
  const solsticeDateEn = isNorthern ? 'December 21' : 'June 21';
  const solsticeDateFa = isNorthern ? '۲۱ دسامبر (انقلاب زمستانی نیم‌کره شمالی)' : '۲۱ ژوئن (انقلاب زمستانی نیم‌کره جنوبی)';

  // Physical noon elevation formula: 90 - |latitude - declination|
  const rawElevation = 90.0 - Math.abs(safeLat - declinationDeg);
  const isPolarNight = rawElevation <= 0;
  const isMidnightSun = Math.abs(safeLat) > 66.56 && rawElevation >= 90;

  const noonElevation = Number(Math.max(0, Math.min(90, rawElevation)).toFixed(1));

  let narrativeEn: string;
  let narrativeFa: string;

  if (isPolarNight) {
    narrativeEn = `At latitude ${formatLatitude(safeLat)}, the site experiences polar night during the local winter solstice (${solsticeDateEn}) where the sun does not rise above the horizon.`;
    narrativeFa = `در عرض جغرافیایی ${formatLatitude(safeLat)}، سایت در انقلاب زمستانی محلی (${solsticeDateFa}) وارد پدیده شب قطبی می‌شود که خورشید در طول روز بالای افق طلوع نمی‌کند.`;
  } else {
    narrativeEn = `At latitude ${formatLatitude(safeLat)}, the solar altitude at true solar noon on the local winter solstice (${solsticeDateEn}) reaches ${noonElevation}°.`;
    narrativeFa = `در عرض جغرافیایی ${formatLatitude(safeLat)}، زاویه ارتفاع خورشید در ظهر آفتابی در انقلاب زمستانی محلی (${solsticeDateFa}) به ${noonElevation} درجه می‌رسد.`;
  }

  return {
    isNorthernHemisphere: isNorthern,
    solsticeDateEn,
    solsticeDateFa,
    solarDeclinationDeg: declinationDeg,
    noonSolarElevationDeg: noonElevation,
    isPolarNight,
    isMidnightSun,
    narrativeEn,
    narrativeFa,
  };
}
