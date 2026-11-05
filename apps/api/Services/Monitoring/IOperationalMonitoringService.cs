using System.Threading;
using System.Threading.Tasks;
using Preform.Api.DTOs;

namespace Preform.Api.Services.Monitoring;

public interface IOperationalMonitoringService
{
    Task<OperationalHealthDto> GetOperationalHealthAsync(CancellationToken ct = default);
}
