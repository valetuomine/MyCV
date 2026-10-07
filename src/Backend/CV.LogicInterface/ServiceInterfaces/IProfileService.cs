using CV.LogicInterface.Dto.Profile;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations for retrieving profiles.
    /// </summary>
    public interface IProfileService
    {
        /// <summary>
        /// Creates a profile.
        /// </summary>
        /// <param name="request">The profile values to create.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The created profile.</returns>
        Task<ProfileAdminDto> CreateProfile(CreateProfileRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves the profile using the requested language, defaulting to Finnish.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to retrieve.</param>
        /// <param name="languageCode">The requested language code, either "fi" or "en".</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The profile with content resolved for the requested language.</returns>
        Task<ProfileDto> GetProfile(Guid profileId, string? languageCode, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves all profile translations for an authorized administrator.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to retrieve.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The profile and all its translations.</returns>
        Task<ProfileAdminDto> GetProfileAdmin(Guid profileId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes a profile while preserving its candidate row.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to delete.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        Task DeleteProfile(Guid profileId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Replaces a profile by its identifier.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to replace.</param>
        /// <param name="request">The replacement profile values.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The updated profile.</returns>
        Task<ProfileAdminDto> UpdateProfile(Guid profileId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    }
}
