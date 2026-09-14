using CV.LogicInterface.Dto;

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
        Task<ProfileDto> CreateProfile(CreateProfileRequest request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves a profile by its identifier.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to retrieve.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The profile matching the specified identifier.</returns>
        Task<ProfileDto> GetProfile(Guid profileId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Replaces a profile by its identifier.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to replace.</param>
        /// <param name="request">The replacement profile values.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The updated profile.</returns>
        Task<ProfileDto> UpdateProfile(Guid profileId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
    }
}
