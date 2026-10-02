namespace CV.DataAccess.Entity
{
    public class ProfileTranslation : BaseEntity
    {
        public Guid ProfileId { get; set; }
        public Profile Profile { get; set; } = null!;

        public string LanguageCode { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Location { get; set; }
    }
}