namespace CV.DataAccess.Entity
{
    public class Profile : BaseEntity
    {
        public string FullName { get; set; } = null!;
        public string DefaultLanguageCode { get; set; } = "fi";
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }
        public string? PictureBlobName { get; set; }
        public bool ShowPicture { get; set; } = true;

        public ICollection<ProfileTranslation> Translations { get; set; } = [];
    }
}
