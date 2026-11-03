using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public interface IExaminationCodeService
{
    Task<string> AllocateCodeAsync(string pathway, CancellationToken ct = default);
    Task<Examination> CreateExaminationAsync(CreateExaminationRequest request, string actorId, CancellationToken ct = default);
}
