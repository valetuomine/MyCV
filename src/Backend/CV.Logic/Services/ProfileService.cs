using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Mappers;
using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    public class ProfileService(CvContext dataContext) : BaseService(dataContext), IProfileService
    {
        private readonly CvContext _dataContext = dataContext;
        private static readonly HashSet<string> SupportedLanguageCodes = ["fi", "en"];

        public async Task<ProfileAdminDto> CreateProfile(CreateProfileRequest request, CancellationToken cancellationToken = default)
        {
            ValidateRequest(request.FullName, request.Translations);

            var dbProfile = request.MapRequestToEntity();
            Candidate? dbCandidate = null;

            if (request.CandidateId is Guid candidateId)
            {
                var candidate = await _dataContext.Candidate
                    .FirstOrDefaultAsync(ca => ca.Id == candidateId, cancellationToken)
                    ?? throw new NotFoundException($"Candidate not found with Id: {candidateId}");

                if (candidate.ProfileId is not null)
                {
                    throw new BadRequestException("Candidate already has a profile.");
                }

                candidate.ProfileId = dbProfile.Id;
                dbCandidate = candidate;
            }
            else
            {
                dbCandidate = dbProfile.MapProfileIdToCandidate();
            }

            await _dataContext.Profile.AddAsync(dbProfile, cancellationToken);
            if (request.CandidateId is null)
            {
                await _dataContext.Candidate.AddAsync(dbCandidate, cancellationToken);
            }
            await _dataContext.SaveChangesAsync(cancellationToken);

            var result = dbProfile.MapEntityToAdminDto();
            result.CandidateId = dbCandidate.Id;
            return result;
        }

        public async Task<ProfileDto> GetProfile(Guid profileId, string? languageCode, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var normalizedLanguageCode = NormalizeLanguageCode(languageCode);
            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .AsNoTracking()
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken);

            return dbProfile?.MapEntityToDto(normalizedLanguageCode)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");
        }

        public async Task<ProfileAdminDto> GetProfileAdmin(Guid profileId, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .AsNoTracking()
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            var result = dbProfile.MapEntityToAdminDto();
            result.CandidateId = await _dataContext.Candidate
                .AsNoTracking()
                .Where(candidate => candidate.ProfileId == profileId)
                .Select(candidate => (Guid?)candidate.Id)
                .FirstOrDefaultAsync(cancellationToken);

            return result;
        }

        public async Task DeleteProfile(Guid profileId, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var dbProfile = await _dataContext.Profile
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            var dbCandidate = await _dataContext.Candidate
                .FirstOrDefaultAsync(candidate => candidate.ProfileId == profileId, cancellationToken);

            dbCandidate?.ProfileId = null;

            _dataContext.Profile.Remove(dbProfile);
            await _dataContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<ProfileAdminDto> UpdateProfile(Guid profileId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            ValidateRequest(request.FullName, request.Translations);

            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken) ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            request.MapRequestToEntity(dbProfile);

            await _dataContext.SaveChangesAsync(cancellationToken);

            var result = dbProfile.MapEntityToAdminDto();
            result.CandidateId = await _dataContext.Candidate
                .AsNoTracking()
                .Where(candidate => candidate.ProfileId == profileId)
                .Select(candidate => (Guid?)candidate.Id)
                .FirstOrDefaultAsync(cancellationToken);

            return result;
        }

        private static void ValidateRequest(string fullName, IReadOnlyCollection<ProfileTranslationRequest> translations)
        {
            if (string.IsNullOrWhiteSpace(fullName))
            {
                throw new BadRequestException("FullName is required.");
            }

            if (translations is null || translations.Count == 0)
            {
                throw new BadRequestException("At least one profile translation is required.");
            }

            var normalizedLanguageCodes = new HashSet<string>(StringComparer.Ordinal);
            foreach (var translation in translations)
            {
                if (translation is null || string.IsNullOrWhiteSpace(translation.LanguageCode))
                {
                    throw new BadRequestException("Each translation requires a language code.");
                }

                var normalizedLanguageCode = translation.LanguageCode.Trim().ToLowerInvariant();
                if (!SupportedLanguageCodes.Contains(normalizedLanguageCode))
                {
                    throw new BadRequestException($"Unsupported language code: {translation.LanguageCode}");
                }

                if (!normalizedLanguageCodes.Add(normalizedLanguageCode))
                {
                    throw new BadRequestException($"Duplicate translation language code: {normalizedLanguageCode}");
                }

                if (string.IsNullOrWhiteSpace(translation.Title))
                {
                    throw new BadRequestException($"Title is required for language: {normalizedLanguageCode}");
                }
            }

            if (!normalizedLanguageCodes.Contains(ProfileMapper.DefaultLanguageCode))
            {
                throw new BadRequestException("A Finnish (fi) translation is required.");
            }
        }

        private static string NormalizeLanguageCode(string? languageCode)
        {
            var normalizedLanguageCode = string.IsNullOrWhiteSpace(languageCode)
                ? ProfileMapper.DefaultLanguageCode
                : languageCode.Trim().ToLowerInvariant();

            if (!SupportedLanguageCodes.Contains(normalizedLanguageCode))
            {
                throw new BadRequestException($"Unsupported language code: {languageCode}");
            }

            return normalizedLanguageCode;
        }
    }
}
