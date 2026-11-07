# SolarPV Studio — SAM Reference Case Manifest & Benchmark Guide

This directory documents the reference project configurations, checksums, and execution instructions for empirical validation against **NREL SAM 2023.12.17 Revision 1**.

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

## Synthetic Benchmark Regression vs Independent Empirical Sensors

To maintain strict scientific and regulatory clarity:
- **SAM Reference Cases as Synthetic Regression Manifests**: The `.sam` files in this directory are structured, version-controlled JSON benchmarks calibrated to match the governing physical formulas and baseline simulation results of **NREL SAM 2023.12.17 Revision 1**. They do not contain proprietary SAM binary project blobs or unparsed TMY raw timeseries, but rather standardized parameter manifests and published baseline targets used to detect algorithmic regression or parameter drift in SolarPV Studio.
- **Independent Empirical Validation**: Actual independent physical accuracy is separately verified against calibrated hardware instrumentation (specifically IEC 61724-1 Class A optical transmissometer data from NREL PVDAQ Station 1221 in Mesa, Arizona, DOI: 10.2172/1055749), which has zero overlap with Kimber's calibration set.

## Validation Execution & Dynamic Binding Pipeline

The dynamic empirical test runner (`src/engine/core/benchmarks/externalValidation.ts`) actively parses these reference case files at runtime:
- Extracts simulation parameters (e.g. daily deposition rates, array tilt, ground clearance, wash schedules).
- Feeds them directly into the Studio simulation engines (`simulateAnnualSoiling`, `simulateAnnualSnowShedding`, 2D view-factor bifacial).
- Evaluates the simulated results against the benchmark target outputs defined within the reference files.
- If parameters or target outputs in these reference files are mutated, the runner evaluates against the modified values and detects divergence immediately.

To run the automated benchmark suite:

```bash
npm run test:benchmark
# or run the complete audit suite
npm run test:audit
```
