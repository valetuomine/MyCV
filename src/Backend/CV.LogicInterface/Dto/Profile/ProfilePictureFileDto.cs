namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents a stored profile picture streamed to a visitor.
    /// </summary>
    public sealed class ProfilePictureFileDto
    {
        /// <summary>
        /// Gets or sets the picture's bytes, read from storage as they are sent.
        /// </summary>
        public Stream Content { get; set; } = null!;

        /// <summary>
        /// Gets or sets the picture's media type.
        /// </summary>
        public string ContentType { get; set; } = null!;

        /// <summary>
        /// Gets or sets when the picture was stored.
        /// </summary>
        public DateTimeOffset LastModified { get; set; }

        /// <summary>
        /// Gets or sets the quoted entity tag. A stored picture never changes, so it is the picture's version.
        /// </summary>
        public string ETag { get; set; } = null!;

        /// <summary>
        /// Gets or sets whether the request named the picture's current version, so it may be cached for good.
        /// </summary>
        public bool IsCurrentVersion { get; set; }
    }
}
