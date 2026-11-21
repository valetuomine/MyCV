namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents the complete profile data used to replace an existing profile.
    /// </summary>
    public class UpdateProfileRequest
    {
        /// <summary>
        /// Gets or sets the candidate's full name.
        /// </summary>
        public string FullName { get; set; } = null!;

        /// <summary>
        /// Gets or sets the language that the profile falls back to when a requested translation is missing.
        /// A missing or blank value keeps the stored default language. The request must include a translation in this language.
        /// </summary>
        public string? DefaultLanguageCode { get; set; }

        /// <summary>
        /// Gets or sets the complete set of profile translations, including the required default language translation.
        /// </summary>
        public IReadOnlyCollection<ProfileTranslationRequest> Translations { get; set; } = [];

        /// <summary>
        /// Gets or sets the candidate's LinkedIn profile URL.
        /// </summary>
        public string? LinkedInUrl { get; set; }

        /// <summary>
        /// Gets or sets the candidate's GitHub profile URL.
        /// </summary>
        public string? GitHubUrl { get; set; }
    }
}