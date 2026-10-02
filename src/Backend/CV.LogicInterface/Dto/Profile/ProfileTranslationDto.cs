namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents one translated version of a profile.
    /// </summary>
    public class ProfileTranslationDto
    {
        /// <summary>
        /// Gets or sets the two-letter language code.
        /// </summary>
        public string LanguageCode { get; set; } = null!;

        /// <summary>
        /// Gets or sets when this language's content was created, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets when this language's content was last updated, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the candidate's professional title in this language.
        /// </summary>
        public string Title { get; set; } = null!;

        /// <summary>
        /// Gets or sets the candidate's professional summary in this language.
        /// </summary>
        public string? Summary { get; set; }

        /// <summary>
        /// Gets or sets the candidate's location in this language.
        /// </summary>
        public string? Location { get; set; }
    }
}