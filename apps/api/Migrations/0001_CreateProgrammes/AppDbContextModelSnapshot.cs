using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Preform.Api.Data;
using Preform.Api.Models;

#nullable disable

namespace Preform.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.10")
                .HasAnnotation("Relational:MaxIdentifierLength", 128)
                .HasAnnotation("Relational:TypeMappingSource", "NpgsqlTypeMappingSource");

            modelBuilder.Entity<Preform.Api.Models.Programme>(b =>
                {
                    b.Property<string>("Id")
                        .HasColumnType("text");

                    b.Property<Preform.Api.Models.ProgrammeCode>("Code")
                        .HasConversion<string>()
                        .HasColumnType("text");

                    b.Property<string>("DisplayName")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<bool>("IsActive")
                        .IsRequired()
                        .HasColumnType("boolean");

                    b.Property<DateTime>("CreatedAt")
                        .IsRequired()
                        .HasColumnType("timestamp with time zone");

                    b.Property<DateTime>("UpdatedAt")
                        .IsRequired()
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.HasIndex("Code")
                        .IsUnique();

                    b.HasIndex("IsActive");

                    b.ToTable("Programme");
                });
        }
    }
}
