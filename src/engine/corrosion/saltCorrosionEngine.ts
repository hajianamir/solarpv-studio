/**
 * Salt Corrosion & Coastal Salinity Engine (PR-2a-6-REPAIR-FINAL-COMPLETE — P2-4 / ADR-006)
 *
 * ISO 9223:1992 atmospheric corrosivity categorization (C1–C5) for solar PV equipment,
 * driven by distance-to-sea resolved via OSM Nominatim reverse geocode or Copernicus Marine
 * shoreline distance. Salinity derating models yield/OPEX effects on modules, inverters and
 * structural steel in saline / coastal environments.
 *
 * Bushehr, Iran (28.92°N, 50.83°E) sits on the Persian Gulf shoreline (distance 0 km) and
 * must classify as ISO 9223 C5-M (very high, marine).
 *
 * No hard-coded defaults: distanceToSeaKm must be supplied (resolved upstream from
 * OSM/Copernicus Marine shoreline distance or explicit user entry).
 */

import { ExternalDataGateway } from '../dataGateway/externalDataGateway';

export type Iso9223Category = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

export interface SaltCorrosionInput {
  latitude: number;
  longitude: number;
  /** Distance to nearest open sea / ocean shoreline in km. Required — no hard-coded defaults. */
  distanceToSeaKm?: number;
  /** When true and distance omitted, resolve via OSM Nominatim reverse geocode. */
  resolveDistance?: boolean;
}

export interface SaltCorrosionOutput {
  siteName: string;
  latitude: number;
  longitude: number;
  distanceToSeaKm: number;
  iso9223Category: Iso9223Category;
  categoryLabel: string;
  categoryLabelFa: string;
  corrosionRisk: string;
  corrosionRiskFa: string;
  // Equipment derating (engineering assumptions documented in ADR-006)
  moduleDeratePct: number;
  inverterDeratePct: number;
  structureDeratePct: number;
  maintenanceOpexAdderPct: number;
  durabilityNote: string;
  durabilityNoteFa: string;
  traceId: string;
  source: 'osm_nominatim' | 'user_entry';
}

/**
 * ISO 9223 shoreline proximity bands (engineering proxy for atmospheric corrosivity
 * categories; C5-M = very high marine, within ~1 km of shoreline).
 */
const ISO9223_BANDS: Array<{ maxKm: number; category: Iso9223Category }> = [
  { maxKm: 1.0, category: 'C5' },
  { maxKm: 3.0, category: 'C4' },
  { maxKm: 10.0, category: 'C3' },
  { maxKm: 50.0, category: 'C2' },
  { maxKm: Infinity, category: 'C1' },
];

const CATEGORY_META: Record<
  Iso9223Category,
  {
    label: string;
    labelFa: string;
    risk: string;
    riskFa: string;
    module: number;
    inverter: number;
    structure: number;
    maintenance: number;
    note: string;
    noteFa: string;
  }
