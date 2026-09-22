namespace CV.DataAccess.Entity
{
    public class Candidate : BaseEntity
    {
        public Guid PublicId { get; set; } = Guid.NewGuid();

        public Guid? ProfileId { get; set; }
        public Profile? Profile { get; set; }
    }
}