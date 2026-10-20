namespace SolarPv.Grpc.Services;

using global::Grpc.Core;
using SolarPv.Application.Services;
using SolarPv.Grpc.Protos;

public class PvEngineGrpcService : PvEngineGrpc.PvEngineGrpcBase
{
    private readonly ISolarCalculationService _solarCalculationService;

    public PvEngineGrpcService(ISolarCalculationService solarCalculationService)
    {
        _solarCalculationService = solarCalculationService;
    }

    public override Task<SolarPositionGrpcResponse> CalculateSolarPosition(
        SolarPositionGrpcRequest request,
        ServerCallContext context)
    {
        var res = _solarCalculationService.GetSolarPosition(new SolarPositionRequest(
            request.LatitudeDeg,
            request.LongitudeDeg,
            request.UtcTs));

        return Task.FromResult(new SolarPositionGrpcResponse
        {
            ZenithDeg = res.ZenithDeg,
            AzimuthDeg = res.AzimuthDeg
        });
    }

    public override Task<StringSizingGrpcResponse> CalculateStringSizing(
        StringSizingGrpcRequest request,
        ServerCallContext context)
    {
        var res = _solarCalculationService.GetStringSizing(new StringSizingRequest(
            request.PanelVoc,
            request.PanelVmp,
            request.TempMinC,
            request.TempMaxC,
            request.BetaVocPerC,
            request.InverterVdcMax,
            request.InverterMpptMin,
            request.InverterMpptMax));

        return Task.FromResult(new StringSizingGrpcResponse
        {
            MinModules = res.MinModules,
            MaxModules = res.MaxModules,
            HasWarning = res.HasWarning
        });
    }
}
