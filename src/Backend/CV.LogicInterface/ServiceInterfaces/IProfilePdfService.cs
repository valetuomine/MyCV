using CV.LogicInterface.Dto.Profile;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations for rendering profiles as PDF documents.
    /// </summary>
    public interface IProfilePdfService
    {
        /// <summary>
        /// Renders the profile as a PDF using the requested language, defaulting to Finnish.
        /// </summary>
        /// <param name="profileId">The identifier of the profile to render.</param>
        /// <param name="languageCode">The requested language code, either "fi" or "en".</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The rendered PDF and its suggested file name.</returns>
        Task<ProfilePdfDto> GetProfilePdf(
            Guid profileId,
            string? languageCode,
            CancellationToken cancellationToken = default);
    }
}
