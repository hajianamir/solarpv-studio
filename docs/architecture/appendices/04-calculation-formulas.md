---
title: "Appendix 04: Calculation Formulas & Engineering Modules Specification"
document_type: "Technical Specification Appendix"
status: "APPROVED"
version: "1.0.0"
author: "Principal Software Architect & Senior Solar Energy Engineer"
date: "2023-10-19"
---

# Appendix 04: Calculation Formulas & Engineering Modules Specification

## 1. Electrical Engineering Module (IEC & IEEE Standards)

All electrical sizing, protection selection, cable dimensioning, and voltage drop calculations in the Rust core engine strictly adhere to international electrotechnical standards: **IEC 60364** (*Low-voltage electrical installations*), **IEC 62548** (*Photovoltaic (PV) arrays - Design requirements*), **IEC 62305** (*Protection against lightning*), and **IEEE 1547** (*Interconnection and Interoperability of Distributed Energy Resources*).

---

### 1.1 DC Cable Cross-Section Sizing & Voltage Drop (IEC 60364-5-52 & IEC 62548 Cl. 8.2)

#### 1.1.1 Temperature-Corrected Open-Circuit Voltage ($V_{oc,max}$)
To prevent inverter DC over-voltage damage during extreme cold conditions, the maximum array open-circuit voltage is evaluated at the site's minimum design ambient temperature ($T_{min}$):

$$V_{oc,max} = N_s \times V_{oc,STC} \times \left[ 1 + \frac{\gamma_{Voc}}{100} \times (T_{min} - 25) \right]$$

*Where:*
* $N_s$: Number of PV modules connected in series per string.
* $V_{oc,STC}$: Module open-circuit voltage at STC ($25^\circ C$) $[V]$.
* $\gamma_{Voc}$: Temperature coefficient of open-circuit voltage $[\%/^\circ C]$ ($\gamma_{Voc} < 0$).
* $T_{min}$: Minimum historical ambient temperature recorded at the site $[^\circ C]$.

*Constraint Checklist:*
$$V_{oc,max} \le \min\left( V_{DC,max}^{Inverter}, V_{DC,max}^{Module\_Insulation} \right)$$

---

#### 1.1.2 Current-Carrying Capacity ($I_z$) & Derating Factors
The design continuous current for DC string conductors ($I_{max,string}$) and main DC array cables ($I_{max,array}$) includes the standard solar irradiance factor ($1.25$) per IEC 62548 Clause 8.2:

$$I_{max,string} = 1.25 \times I_{sc,STC}$$

$$I_{max,array} = 1.25 \times N_p \times I_{sc,STC}$$

*Where:*
* $N_p$: Number of parallel strings connected to the DC busbar or MPPT channel.
* $I_{sc,STC}$: Module short-circuit current at STC $[A]$.

To determine the minimum required current-carrying capacity ($I_z$) of the candidate cable under installation conditions:

$$I_z = \frac{I_n}{k_1 \times k_2 \times k_3}$$

*Where:*
* $I_n$: Nominal protective device rating or design current $I_{max}$ $[A]$.
* $k_1$: Ambient temperature correction factor per IEC 60364-5-52 Table B.52.14:
  $$k_1 = \sqrt{\frac{T_{max,conductor} - T_{ambient}}{T_{max,conductor} - 30}}$$
* $k_2$: Cable grouping/bundling reduction factor per IEC 60364-5-52 Table B.52.17.
* $k_3$: Installation method factor (e.g., in conduit, direct buried, tray).

---

#### 1.1.3 DC Voltage Drop & Cross-Section Calculation
The cross-sectional conductor area $A_{min}$ $[mm^2]$ required to maintain the percentage voltage drop below the user threshold $\Delta V_{\%}$ (typically $\le 1.5\%$ for DC strings and $\le 1.0\%$ for main DC feeders) is derived as:

$$\Delta V_{volts} = \frac{2 \times L \times I_{mp} \times \cos\phi}{\gamma \times A}$$

$$A_{min} = \frac{2 \times L \times I_{mp}}{\gamma \times \left( \frac{\Delta V_{\%}}{100} \times V_{mp,string} \right)}$$

