---
title: "Appendix 01: System Architecture & C4 Diagrams"
document_type: "Technical Specification Appendix"
status: "APPROVED"
version: "1.0.0"
author: "Principal Software Architect & Senior Solar Energy Engineer"
date: "2023-10-19"
---

# Appendix 01: System Architecture & C4 Diagrams

## 1. Executive Summary & Tech Stack Justification

The next-generation Solar PV Design & Simulation Software is architected as an all-in-one, cross-platform (Windows Desktop & Android Mobile), EPC-grade engineering platform. It provides desktop-class performance for intensive 3D CAD modeling, ray-traced shading, and high-frequency energy yield calculations while ensuring full offline-first functionality for mobile field engineers.

### 1.1 Technology Stack Architecture Matrix

| Layer / Component | Technology Selected | Technical Justification |
| :--- | :--- | :--- |
| **Cross-Platform UI** | `.NET 8 MAUI` + `Blazor Hybrid` | Single C# codebase targeting Windows (WinUI 3) and Android (API 26+). Blazor Hybrid enables 100% web UI component reuse (using WebAssembly/Razor) across platforms, while MAUI native interop allows low-level access to device hardware, camera, GPS, and native window handles. |
| **3D Rendering & CAD View** | Native Direct3D 12 (Windows) / Vulkan & OpenGL ES 3.2 (Android) via Native MAUI View Handlers; `SkiaSharp` for 2D overlays | High-performance 3D canvas for handling heavy photogrammetry meshes (>1M polygons), terrain heightmaps, and real-time ray-traced GPU shading. Eliminates WebGL overhead on mobile hardware. |
| **Core Calculation Engine** | `Rust` (compiled to `.dll` / `.so` / `.a` via `UniFFI` / C FFI) | Provides memory safety, zero-cost abstractions, SIMD vectorization, and multi-threaded parallel execution for annual 8760-hour yield simulations and 3D shading ray-casting. Reused identically in local desktop client, mobile app, and backend cloud microservices. |
| **Cloud Backend Service** | `ASP.NET Core 8 Web API` + `gRPC` | High-throughput, enterprise-grade backend providing REST/OpenAPI 3.1 endpoints for web dashboards and gRPC for binary streaming of high-density simulation vector data. |
| **Primary Relational DB** | `PostgreSQL 16` (Cloud) / `SQLite 3` (Client Offline DB) | PostgreSQL provides ACID compliance for project configurations, user RBAC, BOM inventories, and financial models. SQLite running inside the mobile/desktop app enables complete offline CRUD capabilities. |
| **Time-Series DB** | `TimescaleDB` extension on PostgreSQL / `InfluxDB v3` | Optimized for sub-hourly meteorological irradiance data (GHI, DNI, DHI), 8760-hour annual simulation timeseries, and SCADA monitoring telemetry. |
| **In-Memory Cache & Queue**| `Redis 7.2` | Distributed caching of manufacturer datasheets, scraping session locks, and background execution job queue state (via `Hangfire` or `MassTransit`). |
| **Web Scraping Service** | Isolated Node.js Microservice with `Apify SDK` & `Playwright` | Dedicated background service that interfaces with Apify Actors (Tienda Solar, SolarTraders) with built-in proxies, rate limiting, anti-bot protection, and circuit breakers. |

---

## 2. C4 Architecture Diagrams

### 2.1 C4 Level 1: System Context Diagram

The following diagram illustrates how external users (Solar Engineers, Field Surveyors, Clients) and third-party services interact with the Solar PV Platform.

