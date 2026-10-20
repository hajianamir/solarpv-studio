namespace SolarPv.Application.Services;

using SolarPv.Domain.Entities;

public record SyncPushRequest(
    string ClientId,
    List<OfflineOutboxMessage> Messages);

public record SyncPushResponse(
    bool Success,
    int ProcessedCount,
    List<Guid> AckedMessageIds);

public record SyncPullResponse(
    long CurrentServerVectorClock,
    List<Project> Projects);

public interface ISyncService
{
    Task<SyncPushResponse> PushSyncAsync(SyncPushRequest request);
    Task<SyncPullResponse> PullSyncAsync(long sinceVectorClock);
}