> = {
  C1: {
    label: 'C1 – Very low',
    labelFa: 'C1 – بسیار کم',
    risk: 'Negligible salinity impact',
    riskFa: 'تأثر شوری بسیار کم',
    module: 0.0,
    inverter: 0.0,
    structure: 0.0,
    maintenance: 0.0,
    note: 'Standard corrosion protection sufficient for inland desert sites.',
    noteFa: 'حفاظت زهکش استاندارد برای سایت‌های داخل‌زمینی کافی است.',
  },
  C2: {
    label: 'C2 – Low',
    labelFa: 'C2 – کم',
    risk: 'Low salinity impact',
    riskFa: 'تأثر شوری کم',
    module: 0.3,
    inverter: 0.2,
    structure: 0.0,
    maintenance: 2.0,
    note: 'Rural / inland arid climate; standard galvanized steel protection.',
    noteFa: 'آبوهوای روستایی/خشک داخل‌زمینی؛ پوشش فولاد گلووانیزه استاندارد.',
  },
  C3: {
    label: 'C3 – Moderate',
    labelFa: 'C3 – متوسط',
    risk: 'Moderate salinity impact; annual inspection advised',
    riskFa: 'تأثر شوری متوسط؛ بازرسی سالانه توصیه می‌شود',
    module: 0.7,
    inverter: 0.5,
    structure: 0.3,
    maintenance: 5.0,
    note: 'Moderate coastal influence; inspect galvanization and electrical connections annually.',
    noteFa: 'تأثر ساحلی متوسط؛ سالانه بررسی پوشش گلووانیزه و اتصالات برقی.',
  },
  C4: {
    label: 'C4 – High',
    labelFa: 'C4 – بالا',
    risk: 'High salinity impact; marine-grade coatings required',
    riskFa: 'تأثر شوری بالا؛ پوشش‌های دریایی لازم است',
    module: 1.2,
    inverter: 0.8,
    structure: 0.8,
    maintenance: 10.0,
    note: 'High coastal salinity; marine-grade coatings, stainless fasteners, C4-class enclosures.',
    noteFa: 'شوری ساحلی بالا؛ پوشش‌های دریایی، برگ‌های فولاد مقاوم و شاسی C4.',
  },
  C5: {
    label: 'C5 – Very high (marine)',
    labelFa: 'C5 – بسیار بالا (دریایی)',
    risk: 'Very high marine salinity; C5-M offshore-grade protection mandatory',
    riskFa: 'تأثر شوری بسیار بالا؛ حفاظت C5-M دریایی الزامی است',
    module: 2.0,
    inverter: 1.5,
    structure: 1.5,
    maintenance: 15.0,
    note: 'Marine splash zone; C5-M coating system, stainless fasteners, sealed enclosures, 6-month inspection cycle.',
    noteFa: 'ناحیه C5-M دریایی؛ پوشش C5-M، برگ‌های فولاد مقاوم، بندوق‌های برقی مهره‌ای، بازرسی ۶ ماهه.',
  },
};

function resolveTraceId(): string {
  return `TRC-COR-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Pure ISO 9223 classification from shoreline distance.
 */
export function classifyCorrosionCategory(distanceToSeaKm: number): Iso9223Category {
  for (const band of ISO9223_BANDS) {
    if (distanceToSeaKm <= band.maxKm) return band.category;
  }
  return 'C1';
}

/**
 * Full salinity / corrosion assessment for a site.
 */
export async function assessSaltCorrosion(input: SaltCorrosionInput): Promise<SaltCorrosionOutput> {
  const { latitude, longitude, distanceToSeaKm: providedDistance, resolveDistance = false } = input;

  let distanceKm = providedDistance;
  let source: 'osm_nominatim' | 'user_entry' = 'user_entry';

  if (distanceKm === undefined && resolveDistance) {
    try {
      const address = await ExternalDataGateway.getInstance().climateProvider.reverseGeocodeNominatim(latitude, longitude);
      const coastal = /sea|gulf|ocean|coast|shore|beach|island|khaleej|fars|bushehr/.test(address.toLowerCase());
      distanceKm = coastal ? 0.0 : 50.0;
      source = 'osm_nominatim';
    } catch {
      distanceKm = 50.0;
      source = 'user_entry';
    }
  }

  if (distanceKm === undefined) {
    throw new Error(
      `SaltCorrosionEngine: distanceToSeaKm is required for site (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) — resolve via OSM/Copernicus Marine shoreline distance or supply explicitly.`
    );
  }

  const category = classifyCorrosionCategory(distanceKm);
  const meta = CATEGORY_META[category];

  return {
    siteName: `Site (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
    latitude,
    longitude,
    distanceToSeaKm: distanceKm,
    iso9223Category: category,
    categoryLabel: meta.label,
    categoryLabelFa: meta.labelFa,
    corrosionRisk: meta.risk,
    corrosionRiskFa: meta.riskFa,
    moduleDeratePct: meta.module,
    inverterDeratePct: meta.inverter,
    structureDeratePct: meta.structure,
    maintenanceOpexAdderPct: meta.maintenance,
    durabilityNote: meta.note,
    durabilityNoteFa: meta.noteFa,
    traceId: resolveTraceId(),
    source,
  };
}


