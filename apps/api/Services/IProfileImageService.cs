using Preform.Api.DTOs;

namespace Preform.Api.Services;

public interface IProfileImageService
{
    Task<ProfileImageMetadataDto> UpsertProfileImageAsync(
        string authenticatedUserId,
        string authenticatedUserEmail,
        string? displayName,
        byte[] imageBytes,
        string? declaredContentType);

    Task<ProfileImageBinaryDto?> GetProfileImageAsync(
        string authenticatedUserId,
        string authenticatedUserEmail);

    Task<bool> DeleteProfileImageAsync(
        string authenticatedUserId,
        string authenticatedUserEmail);
}
