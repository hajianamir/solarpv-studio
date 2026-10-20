namespace SolarPv.Infrastructure.Native;

using System.Runtime.InteropServices;

[StructLayout(LayoutKind.Sequential)]
public struct FfiSolarPosition
{
    public double ZenithDeg;
    public double AzimuthDeg;
}

[StructLayout(LayoutKind.Sequential)]
public struct FfiStringSizingResult
{
    public uint MinModules;
    public uint MaxModules;
    public byte HasWarning;
}

[StructLayout(LayoutKind.Sequential)]
public struct FfiTriangle
{
    public double V0X; public double V0Y; public double V0Z;
    public double V1X; public double V1Y; public double V1Z;
    public double V2X; public double V2Y; public double V2Z;
}

[StructLayout(LayoutKind.Sequential)]
public struct FfiVec3
{
    public double X;
    public double Y;
    public double Z;
}

public static unsafe class RustCore
{
    private const string LibName = "pv_ffi";

    [DllImport(LibName, EntryPoint = "ffi_solar_position")]
    public static extern FfiSolarPosition SolarPosition(double latitudeDeg, double longitudeDeg, long utcTs);

    [DllImport(LibName, EntryPoint = "ffi_poa_irradiance")]
    public static extern double PoaIrradiance(
        double ghi,
        double dni,
        double dhi,
        double tiltDeg,
        double azimuthDeg,
        double sunZenithDeg,
        double sunAzimuthDeg);

    [DllImport(LibName, EntryPoint = "ffi_string_sizing")]
    public static extern FfiStringSizingResult StringSizing(
        double panelVoc,
        double panelVmp,
        double tempMinC,
        double tempMaxC,
        double betaVocPerC,
        double inverterVdcMax,
        double inverterMpptMin,
        double inverterMpptMax);

    [DllImport(LibName, EntryPoint = "ffi_voltage_drop_dc")]
    public static extern double VoltageDropDc(
        double lengthM,
        double currentA,
        double crossSectionMm2,
        double vNominal,
        double rho);

    [DllImport(LibName, EntryPoint = "ffi_npv")]
    public static extern double Npv(double rate, double* cashflowsPtr, nuint len);

    [DllImport(LibName, EntryPoint = "ffi_irr")]
    public static extern double Irr(double* cashflowsPtr, nuint len);

    [DllImport(LibName, EntryPoint = "ffi_lcoe")]
    public static extern double Lcoe(
        double capex,
        double opexAnnual,
        double energyAnnual,
        double discountRate,
        uint lifetimeYears);

    [DllImport(LibName, EntryPoint = "ffi_shading_factor")]
    public static extern int ShadingFactor(
        FfiTriangle* trisPtr,
        nuint trisLen,
        FfiVec3* targetsPtr,
        nuint targetsLen,
        FfiVec3* sundirsPtr,
        nuint sundirsLen,
        double* outFactorsPtr);
}
