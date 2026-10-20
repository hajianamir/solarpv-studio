namespace SolarPv.Domain.Entities;

public class OfflineOutboxMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Operation { get; set; } = "UPSERT";
    public string PayloadJson { get; set; } = string.Empty;
    public long VectorClockSequence { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsProcessed { get; set; } = false;
}
