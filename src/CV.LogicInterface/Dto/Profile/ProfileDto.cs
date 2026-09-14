namespace CV.LogicInterface.Dto.Profile
{
    public class ProfileDto
    {
        public Guid Id { get; set; }
        public string FullName { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Location { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? GitHubUrl { get; set; }
    }
}