# Iranian financial screen: saved nominal policy and cash-flow basis

This is an illustrative pre-tax 25-year TOMAN screen, not verified statutory tariffs or an approved investment model. Financial adoption is disabled. Use `install.bat` for Windows application installation.

## Controls and persistence

Set framework, entered tariff, debt share, loan interest and repayment years in the Iranian tab. The additional controls set **nominal discount**, **annual tariff escalation** and **annual OPEX escalation**, all in percent/year:5 means5%, not.05%. Rates are independent; discount need not exceed loan interest. Both project/equity NPV use the selected screening discount, not an assessed WACC/cost-of-equity pair.

Settings survive navigation and are included by project Save, project-file export/import and report project-input snapshots. A project does not automatically use these settings in the separate Financial tab. No chronological energy/dispatch or research result is newly adopted. Adopted operational energy remains unavailable in this scalar framework.

- Intentional0% interest or discount is retained.
- Invalid/empty/out-of-range edits display an error and retain the last validated calculation. Unsupported imported settings block restoration; they are not silently replaced.
- Only TOMAN/nominal is supported. There is no automatic currency, rial/Toman or real/nominal conversion.
- The entered tariff and actual applied tariff are shown. Unverified framework floors3800/4500/3200/5000Toman/kWh remain; entered0 is not an assertion of a zero applied tariff.
- Annual rates must be finite, >−100% and ≤1000%. The upper limit is a supported numerical envelope, not an economic rule. Extreme inputs/rates causing nonfinite calculations are unavailable rather than a displayed success.

## Reading project versus equity results

**Project NPV** discounts year-zero full capital expenditure and revenue minus OPEX, before loan payments. **Equity NPV** discounts year-zero equity contribution and operating cash flow after debt service. Changing financing therefore changes equity NPV but not pre-debt project NPV. The former UI incorrectly labeled the equity number Project NPV; historical snapshots with that label must be interpreted accordingly, not silently rewritten.

The ledger retains full-precision million Toman for accounting/NPV. Display formatting does not feed calculations. Existing IRR, LCOE, payback and avoided-cost compatibility metrics still have their historical rounded scalar formats; full precision across all financial metrics is not claimed complete. DSCR is the screen's operating income divided by debt service and is null without debt service, not infinite coverage.

Positive near-zero interest now uses stable ordinary-annuity arithmetic (`log1p`/`expm1`); exactly zero uses principal/term. This fixes numerical cancellation, not financing applicability. No taxes, balloon schedule, replacement/salvage cash flows or full nonconventional-flow IRR assessment is implemented.

## Engine and project contract

Existing eight-argument calls remain compatible:

```ts
runIranianRegulationFinancialModel(10, 18, 'satba_fit_ppa', 4200, 70, 0, 6, 25);
```

Omitting the ninth argument uses the former20% discount and escalation=.48/.60times the eighth inflation percentage. Active UI calls supply an explicit policy instead:

```ts
const policy = {
  modelPolicy: 'iranian_screen_economics_v1',
  currency: 'TOMAN',
  rateBasis: 'nominal',
  discountRatePct: 5,
  tariffEscalationPct: 0,
  opexEscalationPct: 3,
} as const;
runIranianRegulationFinancialModel(10, 18, 'satba_fit_ppa', 4200, 70, 0, 6, 25, policy);
```

An explicit policy replaces—not adds to—the legacy escalation indexing. Input objects are strict: unknown tax/salvage fields, unsupported valuation/currency, numeric strings, null or unknown versions reject. The result includes `economicPolicy`, `projectNpvMillionToman`, `equityNpvMillionToman` and `financialAdoptionEligible:false`. Deprecated `npvMillionToman` remains an equity alias; migrate consumers to the explicit field names.

`iranianScreenSettings` in project JSON contains framework, entered tariff, debt share, loan interest, tenor and `economicPolicy`. Current import validates it atomically. Missing legacy settings use the former UI defaults (Article16,4500tariff,70%debt,23%interest,5years,20/12/15%discount/tariff/OPEX). Older releases did not save custom tab-local edits; they cannot be recovered from those files. Historical results are not model inputs or current-policy eligibility evidence.

## Rollback and evidence limits

Do not downgrade a custom-policy project to an older reader expecting policy fidelity: it may discard the new field. A safe rollback disables this screen or retains strict policy parsing; never silently restore20% for a saved custom policy. Keep a project-file copy and recompute results after changes. No automatic destructive schema rewrite or cross-model financial mutation is performed.

ADR-022 and `phase2-iranian-policy-verification-receipt.json` record independent Decimal arithmetic, actual browser/save/export/import evidence and limits. These establish software behavior within the tested specialization, not whole-project accuracy, conformity, bankability or completion of Phase2.
