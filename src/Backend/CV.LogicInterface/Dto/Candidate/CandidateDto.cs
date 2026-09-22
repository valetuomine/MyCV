namespace CV.LogicInterface.Dto.Candidate
{
    /// <summary>
    /// Represents candidate relationship and identity data returned by the API.
    /// </summary>
    public class CandidateDto
    {
        /// <summary>
        /// Gets or sets the candidate identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the public candidate identifier used for external references.
        /// </summary>
        public Guid PublicId { get; set; }

        /// <summary>
        /// Gets or sets the related profile identifier, when a profile is assigned.
        /// </summary>
        public Guid? ProfileId { get; set; }
    }
}