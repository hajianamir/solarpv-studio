import type { ClimateCity } from "../engine/climaticData";
import { z } from "zod";
import {
  adoptOperationalEnergy,
  OperationalContextSchema,
  type OperationalContext,
  type OperationalEnergy,
} from "./operationalEnergy";
import { stable } from "./studyComparisonGate";
import { weatherSha256 } from "./declaredWeatherAdapter";

/** Optional engineering annotations never masquerade as measured inputs or alter yield. */
export const StudyDescriptorSchema = z
  .object({
    altitudeM: z.number().finite().min(-500).max(9000).optional(),
    timeZone: z
      .string()
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Invalid IANA time zone")
      .optional(),
    moduleModel: z.string().trim().max(200).optional(),
    inverterModel: z.string().trim().max(200).optional(),
    notes: z.string().max(2000).default(""),
    boundary: z
      .literal("declared_modeled_AC_not_verified_sale_meter")
      .default("declared_modeled_AC_not_verified_sale_meter"),
    evidenceStatus: z
      .literal("user_declared_not_authenticated")
      .default("user_declared_not_authenticated"),
  })
  .strict();
export type StudyDescriptor = z.infer<typeof StudyDescriptorSchema>;
const DocumentSchema = z
  .object({
    schemaVersion: z.literal("operational-study-v1"),
    id: z.string().regex(/^[a-f0-9]{64}$/),
    context: OperationalContextSchema,
    acknowledgement: z.string().trim().min(10).max(500),
    descriptor: StudyDescriptorSchema,
    evidence: z.unknown(),
    receipt: z.unknown(),
  })
  .strict();
export type OperationalStudyDocument = z.infer<typeof DocumentSchema>;
export function createOperationalStudy(
  evidence: unknown,
  context: OperationalContext,
  acknowledgement: string,
  descriptor: unknown = {},
): OperationalStudyDocument {
  const receipt = adoptOperationalEnergy(evidence, context, acknowledgement);
  const payload = {
    schemaVersion: "operational-study-v1" as const,
    context: receipt.context,
    acknowledgement: receipt.acknowledgement,
    descriptor: StudyDescriptorSchema.parse(descriptor),
    evidence,
    receipt,
  };
  return { ...payload, id: weatherSha256(stable(payload)) };
}
/** A saved summary/hash is not authority: replay the validated model evidence every restore. */
export function validateOperationalStudy(
  input: unknown,
  context?: OperationalContext,
): { document: OperationalStudyDocument; receipt: OperationalEnergy } {
  const text = JSON.stringify(input);
  if (!text || new TextEncoder().encode(text).length > 68 * 1024 * 1024)
    throw new Error("Operational study exceeds 68 MiB");
  const doc = DocumentSchema.parse(input);
  const rebuilt = createOperationalStudy(
    doc.evidence,
    context ?? doc.context,
    doc.acknowledgement,
    doc.descriptor,
  );
  if (stable(rebuilt) !== stable(doc))
    throw new Error("Operational study context, receipt or evidence mismatch");
  return {
    document: rebuilt,
    receipt: { ...(rebuilt.receipt as OperationalEnergy), studyId: rebuilt.id },
  };
}
async function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("solarpv-operational-studies", 1);
    let blocked = false;
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents", { keyPath: "id" });
    request.onerror = () =>
      reject(request.error ?? new Error("Operational storage unavailable"));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Close other tabs to access operational storage"));
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, done: (v: T) => void) => void,
): Promise<T> {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("documents", mode);
    let value: T;
    tx.oncomplete = () => {
      db.close();
      resolve(value);
    };
    tx.onabort = () => {
      db.close();
      reject(
        tx.error ??
          new Error(
            "Operational storage transaction aborted (quota/permission)",
          ),
      );
    };
    tx.onerror = () => {
      /* abort handles failures */
    };
    try {
      action(tx.objectStore("documents"), (v) => {
        value = v;
      });
    } catch (e) {
      tx.abort();
      reject(e);
    }
  });
}
export async function saveOperationalStudy(
  input: unknown,
): Promise<OperationalStudyDocument> {
  const { document } = validateOperationalStudy(input);
  await transaction<OperationalStudyDocument>("readwrite", (store, done) => {
    store.put(document);
    done(document);
  });
  return document;
}
export async function loadOperationalStudy(
  id: string,
  context?: OperationalContext,
) {
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new Error("Invalid operational study identifier");
  const value = await transaction<unknown>("readonly", (store, done) => {
    const request = store.get(id);
    request.onsuccess = () => done(request.result);
  });
  if (!value)
    throw new Error(
      "Saved operational evidence missing in this browser; import the portable study archive. Screening remains available.",
    );
  return validateOperationalStudy(value, context);
}

/** Explicit physical city dependency contract; provenance remains in project/archive, not an energy dependency.
 * Import deliberately downgrades provider claims. That must not invalidate unchanged physical inputs.
 * No generic key stripping or ignored hash mismatch is used.
 */
export function operationalCityInputs(c: ClimateCity) {
  return {
    latitude: c.latitude,
    longitude: c.longitude,
    elevationM: c.elevationM,
    peakSunHours: c.peakSunHours,
    daylightHoursDesign: c.daylightHoursDesign,
    nightHoursDesign: c.nightHoursDesign,
    tempMinC: c.tempMinC,
    tempMaxC: c.tempMaxC,
    tempAnnualMeanC: c.tempAnnualMeanC,
    albedo: c.albedo,
    soilingLossPct: c.soilingLossPct,
    optimalTiltAnnualDeg: c.optimalTiltAnnualDeg,
    optimalTiltWinterDeg: c.optimalTiltWinterDeg,
    optimalTiltSummerDeg: c.optimalTiltSummerDeg,
    basicWindSpeedKmh: c.basicWindSpeedKmh,
    groundSnowLoadKgM2: c.groundSnowLoadKgM2,
    annualRainfallMm: c.annualRainfallMm,
    soilType: c.soilType,
    soilBearingCapacityKpa: c.soilBearingCapacityKpa,
    soilInternalFrictionAngleDeg: c.soilInternalFrictionAngleDeg,
    soilCohesionKpa: c.soilCohesionKpa,
    soilDensityKnM3: c.soilDensityKnM3,
    frostDepthCm: c.frostDepthCm,
    seismicZoneCoefficientA: c.seismicZoneCoefficientA,
    distanceToCoastKm: c.distanceToCoastKm,
    drainageCondition: c.drainageCondition,
    groundwaterDepthM: c.groundwaterDepthM,
    annualReferenceLosses: c.annualReferenceLosses,
  };
}
