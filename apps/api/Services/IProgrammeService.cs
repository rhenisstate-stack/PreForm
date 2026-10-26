using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface IProgrammeService
{
    Task<IEnumerable<ProgrammeDto>> GetAllProgrammesAsync(CancellationToken cancellationToken = default);
    Task<ProgrammeDto?> GetProgrammeByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<ProgrammeDto?> GetProgrammeByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task<ProgrammeDto> CreateProgrammeAsync(CreateProgrammeRequest request, CancellationToken cancellationToken = default);
}
