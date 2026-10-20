namespace SolarPv.Domain.Entities;

public class Project
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double DailyLoadKwh { get; set; }
    public double AutonomyDays { get; set; }
    public double SystemCapacityKwp { get; set; }
    public int PanelCount { get; set; }
    public int InverterCount { get; set; }
    public int BatteryCount { get; set; }
    public double LcoeUsdPerKwh { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
