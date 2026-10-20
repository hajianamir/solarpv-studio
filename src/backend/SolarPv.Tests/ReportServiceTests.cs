namespace SolarPv.Tests;

using SolarPv.Application.Services;
using SolarPv.Infrastructure.Services;
using Xunit;

public class ReportServiceTests
{
    [Fact]
    public void GeneratePdfReport_ReturnsValidPdfBytes()
    {
        var service = new ReportService();
        var request = new GenerateReportRequest(
            ProjectId: Guid.NewGuid(),
            ProjectName: "Test Commercial Proposal",
            SystemCapacityKwp: 10.5,
            PanelCount: 18,
            InverterCount: 1,
            BatteryCount: 2,
            AnnualYieldKwh: 15200,
            LcoeUsdPerKwh: 0.052);

        var pdfBytes = service.GeneratePdfReport(request);

        Assert.NotNull(pdfBytes);
        Assert.True(pdfBytes.Length > 1000);
    }
}
