namespace SolarPv.Domain.Entities;

public class PvModule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Manufacturer { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public double PmpWatts { get; set; }
    public double VmpVolts { get; set; }
    public double ImpAmps { get; set; }
    public double VocVolts { get; set; }
    public double IscAmps { get; set; }
    public double BetaVocPerC { get; set; } = -0.0028;
}
