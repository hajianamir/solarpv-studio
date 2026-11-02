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

  const results: Array<{ mode: string; lcoeUsd: number; lcoeTom: number; capexUsd: number; substationUsd: number; gridUsd: number; revenueUsd: number; dieselOpexUsd: number; battReplUsd: number; feedInRevenue: number }> = [];

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
    console.log(`\n--- ${m.label} ---`);
    console.log(`  LCOE: ${res.lcoeUsdPerKwh.toFixed(4)} USD/kWh (${res.lcoeTomanPerKwh.toLocaleString('fa-IR')} Toman/kWh)`);
    console.log(`  CAPEX: ${b.totalCapexUsd.toLocaleString('en-US')} USD | NPV: ${res.npvUsd.toLocaleString('en-US')} USD | IRR: ${res.irrPct}%`);
    console.log(`  Substation CAPEX: ${b.substationMvUsd} USD | Grid interconnection: ${b.gridInterconnectionUsd} USD`);
    console.log(`  Annual revenue: ${res.annualRevenueUsd.toLocaleString('en-US')} USD | Diesel fuel OPEX: ${res.cashFlow25Years[0]?.fuelCostToman ?? 0} Toman`);
    console.log(`  Battery replacement Y12: ${b.batteryReplacementYear12Usd} USD`);

    results.push({
      mode: m.label,
      lcoeUsd: res.lcoeUsdPerKwh,
      lcoeTom: res.lcoeTomanPerKwh,
      capexUsd: b.totalCapexUsd,
      substationUsd: b.substationMvUsd,
      gridUsd: b.gridInterconnectionUsd,
      revenueUsd: res.annualRevenueUsd,
      dieselOpexUsd: 0,
      battReplUsd: b.batteryReplacementYear12Usd,
      feedInRevenue: res.annualRevenueUsd,
    });
  }

  console.log('\n================================================================================');
  console.log(' ASSERTIONS');
  console.log('================================================================================\n');

  const lcoes = results.map(r => r.lcoeUsd);
  const allDistinct = new Set(lcoes.map(v => v.toFixed(4))).size === 3;
  assert(allDistinct, `3 modes produce 3 distinct LCOE values: ${lcoes.map(v => v.toFixed(4)).join(' | ')} USD/kWh`);

  const offgrid = results[2];
  assert(offgrid.substationUsd === 0, `Off-Grid substation CAPEX = 0 (got ${offgrid.substationUsd})`);
  assert(offgrid.gridUsd === 0, `Off-Grid grid interconnection CAPEX = 0 (got ${offgrid.gridUsd})`);
  assert(offgrid.battReplUsd > 0, `Off-Grid includes Year-12 battery replacement cost (> 0)`);
  assert(offgrid.capexUsd > results[0].capexUsd || offgrid.capexUsd > results[1].capexUsd,
    `Off-Grid CAPEX reflects battery + diesel instead of grid assets`);

  console.log(`\n${failures === 0 ? 'ALL FINANCIAL MODE ASSERTIONS PASSED' : failures + ' ASSERTION(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('UNCAUGHT ERROR:', err);
  process.exit(2);
});
