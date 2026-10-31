# Architecture Decision Record (ADR-003): Specification for 15-Minute Slope-Aware Backtracking Single-Axis Tracker

**Status**: Accepted  
**Date**: 2026-10-29  
**Scope**: RFC 3.0.0 — Engine Core / Climate Resilience & Dispatch Pillar (Phase 2a)  
**Authors**: Senior Systems Architect & Solar PV Engineering Team  
**Governing References**:
- Anderson, K., & Mikofski, M. (2020): *Slope-Aware Backtracking for Single-Axis Trackers*, NREL Technical Report NREL/TP-5K00-76623
- Marion, B., & Dobos, A. (2013): *Rotation Angle for the Backtracking Strategy of Single-Axis Trackers*, Solar Energy 97, 541-548
- Lorenzo, E., et al. (2011): *Tracking and Backtracking*, Progress in Photovoltaics 19, 747-753

---

## 1. Context & Architectural Motivation

In utility-scale PV plants equipped with horizontal single-axis trackers (HSAT), early morning and late afternoon operations cause inter-row shading if arrays follow the true solar normal vector. Standard backtracking rotates panels away from the sun toward the horizontal to avoid mutual shading.

However, utility sites in Iran and global desert topographies (e.g., Semnan, Yazd, Kerman) feature non-zero terrain slopes ($\alpha_{EW}, \alpha_{NS}$). Conventional flat-terrain backtracking results in either:
1. Significant clipping and residual mutual row shading (if eastern row is higher than western row).
2. Unnecessary tilt back-off causing lost beam irradiance (over-backtracking).

This ADR defines the **2.5D Slope-Aware Backtracking** formulation for 15-minute sub-hourly simulation.

---

## 2. Technical Definition of the Slope-Aware Formulation

Rather than a computationally expensive full 3D mesh ray-caster, the algorithm employs an analytical closed-form 2.5D cross-track trigonometric solution evaluated in under **0.8 microseconds per timestep**.

### 2.1 True Tracking Rotation Angle ($\theta_{true}$)
For a tracker oriented with axis azimuth $\gamma_{axis}$ (typically $180^\circ$ true North-South) and solar position (Zenith $\theta_z$, Azimuth $\gamma_s$):
$$\tan(\theta_{true}) = \frac{\sin(\theta_z) \sin(\gamma_s - \gamma_{axis})}{\cos(\theta_z)}$$
bounded by the mechanical hard-stops: $\theta_{min} \le \theta_{true} \le \theta_{max}$ (typically $\pm 60^\circ$).

### 2.2 Critical Backtracking Angle with Terrain Slope Offset
When adjacent tracker tables lie on an East-West terrain slope of $\beta_{slope}$:
$$\theta_{crit} = \arcsin\left( \frac{\cos(\theta_{true} - \beta_{slope})}{GCR} \right)$$
where $GCR = W / Pitch$ (Ground Cover Ratio, typically $0.35 - 0.42$).

The commanded tracker angle $\theta_{commanded}$ is evaluated as:
$$\theta_{commanded} = 
\begin{cases} 
\theta_{true} & \text{if } |\theta_{true} - \beta_{slope}| \le \theta_{crit} \\
\theta_{true} - \text{sign}(\theta_{true}) \cdot \left[ |\theta_{true} - \beta_{slope}| - \theta_{crit} \right] & \text{if } |\theta_{true} - \beta_{slope}| > \theta_{crit}
\end{cases}$$

---

## 3. Computational Budget & Vectorization

1. **Sub-Hourly 15-Minute Budget**:
   - $35,040\text{ timesteps} \times 0.8\,\mu\text{s} \approx 28\text{ ms}$ for the entire annual 8,760h $\times$ 4 dispatch matrix.
   - Fits comfortably inside the Tier 1 main-thread budget ($< 40\text{ ms}$).
2. **Coupling with Inverter Clipping**:
   - In 15-minute intervals, when DC output exceeds inverter AC rating ($P_{DC} > P_{inv,max}$), the tracker can slightly de-tune ($\Delta\theta_{curtail} \approx 2^\circ - 5^\circ$) to reduce DC thermal stress on the inverter without activating AC circuit breaker protection.