*Where:*
* $L$: One-way conductor route length $[m]$.
* $I_{mp}$: String current at maximum power point $[A]$.
* $V_{mp,string}$: String voltage at maximum power point ($N_s \times V_{mp,STC}$) $[V]$.
* $\gamma$: Electrical conductivity of the conductor at maximum operating temperature $T_{op}$ $[m/(\Omega \cdot mm^2)]$:
  $$\gamma(T_{op}) = \frac{\gamma_{20}}{1 + \alpha_{20} \times (T_{op} - 20)}$$
  *(For Copper: $\gamma_{20} = 58.0$, $\alpha_{20} = 0.00393$; For Aluminum: $\gamma_{20} = 35.0$, $\alpha_{20} = 0.00403$).*

---

### 1.2 Overcurrent Protection & Surge Protection Sizing (IEC 62548 Cl. 9 & IEC 61643-32)

#### 1.2.1 String Overcurrent Fuse Sizing
String fuses are mandatory when $N_p \ge 3$ parallel strings are connected to a single MPPT or combiner box (to protect a faulted string from reverse current fed by the parallel strings).

The nominal string fuse rating $I_{gRM}$ must satisfy the dual condition per IEC 62548:

$$1.5 \times I_{sc,STC} \le I_{gRM} \le \min\left( 2.4 \times I_{sc,STC}, I_{MOD\_MAX\_FUSE} \right)$$

*Where $I_{MOD\_MAX\_FUSE}$ is the maximum series fuse rating specified on the PV module datasheet.*

---

#### 1.2.2 DC & AC Surge Protection Devices (SPD Selection per IEC 61643-32)
* **Maximum Continuous Operating Voltage ($U_{cpv}$)**:
  $$U_{cpv} \ge 1.2 \times V_{oc,max}$$
* **SPD Type Selection**:
  * **Type 1 / Class I** ($I_{imp} \ge 12.5\,kA\,10/350\,\mu s$): Mandatory if the building has an external Lightning Protection System (LPS) or if risk assessment per IEC 62305-2 requires it.
  * **Type 2 / Class II** ($I_n \ge 20\,kA\,8/20\,\mu s$, $I_{max} \ge 40\,kA$): Installed at the inverter DC/AC terminals when no external LPS is required and separation distance $s$ is maintained.

---

### 1.3 Earthing & Lightning Risk Assessment (IEC 62305-2 & IEC 60364-5-54)

#### 1.3.1 Earthing Conductor Resistance & Earth Electrode Sizing
The total earth resistance $R_E$ for a grid-tied PV installation must satisfy $R_E \le 10\,\Omega$ ($100\,\Omega$ in high resistivity soil with RCD protection).

For a buried horizontal ring conductor or driven rod earth electrode array:

$$R_{rod} = \frac{\rho}{2 \pi L_r} \times \ln\left( \frac{4 L_r}{d_r} \right)$$

$$R_{ring} = \frac{\rho}{\pi^2 D} \times \ln\left( \frac{8 D}{d_c} \right)$$

*Where:*
* $\rho$: Soil resistivity $[\Omega \cdot m]$ (e.g., moist clay = 50, dry sandstone = 1000).
* $L_r, d_r$: Earth rod length and diameter $[m]$.
* $D, d_c$: Earth ring diameter and conductor diameter $[m]$.

---

#### 1.3.2 IEC 62305 Lightning Risk Assessment Equation
The annual expected number of direct lightning strikes to the PV structure ($N_D$) is computed as:

$$N_D = N_g \times A_d \times C_d \times 10^{-6}$$

*Where:*
* $N_g$: Ground flash density $[flashes/km^2/year]$ (from meteorological maps).
* $A_d$: Equivalent collection area of the structure $[m^2]$:
  $$A_d = L \times W + 6 \times H \times (L + W) + 9 \pi H^2$$
* $C_d$: Environmental location factor (1.0 for isolated structure, 0.5 for surrounded structure, 0.25 for town center).

*Trigger Condition:* If Risk $R = N_D \times P_B \times C_L > R_T$ ($10^{-5}$ per year), a structural Lightning Protection System (LPS Air Termination Rods) is mandatory.

---

### 1.4 Grid Interconnection & Power Quality (IEEE 1547 / IEC 61727)

#### 1.4.1 Voltage & Frequency Ride-Through Tripping Curves (IEEE 1547-2018)
The software models automatic inverter disconnection or ride-through behavior based on grid voltage ($V$) and frequency ($f$) thresholds:

