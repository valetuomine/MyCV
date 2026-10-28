using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Extensions;
using CV.Logic.Mappers;
using CV.Logic.Pictures;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    public class ProfilePictureService(
        CvContext dataContext,
        IProfilePictureStore pictureStore,
        HttpClient httpClient) : BaseService(dataContext), IProfilePictureService
    {
        private readonly CvContext _dataContext = dataContext;
        private readonly IProfilePictureStore _pictureStore = pictureStore;

        // Registered without redirects and with a short timeout, see Program.cs.
        private readonly HttpClient _httpClient = httpClient;

        public async Task<ProfilePictureDto> SavePicture(
            Guid profileId,
            Stream content,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            await EnsureCanChangePicture(profileId, actor, canManageAny, cancellationToken);

            var upload = await ReadAtMost(content, ProfilePictureProcessor.MaxUploadBytes, cancellationToken)
                ?? throw new PayloadTooLargeException("The image must be 10 MB or smaller.");

            return await ReplacePicture(profileId, ProfilePictureProcessor.ToWebp(upload), cancellationToken);
        }

        public async Task<ProfilePictureDto> SaveGooglePicture(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            if (actor?.Provider != LoginProvider.Google)
            {
                throw new BadRequestException("Only a Google sign-in can use its Google profile picture.");
            }

            // The URL comes from the validated Google token, never from the request, and is still
            // limited to Google's picture host.
            var pictureUri = GooglePictureUri.ForStoredSize(actor.PictureUrl)
                ?? throw new BadRequestException("This Google account has no profile picture.");

            await EnsureCanChangePicture(profileId, actor, canManageAny, cancellationToken);

            var download = await DownloadGooglePicture(pictureUri, cancellationToken);
            byte[] picture;
            try
            {
                picture = ProfilePictureProcessor.ToWebp(download);
            }
            catch (Exception exception) when (exception is UnsupportedMediaTypeException or PayloadTooLargeException)
            {
                throw new BadGatewayException("Google's profile picture could not be read.", exception);
            }

            return await ReplacePicture(profileId, picture, cancellationToken);
        }

        public async Task DeletePicture(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            await EnsureCanChangePicture(profileId, actor, canManageAny, cancellationToken);

            if (await ReadPictureBlobName(profileId, cancellationToken) is not { } previousBlobName)
            {
                return;
            }

            await SwapPicture(profileId, previousBlobName, null, cancellationToken);
            await _pictureStore.RemoveUnused(previousBlobName);
        }

        public async Task<ProfilePictureFileDto> GetPicture(
            Guid profileId,
            string? version,
            CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var blobName = await ReadPictureBlobName(profileId, cancellationToken)
                ?? throw new NotFoundException($"Profile picture not found for profile Id: {profileId}");

            var stored = await _pictureStore.Download(blobName, cancellationToken)
                ?? throw new NotFoundException($"Profile picture not found for profile Id: {profileId}");

            var currentVersion = ProfilePictureNames.GetVersion(blobName);
            return new ProfilePictureFileDto
            {
                Content = stored.Content,
                ContentType = string.IsNullOrEmpty(stored.ContentType) ? ProfilePictureProcessor.ContentType : stored.ContentType,
                LastModified = stored.LastModified,
                ETag = $"\"{currentVersion}\"",
                IsCurrentVersion = string.Equals(version, currentVersion, StringComparison.Ordinal)
            };
        }

        /// <summary>
        /// Lets the profile's owner, or any caller with <c>CvAdmin</c>, change its picture, once storage is set up.
        /// A non-owner gets 404, like the other profile changes.
        /// </summary>
        private async Task EnsureCanChangePicture(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var canChange = await _dataContext.CandidateLogin.OwnsProfile(actor, profileId, cancellationToken)
                || (canManageAny && await _dataContext.Profile.AnyAsync(profile => profile.Id == profileId, cancellationToken));
            if (!canChange)
            {
                throw new NotFoundException($"Profile not found with Id: {profileId}");
            }

            if (!_pictureStore.IsConfigured)
            {
                throw new ServiceUnavailableException("Profile picture storage is not set up.");
            }
        }

        /// <summary>
        /// Stores the new picture under a new name, points the profile at it and deletes the previous one.
        /// When pointing the profile at it fails, the new blob is deleted instead, so no blob is left unused.
        /// </summary>
        private async Task<ProfilePictureDto> ReplacePicture(Guid profileId, byte[] picture, CancellationToken cancellationToken)
        {
            var previousBlobName = await ReadPictureBlobName(profileId, cancellationToken);
            var blobName = ProfilePictureNames.NewBlobName(profileId);
            await _pictureStore.Upload(blobName, picture, ProfilePictureProcessor.ContentType, cancellationToken);

            try
            {
                await SwapPicture(profileId, previousBlobName, blobName, cancellationToken);
            }
            catch
            {
                await _pictureStore.RemoveUnused(blobName);
                throw;
            }

            if (previousBlobName is not null)
            {
                await _pictureStore.RemoveUnused(previousBlobName);
            }

            return new ProfilePictureDto { PictureUrl = ProfileMapper.ToPictureUrl(profileId, blobName)! };
        }

        /// <summary>
        /// Points the profile at a new picture, or at none, only while it still has the picture this request
        /// read. Two changes at the same time then can't both replace the same picture, which would leave the
        /// first one's blob unused; the later one gets 409 instead.
        /// </summary>
        private async Task SwapPicture(
            Guid profileId,
            string? expectedBlobName,
            string? newBlobName,
            CancellationToken cancellationToken)
        {
            DateTime? updatedAt = DateTime.UtcNow;
            var updated = await _dataContext.Profile
                .Where(profile => profile.Id == profileId && profile.PictureBlobName == expectedBlobName)
                .ExecuteUpdateAsync(
                    setters => setters
                        .SetProperty(profile => profile.PictureBlobName, newBlobName)
                        .SetProperty(profile => profile.UpdatedAt, updatedAt),
                    cancellationToken);

            if (updated == 0)
            {
                throw new ConflictException("The profile picture was changed at the same time. Try again.");
            }
        }

        private Task<string?> ReadPictureBlobName(Guid profileId, CancellationToken cancellationToken)
        {
            return _dataContext.Profile
                .AsNoTracking()
                .Where(profile => profile.Id == profileId)
                .Select(profile => profile.PictureBlobName)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private async Task<byte[]> DownloadGooglePicture(Uri pictureUri, CancellationToken cancellationToken)
        {
            try
            {
                using var response = await _httpClient.GetAsync(
                    pictureUri,
                    HttpCompletionOption.ResponseHeadersRead,
                    cancellationToken);

                // Redirects are off, so a redirect lands here too instead of being followed.
                if (!response.IsSuccessStatusCode)
                {
                    throw new BadGatewayException(
                        $"Google answered {(int)response.StatusCode} for the profile picture.");
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                return await ReadAtMost(stream, ProfilePictureProcessor.MaxUploadBytes, cancellationToken)
                    ?? throw new BadGatewayException("Google's profile picture is too large.");
            }
            catch (Exception exception) when (exception is HttpRequestException
                || (exception is TaskCanceledException && !cancellationToken.IsCancellationRequested))
            {
                throw new BadGatewayException("Google's profile picture could not be fetched.", exception);
            }
        }

        /// <summary>
        /// Reads a stream into memory, stopping as soon as it passes the limit.
        /// </summary>
        /// <returns>The bytes, or null when the stream is longer than <paramref name="maxBytes"/>.</returns>
        private static async Task<byte[]?> ReadAtMost(Stream content, int maxBytes, CancellationToken cancellationToken)
        {
            using var buffer = new MemoryStream();
            var chunk = new byte[81920];
            int read;
            while ((read = await content.ReadAsync(chunk, cancellationToken)) > 0)
            {
                if (buffer.Length + read > maxBytes)
                {
                    return null;
                }

                buffer.Write(chunk, 0, read);
            }

            return buffer.ToArray();
        }
    }
}
