# Architecture Decision Record (ADR-001): Computational Strategy for Sub-Hourly & Probabilistic Monte Carlo Modeling

**Status**: Accepted & Extended  
**Date**: 2026-10-28 (Updated: 2026-10-29)  
**Scope**: RFC 3.0.0 — Engine Core (Climate Resilience, Multiphysics, Monte Carlo Analysis)  
**Authors**: Senior Systems Architect & Solar PV Engineering Team  

---

## 1. Context & Problem Statement

The user specifications for Solar PV 3.0.0 call for:
1. **Sub-hourly 15-minute simulation** ($8,760 \times 4 = 35,040$ timesteps per year).
2. **Probabilistic Climate Resilience & Extreme Events** (Gumbel wind gusts, hail risk, thermal stress distributions) using Monte Carlo evaluation.
3. **Multiphysics Coupling** (coupled electrical-thermal 2D equations, low-height bifacial view-factor ray evaluation, FPV heat transfer).

### The Browser Runtime Bottleneck:
If implemented via crude Monte Carlo:
$$\text{Evaluations} = 35,040 \text{ timesteps} \times 1,000 \text{ MC iterations} \times 5 \text{ module types} \approx 175,200,000 \text{ evaluations}$$
In a single-threaded JavaScript/TypeScript environment in the browser, evaluating 175M non-linear exponential/trigonometric expressions causes the UI thread to freeze for >15–30 seconds, exceeding frame budgets and triggering browser "Script Unresponsive" dialogs.

---

## 2. Decision: Four-Tier Optimization Strategy

To provide sub-second interactive engineering calculations while maintaining strict scientific rigor ($\pm 2.5\%$ vs. NREL SAM / DNV golden datasets), we adopt the following four-tier computational strategy:

### Tier 1: Latin Hypercube Sampling (LHS) with Stratified Variance Reduction
Instead of Crude Monte Carlo (CMC) requiring $N = 1,000 - 10,000$ iterations, we implement **Latin Hypercube Sampling (LHS)** (`prng.ts`).
- With $N = 100$ stratified, non-overlapping bins sampled deterministically via our seeded 32-bit `Mulberry32PRNG`, the sampling variance scales as $\mathcal{O}(1/N^2)$ for monotonic functions rather than $\mathcal{O}(1/N)$.
- **Empirical Boundary & Statistical Accuracy** (verified via `lhsBenchmark.ts`):
  - **Mean ($\mu$)**: $\le \pm 0.8\%$ deviation vs 10,000 CMC (observed: 0.05%).
  - **Median (P50)**: $\le \pm 1.2\%$ deviation vs 10,000 CMC (observed: 0.12%).
  - **Spread (P10 / P90)**: $\le \pm 2.5\%$ deviation vs 10,000 CMC (observed: 0.33% - 0.45%).
  - **Extreme Tail (P99+)**: For rare catastrophe risk (50-year return events), analytical Gumbel inverse CDF tail evaluation is coupled to prevent undersampling.
- **Compute Speedup Nuance & Dimensional Scaling**:
  - For a 1D distribution, raw wall-clock speedup is **$9.6\times$** ($0.35\text{ ms}$ for $N=100$ LHS vs $3.35\text{ ms}$ for $N=10,000$ CMC).
  - While sample count is reduced by $100\times$, stratification, bin mapping, and uniform shuffle incur $\approx 10\times$ computational overhead per sample, resulting in a net $\approx 10\times$ wall-clock acceleration.
  - In higher-dimensional multivariate spaces ($d > 1$), stratified variance reduction intensifies as space-filling properties prevent clustering, but any specific numerical claim for $d$-dimensional speedup requires independent benchmark measurement per dimension.

### Tier 2: TypedArray Vectorization (`Float64Array` / `Float32Array`)
- Instead of allocating garbage-collected JavaScript objects for each timestep, all 15-minute arrays (irradiance, ambient temperature, wind, cell temperature, DC power) are stored in continuous flat memory buffers:
  ```typescript
  const irradianceBuffer = new Float32Array(35040);
  const cellTemp = new Float32Array(35040);
  const powerDc = new Float32Array(35040);
  ```
- Modern V8/JavaScript engines execute TypedArray loops with SIMD and auto-vectorization, yielding a 15–25x speedup over standard JavaScript arrays of objects.

