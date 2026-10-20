# SolarPV Studio Production Codebase (Phase 0 Skeleton)

Cross-platform Solar PV Design & Simulation Software (.NET 8 MAUI + Blazor Hybrid, Rust 1.79 Calculation Core, ASP.NET Core 8 Minimal API & gRPC).

## Quickstart & Build Instructions

### 1. Build and Test Rust Core Workspace
```bash
cd solarpv-studio/src/core-engine
cargo test --workspace
cargo build --release
```

### 2. Build and Test ASP.NET Core Backend
```bash
export LD_LIBRARY_PATH=$PWD/solarpv-studio/src/core-engine/target/release:$LD_LIBRARY_PATH
cd solarpv-studio/src/backend/SolarPv.Tests
dotnet test
```

### 3. Build .NET MAUI App
```bash
cd solarpv-studio/src/desktop-mobile/SolarPv.App
dotnet build
```

### 4. Run Docker Services
```bash
cd solarpv-studio/infra
docker compose up -d
```
Access Swagger UI at `http://localhost:8080/swagger`.
