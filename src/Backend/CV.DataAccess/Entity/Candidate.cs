namespace CV.DataAccess.Entity
{
    public class Candidate : BaseEntity
    {
        public string PublicUrlSegment { get; set; } = null!;
        public Guid? ProfileId { get; set; }
        public Profile? Profile { get; set; }

        /// <summary>
        /// Gets or sets whether the owner chose never to see the notice about the profile's missing languages.
        /// </summary>
        public bool HideMissingLanguageNotice { get; set; }

        public ICollection<CandidateLogin> Logins { get; set; } = [];
    }
}