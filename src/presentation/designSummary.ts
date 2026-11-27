/** Display/adaptor contract, not a sizing, annual-energy or financial model.
 * Call only after activeOperationalEnergy has evaluated context/coverage/staleness.
 * Do not accept a raw Research result as an annual-energy source.
 */
export interface DesignSummaryInput {
  actualDcKwp: number;
  installedAcKw: number;
  requestedAcKw: number;
  annualFinancialEnergyKwh: number;
  waterfallPrPct: number;
  hasAdoptedOperationalEnergy: boolean;
}

export function buildDesignSummary(input: DesignSummaryInput) {
  return {
    actualDcKwp: input.actualDcKwp,
    installedAcKw: input.installedAcKw,
    requestedAcKw: input.requestedAcKw,
    annualFinancialEnergyMwh: input.annualFinancialEnergyKwh / 1000,
    waterfallPrPct: input.waterfallPrPct,
    // The legacy Iranian scalar model has no import-cost/dispatch ledger.
    // Do not revalue gross PV or exported energy as though it implemented that ledger.
    iranianModelAvailable: !input.hasAdoptedOperationalEnergy,
    energyBasis: input.hasAdoptedOperationalEnergy ? 'operational_financial_boundary' as const : 'screening_waterfall_net_ac' as const,
  };
}
