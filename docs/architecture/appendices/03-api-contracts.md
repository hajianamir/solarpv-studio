---
title: "Appendix 03: API Contracts (OpenAPI 3.1 & gRPC Protocols)"
document_type: "Technical Specification Appendix"
status: "APPROVED"
version: "1.0.0"
author: "Principal Software Architect & Senior Solar Energy Engineer"
date: "2023-10-19"
---

# Appendix 03: API Contracts (OpenAPI 3.1 & gRPC Protocols)

## 1. RESTful OpenAPI 3.1 Specifications

The cloud API surface exposes standard RESTful HTTP JSON interfaces for project CRUD, spatial GIS data handling, component catalog lookup, pricing scraper invocation, and report downloads.

```yaml
openapi: 3.1.0
info:
  title: Cross-Platform Solar PV Design Platform API
  description: Enterprise REST API for solar PV CAD layout, component scraping, and financial engineering.
  version: 1.0.0
servers:
  - url: https://api.pvdesignstudio.com/v1
    description: Production API Gateway
  - url: https://staging-api.pvdesignstudio.com/v1
    description: Staging Environment

paths:
  /projects:
    get:
      summary: List user projects with pagination and filtering
      operationId: listProjects
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: search
          in: query
          schema:
            type: string
      responses:
        '200':
          description: List of projects retrieved successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  total:
                    type: integer
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/ProjectSummary'
    post:
      summary: Create a new Solar PV Project
      operationId: createProject
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateProjectRequest'
      responses:
        '201':
          description: Project created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectDetail'

  /components/scrape:
    post:
      summary: Trigger automated web scraping for PV component live pricing
      operationId: triggerComponentScrape
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - vendor
                - searchQuery
              properties:
                vendor:
                  type: string
                  enum: [SolarTraders, TiendaSolar, Krannich, BayWa_re]
                searchQuery:
                  type: string
                  example: "Jinko Tiger Neo 575W"
      responses:
        '202':
          description: Scraping job queued successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId:
                    type: string
                    format: uuid
                  status:
                    type: string
                    example: "QUEUED"

  /simulations/run:
    post:
      summary: Initiate cloud-based high-performance simulation job
      operationId: runCloudSimulation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SimulationExecutionParams'
      responses:
        '200':
          description: Simulation complete
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SimulationSummaryResult'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreateProjectRequest:
      type: object
      required:
        - name: projectType
        - systemConfiguration
        - latitude
        - longitude
      properties:
        name:
          type: string
          example: "Commercial Rooftop 250kWp - Warehouse A"
        projectType:
          type: string
          enum: [Residential, C&I, Agricultural, Utility]
        systemConfiguration:
          type: string
          enum: [GridTied, OffGrid, Hybrid]
        latitude:
          type: number
          format: double
          example: 37.774929
        longitude:
          type: number
          format: double
          example: -122.419416
        elevationMeters:
          type: number
          example: 45.2

    ProjectSummary:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        projectType:
          type: string
        systemCapacityKwp:
          type: number
        updatedAt:
          type: string
          format: date-time

    ProjectDetail:
      allOf:
        - $ref: '#/components/schemas/ProjectSummary'
        - type: object
          properties:
            latitude:
              type: number
            longitude:
              type: number
            versionVector:
              type: object
              additionalProperties:
                type: integer

    SimulationExecutionParams:
      type: object
      required:
        - projectId
        - meteoDatasetId
        - simulationResolutionMinutes
      properties:
        projectId:
          type: string
          format: uuid
        meteoDatasetId:
          type: string
          format: uuid
        simulationResolutionMinutes:
          type: integer
          enum: [60, 15, 5, 1]
          default: 60
        includeRayTracedShading:
          type: boolean
          default: true

    SimulationSummaryResult:
      type: object
      properties:
        simulationRunId:
          type: string
          format: uuid
        annualYieldKwh:
          type: number
        specificYieldKwhKwp:
          type: number
        performanceRatioPct:
          type: number
        co2SavedTons:
          type: number
        lossDiagramTreeJson:
          type: object

security:
  - BearerAuth: []
```

---

## 2. gRPC Protobuf Contracts (`pv_simulation_engine.proto`)

For high-throughput, low-latency binary IPC between the ASP.NET Core API and the Rust Calculation Microservice (as well as client streaming of 8760 time-series data points), gRPC protocols are defined below.

