import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explicitEnergyQuantiles, type UqQuantileRequest } from '../src/studies/uqQuantileContract';
const input: UqQuantileRequest = { enabled: true, source: 'legacy_financial_cdf_v1', provenance: 'synthetic-lognormal-fixture', energy: { p10: Math.exp(-1.2815515655446004 * 0.2) * 100, p50: 100, p90: Math.exp(1.2815515655446004 * 0.2) * 100, unit: 'MWh' } };
const before = JSON.stringify(input);
const result = explicitEnergyQuantiles(input);
assert.equal(result.status, 'available');
if (result.status !== 'available') throw new Error('unreachable');
// Analytic lognormal fixture: median=100, log sigma=.2, Phi^-1(.1)=-1.28155...
// Independent Python statistics.NormalDist inverse CDF reference, rounded to 14 decimals.
assert.ok(Math.abs(result.energyExceedance.p90 - 77.39017796600123) < 1e-9);
assert.equal(result.energyExceedance.p90, input.energy.p10);
assert.equal(result.energyExceedance.p10, input.energy.p90);
assert.equal(result.cdf.q90, input.energy.p90);
assert.equal(result.energyExceedance.p50, 100);
assert.equal(result.policy.financeMutation, false);
assert.equal(result.policy.researchEnergyAdoption, false);
assert.equal(JSON.stringify(input), before);
assert.deepEqual(explicitEnergyQuantiles({ ...input, enabled: false }), { status: 'disabled', feature: 'uq_explicit_quantiles_v1' });
for (const unit of ['Wh', 'kWh', 'MWh', 'MWh/year']) {
  const zero = explicitEnergyQuantiles({ ...input, energy: { p10: 0, p50: 0, p90: 0, unit } });
  assert.equal(zero.status, 'available');
}
for (const value of [NaN, Infinity, -Infinity, -1]) {
  assert.throws(() => explicitEnergyQuantiles({ ...input, energy: { ...input.energy, p10: value } }), /UQ_INVALID_ENERGY_QUANTILES/);
}
assert.throws(() => explicitEnergyQuantiles({ ...input, provenance: ' ' }), /UQ_PROVENANCE_REQUIRED/);
assert.throws(() => explicitEnergyQuantiles({ ...input, energy: { ...input.energy, p10: 101 } }), /UQ_UNORDERED_QUANTILES/);
assert.throws(() => explicitEnergyQuantiles({ ...input, energy: { ...input.energy, unit: 'USD' } }), /UQ_UNSUPPORTED_ENERGY_UNIT/);
assert.throws(() => explicitEnergyQuantiles({ ...input, source: 'research' as UqQuantileRequest['source'] }), /UQ_UNSUPPORTED_SOURCE/);
// Architectural guard: pure adapter has no imports, financial calls or adoption calls.
const source = readFileSync('src/studies/uqQuantileContract.ts', 'utf8');
assert.doesNotMatch(source, /^import\s/m);
assert.doesNotMatch(source, /performFinancialAnalysis\s*\(|adoptOperationalEnergy\s*\(/);
console.log('PASS UQ quantile contract: analytic, opt-in, fail-closed, immutability and boundary checks');
