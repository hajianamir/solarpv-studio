namespace SolarPv.Tests;

using SolarPv.Application.Services;
using SolarPv.Infrastructure.Services;
using Xunit;

public class SolarCalculationServiceTests
{
    private readonly ISolarCalculationService _service = new SolarCalculationService();

    [Fact]
    public void GetSolarPosition_ReturnsValidAngles()
    {
        var response = _service.GetSolarPosition(new SolarPositionRequest(35.6895, 139.6917, 1700000000));
        Assert.InRange(response.ZenithDeg, 0.0, 180.0);
        Assert.InRange(response.AzimuthDeg, 0.0, 360.0);
    }

    [Fact]
    public void GetStringSizing_ReturnsValidModuleCounts()
    {
        var response = _service.GetStringSizing(new StringSizingRequest(50.0, 42.0, -10.0, 60.0, -0.0028, 1000.0, 200.0, 800.0));
        Assert.True(response.MinModules > 0);
        Assert.True(response.MaxModules >= response.MinModules);
    }

    [Fact]
    public void GetNpv_CalculatesPositiveNpv()
    {
        var response = _service.GetNpv(new NpvRequest(0.05, new[] { -1000.0, 300.0, 400.0, 500.0 }));
        Assert.True(response.NpvValue > 0.0);
    }

    [Fact]
    public void AnalyzeShading_ValidMeshAndSunDirections_ReturnsShadingFactor()
    {
        var request = new ShadingAnalyzeRequest(
            MeshTriangles: new List<Triangle3D>
            {
                new Triangle3D(new Point3D(-1, 1, 2), new Point3D(1, 1, 2), new Point3D(0, -1, 2))
            },
            TargetPoints: new List<Point3D> { new Point3D(0, 0, 0) },
            SunDirections: new List<Point3D> { new Point3D(0, 0, 1) });

        var response = _service.AnalyzeShading(request);

        Assert.NotNull(response);
        Assert.Single(response.ShadingFactors);
        Assert.Equal(0.0, response.ShadingFactors[0]);
    }
}
