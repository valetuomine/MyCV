namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents a profile rendered as a PDF document.
    /// </summary>
    public class ProfilePdfDto
    {
        /// <summary>
        /// The media type of the rendered document.
        /// </summary>
        public const string ContentType = "application/pdf";

        /// <summary>
        /// Gets or sets the suggested file name for the document, including the language code.
        /// </summary>
        public string FileName { get; set; } = null!;

        /// <summary>
        /// Gets or sets the rendered PDF bytes.
        /// </summary>
        public byte[] Content { get; set; } = [];

        /// <summary>
        /// Gets or sets when the document was printed.
        /// </summary>
        public DateTimeOffset LastModified { get; set; }

        /// <summary>
        /// Gets or sets the quoted entity tag, a hash of the document's bytes.
        /// </summary>
        public string ETag { get; set; } = null!;
    }
}
