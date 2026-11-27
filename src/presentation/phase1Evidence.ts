/** Review date is not a tariff-effective date or independent validation date. */
export interface AssumptionEvidence {
  id: string;
  status: 'illustrative_unverified';
  source: null;
  effectiveDate: null;
  reviewedDate: '2026-11-03';
  currencyBasis: string;
  valuationBasis: string;
  owner: string;
}
export const ECONOMIC_ASSUMPTIONS: readonly AssumptionEvidence[] = [
  {id:'financial-defaults',status:'illustrative_unverified',source:null,effectiveDate:null,reviewedDate:'2026-11-03',currencyBasis:'Toman inputs; currency conversion is a user assumption, not a live quote',valuationBasis:'User-selected nominal discount/escalation; Fisher real profile only when explicitly selected. No asserted market cost of capital.',owner:'financialEngine.DEFAULT_FINANCIAL_PRICING / core/financialContract.COUNTRY_FINANCIAL_PROFILES'},
  {id:'iranian-scalar',status:'illustrative_unverified',source:null,effectiveDate:null,reviewedDate:'2026-11-03',currencyBasis:'million Toman ledger; Toman/kWh tariffs',valuationBasis:'Nominal 20% discount; 25% default inflation; tariff/OPEX growth 0.48/0.60 times inflation. Tariff floors and CAPEX are unsourced scenario assumptions.',owner:'iranianRegulationsFinancial.runIranianRegulationFinancialModel'},
];
export const ECONOMIC_DISCLOSURE = 'ILLUSTRATIVE ASSUMPTIONS — tariff/FX/CAPEX/discount defaults have no verified market source or effective date (disclosure review 2026-11-03). Toman values and user FX are not live quotes. Verify nominal versus real discount/escalation and override assumptions before decisions; not a bankability assessment.';
export const BIFACIAL_READINESS = {
  status: 'unsupported_sensitivity',
  bankabilityEligible: false,
  independentlyValidatedDomain: null,
  warning: 'Bifacial sensitivity UNSUPPORTED: screening proxy and simplified 2D model have no independently validated sensitivity domain. GCR/albedo/tilt sweeps are illustrative, not calibrated yield or bankability evidence. No replacement physical model is claimed.',
} as const;
