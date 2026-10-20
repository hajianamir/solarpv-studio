namespace SolarPv.Application.Services;

public record SolarPositionRequest(double LatitudeDeg, double LongitudeDeg, long UtcTs);
public record SolarPositionResponse(double ZenithDeg, double AzimuthDeg);

public record PoaIrradianceRequest(double Ghi, double Dni, double Dhi, double TiltDeg, double AzimuthDeg, double SunZenithDeg, double SunAzimuthDeg);
public record PoaIrradianceResponse(double PoaIrradiance);

public record StringSizingRequest(
    double PanelVoc,
    double PanelVmp,
    double TempMinC,
    double TempMaxC,
    double BetaVocPerC,
    double InverterVdcMax,
    double InverterMpptMin,
    double InverterMpptMax);
public record StringSizingResponse(uint MinModules, uint MaxModules, bool HasWarning);

public record VoltageDropRequest(double LengthM, double CurrentA, double CrossSectionMm2, double VNominal, double Rho = 0.0175);
public record VoltageDropResponse(double VoltageDropPercent);

public record NpvRequest(double Rate, double[] Cashflows);
public record NpvResponse(double NpvValue);

public record IrrRequest(double[] Cashflows);
public record IrrResponse(double IrrValue);

public record LcoeRequest(double Capex, double OpexAnnual, double EnergyAnnual, double DiscountRate, uint LifetimeYears);
public record LcoeResponse(double LcoeValue);

public record Point3D(double X, double Y, double Z);
public record Triangle3D(Point3D V0, Point3D V1, Point3D V2);
public record ShadingAnalyzeRequest(
    List<Triangle3D> MeshTriangles,
    List<Point3D> TargetPoints,
    List<Point3D> SunDirections);
public record ShadingAnalyzeResponse(List<double> ShadingFactors);

public interface ISolarCalculationService
{
    SolarPositionResponse GetSolarPosition(SolarPositionRequest request);
    PoaIrradianceResponse GetPoaIrradiance(PoaIrradianceRequest request);
    StringSizingResponse GetStringSizing(StringSizingRequest request);
    VoltageDropResponse GetVoltageDrop(VoltageDropRequest request);
    NpvResponse GetNpv(NpvRequest request);
    IrrResponse GetIrr(IrrRequest request);
    LcoeResponse GetLcoe(LcoeRequest request);
    ShadingAnalyzeResponse AnalyzeShading(ShadingAnalyzeRequest request);
}
