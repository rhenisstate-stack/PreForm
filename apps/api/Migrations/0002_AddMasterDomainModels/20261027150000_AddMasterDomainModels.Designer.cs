using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Preform.Api.Data;

#nullable disable

namespace Preform.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261027150000_AddMasterDomainModels")]
partial class AddMasterDomainModels : Migration
{
}
