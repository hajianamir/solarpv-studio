import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { simulate24hEnergyBalance } from '../src/engine/simulation24hEngine';
import { formatEnergyKwh } from '../src/engine/energyFormatting';
import { Simulation24hTab } from '../src/components/Simulation24hTab';

const EPSILON = Number.EPSILON;
let checks = 0;
function check(name: string, condition: boolean, detail = ''): void {
  checks += 1;
  assert.ok(condition, `${name}${detail ? `: ${detail}` : ''}`);
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

function kahanSum(values: number[]): number {
  let sum = 0;
  let correction = 0;
  for (const value of values) {
    const adjusted = value - correction;
    const next = sum + adjusted;
    correction = (next - sum) - adjusted;
    sum = next;
  }
  return sum;
}

function forwardErrorBound(values: number[], operationCount: number): number {
  // Standard floating-point summation bound gamma_n * sum(|x_i|), with an
  // additional small operation budget for the independently computed model
  // target. This scales with the data; it is not a business tolerance.
  const nEpsilon = operationCount * EPSILON;
  const gamma = nEpsilon / (1 - nEpsilon);
  return gamma * values.reduce((sum, value) => sum + Math.abs(value), 0)
    + (4 * EPSILON * Math.max(1, ...values.map(Math.abs)));
}

function withinForwardError(actual: number, expected: number, values: number[], operations = 32): boolean {
  return Math.abs(actual - expected) <= forwardErrorBound(values, operations);
}

// Separate test oracle: parse the canonical decimal spelling into an exact
// rational, scale to cents, then apply nearest/ties-away-from-zero using BigInt.
function decimalOracle(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(value.toString());
  assert.ok(match, `unexpected decimal spelling for ${value}`);
  const [, sign, whole, fraction = '', exponentText = '0'] = match;
  const scale = fraction.length - Number(exponentText);
  let numerator = BigInt(`${whole}${fraction}`) * 100n;
  let denominator = 1n;
  if (scale > 0) denominator = 10n ** BigInt(scale);
  else if (scale < 0) numerator *= 10n ** BigInt(-scale);
  let cents = numerator / denominator;
  if ((numerator % denominator) * 2n >= denominator) cents += 1n;
  const rendered = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
  return sign && cents !== 0n ? `-${rendered}` : rendered;
}

function displayCents(formatted: string): bigint {
  const match = /^(-?)(\d+)\.(\d{2})$/.exec(formatted);
  assert.ok(match, `expected two-decimal kWh string, received ${formatted}`);
  const [, sign, whole, fraction] = match;
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  return sign ? -cents : cents;
}

function checkRawSums(name: string, result: ReturnType<typeof simulate24hEnergyBalance>, modeledGeneration: number, modeledDemand: number): void {
  const steps = result.hourlySteps;
  const fields = [
    ['generation', steps.map((step) => step.solarGenKwh), result.totalGeneration24hKwh],
    ['consumption', steps.map((step) => step.loadDemandKwh), result.totalConsumption24hKwh],
    ['surplus', steps.map((step) => step.surplusKwh), result.totalSurplus24hKwh],
    ['deficit', steps.map((step) => step.deficitKwh), result.totalDeficit24hKwh],
  ] as const;

  for (const [fieldName, hourly, publishedTotal] of fields) {
    const independent = kahanSum(hourly);
    check(`${name}: ${fieldName} raw summary agrees with compensated hourly sum`,
      withinForwardError(publishedTotal, independent, hourly, 24),
      `raw=${publishedTotal}; independent=${independent}`);
    const displayedHourlyCents = hourly.reduce((sum, value) => sum + displayCents(formatEnergyKwh(value)), 0n);
    const displayedTotalCents = displayCents(formatEnergyKwh(publishedTotal));
    const displayedDifferenceKwh = Number(displayedHourlyCents - displayedTotalCents < 0n
      ? displayedTotalCents - displayedHourlyCents
      : displayedHourlyCents - displayedTotalCents) / 100;
    const rawSummationDifference = Math.abs(publishedTotal - independent);
    const displayOnlyBoundKwh = (hourly.length + 1) * 0.005 + rawSummationDifference;
    check(`${name}: ${fieldName} independent-display discrepancy stays within the documented rounding bound`,
      displayedDifferenceKwh <= displayOnlyBoundKwh + 4 * EPSILON * Math.max(1, displayedDifferenceKwh),
      `displayedDifference=${displayedDifferenceKwh} kWh; bound=${displayOnlyBoundKwh} kWh`);
  }

  const rawGeneration = kahanSum(steps.map((step) => step.solarGenKwh));
  const rawDemand = kahanSum(steps.map((step) => step.loadDemandKwh));
  check(`${name}: hourly generation conserves independent model input`,
    withinForwardError(rawGeneration, modeledGeneration, steps.map((step) => step.solarGenKwh), 64),
    `hourly=${rawGeneration}; model=${modeledGeneration}`);
  check(`${name}: hourly demand conserves independent model inputs`,
    withinForwardError(rawDemand, modeledDemand, steps.map((step) => step.loadDemandKwh), 64),
    `hourly=${rawDemand}; model=${modeledDemand}`);

  for (const step of steps) {
    const net = step.solarGenKwh - step.loadDemandKwh;
    const positiveSide = step.batteryChargeKwh + step.surplusKwh;
    const negativeSide = step.batteryDischargeKwh + step.deficitKwh;
    const scale = Math.max(1, Math.abs(step.solarGenKwh), Math.abs(step.loadDemandKwh),
      Math.abs(step.batteryChargeKwh), Math.abs(step.batteryDischargeKwh),
      Math.abs(step.surplusKwh), Math.abs(step.deficitKwh));
    const perStepBound = 16 * EPSILON * scale;
    const flowMatches = net >= 0
      ? Math.abs(net - positiveSide) <= perStepBound && step.deficitKwh === 0 && step.batteryDischargeKwh === 0
      : Math.abs(-net - negativeSide) <= perStepBound && step.surplusKwh === 0 && step.batteryChargeKwh === 0;
    check(`${name}: hour ${step.hour} energy-flow identity`, flowMatches,
      `net=${net}; charge+surplus=${positiveSide}; discharge+deficit=${negativeSide}`);
  }
}

const defaultDerate = 0.78;
const fixtures: Array<{
  name: string;
  args: [number, number, number, number, number, number, number, number, number?];
  generation: number;
  demand: number;
}> = [
  {
    name: 'original audit fixture',
    args: [10, 5.2, 24.55, 18.25, 25, 30, 50, 9.58],
    generation: 10 * 5.2 * defaultDerate,
    demand: 24.55 + 18.25,
  },
  {
    name: 'sub-cent generation and loads; no battery',
    args: [0.137, 0.123, 0.271, 0.193, 0, 0, 50, 9.58, 0.731],
    generation: 0.137 * 0.123 * 0.731,
    demand: 0.271 + 0.193,
  },
  {
    name: 'zero daylight with fractional demand',
    args: [8.7, 5.23, 0.013, 1.027, 0, 0, 50, 0],
    generation: 0,
    demand: 0.013 + 1.027,
  },
  {
    name: '24-hour daylight with fractional flows and battery',
    args: [7.321, 4.876, 3.217, 2.013, 1.25, 2.5, 37.5, 24, 0.813],
    generation: 7.321 * 4.876 * 0.813,
    demand: 3.217 + 2.013,
  },
  {
    name: 'zero generation and zero demand',
    args: [0, 5.2, 0, 0, 0, 0, 50, 12],
    generation: 0,
    demand: 0,
  },
  {
    name: 'fractional generation with battery flows',
    args: [7.321, 4.876, 3.217, 2.013, 1.25, 2.5, 37.5, 9.58, 0.813],
    generation: 7.321 * 4.876 * 0.813,
    demand: 3.217 + 2.013,
  },
] as const;

const allOutputs: number[] = [];
for (const fixture of fixtures) {
  const result = simulate24hEnergyBalance(...fixture.args);
  assert.equal(result.hourlySteps.length, 24, `${fixture.name}: 24 hourly steps`);
  checkRawSums(fixture.name, result, fixture.generation, fixture.demand);
  if (fixture.name === 'original audit fixture') {
    check('original fixture exercises battery charge and discharge',
      result.hourlySteps.some((step) => step.batteryChargeKwh > 0)
        && result.hourlySteps.some((step) => step.batteryDischargeKwh > 0));
  }
  if (fixture.name === 'sub-cent generation and loads; no battery') {
    check('no-battery fixture has no battery charge/discharge and retains positive deficit',
      result.hourlySteps.every((step) => step.batteryChargeKwh === 0 && step.batteryDischargeKwh === 0)
        && result.totalDeficit24hKwh > 0);
  }
  if (fixture.name === 'fractional generation with battery flows') {
    check('battery fixture exercises positive surplus and deficit',
      result.totalSurplus24hKwh > 0 && result.totalDeficit24hKwh > 0);
  }
  for (const step of result.hourlySteps) {
    allOutputs.push(step.solarGenKwh, step.loadDemandKwh, step.batteryChargeKwh,
      step.batteryDischargeKwh, step.surplusKwh, step.deficitKwh);
  }
  allOutputs.push(result.totalGeneration24hKwh, result.totalConsumption24hKwh,
    result.totalSurplus24hKwh, result.totalDeficit24hKwh);

  const copy = JSON.parse(JSON.stringify(result)) as typeof result;
  check(`${fixture.name}: raw JSON read-back preserves exact IEEE values`,
    copy.hourlySteps.every((step, index) => {
      const original = result.hourlySteps[index];
      return Object.is(step.solarGenKwh, original.solarGenKwh)
        && Object.is(step.loadDemandKwh, original.loadDemandKwh)
        && Object.is(step.batteryChargeKwh, original.batteryChargeKwh)
        && Object.is(step.batteryDischargeKwh, original.batteryDischargeKwh)
        && Object.is(step.surplusKwh, original.surplusKwh)
        && Object.is(step.deficitKwh, original.deficitKwh);
    })
      && Object.is(copy.totalGeneration24hKwh, result.totalGeneration24hKwh)
      && Object.is(copy.totalConsumption24hKwh, result.totalConsumption24hKwh)
      && Object.is(copy.totalSurplus24hKwh, result.totalSurplus24hKwh)
      && Object.is(copy.totalDeficit24hKwh, result.totalDeficit24hKwh));

  const formatted = [
    ...copy.hourlySteps.flatMap((step) => [step.solarGenKwh, step.loadDemandKwh,
      step.batteryChargeKwh, step.batteryDischargeKwh, step.surplusKwh, step.deficitKwh]),
    copy.totalGeneration24hKwh, copy.totalConsumption24hKwh,
    copy.totalSurplus24hKwh, copy.totalDeficit24hKwh,
  ];
  check(`${fixture.name}: every displayed hourly and daily energy value uses independent two-decimal oracle`,
    formatted.every((value) => formatEnergyKwh(value) === decimalOracle(value)));
}

for (const [value, expected] of [
  [0.0049, '0.00'], [0.005, '0.01'], [0.015, '0.02'], [1.005, '1.01'],
  [2.675, '2.68'], [-0.0049, '0.00'], [-0.005, '-0.01'], [-1.005, '-1.01'],
  [1.234, '1.23'], [1.235, '1.24'], [0, '0.00'],
] as const) {
  check(`display rounding ${value} -> ${expected} (nearest, ties away from zero)`,
    formatEnergyKwh(value) === expected && formatEnergyKwh(value) === decimalOracle(value));
}

check('display-only output differs from raw model data when precision is discarded',
  allOutputs.some((value) => Number(formatEnergyKwh(value)) !== value));
check('formatter reports non-finite values without emitting a false energy reading',
  formatEnergyKwh(Number.NaN) === '—' && formatEnergyKwh(Number.POSITIVE_INFINITY) === '—');

const uiResult = simulate24hEnergyBalance(...fixtures[0].args);
const uiMarkup = renderToStaticMarkup(React.createElement(Simulation24hTab, {
  simulationResult: uiResult,
  generatorSizing: {
    recommendedCapacityKva: 5,
    recommendedCapacityKw: 4,
    estimatedCapexUsd: 1000,
    fuelConsumptionLitersPerHour: 1,
    dailyFuelConsumptionLiters: 24,
    minFuelTankSizeLiters: 30,
    powerFactor: 0.8,
    startingCurrentCapabilityAmps: 20,
    notesFa: '',
    notesEn: '',
  },
  outageHours: 6,
  onOutageHoursChange: () => undefined,
  lang: 'en',
}));
check('real 24-hour UI component renders the rounding disclosure and raw-derived two-decimal daily KPIs',
  uiMarkup.includes('data-testid="energy-rounding-disclosure"')
    && uiMarkup.includes('Daily totals are calculated from unrounded simulation values')
    && uiMarkup.includes(formatEnergyKwh(uiResult.totalGeneration24hKwh))
    && uiMarkup.includes(formatEnergyKwh(uiResult.totalConsumption24hKwh))
    && uiMarkup.includes(formatEnergyKwh(uiResult.totalSurplus24hKwh))
    && uiMarkup.includes(formatEnergyKwh(uiResult.totalDeficit24hKwh)));

console.log(`F-04 energy contract: ${checks} checks passed; calculations and JSON retain raw values.`);