```mermaid
C4Context
    title System Context Diagram - Cross-Platform Solar PV Design Platform

    Person(engineer, "Solar Energy Engineer", "Designs C&I and Utility systems, performs 3D shading, electrical calculations, and financial modeling.")
    Person(field_tech, "Field Surveyor / Tech", "Performs offline site surveys on Android, captures rooftop photos, GPS bounds, and shading obstructions.")
    Person(client, "Client / Stakeholder", "Views project proposals, financial yield reports, and 3D interactive visualizations.")

    System(pv_system, "Solar PV Design & Simulation Platform", "Cross-platform desktop & mobile EPC-grade PV design, simulation, and financial analysis application.")

    System_Ext(solargis, "Meteonorm / Solargis / NASA POWER API", "Provides satellite meteorological irradiance (GHI, DNI, DHI, temp, wind).")
    System_Ext(pvfree, "PVFree / CEC Database API", "Provides standardized module and inverter parameter databases (Sandia / CEC models).")
    System_Ext(apify, "Apify Scraping Network", "Executes automated scrapers for distributor inventory, live pricing, and stock levels.")
    System_Ext(gis_server, "GIS Tile Servers (Google Maps / Esri / USGS)", "Delivers high-resolution satellite imagery, LiDAR point clouds, and elevation models.")

    Rel(engineer, pv_system, "Designs systems, runs 3D simulations, generates reports", "GUI / Desktop app")
    Rel(field_tech, pv_system, "Captures field site surveys, syncs offline data", "Mobile app (Android)")
    Rel(client, pv_system, "Views PDF reports and web portal summaries", "Web / PDF")

    Rel(pv_system, solargis, "Fetches weather & irradiance data", "HTTPS / REST")
    Rel(pv_system, pvfree, "Queries panel & inverter specs", "HTTPS / REST")
    Rel(pv_system, apify, "Triggers pricing scrapers & fetches catalogs", "HTTPS / REST")
    Rel(pv_system, gis_server, "Downloads map tiles & elevation data", "HTTPS / WMS")
```

---

### 2.2 C4 Level 2: Container Diagram

The Container Diagram details the internal architectural boundary of the platform across Client (Desktop/Mobile) and Cloud Backend environments.

```mermaid
C4Container
    title Container Diagram - Solar PV Platform Architectural Layout

    System_Boundary(client_app, "Cross-Platform Native App (Windows & Android)") {
        Container(blazor_ui, "Blazor Hybrid UI", ".NET 8 MAUI / Razor", "Renders modern, responsive HTML/CSS UI components, dashboards, wizards, and forms.")
        Container(native_3d, "3D Cad Engine View", "Direct3D 12 / Vulkan / SkiaSharp", "Native platform window rendering 3D scene, obstacle extrusion, panel layouts, and GPU shadow maps.")
        ContainerDb(sqlite_db, "Local Offline DB", "SQLite 3 + EF Core / Sqlite-net", "Stores offline project data, cached datasheets, local spatial geometry, and sync outbox queue.")
        Container(rust_local, "Embedded Calculation Engine", "Rust Native Binary (FFI)", "Performs offline electrical sizing, 3D ray-traced shading, and annual yield simulations directly on device.")
        Container(sync_agent, "Offline Sync Manager", "C# Background Service", "Handles conflict-free bidirectional sync with cloud database via CRDT / Outbox pattern.")
    }

    System_Boundary(cloud_backend, "Cloud Microservices Backend (AWS / Azure)") {
        Container(api_gateway, "API Gateway / Reverse Proxy", "YARP / NGINX", "Handles TLS termination, JWT validation, rate limiting, and route distribution.")
        Container(core_api, "Core Application API", "ASP.NET Core 8 Web API", "Business logic, project lifecycle, user management, BOM generation, and financial calculations.")
        Container(sim_service, "High-Performance Compute Service", "ASP.NET Core gRPC + Rust Engine", "Executes multi-threaded, parallelized cloud simulations for complex 100MW+ utility solar farms.")
        Container(scraper_svc, "Integrated Scraping Engine", "Node.js + Apify SDK", "Executes headless browsers to extract live component pricing from e-commerce platforms.")
        
        ContainerDb(postgres_db, "Relational Database", "PostgreSQL 16", "Primary transactional database for users, orgs, projects, BOM, and financial parameters.")
        ContainerDb(timescale_db, "Time-Series Database", "TimescaleDB", "Stores sub-hourly solar irradiance profiles, 8760 simulation vectors, and SCADA data.")
        ContainerDb(redis_cache, "Cache & Queue", "Redis 7.2", "Caches external API responses, session tokens, and async job queues.")
    }

    Rel(blazor_ui, rust_local, "Invokes local calculations", "In-Process C FFI")
    Rel(blazor_ui, sqlite_db, "Reads/Writes offline state", "EF Core")
    Rel(sync_agent, api_gateway, "Synchronizes pending offline outbox", "HTTPS / gRPC")
    Rel(blazor_ui, api_gateway, "API calls when online", "HTTPS / REST / WebSocket")
    
    Rel(api_gateway, core_api, "Routes HTTP requests", "HTTP/2")
    Rel(core_api, sim_service, "Offloads heavy utility simulations", "gRPC")
    Rel(core_api, scraper_svc, "Triggers price update jobs", "gRPC / AMQP")

    Rel(core_api, postgres_db, "CRUD operations", "Npgsql / EF Core")
    Rel(sim_service, timescale_db, "Writes 8760 timeseries results", "SQL / Copy Protocol")
    Rel(core_api, redis_cache, "Caches session & queries", "RESP")
```

