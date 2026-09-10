using CV.DataAccess.Entity;
using CV.LogicInterface.Dto;

namespace CV.Logic.Mappers
{
    /// <summary>
    /// Provides mappings between profile entities and data transfer objects.
    /// </summary>
    public static class ProfileMapper
    {
        /// <summary>
        /// Maps a profile entity to a profile data transfer object.
        /// </summary>
        /// <param name="dbProfile">The profile entity to map.</param>
        /// <returns>A data transfer object containing the profile data.</returns>
        public static ProfileDto MapEntityToDto(this Profile dbProfile)
        {
            return new ProfileDto
            {
                FullName = dbProfile.FullName,
                Title = dbProfile.Title,
                Summary = dbProfile.Summary,
                Location = dbProfile.Location,
                LinkedInUrl = dbProfile.LinkedInUrl,
                GitHubUrl = dbProfile.GitHubUrl
            };
        }
    }
}
