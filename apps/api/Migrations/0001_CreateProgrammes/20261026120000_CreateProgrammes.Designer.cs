using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Preform.Api.Data;
using Preform.Api.Models;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261026120000_CreateProgrammes")]
partial class CreateProgrammes : Migration
{
    // This partial class is required by EF Core tooling conventions.
    // The Up and Down methods are defined in the non-partial class above.
}
