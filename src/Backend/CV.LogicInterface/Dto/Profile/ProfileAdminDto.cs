namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents profile data returned to an authorized administrator.
    /// </summary>
    public class ProfileAdminDto
    {
        /// <summary>
        /// Gets or sets the profile's internal identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets when the profile was created, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets when the profile was last updated, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the candidate's full name, shared across languages.
        /// </summary>
        public string FullName { get; set; } = null!;

        /// <summary>
        /// Gets or sets the candidate's LinkedIn profile URL, shared across languages.
        /// </summary>
        public string? LinkedInUrl { get; set; }

        /// <summary>
        /// Gets or sets the candidate's GitHub profile URL, shared across languages.
        /// </summary>
        public string? GitHubUrl { get; set; }

        /// <summary>
        /// Gets or sets all language-specific profile content.
        /// </summary>
        public IReadOnlyCollection<ProfileTranslationDto> Translations { get; set; } = [];
    }
}