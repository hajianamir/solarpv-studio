namespace SolarPv.App.Services;

using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SolarPv.Domain.Entities;

public class LocalSyncManager
{
    private readonly LocalSolarPvDbContext _localDb;
    private readonly HttpClient _httpClient;

    public LocalSyncManager(LocalSolarPvDbContext localDb, IHttpClientFactory httpClientFactory)
    {
        _localDb = localDb;
        _httpClient = httpClientFactory.CreateClient("SolarPvApi");
    }

    public async Task SaveProjectOfflineAsync(Project project)
    {
        _localDb.LocalProjects.Update(project);

        var outboxMsg = new OfflineOutboxMessage
        {
            Id = Guid.NewGuid(),
            EntityType = nameof(Project),
            EntityId = project.Id,
            Operation = "UPSERT",
            PayloadJson = JsonSerializer.Serialize(project),
            CreatedAt = DateTime.UtcNow
        };

        _localDb.LocalOutbox.Add(outboxMsg);
        await _localDb.SaveChangesAsync();
    }

    public async Task<int> SyncOutboxWithServerAsync()
    {
        var pendingMsgs = await _localDb.LocalOutbox
            .Where(m => !m.IsProcessed)
            .ToListAsync();

        if (pendingMsgs.Count == 0) return 0;

        var pushReq = new { ClientId = "MAUI_Client_1", Messages = pendingMsgs };
        var response = await _httpClient.PostAsJsonAsync("/api/v1/sync/push", pushReq);

        if (response.IsSuccessStatusCode)
        {
            foreach (var msg in pendingMsgs)
            {
                msg.IsProcessed = true;
            }
            await _localDb.SaveChangesAsync();
            return pendingMsgs.Count;
        }

        return 0;
    }
}
