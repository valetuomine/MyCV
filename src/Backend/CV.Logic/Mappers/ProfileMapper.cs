using CV.DataAccess.Entity;
using CV.LogicInterface.Dto.Profile;

namespace CV.Logic.Mappers
{
    /// <summary>
    /// Provides mappings between profile entities and data transfer objects.
    /// </summary>
    public static class ProfileMapper
    {
        public const string DefaultLanguageCode = "fi";

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
                LinkedInUrl = request.LinkedInUrl,
                GitHubUrl = request.GitHubUrl,
                Translations = [.. request.Translations
                    .Select(translation => new ProfileTranslation
                    {
                        LanguageCode = translation.LanguageCode.Trim().ToLowerInvariant(),
                        Title = translation.Title,
                        Summary = translation.Summary,
                        Location = translation.Location
                    })]
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
            dbProfile.LinkedInUrl = request.LinkedInUrl;
            dbProfile.GitHubUrl = request.GitHubUrl;
            dbProfile.UpdatedAt = DateTime.UtcNow;

            var incomingTranslations = request.Translations
                .ToDictionary(translation => translation.LanguageCode.Trim().ToLowerInvariant());

            foreach (var existingTranslation in dbProfile.Translations
                .Where(translation => !incomingTranslations.ContainsKey(translation.LanguageCode))
                .ToList())
            {
                dbProfile.Translations.Remove(existingTranslation);
            }

            foreach (var (languageCode, translationRequest) in incomingTranslations)
            {
                var existingTranslation = dbProfile.Translations
                    .FirstOrDefault(translation => translation.LanguageCode == languageCode);

                if (existingTranslation is null)
                {
                    dbProfile.Translations.Add(new ProfileTranslation
                    {
                        ProfileId = dbProfile.Id,
                        LanguageCode = languageCode,
                        Title = translationRequest.Title,
                        Summary = translationRequest.Summary,
                        Location = translationRequest.Location
                    });
                    continue;
                }

                existingTranslation.Title = translationRequest.Title;
                existingTranslation.Summary = translationRequest.Summary;
                existingTranslation.Location = translationRequest.Location;
                existingTranslation.UpdatedAt = DateTime.UtcNow;
            }
        }

        /// <summary>
        /// Maps a profile entity to a profile data transfer object.
        /// </summary>
        /// <param name="dbProfile">The profile entity to map.</param>
        /// <returns>A data transfer object containing the profile data.</returns>
        public static ProfileDto MapEntityToDto(this Profile dbProfile, string? languageCode)
        {
            var normalizedLanguageCode = string.IsNullOrWhiteSpace(languageCode)
                ? DefaultLanguageCode
                : languageCode.ToLowerInvariant();

            var translation = dbProfile.Translations.FirstOrDefault(item => item.LanguageCode == normalizedLanguageCode)
                ?? dbProfile.Translations.FirstOrDefault(item => item.LanguageCode == DefaultLanguageCode);

            return new ProfileDto
            {
                Id = dbProfile.Id,
                CreatedAt = TimestampMapper.ToFinlandTime(dbProfile.CreatedAt),
                UpdatedAt = TimestampMapper.ToFinlandTime(dbProfile.UpdatedAt),
                FullName = dbProfile.FullName,
                Title = translation?.Title ?? string.Empty,
                Summary = translation?.Summary,
                Location = translation?.Location,
                LinkedInUrl = dbProfile.LinkedInUrl,
                GitHubUrl = dbProfile.GitHubUrl
            };
        }

        /// <summary>
        /// Maps a profile entity and its translations to an administrator response.
        /// </summary>
        /// <param name="dbProfile">The profile entity to map.</param>
        /// <returns>A response containing all translated profile content.</returns>
        public static ProfileAdminDto MapEntityToAdminDto(this Profile dbProfile)
        {
            return new ProfileAdminDto
            {
                Id = dbProfile.Id,
                CreatedAt = TimestampMapper.ToFinlandTime(dbProfile.CreatedAt),
                UpdatedAt = TimestampMapper.ToFinlandTime(dbProfile.UpdatedAt),
                FullName = dbProfile.FullName,
                LinkedInUrl = dbProfile.LinkedInUrl,
                GitHubUrl = dbProfile.GitHubUrl,
                Translations = [.. dbProfile.Translations
                    .Select(translation => new ProfileTranslationDto
                    {
                        LanguageCode = translation.LanguageCode,
                        CreatedAt = TimestampMapper.ToFinlandTime(translation.CreatedAt),
                        UpdatedAt = TimestampMapper.ToFinlandTime(translation.UpdatedAt),
                        Title = translation.Title,
                        Summary = translation.Summary,
                        Location = translation.Location
                    })]
            };
        }

        /// <summary>
        /// Maps a profile entity to a candidate entity with the profile ID set.
        /// </summary>
        /// <param name="dbProfile">The profile entity to map.</param>
        /// <returns>A candidate entity with the profile ID set.</returns>
        public static Candidate MapProfileIdToCandidate(this Profile dbProfile)
        {
            return new Candidate
            {
                ProfileId = dbProfile.Id
            };
        }
    }
}
