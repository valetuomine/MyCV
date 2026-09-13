using CV.LogicInterface.Dto;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations for retrieving profiles.
    /// </summary>
    public interface IProfileService
    {
        /// <summary>
        /// Retrieves a profile by its identifier.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to retrieve.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The profile matching the specified identifier.</returns>
        Task<ProfileDto> GetProfile(Guid profileId, CancellationToken cancellationToken = default);
    }
}
