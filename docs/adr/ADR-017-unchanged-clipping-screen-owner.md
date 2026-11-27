# ADR-017 — One unchanged legacy clipping screen owner

Date2026-11-03. Scope: P2-S1, clipping portion of U07a only. **Not closure of U07a or Phase2.**

## Decision

Extract the identical raw ILR-only clipping arithmetic from `annualYieldEngine.ts` and `waterfallLossEngine.ts` to `core/legacyClippingScreen.ts`. Return both pre-clamp raw loss and clamped screening loss. Preserve the deprecated public `calculatePhysicalClippingLossPct` name as an adapter, but remove the unsupported description of its local bounds as validated physical limits.

The unchanged local rule is raw loss `-.2 - 6.5*max(0, ILR-1.3)` percentage points, clamped between−85 and−.2 percentage points. It is **not a physical clipping model**, since it has no hourly power/irradiance distribution, operating voltage or efficiency curve. The bounds/coefficients are inherited internal screening policy, not established physical constants.

The annual adapter retains its previous finite/default normalization and four-decimal rounding. Its `rawClippingLossPct` field remains the pre-clamp raw value, not the clamped value. The waterfall retains unrounded clamped loss in `percentageLossRaw` and its separate one-decimal display. No temporal/adoption/financial policy is changed.

## Evidence classification

Fourteen independent 50-digit Decimal cases characterize the declared legacy arithmetic and both adapters at ordinary, threshold and clamp inputs. Historical source attribution: base0c4d7cadc7db6001459ea36fdf9a3d1403179a71, `src/engine/waterfallLossEngine.ts` and `src/engine/core/annualYieldEngine.ts`. The generator does not run/import production code or copy its outputs. This is independent **arithmetic/extraction characterization**, not an independent physical reference or model-quality benchmark. Both extracted expressions have executed direct-export fixtures and exact-node mutation sensitivity in the unchanged reference gate. No gate waiver is introduced and no scientific validity is inferred from a green arithmetic gate.

The existing different nonfinite boundaries are explicitly retained and tested: annual adapter nonfinite ILR falls back to1.25; raw screen+Infinity reaches its local floor,−Infinity reaches its baseline, and NaN remains NaN. This preserves historical behavior rather than silently turning missing waterfall inputs into assessed production. Validation of broader loss-budget input domains remains separate.

## Reviews and research

1. Ownership trace found only these two copies of the clipping arithmetic. The waterfall requires raw precision while the public annual adapter applies rounding; using the adapter directly in the waterfall would have changed behavior. Preserved separate adapters around the single raw owner.
2. Numerical review found an initial extraction incorrectly removed the still-consumed raw value. The new test exposed a ReferenceError immediately. Corrected the owner to return both raw and clamped values, and the oracle to check the pre-clamp field independently, including large ILR cases. The initial failing test was not waived.
3. Runtime review retains all existing consumer regression suites and adds14 adapter/Decimal cases plus nonfinite characterization. Follow-up research fetched https://pvlib-python.readthedocs.io/en/v0.13.1/reference/generated/pvlib.inverter.pvwatts.html : the actual PVWatts inverter model takes input DC power and a DC power limit, computes efficiency and caps AC output. It does not validate this annual ILR-only slope or authorize substituting a new annual clipping estimate without temporal inputs. Consequently the old coefficients are unchanged and explicitly qualified; no PVWatts-equivalence claim.

These are scoped review steps supplementing ADR-016's three full continuation reviews, not claims of independent human peer review.

## Acceptance, compatibility and rollback

P2-S1 tests the shared owner against independent Decimal arithmetic, annual/waterfall precision contracts and historical invalid-input behavior. No persisted schema changes. Outputs for identical inputs are unchanged. Supported rollback is a selective restoration of the two identical inline screens with parity regression, not any change to coefficients or safety/research gates. No repository reset or unrelated inverse patch.

Remaining U07a obligations: named common transposition policy, consumer policy reconciliation and complete migration of17-slot calls through the typed named adapter while retaining deprecated compatibility. This extraction alone does not complete that package. See the continuation receipt for actual executed commands.
