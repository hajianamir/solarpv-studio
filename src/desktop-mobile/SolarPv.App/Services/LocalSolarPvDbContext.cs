namespace SolarPv.App.Services;

using Microsoft.EntityFrameworkCore;
using SolarPv.Domain.Entities;

public class LocalSolarPvDbContext : DbContext
{
    public DbSet<Project> LocalProjects => Set<Project>();
    public DbSet<OfflineOutboxMessage> LocalOutbox => Set<OfflineOutboxMessage>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlite("Data Source=solarpv_local.db");
    }
}
