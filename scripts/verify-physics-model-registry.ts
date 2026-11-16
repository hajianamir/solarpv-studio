import assert from 'node:assert/strict';
import { PHYSICS_MODEL_REGISTRY } from '../src/engine/core/modelRegistry';

const entries = Object.entries(PHYSICS_MODEL_REGISTRY);
assert.ok(entries.length > 0, 'Physics model registry must not be empty');
const seenIds = new Set<string>();
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

for (const [key, entry] of entries) {
  assert.equal(entry.modelId, key, `Registry key/modelId mismatch for ${key}`);
  assert.ok(!seenIds.has(entry.modelId), `Duplicate modelId: ${entry.modelId}`);
  seenIds.add(entry.modelId);
  assert.match(entry.version, semver, `${key}: version must be strict SemVer x.y.z`);
  if (entry.lastModified !== undefined) {
    assert.match(entry.lastModified, /^\d{4}-\d{2}-\d{2}$/, `${key}: lastModified must be ISO date when supplied`);
    const parsed = new Date(`${entry.lastModified}T00:00:00Z`);
    assert.ok(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === entry.lastModified, `${key}: invalid lastModified date`);
  }
  assert.ok(entry.name.trim(), `${key}: name is required`);
  assert.ok(entry.referenceLiterature.trim(), `${key}: referenceLiterature is required`);
  assert.ok(entry.governingStandards.length > 0 && entry.governingStandards.every(Boolean), `${key}: governing standards must be explicit`);
  assert.ok(entry.analyticalAssumptions.length > 0 && entry.analyticalAssumptions.every((x) => x.trim()), `${key}: assumptions must be documented`);
  assert.ok(entry.validityBoundaries.length > 0 && entry.validityBoundaries.every((x) => x.trim()), `${key}: validity boundaries must be documented`);
}

const singleDiode = PHYSICS_MODEL_REGISTRY.pv_single_diode_core;
assert.ok(singleDiode, 'pv_single_diode_core is required');
assert.match(singleDiode.analyticalAssumptions.join(' '), /Newton.Raphson/i, 'Single-diode registry must describe the implemented root-solving method');
assert.doesNotMatch(singleDiode.analyticalAssumptions.join(' '), /Lambert\s*W/i, 'Do not claim an unimplemented Lambert W solver');

console.log(`Physics model registry contract passed (${entries.length} model entries).`);
