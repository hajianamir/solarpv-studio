namespace SolarPv.Tests;

using Microsoft.EntityFrameworkCore;
using SolarPv.Application.Services;
using SolarPv.Infrastructure.Persistence;
using SolarPv.Infrastructure.Services;
using Xunit;

public class QuickSizingIntegrationTests
{
    [Fact]
    public async Task QuickSize_TehranFixture_ReturnsValidSizingAndSavesProject()
    {
        var options = new DbContextOptionsBuilder<SolarPvDbContext>()
            .UseInMemoryDatabase(databaseName: "TehranFixtureDb")
            .Options;

        using var dbContext = new SolarPvDbContext(options);
        await dbContext.Database.EnsureCreatedAsync();

        var service = new QuickSizingService(dbContext);

        var request = new QuickSizingRequest(
            ProjectName: "Tehran Commercial Rooftop",
            Latitude: 35.6895,
            Longitude: 51.3890,
            DailyKwh: 20.0,
            AutonomyDays: 1.5,
            ModuleId: Guid.Parse("11111111-1111-1111-1111-111111111111"),
            InverterId: Guid.Parse("22222222-2222-2222-2222-222222222222"),
            BatteryId: Guid.Parse("33333333-3333-3333-3333-333333333333"));

        var response = await service.QuickSizeAsync(request);

        Assert.NotNull(response);
        Assert.Equal("Tehran Commercial Rooftop", response.ProjectName);
        Assert.True(response.SystemCapacityKwp >= 4.5 && response.SystemCapacityKwp <= 7.5, $"Actual capacity: {response.SystemCapacityKwp} kWp");
        Assert.True(response.PanelCount > 0);
        Assert.True(response.InverterCount >= 1);
        Assert.True(response.BatteryCount >= 1);
        Assert.True(response.LcoeUsdPerKwh > 0.0);

        var savedProject = await dbContext.Projects.FindAsync(response.ProjectId);
        Assert.NotNull(savedProject);
        Assert.Equal(response.SystemCapacityKwp, savedProject.SystemCapacityKwp);
    }
}
