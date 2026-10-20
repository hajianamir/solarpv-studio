namespace SolarPv.Infrastructure.Services;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SolarPv.Application.Services;
using SolarPv.Domain.Entities;
using SolarPv.Infrastructure.Persistence;

public class SyncService : ISyncService
{
    private readonly SolarPvDbContext _dbContext;

    public SyncService(SolarPvDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<SyncPushResponse> PushSyncAsync(SyncPushRequest request)
    {
        if (request.Messages == null || request.Messages.Count == 0)
        {
            return new SyncPushResponse(true, 0, new List<Guid>());
        }

        var ackedIds = new List<Guid>();

        foreach (var msg in request.Messages)
        {
            if (msg.EntityType == nameof(Project) && !string.IsNullOrEmpty(msg.PayloadJson))
            {
                var project = JsonSerializer.Deserialize<Project>(msg.PayloadJson);
                if (project != null)
                {
                    var existing = await _dbContext.Projects.FindAsync(project.Id);
                    if (existing == null)
                    {
                        _dbContext.Projects.Add(project);
                    }
                    else
                    {
                        _dbContext.Entry(existing).CurrentValues.SetValues(project);
                    }
                }
            }

            msg.IsProcessed = true;
            _dbContext.OfflineOutboxMessages.Add(msg);
            ackedIds.Add(msg.Id);
        }

        await _dbContext.SaveChangesAsync();
        return new SyncPushResponse(true, ackedIds.Count, ackedIds);
    }

    public async Task<SyncPullResponse> PullSyncAsync(long sinceVectorClock)
    {
        var projects = await _dbContext.Projects.AsNoTracking().ToListAsync();
        long currentClock = DateTime.UtcNow.Ticks;
        return new SyncPullResponse(currentClock, projects);
    }
}