---

### 2.3 C4 Level 3: Component Diagram (Core Calculation Engine)

This diagram focuses on the Rust Core Calculation Engine and how its constituent sub-modules process inputs to generate engineering outputs.

```mermaid
C4Component
    title Component Diagram - Rust Calculation Core (In-Process & Cloud)

    Container_Boundary(rust_engine, "Rust Core Calculation Engine (libpv_engine)") {
        Component(ffi_wrapper, "UniFFI / C Interop Layer", "Rust FFI", "Exposes C-compatible exports and C# P/Invoke bindings for cross-language invocation.")
        Component(electrical_mod, "Electrical Engineering Module", "Rust", "IEC 60364 / IEC 62548 cable sizing, voltage drop, SPD, string matching, and fuse sizing.")
        Component(shading_mod, "3D GPU Shading Engine", "Rust + wgpu / Vulkan / Metal", "Builds BVH (Bounding Volume Hierarchy) acceleration structures, performs GPU ray-casting for hourly horizon/near-object shading.")
        Component(yield_mod, "Irradiance & Yield Engine", "Rust", "Implements Perez/Perez transposition, Sandia SAPM, CEC inverter efficiency, degradation, and loss tree math.")
        Component(structural_mod, "Structural Load Module", "Rust", "Calculates ASCE 7 / Eurocode 1 wind pressure, dead loads, snow accumulation, and ballast/anchor requirements.")
        Component(financial_mod, "Financial & LCOE Engine", "Rust", "Calculates 25-year cash flows, NPV, IRR, LCOE, tax depreciation (MACRS), and debt service coverage ratios.")
        Component(battery_mod, "Off-Grid & BESS Module", "Rust", "Sizes battery banks, depth-of-discharge, days of autonomy, charge controller MPPT tracking, and generator backup dispatch.")
    }

    Rel(ffi_wrapper, electrical_mod, "Dispatches electrical inputs")
    Rel(ffi_wrapper, shading_mod, "Dispatches 3D scene & lat/long")
    Rel(ffi_wrapper, yield_mod, "Dispatches weather timeseries & array config")
    Rel(ffi_wrapper, structural_mod, "Dispatches site geometry & wind zones")
    Rel(ffi_wrapper, financial_mod, "Dispatches CAPEX, OPEX, & tariff structures")
    Rel(ffi_wrapper, battery_mod, "Dispatches load profile & autonomy requirements")

    Rel(shading_mod, yield_mod, "Passes hourly shading loss factors")
    Rel(electrical_mod, yield_mod, "Passes Ohmic loss percentages (DC/AC cables)")
```

---

### 2.4 C4 Level 4: Deployment Diagram

```mermaid
C4Deployment
    title Deployment Architecture Diagram

    Deployment_Node(win_env, "Windows Workstation", "Windows 11 x64") {
        Deployment_Node(win_app, "Desktop Client", ".NET MAUI Executable") {
            Container(desktop_binary, "PVDesignStudio.exe", "Blazor Hybrid + WinUI 3 + Embedded Rust DLL")
        }
    }

    Deployment_Node(android_env, "Field Tablet / Smartphone", "Android 10+ (ARM64)") {
        Deployment_Node(android_app, "Mobile Client", "Android APK / AAB") {
            Container(mobile_binary, "PVDesignStudio.apk", "Blazor Hybrid + MAUI Android + Embedded Rust .so")
        }
    }

    Deployment_Node(cloud_cluster, "Kubernetes Cloud Cluster (AWS EKS / Azure AKS)", "Kubernetes v1.28") {
        Deployment_Node(api_pod, "API Microservice Pods", "Auto-scaling Deployment") {
            Container(api_cont, "ASP.NET Core Gateway & API", "Linux Container (.NET 8)")
        }
        Deployment_Node(sim_pod, "HPC Simulation Pods", "GPU-Enabled Compute Nodes (NVIDIA Tesla / T4)") {
            Container(sim_cont, "Rust Compute Microservice", "Linux Container (gRPC Server + CUDA / Vulkan)")
        }
        Deployment_Node(db_cluster, "Managed Database Cluster", "Multi-AZ High Availability") {
            ContainerDb(pg_master, "PostgreSQL 16 + TimescaleDB Primary", "Database Engine")
            ContainerDb(pg_replica, "PostgreSQL Read Replica", "Read-Only Replica")
        }
    }

    Rel(desktop_binary, api_cont, "REST / gRPC over TLS 1.3", "Internet")
    Rel(mobile_binary, api_cont, "REST / gRPC over TLS 1.3", "4G/5G / WiFi")
    Rel(api_cont, sim_cont, "Internal gRPC", "Cluster Network")
    Rel(api_cont, pg_master, "Read/Write SQL", "Private Subnet")
    Rel(sim_cont, pg_replica, "Write 8760 simulation results", "Private Subnet")
```