| Operating Region | Voltage Range ($\% V_{nom}$) | Minimum Clearing Time (Seconds) | Action |
| :--- | :--- | :--- | :--- |
| **Overvoltage 2 (OV2)** | $V > 120\%$ | 0.16 s | Mandatory Disconnect |
| **Overvoltage 1 (OV1)** | $110\% < V \le 120\%$ | 2.00 s | Mandatory Disconnect |
| **Normal Operation** | $88\% \le V \le 110\%$ | Continuous | Continuous Grid Injection |
| **Undervoltage 1 (UV1)**| $70\% \le V < 88\%$ | 2.00 s | Mandatory Ride-Through / Mandatory Trip |
| **Undervoltage 2 (UV2)**| $V < 50\%$ | 0.16 s | Mandatory Disconnect |

---

## 2. Energy Yield & Shading Calculation Engine

---

### 2.1 Plane-of-Array (POA) Irradiance Transposition (Perez Anisotropic Model)

Global Horizontal Irradiance ($GHI$), Direct Normal Irradiance ($DNI$), and Diffuse Horizontal Irradiance ($DHI$) are converted to total Plane-of-Array Irradiance ($E_{POA}$) for a panel tilted at angle $\beta$ and azimuth $\gamma$:

$$E_{POA} = E_{beam} + E_{diffuse} + E_{ground\_reflected}$$

#### 2.1.1 Beam Component
$$E_{beam} = DNI \times \cos(\theta)$$

*Where $\theta$ is the angle of incidence between the solar vector $\mathbf{\hat{S}}$ and the panel normal vector $\mathbf{\hat{N}}$:*
$$\cos(\theta) = \sin(\theta_s) \cos(\beta) + \cos(\theta_s) \sin(\beta) \cos(\gamma_s - \gamma)$$

#### 2.1.2 Perez Anisotropic Diffuse Component
$$E_{diffuse} = DHI \times \left[ (1 - F_1) \left( \frac{1 + \cos\beta}{2} \right) + F_1 \frac{a}{b} + F_2 \sin\beta \right]$$

*Where:*
* $F_1, F_2$: Perez circumsolar and horizon brightness coefficients derived from sky brightness ($\Delta$) and clearness ($\epsilon$).
* $a = \max(0, \cos\theta)$, $b = \max(\cos 85^\circ, \cos\theta_s)$.

#### 2.1.3 Ground Reflected Component
$$E_{ground\_reflected} = GHI \times \rho_{albedo} \times \left( \frac{1 - \cos\beta}{2} \right)$$

---

### 2.2 3D GPU Ray-Traced Shading Engine

The shading engine constructs a **Bounding Volume Hierarchy (BVH)** tree from site meshes (3D buildings, trees, terrain heightmaps, and adjacent PV module rows) in Rust using `wgpu` / Vulkan.

#### 2.2.1 Hourly Shading Factor Computation
For each array mesh surface element $i$ at hour $t$:

$$\Psi_{shading, i}(t) = \frac{\sum_{k=1}^{M} w_k \cdot \mathbb{I}\left( \text{Ray}(P_i, \mathbf{\hat{d}}_k) \text{ intersects Scene} \right)}{\sum_{k=1}^{M} w_k}$$

*Where:*
* $\mathbf{\hat{d}}_1$: Direct solar vector pointing to the sun center.
* $\mathbf{\hat{d}}_2 \dots \mathbf{\hat{d}}_M$: $M$ hemisphere sky dome sample vectors ($M = 256$) for diffuse sky shading.
* $\mathbb{I}(\cdot)$: Binary intersection function returning $1$ if occluded, $0$ if clear.

---

### 2.3 Photovoltaic Performance & Yield Equations (Sandia SAPM & CEC Model)

#### 2.3.1 Cell Temperature Model
$$T_{cell} = T_{ambient} + \frac{E_{POA}}{E_0} \times \exp(a + b \times WS) + \frac{E_{POA}}{E_0} \times \Delta T$$

*Where:*
* $E_0 = 1000\,W/m^2$.
* $WS$: Wind speed at 10m height $[m/s]$.
* $a, b, \Delta T$: Module mounting structure thermal parameters (e.g., open rack: $a = -3.47, b = -0.0594, \Delta T = 3^\circ C$).

