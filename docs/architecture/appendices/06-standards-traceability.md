---
title: "Appendix 06: Standards Traceability Matrix"
document_type: "Technical Specification Appendix"
status: "APPROVED"
version: "1.0.0"
author: "Principal Software Architect & Senior Solar Energy Engineer"
date: "2023-10-19"
---

# Appendix 06: Standards Traceability Matrix

## 1. Traceability Architecture

This matrix provides strict end-to-end traceability mapping product design requirements and functionality to system implementation modules, international engineering standards (IEC, IEEE, ASCE, Eurocode), verification test vectors, and acceptance criteria.

---

## 2. Comprehensive Traceability Matrix Table

| Requirement ID | Requirement Description | System Implementation Module | Normative Standard & Clause Reference | Verification Test Vector / Method | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ELEC-01** | DC Cable Sizing & Current Capacity | `Rust Engine::ElectricalModule::size_dc_cable` | **IEC 60364-5-52** Table B.52.14 & **IEC 62548** Cl. 8.2 | Test Vector 01 (`04-calculation-formulas.md`) | Conductor capacity $I_z \ge 1.25 \times I_{sc,STC}$ after applying derating factors $k_1, k_2, k_3$. |
| **REQ-ELEC-02** | DC Voltage Drop Limitation | `Rust Engine::ElectricalModule::calc_voltage_drop` | **IEC 62548** Cl. 8.2.3 | Automated Unit Test `test_dc_vdrop_calc` | Calculated voltage drop $\Delta V_{\%} \le 1.5\%$ for string cables under full load $I_{mp}$. |
| **REQ-ELEC-03** | String Overcurrent Fuse Sizing | `Rust Engine::ElectricalModule::select_string_fuse` | **IEC 62548** Cl. 9.3 | Automated Unit Test `test_fuse_rating_bounds` | Nominal fuse rating satisfies $1.5 \times I_{sc} \le I_{gRM} \le \min(2.4 I_{sc}, I_{MOD\_MAX\_FUSE})$. |
| **REQ-ELEC-04** | Surge Protection Device Selection | `Rust Engine::ElectricalModule::select_spd` | **IEC 61643-32** Cl. 6 & **IEC 62305** | Rule-Based Validation Test | SPD $U_{cpv} \ge 1.2 \times V_{oc,max}$. Type 1 selected if structural LPS present. |
| **REQ-ELEC-05** | Maximum DC Voltage Calculation | `Rust Engine::ElectricalModule::calc_voc_max` | **IEC 62548** Cl. 7.3.1 | Automated Cold Temp Test Vector | String $V_{oc,max}$ evaluated at site $T_{min}$ does not exceed inverter maximum input voltage. |
| **REQ-ELEC-06** | Earthing Resistance Calculation | `Rust Engine::ElectricalModule::calc_earth_grid` | **IEC 60364-5-54** Cl. 542 & **IEEE 80** | Analytical Soil Resistance Test | Calculated earth resistance $R_E \le 10.0\,\Omega$. |
| **REQ-ELEC-07** | Lightning Risk Assessment | `Rust Engine::ElectricalModule::assess_lightning_risk`| **IEC 62305-2** Cl. 5 & 6 | Direct Flash Density Calculation | Flags mandatory LPS Air Termination System when direct flash risk $R > 10^{-5}$ strikes/year. |
| **REQ-ELEC-08** | Grid Interconnection Ride-Through | `Rust Engine::ElectricalModule::check_grid_compliance`| **IEEE 1547-2018** Cl. 6.4 / **IEC 61727** | Voltage/Frequency Trip Curve Test | Inverter disconnect times match IEEE 1547 OV1/OV2 & UV1/UV2 cleared time thresholds. |
| **REQ-YIELD-01**| POA Irradiance Transposition | `Rust Engine::YieldModule::transpose_perez` | Perez et al. (1990) Anisotropic Model | Test Vector 02 (`04-calculation-formulas.md`) | Calculated $E_{POA}$ matches Perez model within $\pm 0.5\%$ against NREL SAM benchmarks. |
| **REQ-YIELD-02**| 3D GPU Ray-Traced Shading | `Rust Engine::ShadingModule::raytrace_bvh` | Standard Geometric Optics & Ray Tracing | Benchmark CAD Model Ray Test | GPU BVH ray-caster calculates hourly shading factor for 100k panels in $< 200\,ms$. |
| **REQ-YIELD-03**| Inverter AC Yield & Clipping | `Rust Engine::YieldModule::calc_ac_power` | Sandia SAPM Inverter Model / CEC | Automated Clipping Test | AC output clipped precisely at $P_{ac,max}$; clipping losses segregated in loss diagram. |
| **REQ-STRUCT-01**| Ultimate Wind Load Pressure | `Rust Engine::StructuralModule::calc_wind_pressure`| **ASCE 7-16** Ch. 29 & **Eurocode 1 EN 1991-1-4** | Structural Pressure Vector Test | Velocity pressure $q_z$ matches ASCE 7-16 formula considering exposure $K_z$ & altitude $K_e$. |
| **REQ-STRUCT-02**| Flat Roof Ballast Mass Sizing | `Rust Engine::StructuralModule::size_ballast` | **ASCE 7-16** / Building Code Requirements | Overturning & Sliding SF Test | Ballast mass achieves Safety Factor $SF_{overturning} \ge 1.5$ and $SF_{sliding} \ge 1.5$. |
| **REQ-FIN-01**  | Financial Metrics (NPV, IRR, LCOE)| `Rust Engine::FinancialModule::compute_kpis` | International Financial Accounting Standards | Test Vector 03 (`04-calculation-formulas.md`) | LCOE, NPV, and IRR match discount cashflow formulas with $100\%$ precision against Excel financial models. |
| **REQ-FIN-02**  | Automated Bill of Materials | `ASP.NET Core API::BOMService::generate_bom` | EPC Procurement Engineering Standards | Automated Inventory Aggregation Test| BOM lists exact panel count, inverter count, cable lengths $[m]$, fuse counts, and structural racking weight. |
| **REQ-BESS-01** | Off-Grid Battery Sizing | `Rust Engine::BESSModule::size_battery_bank` | **IEEE 1562** (*Design of Standalone PV Systems*) | Daily Load Autonomy Profile Test | Battery capacity $C_{kwh}$ meets specified days of autonomy without exceeding maximum $DOD$. |
| **REQ-ARCH-01** | Offline Operation & Sync | `Client::SyncAgent` + `SQLite Outbox` | Operational CRDT / Transactional Outbox | Simulated Airplane Mode Offline Test | 100% full CRUD operation available offline; zero data loss upon reconnecting & sinking outbox. |
| **REQ-ARCH-02** | Role-Based Access Control | `ASP.NET Core Gateway::RBACMiddleware` | **OAuth 2.0 / OIDC** Standards | Security Auth Test Matrix | Denies unauthorized access to component price scraping and financial approval endpoints per RBAC matrix. |
