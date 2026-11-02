/**
 * PR-2a-6 REPAIR — Ambiguity C integration script
 * ===============================================
 * Mode-aware financial analysis:
 * 1 MW plant in 3 modes (On-Grid / Off-Grid / Powerplant) must produce 3 distinct
 * LCOE values. Off-Grid must have ZERO substation CAPEX, ZERO grid interconnection
 * CAPEX, ZERO feed-in tariff revenue, and include diesel fuel OPEX + battery
 * replacement cost instead.
 */

import { performFinancialAnalysis, DEFAULT_FINANCIAL_PRICING } from '../src/engine/financialEngine';

let failures = 0;
function assert(condition: boolean, message: string) {
  if (condition) console.log(`  [PASS] ${message}`);
  else { console.error(`  [FAIL] ${message}`); failures++; }
}

function main() {
  console.log('================================================================================');
  console.log(' PR-2a-6 REPAIR — Mode-aware financial engine (Ambiguity C)');
  console.log('================================================================================\n');

  const annualYieldKwh = 1_500_000; // 1 MWp @ ~1,500 kWh/kWp·y
  const batteryKwh = 2000;

  const modes: Array<{ mode: 'powerplant' | 'ongrid' | 'offgrid'; label: string }> = [
    { mode: 'powerplant', label: 'Utility Powerplant (1 MW AC)' },
    { mode: 'ongrid', label: 'On-Grid with backup (1 MW AC)' },
    { mode: 'offgrid', label: 'Off-Grid standalone (1 MW AC + 2 MWh BESS)' },
  ];

  const results: Array<{
  mode: string; lcoeUsd: number; lcoeTom: number; capexUsd: number;
  substationUsd: number; gridUsd: number; revenueUsd: number;
  dieselFuelCostUsd: number; dieselOpexUsd: number; battReplUsd: number;
  feedInRevenue: number; costOfEnergyServedUsd: number;
  hvConnectionUsd: number; landLeaseAnnualUsd: number; gridOperatorFeeAnnualUsd: number;
  ppaTariffTom: number;
}> = [];

  for (const m of modes) {
    const res = performFinancialAnalysis(
      1000,              // totalPvCapacityKwp
      batteryKwh,        // batteryCapacityKwh
      1000,              // inverterCapacityKw
      annualYieldKwh,    // annualYieldKwh
      { ...DEFAULT_FINANCIAL_PRICING, includeDieselGenSet: m.mode === 'offgrid', dieselGenSetCapexUsd: 45000 },
      25,
      m.mode
    );

    const b = res.capexBreakdown;
    const offgrid = m.mode === 'offgrid';
    console.log(`\n--- ${m.label} ---`);
    console.log(`  LCOE: ${res.lcoeUsdPerKwh.toFixed(4)} USD/kWh | Cost of Energy Served: ${res.costOfEnergyServedUsdPerKwh.toFixed(6)} USD/kWh`);
    console.log(`  CAPEX: ${b.totalCapexUsd.toLocaleString('en-US')} USD | Substation: ${b.substationMvUsd} USD | Grid: ${b.gridInterconnectionUsd} USD | HV Conn: ${b.hvConnectionUsd} USD`);
    console.log(`  Diesel fuel: ${res.dieselFuelCostUsd.toFixed(2)} USD/yr | Diesel OPEX: ${res.dieselOpexUsd} USD/yr | Battery repl Y12: ${b.batteryReplacementYear12Usd} USD`);
    console.log(`  PPA tariff: ${res.ppaTariffTomanPerKwh} Toman/kWh | Land lease: ${res.landLeaseAnnualUsd.toFixed(2)} USD/yr | Grid operator fee: ${res.gridOperatorFeeAnnualUsd.toFixed(2)} USD/yr`);
    console.log(`  Feed-in revenue: ${offgrid ? '0 (disabled)' : res.annualRevenueUsd.toLocaleString('en-US')} USD/yr`);

    results.push({
      mode: m.label,
      lcoeUsd: res.lcoeUsdPerKwh,
      lcoeTom: res.lcoeTomanPerKwh,
      capexUsd: b.totalCapexUsd,
      substationUsd: b.substationMvUsd,
      gridUsd: b.gridInterconnectionUsd,
      revenueUsd: res.annualRevenueUsd,
      dieselFuelCostUsd: res.dieselFuelCostUsd,
      dieselOpexUsd: res.dieselOpexUsd,
      battReplUsd: b.batteryReplacementYear12Usd,
      feedInRevenue: offgrid ? 0 : res.annualRevenueUsd,
      costOfEnergyServedUsd: res.costOfEnergyServedUsdPerKwh,
      hvConnectionUsd: b.hvConnectionUsd,
      landLeaseAnnualUsd: res.landLeaseAnnualUsd,
      gridOperatorFeeAnnualUsd: res.gridOperatorFeeAnnualUsd,
      ppaTariffTom: res.ppaTariffTomanPerKwh,
    });
  }

  console.log('\n================================================================================');
  console.log(' LCOE COMPARISON TABLE — 1 MW Plant in 3 Modes (Ambiguity C)');
  console.log('================================================================================\n');

  console.log('| Mode       | LCOE ($/kWh) | Cost Served | Substation | Grid | HV Conn | Feed-In | Diesel Fuel | Diesel OPEX | Battery |');
  console.log('|------------|--------------|-------------|------------|------|---------|---------|-------------|-------------|---------|');
  for (const r of results) {
    const modePad = r.mode.padEnd(12);
    const lcoePad = r.lcoeUsd.toFixed(4).padStart(12);
    const cosPad = r.costOfEnergyServedUsd.toFixed(4).padStart(11);
    const subPad = (r.substationUsd > 0 ? r.substationUsd : 0).toString().padStart(10);
    const gridPad = (r.gridUsd > 0 ? r.gridUsd : 0).toString().padStart(6);
    const hvPad = (r.hvConnectionUsd > 0 ? r.hvConnectionUsd : 0).toString().padStart(7);
    const fiPad = (r.feedInRevenue > 0 ? r.feedInRevenue.toFixed(0) : '0').padStart(7);
    const dieselPad = (r.dieselFuelCostUsd > 0 ? r.dieselFuelCostUsd.toFixed(0) : '0').padStart(11);
    const dieselOpexPad = (r.dieselOpexUsd > 0 ? r.dieselOpexUsd : 0).toString().padStart(11);
    const battPad = (r.battReplUsd > 0 ? r.battReplUsd : 0).toString().padStart(7);
    console.log(`| ${modePad} | ${lcoePad} | ${cosPad} | ${subPad} | ${gridPad} | ${hvPad} | ${fiPad} | ${dieselPad} | ${dieselOpexPad} | ${battPad} |`);
  }
  console.log('');

  console.log('================================================================================');
  console.log(' ASSERTIONS');
  console.log('================================================================================\n');

  const lcoes = results.map(r => r.lcoeUsd);
  const allDistinct = new Set(lcoes.map(v => v.toFixed(4))).size === 3;
  assert(allDistinct, `3 modes produce 3 distinct LCOE values: ${lcoes.map(v => v.toFixed(4)).join(' | ')} USD/kWh`);

  const offgrid = results[2];
  assert(offgrid.substationUsd === 0, `Off-Grid substation CAPEX = 0 (got ${offgrid.substationUsd})`);
  assert(offgrid.gridUsd === 0, `Off-Grid grid interconnection CAPEX = 0 (got ${offgrid.gridUsd})`);
  assert(offgrid.feedInRevenue === 0, `Off-Grid feed-in revenue = 0 (got ${offgrid.feedInRevenue})`);
  assert(offgrid.battReplUsd > 0, `Off-Grid includes Year-12 battery replacement cost (> 0)`);
  assert(offgrid.dieselFuelCostUsd > 0, `Off-Grid includes diesel fuel cost (> 0)`);
  assert(offgrid.dieselOpexUsd > 0, `Off-Grid includes diesel OPEX (> 0)`);
  assert(offgrid.capexUsd > results[0].capexUsd || offgrid.capexUsd > results[1].capexUsd,
    `Off-Grid CAPEX reflects battery + diesel instead of grid assets`);

  console.log(`\n${failures === 0 ? 'ALL FINANCIAL MODE ASSERTIONS PASSED' : failures + ' ASSERTION(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(2);
});