#### 2.3.2 Temperature and Irradiance Corrected DC Power ($P_{dc}$)
$$P_{dc}(t) = N_{total} \times P_{mp,STC} \times \left( \frac{E_{POA,effective}(t)}{E_0} \right) \times \left[ 1 + \frac{\gamma_{Pmp}}{100} (T_{cell}(t) - 25) \right] \times \eta_{mismatch} \times \eta_{soiling}$$

#### 2.3.3 Inverter AC Power Output ($P_{ac}$) with Clipping (CEC Model)
$$P_{ac}(t) = \min\left( P_{ac,max}, \left[ \frac{P_{ac,nom}}{P_{dc,0} - P_{0}} - C_0 (P_{dc}(t) - P_{dc,0}) \right] \times (P_{dc}(t) - P_0) \right)$$

*Where $P_{dc,0}, P_0, C_0$ are Sandia Inverter empirical parameters.*

---

## 3. Structural & Mechanical Engineering Module

### 3.1 Wind & Snow Load Sizing (ASCE 7-16 & Eurocode 1 EN 1991-1-4)

#### 3.1.1 ASCE 7-16 Ultimate Wind Pressure ($q_z$)
The velocity pressure $q_z$ $[N/m^2]$ acting on the PV module array is computed as:

$$q_z = 0.613 \times K_z \times K_{zt} \times K_d \times K_e \times V^2$$

*Where:*
* $V$: Basic design wind speed $[m/s]$ (3-second gust).
* $K_z$: Velocity pressure exposure coefficient evaluated at array height $z$.
* $K_{zt}$: Topographic factor.
* $K_d$: Directionality factor ($0.85$ for solar panels).
* $K_e$: Elevation factor.

The design net wind force $F_{net}$ $[N]$ acting perpendicular to panel surface area $A_{panel}$:

$$F_{net} = q_z \times G \times (C_{p,net}) \times A_{panel}$$

*Where $C_{p,net}$ is the net pressure coefficient derived from wind tunnel tests for array tilt angle $\beta$ and roof edge proximity.*

---

### 3.2 Concrete Ballast & Anchor Foundation Calculations

For non-penetrating flat roof racking or ground-mount ballast blocks, the minimum required ballast mass $M_{ballast}$ $[kg]$ per racking leg to prevent sliding and overturning is derived using a safety factor $SF \ge 1.5$:

#### 3.2.1 Overturning Stability
$$M_{ballast, overturning} \ge \frac{SF_{overturning} \times F_{net} \times d_{wind} - M_{rack} \times g \times d_{cg}}{g \times d_{ballast}}$$

#### 3.2.2 Sliding Stability
$$M_{ballast, sliding} \ge \frac{SF_{sliding} \times F_{net} \cos(\beta)}{\mu_{friction}} + F_{net} \sin(\beta) - M_{rack}$$

*Where $\mu_{friction}$ is the coefficient of friction between roof membrane and rubber pad (typically $0.5 - 0.6$).*

---

## 4. Financial & EPC Analysis Module

### 4.1 Financial Metrics Formulas (NPV, IRR, LCOE, Payback)

#### 4.1.1 Net Present Value (NPV)
$$NPV = -CAPEX_0 + \sum_{t=1}^{N} \frac{CF_t - OPEX_t}{(1 + r)^t}$$

*Where:*
* $CAPEX_0$: Initial project capital expenditure $[USD]$.
* $CF_t$: Net revenue/savings in year $t = E_{yield}(t) \times Tariff(t) \times (1 - \delta)^t$.
* $OPEX_t$: Operational & maintenance expenditure in year $t$.
* $r$: Discount rate / Weighted Average Cost of Capital (WACC) $[\%]$.
* $\delta$: Annual panel degradation rate (e.g., $0.5\%/year$).
* $N$: Project lifetime ($25$ years).

#### 4.1.2 Internal Rate of Return (IRR)
IRR is the exact discount rate $r^*$ that solves:

$$0 = -CAPEX_0 + \sum_{t=1}^{N} \frac{CF_t - OPEX_t}{(1 + r^*)^t}$$

#### 4.1.3 Levelized Cost of Energy (LCOE)
$$LCOE = \frac{CAPEX_0 + \sum_{t=1}^{N} \frac{OPEX_t}{(1 + r)^t}}{\sum_{t=1}^{N} \frac{E_{yield,0} \times (1 - \delta)^t}{(1 + r)^t}}$$

---

## 5. Off-Grid & Battery Energy Storage System (BESS) Module

