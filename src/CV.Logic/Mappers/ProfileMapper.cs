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
        /// Maps a create request to a new profile entity.
        /// </summary>
        /// <param name="request">The profile values to map.</param>
        /// <returns>A new profile entity.</returns>
        public static Profile MapRequestToEntity(this CreateProfileRequest request)
        {
            return new Profile
            {
                FullName = request.FullName,
                Title = request.Title,
                Summary = request.Summary,
                Location = request.Location,
                LinkedInUrl = request.LinkedInUrl,
                GitHubUrl = request.GitHubUrl
            };
        }

        /// <summary>
        /// Applies an update request to an existing profile entity.
        /// </summary>
        /// <param name="request">The replacement profile values.</param>
        /// <param name="dbProfile">The tracked profile entity to update.</param>
        public static void MapRequestToEntity(this UpdateProfileRequest request, Profile dbProfile)
        {
            dbProfile.FullName = request.FullName;
            dbProfile.Title = request.Title;
            dbProfile.Summary = request.Summary;
            dbProfile.Location = request.Location;
            dbProfile.LinkedInUrl = request.LinkedInUrl;
            dbProfile.GitHubUrl = request.GitHubUrl;
        }

        /// <summary>
        /// Maps a profile entity to a profile data transfer object.
        /// </summary>
        /// <param name="dbProfile">The profile entity to map.</param>
        /// <returns>A data transfer object containing the profile data.</returns>
        public static ProfileDto MapEntityToDto(this Profile dbProfile)
        {
            return new ProfileDto
            {
                Id = dbProfile.Id,
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
