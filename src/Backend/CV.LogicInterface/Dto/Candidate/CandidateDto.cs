namespace CV.LogicInterface.Dto.Candidate
{
    /// <summary>
    /// Represents candidate relationship and identity data returned by the API.
    /// </summary>
    public class CandidateDto
    {
        /// <summary>
        /// Gets or sets the candidate's internal identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the public, URL-safe candidate slug.
        /// </summary>
        public string PublicUrlSegment { get; set; } = null!;

        /// <summary>
        /// Gets or sets when the candidate was created, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets when the candidate was last updated, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset? UpdatedAt { get; set; }

        /// <summary>
        /// Gets or sets the related profile identifier, when a profile is assigned.
        /// </summary>
        public Guid? ProfileId { get; set; }
    }
}