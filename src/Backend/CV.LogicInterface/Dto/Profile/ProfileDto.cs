namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents profile data returned by the API.
    /// </summary>
    public class ProfileDto
    {
        /// <summary>
        /// Gets or sets the profile identifier.
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
        /// Gets or sets the language of the translated content, which is Finnish when the requested translation is missing.
        /// </summary>
        public string LanguageCode { get; set; } = null!;

        /// <summary>
        /// Gets or sets the candidate's full name.
        /// </summary>
        public string FullName { get; set; } = null!;

        /// <summary>
        /// Gets or sets the candidate's professional title.
        /// </summary>
        public string Title { get; set; } = null!;

        /// <summary>
        /// Gets or sets the candidate's professional summary.
        /// </summary>
        public string? Summary { get; set; }

        /// <summary>
        /// Gets or sets the candidate's location.
        /// </summary>
        public string? Location { get; set; }

        /// <summary>
        /// Gets or sets the candidate's LinkedIn profile URL.
        /// </summary>
        public string? LinkedInUrl { get; set; }

        /// <summary>
        /// Gets or sets the candidate's GitHub profile URL.
        /// </summary>
        public string? GitHubUrl { get; set; }

        /// <summary>
        /// Gets or sets the path of the profile picture, relative to the API's origin and the same in every
        /// language, or null when the profile has none. Its version parameter changes with the picture.
        /// </summary>
        public string? PictureUrl { get; set; }
    }
}