---

## 3. Offline-First Synchronization Architecture

Field engineers operating in remote regions must be able to perform site surveys, capture obstacle dimensions, define array boundaries, select components, run local shading/yield estimates, and capture photos without an active internet connection.

### 3.1 SQLite Local Schema & Hybrid Outbox Sync Pattern

1. **Local State Persistence**: All application state on desktop and mobile is written locally to an SQLite database managed via Entity Framework Core and `sqlite-net`.
2. **Transactional Outbox Queue**: When offline modifications occur (e.g., project update, component addition, site photo capture), an entry is appended to the `OfflineOutbox` queue table within a single local database transaction.
3. **Optimistic Concurrency Control (OCC) with Vector Clocks**: Every synced entity contains a `version_vector` (JSON dictionary mapping `client_id` to monotonic integer `sequence_number`) and a `server_updated_at` timestamp.

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Field Surveyor (Android App)
    participant LocalDB as Client SQLite DB
    participant SyncAgent as Client Sync Manager
    participant CloudAPI as Cloud API Gateway
    participant CloudDB as Cloud PostgreSQL DB

    Note over Tech, LocalDB: Device is Offline
    Tech->>LocalDB: Update Project Layout & Add Array Bounds
    LocalDB->>LocalDB: Save Entity Changes (IsSynced = false)
    LocalDB->>LocalDB: Append to Local `OfflineOutbox` Queue Table

    Note over SyncAgent, CloudAPI: Network Connection Restored
    SyncAgent->>LocalDB: Poll `OfflineOutbox` for unsynced changes
    LocalDB-->>SyncAgent: Return batch of 50 Outbox events
    SyncAgent->>CloudAPI: POST /api/v1/sync/push (Batch payload + Vector Clocks)
    
    CloudAPI->>CloudDB: Verify entity versions & detect conflicts
    alt No Conflict Detected
        CloudDB->>CloudDB: Apply updates & increment global server sequence
        CloudDB-->>CloudAPI: Success Response
        CloudAPI-->>SyncAgent: HTTP 200 OK (Sync ACK + Server Vector Clocks)
        SyncAgent->>LocalDB: Mark `OfflineOutbox` entries as Synced & Purge
    else Conflict Detected (Concurrent edits on Server & Client)
        CloudDB-->>CloudAPI: Conflict Matrix (Server state vs Client state)
        CloudAPI-->>SyncAgent: HTTP 409 Conflict + Field-level Delta Payload
        SyncAgent->>SyncAgent: Execute CRDT Conflict Resolution (LWW / Operational Merge)
        SyncAgent->>LocalDB: Update LocalDB with Resolved State
        SyncAgent->>CloudAPI: POST /api/v1/sync/resolve (Ack Resolution)
    end
