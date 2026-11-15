# SolarPV Studio — SAM Reference Case Manifest & Benchmark Guide

This directory contains JSON benchmark manifests that record parameters and target values labelled with **NREL SAM 2023.12.17 Revision 1**. They are not runnable SAM projects and, by themselves, do not document or prove an independent SAM execution.

## Included Reference Cases

1. **`SAM-REF-BIFACIAL-BOULDER`**:
   - Location: Boulder, Colorado (Lat: 40.0150° N, Long: 105.2705° W)
   - Technology: N-Type TOPCon 550W Bifacial, Single-Axis Horizontal Tracker with backtracking.
   - Reference File: `sam_2023_12_17_bifacial_reference_case.sam`
   - Canonical SHA-256 Checksum: `36a5c27d1f0c469c1b33a9046012eb75c8d9ba5988d6f0c99eefad43cc98eab8`
   - Key Target: Annual Bifacial Rear Energy Gain = `10.40%` ($\pm 2.0\%$ tolerance).

2. **`SAM-REF-SOILING-PHOENIX`**:
   - Location: Phoenix, Arizona (Sonoran Arid Desert)
   - Model: Kimber et al. deposition rate model with rain wash-off threshold.
   - Reference File: `sam_2023_12_17_phoenix_soiling_reference.sam`
   - Canonical SHA-256 Checksum: `9b0c26944ba0d8fe458457b27d1dd50dffc835f9be1fdc0cdc552a572febd8e3`
   - Key Target: Annual Average Soiling Loss = `4.20%` ($\pm 5.0\%$ relative tolerance).

3. **`SAM-REF-SNOW-MUNICH`**:
   - Location: Munich, Bavaria (Central European Cold/Snow Regime)
   - Model: Marion et al. snow melting, sliding, and ground damming model.
   - Reference File: `sam_2023_12_17_munich_snow_reference.sam`
   - Canonical SHA-256 Checksum: `0491b76bf2dd2d76987e0e28903f972c82755b7dd0f51f0f9db8cdf5bb809039`
   - Key Target: Annual Snow Loss = `2.60%` ($\pm 5.0\%$ relative tolerance).

## Scope and evidentiary status

The `.sam` files in this directory are JSON manifests with metadata, model parameters, and recorded target outputs. Despite their suffix and SAM release labels, they are not executable SAM project files, do not include the weather files named in their metadata, and do not include an independently generated SAM output log. Their provenance as outputs of NREL SAM 2023.12.17 Revision 1 is **not established by the artifacts in this directory**. Treat the case names and target numbers as manifest labels, not as independently verified SAM results.

The Mesa/PVDAQ field-validation claim formerly made here is withdrawn. `src/engine/core/benchmarks/externalValidation.ts` constructs 45 daily synthetic inputs, uses a hard-coded default target of 8.45%, and compares the model output to that constant. The repository contains no raw PVDAQ time series, sensor identity/calibration record, or reproducible derivation of the claimed measured loss. Thus the reported 8.45% and 0.12% discrepancy do **not** constitute demonstrated field validation; a connection to PVDAQ Station 1221 and DOI 10.2172/1055749 is not established by the supplied evidence. The PVDAQ v3 API documentation identifies that API as decommissioned ([official documentation](https://developer.nrel.gov/docs/solar/pvdaq-v3/)); the endpoint cited in the code is not evidence that a station-specific record was retrieved. The official PVDAQ public-dataset collection DOI is [10.25984/1846021](https://data.openei.org/submissions/4568); citing that collection alone does not establish the specific Mesa measurement.

## Internal manifest comparison runner

`src/engine/core/benchmarks/externalValidation.ts` parses and validates selected manifest fields, runs SolarPV Studio calculations, and compares those results with values recorded in the manifests. This may detect code changes relative to those stored targets. It does not run SAM, independently verify the targets, or establish physical accuracy. Some comparison values are also hard-coded in the runner. A passing result must therefore be described only as an internal comparison/regression result against recorded manifest values.

For the independent evidence assessment and claim-by-claim limitations, see [`docs/audit/INDEPENDENT_EVIDENCE_AUDIT_1.0.3.md`](../../docs/audit/INDEPENDENT_EVIDENCE_AUDIT_1.0.3.md).

To run the automated benchmark suite:

```bash
npm run test:benchmark
# or run the complete audit suite
npm run test:audit
```
