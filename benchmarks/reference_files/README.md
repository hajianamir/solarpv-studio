# SolarPV Studio — SAM Reference Case Manifest & Benchmark Guide

This directory documents the reference project configurations, checksums, and execution instructions for third-party empirical validation against **NREL SAM 2023.12.17 Revision 1**.

## Included Reference Cases

1. **`SAM-REF-BIFACIAL-BOULDER`**:
   - Location: Boulder, Colorado (Lat: 40.0150° N, Long: 105.2705° W)
   - Technology: N-Type TOPCon 550W Bifacial, Single-Axis Horizontal Tracker with backtracking.
   - Reference File: `sam_2023_12_17_bifacial_reference_case.sam`
   - Canonical SHA-256 Checksum: `e9a4f7832bc91e77d85c1894b62e49c716e257db318b76a084594c7185df2314`
   - Key Target: Annual Bifacial Rear Energy Gain = `10.40%` ($\pm 2.0\%$ tolerance).

2. **`SAM-REF-SOILING-PHOENIX`**:
   - Location: Phoenix, Arizona (Sonoran Arid Desert)
   - Model: Kimber et al. deposition rate model with rain wash-off threshold.
   - Key Target: Annual Average Soiling Loss = `4.20%` ($\pm 3.0\%$ tolerance).

3. **`SAM-REF-SNOW-MUNICH`**:
   - Location: Munich, Bavaria (Central European Cold/Snow Regime)
   - Model: Marion et al. snow melting, sliding, and ground damming model.
   - Key Target: Annual Snow Loss = `2.60%` ($\pm 3.0\%$ tolerance).

## Validation Execution

To run the automated external benchmark suite and verify alignment against these reference cases:

```bash
npm run test:benchmark
# or run the complete audit suite
npm run test:audit
```

The dynamic empirical test runner (`src/engine/core/benchmarks/externalValidation.ts`) evaluates each scenario against the physics models and validates that simulation results remain within tight engineering tolerances of the published SAM benchmark targets.
