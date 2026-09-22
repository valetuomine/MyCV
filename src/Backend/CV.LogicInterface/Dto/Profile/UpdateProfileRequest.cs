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
    }
}