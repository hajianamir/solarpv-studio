namespace SolarPv.Tests;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SolarPv.Application.Services;
using SolarPv.Domain.Entities;
using SolarPv.Infrastructure.Persistence;
using SolarPv.Infrastructure.Services;
using Xunit;

public class SyncServiceTests
{
    [Fact]
    public async Task PushAndPullSync_PushesOutboxMessageAndPullsUpdatedProject()
    {
        var options = new DbContextOptionsBuilder<SolarPvDbContext>()
            .UseInMemoryDatabase(databaseName: "SyncTestDb")
            .Options;

        using var dbContext = new SolarPvDbContext(options);
        var syncService = new SyncService(dbContext);

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Offline Synced Project",
            SystemCapacityKwp = 12.0
        };

        var outboxMessage = new OfflineOutboxMessage
        {
            Id = Guid.NewGuid(),
            EntityType = nameof(Project),
            EntityId = project.Id,
            PayloadJson = JsonSerializer.Serialize(project)
        };

        var pushReq = new SyncPushRequest("Client_Android_1", new List<OfflineOutboxMessage> { outboxMessage });
        var pushRes = await syncService.PushSyncAsync(pushReq);

        Assert.True(pushRes.Success);
        Assert.Equal(1, pushRes.ProcessedCount);

        var pullRes = await syncService.PullSyncAsync(0);
        Assert.NotNull(pullRes.Projects);
        Assert.Contains(pullRes.Projects, p => p.Id == project.Id && p.Name == "Offline Synced Project");
    }
}
