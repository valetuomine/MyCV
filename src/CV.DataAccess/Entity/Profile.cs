namespace CV.DataAccess.Entity
{
    public class Profile : BaseEntity
    {
        public string FullName { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Location { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }
    }
}
