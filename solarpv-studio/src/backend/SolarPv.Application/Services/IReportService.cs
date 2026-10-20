namespace SolarPv.Application.Services;

public record GenerateReportRequest(
    Guid ProjectId,
    string ProjectName,
    double SystemCapacityKwp,
    int PanelCount,
    int InverterCount,
    int BatteryCount,
    double AnnualYieldKwh,
    double LcoeUsdPerKwh);

public interface IReportService
{
    byte[] GeneratePdfReport(GenerateReportRequest request);
}
