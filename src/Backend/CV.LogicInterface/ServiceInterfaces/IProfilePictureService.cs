using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Profile;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations for a profile's picture. Changes are saved at once, apart from the profile's other
    /// fields, and each one sets the profile's <c>UpdatedAt</c>.
    /// </summary>
    public interface IProfilePictureService
    {
        /// <summary>
        /// Saves an uploaded JPEG, PNG or WebP as the profile's picture: turned upright, scaled to at most
        /// 1200 px on its longer side and re-encoded as WebP without metadata. The previous picture is deleted.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="content">The uploaded file, at most 10 MB.</param>
        /// <param name="actor">The caller's sign-in identity, or null when the token carries none.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The new picture's URL.</returns>
        Task<ProfilePictureDto> SavePicture(
            Guid profileId,
            Stream content,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Saves the caller's Google account picture, from the <c>picture</c> claim of their Google sign-in,
        /// as the profile's picture, processed like an upload.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="actor">The caller's sign-in identity, which must be a Google sign-in.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The new picture's URL.</returns>
        Task<ProfilePictureDto> SaveGooglePicture(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Removes the profile's picture and deletes it from storage. Succeeds when there is none.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="actor">The caller's sign-in identity, or null when the token carries none.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        Task DeletePicture(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Opens the profile's picture for a public visitor.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="version">The version from the picture's URL, if the request has one.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The picture, which the caller disposes.</returns>
        Task<ProfilePictureFileDto> GetPicture(
            Guid profileId,
            string? version,
            CancellationToken cancellationToken = default);
    }
}
