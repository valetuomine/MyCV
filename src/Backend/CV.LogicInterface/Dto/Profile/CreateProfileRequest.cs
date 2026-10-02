using System.Text.Json.Serialization;

namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents the profile data required to create a profile.
    /// </summary>
    public class CreateProfileRequest
    {
        /// <summary>
        /// Gets or sets the public identifier of an existing candidate to reattach the profile to.
        /// </summary>
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public Guid? CandidatePublicId { get; set; }

        /// <summary>
        /// Gets or sets the candidate's full name.
        /// </summary>
        public string FullName { get; set; } = null!;

        /// <summary>
        /// Gets or sets the profile translations, including the required Finnish translation.
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