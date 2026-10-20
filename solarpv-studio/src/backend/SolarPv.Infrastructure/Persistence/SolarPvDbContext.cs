namespace SolarPv.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;
using SolarPv.Domain.Entities;

public class SolarPvDbContext : DbContext
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<PvModule> PvModules => Set<PvModule>();
    public DbSet<Inverter> Inverters => Set<Inverter>();
    public DbSet<Battery> Batteries => Set<Battery>();
    public DbSet<OfflineOutboxMessage> OfflineOutboxMessages => Set<OfflineOutboxMessage>();

    public SolarPvDbContext(DbContextOptions<SolarPvDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<PvModule>().HasData(
            new PvModule
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Manufacturer = "Jinko Solar",
                ModelName = "Tiger Neo 575W",
                PmpWatts = 575.0,
                VmpVolts = 42.22,
                ImpAmps = 13.62,
                VocVolts = 50.88,
                IscAmps = 14.37,
                BetaVocPerC = -0.0028
            }
        );

        modelBuilder.Entity<Inverter>().HasData(
            new Inverter
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                Manufacturer = "SMA",
                ModelName = "Sunny Tripower 10.0",
                PnomAcKw = 10.0,
                VdcMaxVolts = 1000.0,
                VmpptMinVolts = 200.0,
                VmpptMaxVolts = 800.0
            }
        );

        modelBuilder.Entity<Battery>().HasData(
            new Battery
            {
                Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                Manufacturer = "BYD",
                ModelName = "Battery-Box Premium HVS 10.2",
                CapacityKwh = 10.2,
                NominalVoltageVolts = 400.0,
                DepthOfDischargeMax = 0.8
            }
        );
    }
}