```protobuf
syntax = "proto3";

package pv.simulation.v1;

option csharp_namespace = "SolarPV.Engine.gRPC";
option go_package = "pv/simulation/v1;pvsimv1";

// Service responsible for high-performance solar energy computations
service PvSimulationEngine {
  // Executes full annual 8760 simulation and streams back progress ticks
  rpc StreamAnnualSimulation (SimulationRequest) returns (stream SimulationProgressResponse);
  
  // Executes instantaneous 3D GPU Ray-Traced shading calculation
  rpc ComputeRayTracedShading (ShadingRequest) returns (ShadingResponse);

  // Solves IEC/IEEE electrical cable sizing and loss equations
  rpc ComputeElectricalDesign (ElectricalDesignRequest) returns (ElectricalDesignResponse);

  // Calculates financial KPIs (NPV, IRR, LCOE, Cashflows)
  rpc ComputeFinancials (FinancialRequest) returns (FinancialResponse);
}

// Global Geographic Coordinate
message GeoPoint {
  double latitude = 1;
  double longitude = 2;
  double elevation_m = 3;
}

// Hourly Weather Entry
message MeteorologicalHour {
  int32 hour_of_year = 1; // 1 to 8760
  float ghi_w_m2 = 2;     // Global Horizontal Irradiance
  float dni_w_m2 = 3;     // Direct Normal Irradiance
  float dhi_w_m2 = 4;     // Diffuse Horizontal Irradiance
  float temp_ambient_c = 5;
  float wind_speed_m_s = 6;
  float albedo = 7;
}

// Core Simulation Input
message SimulationRequest {
  string project_id = 1;
  GeoPoint location = 2;
  repeated MeteorologicalHour meteo_data = 3;
  
  // System Array Configuration
  message ArrayConfig {
    string array_id = 1;
    double tilt_deg = 2;
    double azimuth_deg = 3;
    int32 modules_in_series = 4;
    int32 parallel_strings = 5;
    
    // Module Electrics
    double p_mp_w = 6;
    double v_mp_v = 7;
    double i_mp_a = 8;
    double v_oc_v = 9;
    double i_sc_a = 10;
    double temp_coeff_pmp_pct = 11;
    double temp_coeff_voc_pct = 12;
    
    // Inverter Electrics
    double inverter_p_nom_kw = 13;
    double inverter_max_efficiency_pct = 14;
    double dc_cable_resistance_ohms = 15;
  }
  
  repeated ArrayConfig arrays = 4;
  bool enable_bess = 5;
  double battery_capacity_kwh = 6;
}

message SimulationProgressResponse {
  int32 percent_complete = 1;
  string status_message = 2;
  
  // Optional intermediate result included on completion
  SimulationFinalResult final_result = 3;
}

message SimulationFinalResult {
  double annual_yield_kwh = 1;
  double specific_yield_kwh_kwp = 2;
  double performance_ratio_pct = 3;
  double total_dc_losses_kwh = 4;
  double total_ac_losses_kwh = 5;
  double total_shading_loss_kwh = 6;
  
  repeated float hourly_ac_power_kw = 7; // 8760 float array
}

// 3D Shading Protocol Messages
message ShadingRequest {
  string site_layout_id = 1;
  GeoPoint location = 2;
  
  message Mesh3D {
    repeated float vertices_xyz = 1; // Packed [x1, y1, z1, x2, y2, z2...]
    repeated int32 indices = 2;
  }
  
  Mesh3D site_geometry = 3;
  repeated ArrayConfig arrays = 4;
}

message ShadingResponse {
  // 8760 hourly shading factor per array (0.0 = fully shaded, 1.0 = fully unshaded)
  message ArrayShadingFactors {
    string array_id = 1;
    repeated float hourly_shading_factor = 2; // 8760 values
  }
  
  repeated ArrayShadingFactors array_factors = 1;
  double annual_shading_loss_pct = 2;
}

// Electrical Design Protocol
message ElectricalDesignRequest {
  double string_v_oc_max_v = 1;
  double string_i_sc_max_a = 2;
  double cable_length_m = 3;
  double conductor_conductivity = 4; // Copper = 56, Aluminum = 35
  double max_allowed_voltage_drop_pct = 5;
  double ambient_temp_c = 6;
  string installation_method_code = 7; // IEC 60364-5-52 installation code
}

message ElectricalDesignResponse {
  double recommended_cross_section_mm2 = 1;
  double actual_voltage_drop_volts = 2;
  double actual_voltage_drop_pct = 3;
  double cable_power_loss_watts = 4;
  double recommended_fuse_rating_amps = 5;
  double recommended_cb_rating_amps = 6;
}

// Financial Parameters Protocol
message FinancialRequest {
  double total_capex_usd = 1;
  double total_opex_annual_usd = 2;
  double discount_rate_pct = 3;
  double electricity_tariff_usd_kwh = 4;
  double annual_degradation_pct = 5;
  int32 project_lifetime_years = 6;
  repeated double annual_generation_kwh = 7; // Generation profile over lifetime
}

message FinancialResponse {
  double npv_usd = 1;
  double irr_pct = 2;
  double lcoe_usd_kwh = 3;
  double simple_payback_years = 4;
  double discounted_payback_years = 5;
  repeated double lifetime_net_cashflows_usd = 6;
}
```
