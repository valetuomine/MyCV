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
        /// Shows or hides the profile's picture section on the CV and its PDF. Hiding keeps the stored picture,
        /// and works whether or not the profile has one, so the CV shows no initials either.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="isVisible">Whether the CV shows the picture section.</param>
        /// <param name="actor">The caller's sign-in identity, or null when the token carries none.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The saved visibility.</returns>
        Task<ProfilePictureVisibilityDto> SetPictureVisibility(
            Guid profileId,
            bool isVisible,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Opens the profile's picture for a public visitor. A hidden picture is not found.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="version">The version from the picture's URL, if the request has one.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The picture, which the caller disposes.</returns>
        Task<ProfilePictureFileDto> GetPicture(
            Guid profileId,
            string? version,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Opens the profile's picture for the edit view's preview, whether or not the CV shows it.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="actor">The caller's sign-in identity, or null when the token carries none.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The picture, which the caller disposes.</returns>
        Task<ProfilePictureFileDto> GetPicturePreview(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default);
    }
}