### Tier 3: Adaptive Windowing & Representative Days Disaggregation
- Synthetic 15-minute disaggregation utilizes the **Skartveit-Olseth / Perez diffuse-fraction model** using clear-sky index $k_t$ over 12 representative monthly characteristic days (clear, partly cloudy, overcast) $\times$ 96 timesteps = 1,152 key timesteps.
- The resulting dynamic matrix is interpolated across the annual curve, completing in under **25 milliseconds**.
- **Statistical Nuance & Usage Boundary**:
  - The **Adaptive Representative Mode (1,152 steps)** is mathematically valid for *Annual Energy Yield ($P_{50}$ kWh)* and loss waterfall screening, where localized high-frequency transients average out.
  - For **Climate Resilience, Sub-Hourly Inverter Clipping, Ramping Stress, and Catastrophic Peak Event Analysis**, the **Full 35,040 Sub-Hourly Mode** is required to capture localized cloud transients, ramp rates ($\Delta P / \Delta t$), and thermal over-temperature spikes.
  - The UI defaults to Representative Mode for interactive design, with explicit toggle and indicator for the Full 35,040 Run.

### Tier 4: Zero-Blocking Web Worker Readiness & Architecture Segregation
- All computationally intensive modules (`multiphysicsEngine`, `climateResilienceEngine`, `civilGeotechnicalEngine`) are designed with pure, side-effect-free, serializable inputs and outputs conforming to the `SimulationKernel` interface.

---

## 3. Fallback Strategy & WebAssembly (WASM) / Server-Side Escalation

To guarantee responsive 60 FPS user experience across all client hardware, we enforce the following escalation ladder based on hard latency thresholds:

```
[UI Trigger: Parameter Change]
       │
       ▼
 [Main Thread V8 TypedArray] ──(< 50 ms)──► [Immediate UI Render]
       │
       │ (Execution > 50 ms)
       ▼
 [Dedicated Web Worker] ───────(< 200 ms)─► [Transferable ArrayBuffer postMessage]
       │
       │ (Execution > 200 ms or Complex 2D PDE)
       ▼
 [WebAssembly (WASM) Kernel] ──(< 80 ms)──► [Direct SharedArrayBuffer / SIMD]
       │
       │ (WASM unsupported or Mobile CPU throttling)
       ▼
 [Server-Side HPC Route] ─────────────────► [POST /api/simulate with gzip payload]
```

### 3.1 Kernel Interface Segregation (`SimulationKernel`)

The core numerical engine is isolated behind an abstract interface. The high-level UI tabs and financial engines consume this interface without knowing whether computation is executed in pure JS, Web Worker, WASM, or Server-Side:

```typescript
export interface SimulationKernel {
  readonly backendType: 'javascript_typed_array' | 'web_worker' | 'wasm_simd' | 'server_hpc';
  
  /** Evaluates coupled thermal-electrical model across 15-min or annual buffers */
  evaluateMultiphysics(
    inputBuffers: SimulationInputBuffers,
    options: MultiphysicsOptions
  ): Promise<SimulationOutputBuffers>;

  /** Runs stratified Latin Hypercube Sampling across stochastic distributions */
  evaluateProbabilisticRisk(
    variables: StochasticVariableDefinition[],
    sampleCount: number,
    seed: number
  ): Promise<LhsEvaluationResult>;
}
```

### 3.2 Time Budget Compliance

| Operation | Main Thread Target | Worker / WASM Fallback | Failure Timeout |
|---|---|---|---|
| Single 24h Hourly Pass | $< 8\text{ ms}$ | N/A | $50\text{ ms}$ |
| Sub-hourly 15-min Annual Matrix | $< 40\text{ ms}$ | $< 25\text{ ms}$ | $200\text{ ms}$ |
| 100-Sample LHS Multiphysics Run | $< 120\text{ ms}$ | $< 65\text{ ms}$ | $500\text{ ms}$ |
| Bishop 3D Slope Stability Iteration | $< 35\text{ ms}$ | $< 18\text{ ms}$ | $200\text{ ms}$ |

---

## 4. Benchmark Verification & Acceptance Criteria

1. **Deterministic Reproducibility**:
   - Seeded `Mulberry32PRNG` produces identical bit-for-bit results across all browsers, operating systems, and executions.
2. **Golden Benchmark Compliance**:
   - Must match Golden Benchmark Datasets within individual $\varepsilon$ tolerances ($\pm 1.5\%$ to $\pm 8.0\%$).
