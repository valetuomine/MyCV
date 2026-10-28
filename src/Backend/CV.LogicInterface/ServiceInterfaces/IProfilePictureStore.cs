using CV.LogicInterface.Storage;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Stores profile pictures as blobs in the private <c>profile-pictures</c> container. Blob names are
    /// never reused, so a stored picture never changes. Without a configured storage account, uploads and
    /// downloads fail with 503; when the account can't be reached, they fail with 502.
    /// </summary>
    public interface IProfilePictureStore
    {
        /// <summary>
        /// Gets whether a storage account is configured.
        /// </summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Stores a new picture, creating the private container first if it doesn't exist yet.
        /// </summary>
        /// <param name="blobName">The new blob's name, which must not exist yet.</param>
        /// <param name="content">The picture's bytes.</param>
        /// <param name="contentType">The picture's media type.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        Task Upload(string blobName, byte[] content, string contentType, CancellationToken cancellationToken = default);

        /// <summary>
        /// Opens a stored picture for reading.
        /// </summary>
        /// <param name="blobName">The blob's name.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The picture, or null when the blob doesn't exist.</returns>
        Task<StoredProfilePicture?> Download(string blobName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes a picture that the database no longer refers to. Failures, and a missing storage
        /// account, are logged instead of thrown, because the database change is already saved.
        /// </summary>
        /// <param name="blobName">The blob's name.</param>
        /// <returns>A task that completes once the blob is deleted or the failure is logged.</returns>
        Task RemoveUnused(string blobName);
    }
}
