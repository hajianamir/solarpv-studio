using Microsoft.EntityFrameworkCore;
using SolarPv.Application.Services;
using SolarPv.Domain.Entities;
using SolarPv.Infrastructure.Persistence;
using SolarPv.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<SolarPvDbContext>(options =>
    options.UseInMemoryDatabase("SolarPvInMemoryDb"));

builder.Services.AddSingleton<ISolarCalculationService, SolarCalculationService>();
builder.Services.AddScoped<IQuickSizingService, QuickSizingService>();
builder.Services.AddSingleton<IReportService, ReportService>();
builder.Services.AddScoped<ISyncService, SyncService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SolarPvDbContext>();
    db.Database.EnsureCreated();
}

app.UseSwagger();
app.UseSwaggerUI();

app.MapPost("/api/v1/solar/position", (SolarPositionRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetSolarPosition(req)));

app.MapPost("/api/v1/solar/poa", (PoaIrradianceRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetPoaIrradiance(req)));

app.MapPost("/api/v1/electrical/string-sizing", (StringSizingRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetStringSizing(req)));

app.MapPost("/api/v1/electrical/voltage-drop", (VoltageDropRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetVoltageDrop(req)));

app.MapPost("/api/v1/finance/npv", (NpvRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetNpv(req)));

app.MapPost("/api/v1/finance/irr", (IrrRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetIrr(req)));

app.MapPost("/api/v1/finance/lcoe", (LcoeRequest req, ISolarCalculationService service) =>
    Results.Ok(service.GetLcoe(req)));

app.MapPost("/api/v1/shading/analyze", (ShadingAnalyzeRequest req, ISolarCalculationService service) =>
    Results.Ok(service.AnalyzeShading(req)));

app.MapPost("/api/v1/projects/quick-size", async (QuickSizingRequest req, IQuickSizingService service) =>
{
    var result = await service.QuickSizeAsync(req);
    return Results.Ok(result);
});

app.MapPost("/api/v1/reports/generate", (GenerateReportRequest req, IReportService service) =>
{
    var pdfBytes = service.GeneratePdfReport(req);
    return Results.File(pdfBytes, "application/pdf", $"{req.ProjectName}_EPC_Report.pdf");
});

app.MapPost("/api/v1/sync/push", async (SyncPushRequest req, ISyncService syncService) =>
{
    var res = await syncService.PushSyncAsync(req);
    return Results.Ok(res);
});

app.MapGet("/api/v1/sync/pull", async (long? since, ISyncService syncService) =>
{
    var res = await syncService.PullSyncAsync(since ?? 0);
    return Results.Ok(res);
});

app.MapGet("/api/v1/catalog/modules", async (SolarPvDbContext db) =>
    Results.Ok(await db.PvModules.ToListAsync()));

app.MapPost("/api/v1/catalog/modules", async (PvModule module, SolarPvDbContext db) =>
{
    if (module.Id == Guid.Empty) module.Id = Guid.NewGuid();
    db.PvModules.Add(module);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/catalog/modules/{module.Id}", module);
});

app.MapGet("/api/v1/catalog/inverters", async (SolarPvDbContext db) =>
    Results.Ok(await db.Inverters.ToListAsync()));

app.MapPost("/api/v1/catalog/inverters", async (Inverter inverter, SolarPvDbContext db) =>
{
    if (inverter.Id == Guid.Empty) inverter.Id = Guid.NewGuid();
    db.Inverters.Add(inverter);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/catalog/inverters/{inverter.Id}", inverter);
});

app.MapGet("/api/v1/catalog/batteries", async (SolarPvDbContext db) =>
    Results.Ok(await db.Batteries.ToListAsync()));

app.MapPost("/api/v1/catalog/batteries", async (Battery battery, SolarPvDbContext db) =>
{
    if (battery.Id == Guid.Empty) battery.Id = Guid.NewGuid();
    db.Batteries.Add(battery);
    await db.SaveChangesAsync();
    return Results.Created($"/api/v1/catalog/batteries/{battery.Id}", battery);
});

app.Run();