### 5.1 Battery Bank & Solar Array Sizing Algorithm

For off-grid standalone PV installations:

#### 5.1.1 Required Battery Storage Capacity ($C_{bess, kWh}$)
$$C_{bess, kWh} = \frac{E_{daily\_load\_kWh} \times N_{autonomy}}{\eta_{bess, roundtrip} \times DOD_{max} \times f_{temp}}$$

*Where:*
* $E_{daily\_load\_kWh}$: Total daily customer energy consumption $[kWh/day]$.
* $N_{autonomy}$: Required days of autonomy without solar irradiance (e.g., $2.5$ days).
* $DOD_{max}$: Maximum allowable depth of discharge (e.g., $80\%$ for LiFePO4, $50\%$ for Lead-Acid).
* $\eta_{bess, roundtrip}$: Battery round-trip efficiency (e.g., $95\%$ for LFP).
* $f_{temp}$: Temperature derating factor for low ambient operating temperatures.

#### 5.1.2 Required Off-Grid PV Array Capacity ($P_{pv, peak\_kW}$)
$$P_{pv, peak\_kW} = \frac{E_{daily\_load\_kWh}}{PSS_{worst\_month} \times \eta_{overall\_system}}$$

*Where $PSS_{worst\_month}$ is the worst-month design Peak Sun Hours $[hours/day]$ at the site.*

---

## 6. Comprehensive Calculation Validation Test Vectors

The Rust engine contains automated unit test suites compiled against benchmarked standard test vectors to guarantee mathematical precision.

### 6.1 Test Vector 01: DC Cable Sizing Verification (IEC 60364-5-52)
* **Inputs**:
  * String $V_{mp} = 650.0\,V$, $I_{mp} = 13.5\,A$, $I_{sc} = 14.2\,A$.
  * Route length $L = 45\,m$. Copper conductor ($\gamma = 56.0$).
  * Maximum allowable voltage drop $\Delta V_{\%} = 1.0\%$.
* **Expected Mathematical Outputs**:
  * Allowable $\Delta V_{volts} = 0.01 \times 650.0 = 6.50\,V$.
  * Minimum area $A_{calc} = \frac{2 \times 45 \times 13.5}{56.0 \times 6.50} = 3.335\,mm^2$.
  * **Selected Commercial Standard Conductor**: $4.0\,mm^2$ Solar Cable.
  * **Actual Voltage Drop**: $5.424\,V$ ($0.834\%$). Pass status: `PASS`.

---

### 6.2 Test Vector 02: Perez Irradiance Transposition
* **Inputs**:
  * $GHI = 750.0\,W/m^2$, $DNI = 820.0\,W/m^2$, $DHI = 120.0\,W/m^2$.
  * Solar Zenith $\theta_s = 35.0^\circ$, Solar Azimuth $\gamma_s = 180.0^\circ$.
  * Array Tilt $\beta = 30.0^\circ$, Array Azimuth $\gamma = 180.0^\circ$. Albedo $\rho = 0.20$.
* **Expected Mathematical Outputs**:
  * Angle of Incidence $\theta = 35.0^\circ - 30.0^\circ = 5.0^\circ$.
  * $E_{beam} = 820.0 \times \cos(5.0^\circ) = 816.88\,W/m^2$.
  * $E_{ground} = 750.0 \times 0.20 \times \left( \frac{1 - \cos 30^\circ}{2} \right) = 10.05\,W/m^2$.
  * Expected total $E_{POA\_Perez} = 952.4 \pm 1.0\,W/m^2$. Pass status: `PASS`.

---

### 6.3 Test Vector 03: Financial LCOE Verification
* **Inputs**:
  * $CAPEX_0 = \$250,000.00$. Annual $OPEX = \$3,500.00$.
  * Year 1 Yield $E_{yield,0} = 320,000\,kWh$. Panel degradation $\delta = 0.50\%/year$.
  * Discount Rate $r = 6.0\%$. Project lifetime $N = 25$ years.
* **Expected Mathematical Outputs**:
  * Present Value of Costs = $\$250,000 + \$44,741.80 = \$294,741.80$.
  * Present Value of Energy Production = $3,764,120.5\,kWh$.
  * **Calculated LCOE**: $\$0.078302 / kWh$ ($\mathbf{7.83\,\text{cents}/kWh}$). Pass status: `PASS`.
