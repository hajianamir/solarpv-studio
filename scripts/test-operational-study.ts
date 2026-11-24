import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createOperationalStudy,
  validateOperationalStudy,
  StudyDescriptorSchema,
} from "../src/studies/operationalStudy";
import { adoptOperationalEnergy } from "../src/studies/operationalEnergy";
import {
  ProjectDataV3Schema,
} from "../src/engine/core/projectMigration";
const evidence = JSON.parse(
  readFileSync(".cache/study-evidence/operational/annual-direct.json", "utf8"),
);
const request = evidence.request;
const context = {
  latitude: request.site.latitude,
  longitude: request.site.longitude,
  dcCapacityKwp: request.system.arrayPdc0W / 1000,
  inverterCapacityKw:
    (request.system.inverterPdc0W * request.system.inverterEtaNom) / 1000,
  mode: "powerplant" as const,
  configurationSha256: "a".repeat(64),
};
const ack = "Synthetic software fixture; not field validation";
const doc = createOperationalStudy(evidence, context, ack, {
  timeZone: "America/New_York",
  altitudeM: 0,
  notes: "test only",
});
const restored = validateOperationalStudy(
  JSON.parse(JSON.stringify(doc)),
  context,
);
assert.equal(restored.receipt.studyId, doc.id);
assert.equal(
  restored.receipt.exportKwh,
  adoptOperationalEnergy(evidence, context, ack).exportKwh,
);
for (const mutate of [
  (d: any) => d.receipt.exportKwh++,
  (d: any) => (d.descriptor.notes = "modified"),
  (d: any) => d.evidence.samples.pop(),
  (d: any) => (d.context.configurationSha256 = "b".repeat(64)),
  (d: any) => (d.id = "c".repeat(64)),
]) {
  const bad = structuredClone(doc);
  mutate(bad);
  assert.throws(() => validateOperationalStudy(bad, context));
}
assert.throws(() =>
  validateOperationalStudy(doc, {
    ...context,
    longitude: context.longitude + 0.1,
  }),
);
assert.equal(
  StudyDescriptorSchema.safeParse({ timeZone: "Mars/Unknown" }).success,
  false,
);
assert.equal(
  StudyDescriptorSchema.safeParse({ altitudeM: Infinity }).success,
  false,
);
assert.equal(StudyDescriptorSchema.safeParse({}).success, true);
assert.ok(
  ProjectDataV3Schema.shape.operationalStudyId.safeParse(doc.id).success,
);
assert.ok(
  !ProjectDataV3Schema.shape.operationalStudyId.safeParse("forged").success,
);
console.log(
  "PASS operational archive roundtrip, replay, evidence/receipt/context/descriptor tampering, optional metadata, reference schema",
);
