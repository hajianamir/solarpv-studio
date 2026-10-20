namespace SolarPv.Application.Services;

public record QuickSizingRequest(
    string ProjectName,
    double Latitude,
    double Longitude,
    double DailyKwh,
    double AutonomyDays,
    Guid ModuleId,
    Guid InverterId,
    Guid BatteryId);

public record QuickSizingResponse(
    Guid ProjectId,
    string ProjectName,
    double SystemCapacityKwp,
    int PanelCount,
    int InverterCount,
    int BatteryCount,
    double LcoeUsdPerKwh,
    double EstimatedAnnualYieldKwh);

public interface IQuickSizingService
{
    Task<QuickSizingResponse> QuickSizeAsync(QuickSizingRequest request);
}
