namespace CV.DataAccess.Entity
{
    public class Candidate : BaseEntity
    {
        public string PublicUrlSegment { get; set; } = null!;
        public Guid? ProfileId { get; set; }
        public Profile? Profile { get; set; }

        public ICollection<CandidateLogin> Logins { get; set; } = [];
    }
}