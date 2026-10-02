namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents one language's editable profile content.
    /// </summary>
    public class ProfileTranslationRequest
    {
        /// <summary>
        /// Gets or sets the two-letter language code, either "fi" or "en".
        /// </summary>
        public string LanguageCode { get; set; } = null!;

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