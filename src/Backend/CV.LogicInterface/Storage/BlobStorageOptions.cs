namespace CV.LogicInterface.Storage
{
    /// <summary>
    /// Settings for the Azure Blob Storage account that holds profile pictures, bound from the
    /// <c>BlobStorage</c> configuration section. With neither setting, the API runs without picture storage.
    /// </summary>
    public class BlobStorageOptions
    {
        public const string SectionName = "BlobStorage";

        /// <summary>
        /// The private container that holds profile pictures.
        /// </summary>
        public const string ContainerName = "profile-pictures";

        /// <summary>
        /// Gets or sets the account's blob endpoint, such as <c>https://account.blob.core.windows.net</c>,
        /// reached with <c>DefaultAzureCredential</c>, which is the App Service's managed identity in production.
        /// It takes precedence over <see cref="ConnectionString"/>.
        /// </summary>
        public Uri? ServiceUri { get; set; }

        /// <summary>
        /// Gets or sets a connection string, for Azurite in local development only. It defaults to
        /// <c>ConnectionStrings:BlobStorage</c>.
        /// </summary>
        public string? ConnectionString { get; set; }
    }
}
