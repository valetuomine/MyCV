namespace CV.DataAccess.Entity
{
    public class Profile : BaseEntity
    {
        public string FullName { get; set; } = null!;
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }

        public ICollection<ProfileTranslation> Translations { get; set; } = [];
    }
}
