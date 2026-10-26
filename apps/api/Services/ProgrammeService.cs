using Microsoft.EntityFrameworkCore;
using Preform.Api.Data;
using Preform.Api.DTOs;
using Preform.Api.Models;

namespace Preform.Api.Services;

public class ProgrammeService : IProgrammeService
{
    private readonly AppDbContext _dbContext;

    public ProgrammeService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IEnumerable<ProgrammeDto>> GetAllProgrammesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.Programmes
            .OrderBy(p => p.Code)
            .Select(p => new ProgrammeDto
            {
                Id = p.Id,
                Code = p.Code.ToString(),
                DisplayName = p.DisplayName,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<ProgrammeDto?> GetProgrammeByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Programmes
            .Where(p => p.Id == id)
            .Select(p => new ProgrammeDto
            {
                Id = p.Id,
                Code = p.Code.ToString(),
                DisplayName = p.DisplayName,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProgrammeDto?> GetProgrammeByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<ProgrammeCode>(code, true, out var programmeCode))
        {
            return null;
        }

        return await _dbContext.Programmes
            .Where(p => p.Code == programmeCode)
            .Select(p => new ProgrammeDto
            {
                Id = p.Id,
                Code = p.Code.ToString(),
                DisplayName = p.DisplayName,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<ProgrammeDto> CreateProgrammeAsync(CreateProgrammeRequest request, CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<ProgrammeCode>(request.Code, true, out var programmeCode))
        {
            throw new ArgumentException($"Invalid programme code: {request.Code}", nameof(request.Code));
        }

        var existing = await _dbContext.Programmes
            .AnyAsync(p => p.Code == programmeCode, cancellationToken);

        if (existing)
        {
            throw new InvalidOperationException($"Programme with code {request.Code} already exists.");
        }

        var programme = new Programme
        {
            Code = programmeCode,
            DisplayName = request.DisplayName,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Programmes.Add(programme);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ProgrammeDto
        {
            Id = programme.Id,
            Code = programme.Code.ToString(),
            DisplayName = programme.DisplayName,
            IsActive = programme.IsActive,
            CreatedAt = programme.CreatedAt,
            UpdatedAt = programme.UpdatedAt
        };
    }
}
