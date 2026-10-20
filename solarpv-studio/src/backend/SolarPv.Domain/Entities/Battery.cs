namespace SolarPv.Domain.Entities;

public class Battery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Manufacturer { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public double CapacityKwh { get; set; }
    public double NominalVoltageVolts { get; set; }
    public double DepthOfDischargeMax { get; set; } = 0.8;
}
