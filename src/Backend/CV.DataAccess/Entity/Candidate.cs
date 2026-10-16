namespace CV.DataAccess.Entity
{
    public class Candidate : BaseEntity
    {
        public string PublicUrlSegment { get; set; } = null!;
        public string? OwnerEntraObjectId { get; set; }
        public Guid? ProfileId { get; set; }
        public Profile? Profile { get; set; }
    }
}