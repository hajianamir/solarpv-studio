namespace SolarPv.Infrastructure.Services;

using SolarPv.Application.Services;
using SolarPv.Infrastructure.Native;

public class SolarCalculationService : ISolarCalculationService
{
    public SolarPositionResponse GetSolarPosition(SolarPositionRequest request)
    {
        var res = RustCore.SolarPosition(request.LatitudeDeg, request.LongitudeDeg, request.UtcTs);
        return new SolarPositionResponse(res.ZenithDeg, res.AzimuthDeg);
    }

    public PoaIrradianceResponse GetPoaIrradiance(PoaIrradianceRequest request)
    {
        var val = RustCore.PoaIrradiance(
            request.Ghi,
            request.Dni,
            request.Dhi,
            request.TiltDeg,
            request.AzimuthDeg,
            request.SunZenithDeg,
            request.SunAzimuthDeg);
        return new PoaIrradianceResponse(val);
    }

    public StringSizingResponse GetStringSizing(StringSizingRequest request)
    {
        var res = RustCore.StringSizing(
            request.PanelVoc,
            request.PanelVmp,
            request.TempMinC,
            request.TempMaxC,
            request.BetaVocPerC,
            request.InverterVdcMax,
            request.InverterMpptMin,
            request.InverterMpptMax);
        return new StringSizingResponse(res.MinModules, res.MaxModules, res.HasWarning != 0);
    }

    public VoltageDropResponse GetVoltageDrop(VoltageDropRequest request)
    {
        var pct = RustCore.VoltageDropDc(
            request.LengthM,
            request.CurrentA,
            request.CrossSectionMm2,
            request.VNominal,
            request.Rho);
        return new VoltageDropResponse(pct);
    }

    public unsafe NpvResponse GetNpv(NpvRequest request)
    {
        if (request.Cashflows == null || request.Cashflows.Length == 0)
        {
            return new NpvResponse(0.0);
        }
        fixed (double* ptr = request.Cashflows)
        {
            var val = RustCore.Npv(request.Rate, ptr, (nuint)request.Cashflows.Length);
            return new NpvResponse(val);
        }
    }

    public unsafe IrrResponse GetIrr(IrrRequest request)
    {
        if (request.Cashflows == null || request.Cashflows.Length == 0)
        {
            return new IrrResponse(0.0);
        }
        fixed (double* ptr = request.Cashflows)
        {
            var val = RustCore.Irr(ptr, (nuint)request.Cashflows.Length);
            return new IrrResponse(val);
        }
    }

    public LcoeResponse GetLcoe(LcoeRequest request)
    {
        var val = RustCore.Lcoe(
            request.Capex,
            request.OpexAnnual,
            request.EnergyAnnual,
            request.DiscountRate,
            request.LifetimeYears);
        return new LcoeResponse(val);
    }

    public unsafe ShadingAnalyzeResponse AnalyzeShading(ShadingAnalyzeRequest request)
    {
        if (request.MeshTriangles == null || request.TargetPoints == null || request.SunDirections == null ||
            request.SunDirections.Count == 0 || request.TargetPoints.Count == 0)
        {
            return new ShadingAnalyzeResponse(new List<double>());
        }

        var tris = request.MeshTriangles.Select(t => new FfiTriangle
        {
            V0X = t.V0.X, V0Y = t.V0.Y, V0Z = t.V0.Z,
            V1X = t.V1.X, V1Y = t.V1.Y, V1Z = t.V1.Z,
            V2X = t.V2.X, V2Y = t.V2.Y, V2Z = t.V2.Z,
        }).ToArray();

        var targets = request.TargetPoints.Select(p => new FfiVec3 { X = p.X, Y = p.Y, Z = p.Z }).ToArray();
        var sundirs = request.SunDirections.Select(d => new FfiVec3 { X = d.X, Y = d.Y, Z = d.Z }).ToArray();
        var factors = new double[sundirs.Length];

        fixed (FfiTriangle* tPtr = tris)
        fixed (FfiVec3* pPtr = targets)
        fixed (FfiVec3* dPtr = sundirs)
        fixed (double* outPtr = factors)
        {
            RustCore.ShadingFactor(
                tPtr, (nuint)tris.Length,
                pPtr, (nuint)targets.Length,
                dPtr, (nuint)sundirs.Length,
                outPtr);
        }

        return new ShadingAnalyzeResponse(factors.ToList());
    }
}