```

### 3.2 Conflict Resolution Policy

| Entity Type | Conflict Resolution Rule | Description |
| :--- | :--- | :--- |
| **Site Survey Photos / Attachments** | Append / Union | Photos captured offline are never overwritten. Filename uses UUIDv4 + Timestamp. |
| **3D Geometry / Array Layouts** | Last-Write-Wins (LWW) by Timestamp | Resolved using the highest UTC timestamp. If modified by both simultaneously, a design scenario branch (e.g., `Scenario_Survey_Sync_1`) is auto-created. |
| **BOM / Component Selections** | Last-Write-Wins (Field Level) | Field-level delta merging. If Client A changed Panel model and Client B changed Cable length, both modifications are preserved. |
| **Financial Parameters** | Server Deterministic Win | Financial tax parameters, tariff rates, and discount factors updated by office admins supersede field edits. |

---

## 4. Security Architecture & RBAC Matrix

### 4.1 Authentication & Transport Security
* **Authentication Standard**: OpenID Connect (OIDC) & OAuth 2.0 framework integrated with IdentityServer / Auth0 / Azure AD B2C.
* **Token Management**:
  * **Access Token**: Short-lived JWT (15-minute validity) signed using RS256 / Ed25519.
  * **Refresh Token**: Long-lived sliding window token (30 days) stored securely in `Windows Credential Manager` (Desktop) and `Android KeyStore / EncryptedSharedPreferences` (Mobile).
* **Data Encryption**:
  * **In Transit**: TLS 1.3 enforced across all REST and gRPC channels with TLS Certificate Pinning implemented in mobile APKs.
  * **At Rest**: SQLCipher (AES-256-GCM) for local SQLite client database encryption; AWS KMS / Azure Key Vault managed keys for server PostgreSQL disks.

### 4.2 Role-Based Access Control (RBAC) Matrix

| Permission / Functionality | Administrator | Principal Solar Engineer | Field Surveyor | Procurement Manager | Client / Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage Users & Org Settings** | **Full** | Read Only | No Access | No Access | No Access |
| **Create/Edit 3D CAD Sites** | **Full** | **Full** | **Full** | Read Only | Read Only |
| **Run Yield & Shading Simulations**| **Full** | **Full** | Basic (Presets) | No Access | Read Only |
| **Modify Electrical / Standards Config**| **Full** | **Full** | No Access | No Access | No Access |
| **Execute Component Scraper & Pricing**| **Full** | **Full** | No Access | **Full** | No Access |
| **Approve Financial Model & BOM** | **Full** | **Full** | No Access | Edit BOM Costs | Read Only |
| **Export Official EPC PDF Reports**| **Full** | **Full** | Draft Only | Draft Only | Download Final |
| **Purge / Delete Projects** | **Full** | Soft Delete | No Access | No Access | No Access |

---

## 5. System Sequence Diagrams

### 5.1 Project Creation & Component Scraping Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Engineer as Solar Engineer
    participant UI as Blazor Hybrid UI
    participant CoreAPI as ASP.NET Core API
    participant Scraper as Apify Scraping Microservice
    participant Vendor as SolarTraders / External Vendor
    participant DB as PostgreSQL DB

    Engineer->>UI: Select "New Project" & Search Component ("Jinko 575W")
    UI->>CoreAPI: GET /api/v1/components/search?q=Jinko+575W
    CoreAPI->>DB: Query local catalog DB
    alt Catalog match found and price fresh (< 24h)
        DB-->>CoreAPI: Return cached component parameters & pricing
    else Price stale or component missing
        CoreAPI->>Scraper: Trigger Scraper Job (Vendor="SolarTraders", Model="Jinko 575W")
        Scraper->>Vendor: Execute Headless Scraper / API query
        Vendor-->>Scraper: Return HTML/JSON Datasheet & Live Price
        Scraper->>Scraper: Parse parameters (Pmp, Vmp, Imp, Voc, Isc, TempCoeffs)
        Scraper-->>CoreAPI: Return parsed datasheet schema
        CoreAPI->>DB: Upsert component & price log entry
    end
    CoreAPI-->>UI: Return component specification payload
    UI-->>Engineer: Render live datasheet card & stock availability
```

### 5.2 Simulation & Report Generation Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Engineer as Solar Engineer
    participant UI as Blazor UI / Rust FFI
    participant gRPC as gRPC Compute Microservice
    participant RustEngine as Rust Calculation Core
    participant Timescale as TimescaleDB
    participant PDFGen as PDF Report Engine

    Engineer->>UI: Click "Run Annual Yield Simulation"
    alt Execution Mode == Local Desktop / Mobile
        UI->>RustEngine: Direct C FFI Invocation (`run_simulation_ffi`)
        RustEngine->>RustEngine: Execute 8760 hourly transposition & loss calculations
        RustEngine-->>UI: Return SimulationResults struct (< 500ms)
    else Execution Mode == Cloud Cloud HPC (Utility Scale)
        UI->>gRPC: gRPC `ExecuteSimulationStream(SimulationRequest)`
        gRPC->>RustEngine: Parallel ray-casting & yield threadpool
        RustEngine->>Timescale: Bulk insert 8760 hourly time-series
        RustEngine-->>gRPC: Stream progress ticks & final result
        gRPC-->>UI: Stream completed results
    end
    UI-->>Engineer: Display dynamic yield graphs, loss tree, LCOE
    Engineer->>UI: Click "Export EPC PDF Report"
    UI->>PDFGen: Render Razor View to PDF (SkiaSharp / QuestPDF)
    PDFGen-->>UI: Return PDF Byte Stream
    UI-->>Engineer: Open/Save Printable EPC Report
```
