namespace CV.DataAccess.Entity
{
    public class CandidateLogin : BaseEntity
    {
        public Guid CandidateId { get; set; }
        public Candidate Candidate { get; set; } = null!;

        public string Provider { get; set; } = null!;
        public string ProviderTenantId { get; set; } = null!;
        public string ProviderUserId { get; set; } = null!;
        public DateTime? LastSignInAt { get; set; }
    }
}
