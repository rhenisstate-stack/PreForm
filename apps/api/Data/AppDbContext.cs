using Microsoft.EntityFrameworkCore;
using Preform.Api.Models;

namespace Preform.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Programme> Programmes => Set<Programme>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Programme>(entity =>
        {
            entity.ToTable("Programme", "public");
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Id).HasColumnType("text");
            entity.Property(p => p.Code).HasConversion<string>().HasColumnType("text");
            entity.Property(p => p.DisplayName).IsRequired().HasColumnType("text");
            entity.Property(p => p.IsActive).IsRequired().HasColumnType("boolean");
            entity.Property(p => p.CreatedAt).IsRequired().HasColumnType("timestamp with time zone");
            entity.Property(p => p.UpdatedAt).IsRequired().HasColumnType("timestamp with time zone");
            entity.HasIndex(p => p.Code).IsUnique();
            entity.HasIndex(p => p.IsActive);
        });
    }
}
