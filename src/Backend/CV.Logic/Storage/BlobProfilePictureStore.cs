using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using CV.Common.Exceptions;
using CV.LogicInterface.ServiceInterfaces;
using CV.LogicInterface.Storage;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CV.Logic.Storage
{
    /// <summary>
    /// Keeps profile pictures in Azure Blob Storage. Production signs in with <c>DefaultAzureCredential</c>
    /// (the App Service's managed identity) at <see cref="BlobStorageOptions.ServiceUri"/>; local development
    /// uses an Azurite connection string. Registered as a singleton, so one client is shared.
    /// </summary>
    public sealed class BlobProfilePictureStore : IProfilePictureStore
    {
        private const string NotConfiguredMessage = "Profile picture storage is not set up.";
        private const string UnreachableMessage = "Profile picture storage could not be reached.";

        private readonly BlobContainerClient? _container;
        private readonly ILogger<BlobProfilePictureStore> _logger;

        public BlobProfilePictureStore(IOptions<BlobStorageOptions> options, ILogger<BlobProfilePictureStore> logger)
        {
            _logger = logger;

            // Fail fast rather than after the default five retries, so a storage outage answers in seconds.
            var clientOptions = new BlobClientOptions
            {
                Retry =
                {
                    Mode = RetryMode.Exponential,
                    MaxRetries = 2,
                    NetworkTimeout = TimeSpan.FromSeconds(20)
                }
            };

            var settings = options.Value;
            BlobServiceClient? service = settings.ServiceUri is { } serviceUri
                ? new BlobServiceClient(serviceUri, new DefaultAzureCredential(), clientOptions)
                : !string.IsNullOrWhiteSpace(settings.ConnectionString)
                    ? new BlobServiceClient(settings.ConnectionString, clientOptions)
                    : null;

            _container = service?.GetBlobContainerClient(BlobStorageOptions.ContainerName);
        }

        public bool IsConfigured => _container is not null;

        public async Task Upload(string blobName, byte[] content, string contentType, CancellationToken cancellationToken = default)
        {
            var container = _container ?? throw new ServiceUnavailableException(NotConfiguredMessage);
            var blob = container.GetBlobClient(blobName);
            var uploadOptions = new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
                // Blob names are never reused, so an existing blob is never overwritten.
                Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All }
            };

            try
            {
                try
                {
                    await blob.UploadAsync(BinaryData.FromBytes(content), uploadOptions, cancellationToken);
                }
                catch (RequestFailedException exception) when (exception.ErrorCode == BlobErrorCode.ContainerNotFound)
                {
                    await container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: cancellationToken);
                    await blob.UploadAsync(BinaryData.FromBytes(content), uploadOptions, cancellationToken);
                }
            }
            catch (Exception exception) when (IsStorageFailure(exception))
            {
                throw new BadGatewayException(UnreachableMessage, exception);
            }
        }

        public async Task<StoredProfilePicture?> Download(string blobName, CancellationToken cancellationToken = default)
        {
            var container = _container ?? throw new ServiceUnavailableException(NotConfiguredMessage);

            try
            {
                var response = await container.GetBlobClient(blobName).DownloadStreamingAsync(cancellationToken: cancellationToken);
                var result = response.Value;
                return new StoredProfilePicture(
                    result.Content,
                    result.Details.ContentType,
                    result.Details.LastModified);
            }
            catch (RequestFailedException exception) when (exception.Status == 404)
            {
                return null;
            }
            catch (Exception exception) when (IsStorageFailure(exception))
            {
                throw new BadGatewayException(UnreachableMessage, exception);
            }
        }

        public async Task RemoveUnused(string blobName)
        {
            if (_container is null)
            {
                _logger.LogWarning("Could not delete unused profile picture {BlobName}: storage is not set up.", blobName);
                return;
            }

            try
            {
                // Not cancellable: the database change it follows is already saved.
                await _container.GetBlobClient(blobName).DeleteIfExistsAsync(
                    DeleteSnapshotsOption.IncludeSnapshots,
                    cancellationToken: CancellationToken.None);
            }
            catch (Exception exception) when (IsStorageFailure(exception))
            {
                _logger.LogWarning(exception, "Could not delete unused profile picture {BlobName}.", blobName);
            }
        }

        /// <summary>
        /// Tells failures of the storage account apart from bugs. Azure.Core throws an
        /// <see cref="AggregateException"/> once every retry has failed.
        /// </summary>
        private static bool IsStorageFailure(Exception exception)
        {
            return exception is RequestFailedException or AggregateException or AuthenticationFailedException;
        }
    }
}
