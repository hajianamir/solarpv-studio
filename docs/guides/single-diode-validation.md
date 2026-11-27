# Single-diode screening and the first Phase3 reference experiment

The I–V page is a fixed illustrative-module screen, **not** the currently selected catalog module, a measured tracer or a validated design replacement. This Phase3 slice adds independent comparison and accurate disclosure; it does not change production numerical results or authorize annual-energy/financial adoption.

## Explicit-reference continuation

A separate bounded numerical API is now implemented: `evaluateReferenceDiode` with versioned reference parameters, exact implicit Isc/Voc and continuous MPP, residual checks and explicit unavailable/dark results. See [the bounded reference guide](bounded-reference-diode.md) and ADR-025. This does **not** replace the legacy page, repair its extraction/seed behavior or enable annual/financial adoption. The first-slice discussion below remains the legacy model's qualification, not a statement that the new library API is absent.

## Reading the page

- The legacy engine estimates a reference parameter set from STC summary values unless explicit custom parameters are supplied by code. That heuristic is not a complete De Soto/CEC datasheet fit.
- gamma_Pmp is accepted by the legacy signature but unused. beta_Voc affects the root solver's initial guess, not a fitted temperature constraint.
- Pmp/Vmp/Imp are selected from an80interval curve grid, not an exact optimized MPP. Reported scalar Isc is approximate, not the implicit short-circuit root.
- The shading checkbox changes plotted current/power values only. It does not solve shaded substring/bypass circuits or global MPPT, and the KPI numbers remain unshaded. Both languages now state this explicitly.
- Solver convergence is not certified. The first Phase3 investigation reproduced a severe extreme-seed Voc failure; do not use apparently finite output as proof of root convergence or design reliability.

The serialized legacy `vt` value is aggregate `Ns*k*T/q` over all series cells, excluding ideality n. `n*vt` corresponds to pvlib's `nNsVth`; it is not the per-cell thermal voltage. The misleading comment was corrected without renaming or changing stored numbers.

## What the experiment establishes

A separate Python generator executes pvlib0.13.1 with explicitly supplied upstream reference parameters at48irradiance/temperature/series combinations, producing3,888curve points. TypeScript replay checks translated parameters, curve samples and sampled MPP against that independent fixture. A model evidence card records domain, units, provenance, error budgets and observed discrepancies. True optimized MPP, implicit Isc and solver-failure witnesses remain separate from passing component assertions.

This does **not** validate automatic extraction from arbitrary datasheets, manufacturer gamma/beta consistency, inferred cell counts/area, invalid input domains, bypass networks, arbitrary-input convergence, measured module accuracy or annual weather/finance. A tolerance describing numerical agreement is not a claim of real-world accuracy.

## Reproduction

For the application on Windows, continue to use `install.bat`. After the normal development dependencies are installed, `npm run test:phase3` replays the committed independent fixture without Python or network access. It also checks bilingual qualification copy, defect witnesses and unchanged production numerical formula inventory.

Reference regeneration is an optional local/server scientific task, not browser code. Use an isolated Python environment and the existing locked `services/pvlib_study/requirements.txt`. In that environment run:

```text
python scripts/fixtures/generate-phase3-single-diode.py --check
```

The generator rejects network operations after installation, asserts pinned scientific versions and compares reference bytes. The recorded generation runtime was Python3.11.2; metadata drift under another Python/runtime must be investigated, not silently accepted as identical evidence. Removing `--check` deliberately regenerates the fixture. Replay comparison-artifact regeneration is also explicit (`tsx scripts/test-phase3-single-diode.ts --write`), never automatic on ordinary tests. Review changed inputs/source hashes/tolerances before accepting new data; never copy production outputs into the oracle.

## Remaining work and rollback

Prioritize bounded root solving with residual/convergence/error status and an explicit versioned reference-parameter contract. A subsequent fit needs suitable inputs, coefficient constraints, physical checks and residuals; it must not invent unused manufacturer coefficients. Preserve a qualified deprecated summary-input adapter only under an explicit compatibility decision. No replacement selector/adoption integration is introduced here.

Rollback removes the independent experiment/disclosure changes; no persisted schema, selected module or financial ledger is rewritten. Prior safety/adoption containment remains. See ADR-024, `PHASE-3-STATUS.md`, the model evidence card and verification receipt. Phase2 and Phase3 remain incomplete; release remains blocked.
