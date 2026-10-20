namespace SolarPv.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using SolarPv.Application.Services;
using SolarPv.Domain.Entities;
using SolarPv.Infrastructure.Native;
using SolarPv.Infrastructure.Persistence;

public class QuickSizingService : IQuickSizingService
{
    private readonly SolarPvDbContext _dbContext;

    public QuickSizingService(SolarPvDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<QuickSizingResponse> QuickSizeAsync(QuickSizingRequest request)
    {
        var module = await _dbContext.PvModules.FindAsync(request.ModuleId)
            ?? await _dbContext.PvModules.FirstAsync();
        var inverter = await _dbContext.Inverters.FindAsync(request.InverterId)
            ?? await _dbContext.Inverters.FirstAsync();
        var battery = await _dbContext.Batteries.FindAsync(request.BatteryId)
            ?? await _dbContext.Batteries.FirstAsync();

        double peakSunHours = Math.Max(3.5, 6.0 - Math.Abs(request.Latitude) * 0.05);

        double requiredArrayKwp = request.DailyKwh / (peakSunHours * 0.75);

        int panelCount = (int)Math.Ceiling((requiredArrayKwp * 1000.0) / module.PmpWatts);
        double actualCapacityKwp = (panelCount * module.PmpWatts) / 1000.0;

        int inverterCount = (int)Math.Ceiling(actualCapacityKwp / inverter.PnomAcKw);

        double requiredBatteryStorageKwh = (request.DailyKwh * request.AutonomyDays) / battery.DepthOfDischargeMax;
        int batteryCount = (int)Math.Ceiling(requiredBatteryStorageKwh / battery.CapacityKwh);

        double annualYieldKwh = actualCapacityKwp * peakSunHours * 365.0 * 0.78;

        double capex = (actualCapacityKwp * 1100.0) + (batteryCount * battery.CapacityKwh * 350.0);
        double opexAnnual = capex * 0.015;
        double lcoe = RustCore.Lcoe(capex, opexAnnual, annualYieldKwh, 0.05, 25);

        var project = new Project
        {
            Name = string.IsNullOrWhiteSpace(request.ProjectName) ? "Quick PV Project" : request.ProjectName,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            DailyLoadKwh = request.DailyKwh,
            AutonomyDays = request.AutonomyDays,
            SystemCapacityKwp = actualCapacityKwp,
            PanelCount = panelCount,
            InverterCount = inverterCount,
            BatteryCount = batteryCount,
            LcoeUsdPerKwh = lcoe
        };

        _dbContext.Projects.Add(project);
        await _dbContext.SaveChangesAsync();

        return new QuickSizingResponse(
            project.Id,
            project.Name,
            actualCapacityKwp,
            panelCount,
            inverterCount,
            batteryCount,
            lcoe,
            annualYieldKwh);
    }
}
