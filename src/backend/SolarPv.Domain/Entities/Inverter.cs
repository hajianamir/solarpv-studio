namespace SolarPv.Domain.Entities;

public class Inverter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Manufacturer { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public double PnomAcKw { get; set; }
    public double VdcMaxVolts { get; set; }
    public double VmpptMinVolts { get; set; }
    public double VmpptMaxVolts { get; set; }
}
