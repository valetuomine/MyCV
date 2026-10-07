namespace CV.DataAccess.Entity
{
    public class Candidate : BaseEntity
    {
        public Guid? ProfileId { get; set; }
        public Profile? Profile { get; set; }
    }
}