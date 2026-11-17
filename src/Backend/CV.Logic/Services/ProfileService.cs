using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Extensions;
using CV.Logic.Mappers;
using CV.Logic.Validation;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Services
{
    public class ProfileService : BaseService, IProfileService
    {
        private readonly CvContext _dataContext;
        private readonly GoogleAuthenticationOptions _googleOptions;

        // Frontend routes that start with a static segment: /admin and /print/{profileId}.
        private static readonly HashSet<string> ReservedPublicUrlSegments = ["admin", "print"];

        public ProfileService(
            CvContext dataContext,
            IOptions<GoogleAuthenticationOptions> googleOptions)
            : base(dataContext)
        {
            _dataContext = dataContext;
            _googleOptions = googleOptions.Value;
        }

        public async Task<ProfileAdminDto> CreateProfile(
            CreateProfileRequest request,
            ExternalIdentity owner,
            CancellationToken cancellationToken = default)
        {
            ValidateRequest(request.FullName, request.Translations, request.LinkedInUrl, request.GitHubUrl);

            var dbProfile = request.MapRequestToEntity();
            if (await _dataContext.CandidateLogin.ForIdentity(owner).AnyAsync(cancellationToken))
            {
                throw new ConflictException("This sign-in already has a CV.");
            }

            EnsureCanSignUp(owner);

            var publicUrlSegment = NormalizeAndValidatePublicUrlSegment(request.PublicUrlSegment);
            if (await _dataContext.Candidate.AnyAsync(
                candidate => candidate.PublicUrlSegment == publicUrlSegment,
                cancellationToken))
            {
                throw new BadRequestException(
                    $"A public CV with URL segment '{publicUrlSegment}' already exists.");
            }

            var dbCandidate = dbProfile.MapProfileIdToCandidate(publicUrlSegment);
            dbCandidate.Logins.Add(owner.MapIdentityToLogin());

            await _dataContext.Profile.AddAsync(dbProfile, cancellationToken);
            await _dataContext.Candidate.AddAsync(dbCandidate, cancellationToken);
            await _dataContext.SaveChangesAsync(cancellationToken);

            var result = dbProfile.MapEntityToAdminDto();
            FillAdminDto(result, dbCandidate.Id, dbCandidate.PublicUrlSegment, isOwner: true);
            return result;
        }

        public async Task<ProfileDto> GetProfile(Guid profileId, string? languageCode, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var normalizedLanguageCode = NormalizeAndValidateLanguageCode(languageCode);
            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .AsNoTracking()
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken);

            return dbProfile?.MapEntityToDto(normalizedLanguageCode)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");
        }

        public async Task<ProfileAdminDto> GetProfileAdmin(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            var isOwner = await EnsureCanManageProfile(profileId, actor, canManageAny, cancellationToken);

            if (actor is not null)
            {
                await _dataContext.CandidateLogin
                    .ForIdentity(actor)
                    .Where(login => login.Candidate.ProfileId == profileId)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(login => login.LastSignInAt, DateTime.UtcNow),
                        cancellationToken);
            }

            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .AsNoTracking()
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            var result = dbProfile.MapEntityToAdminDto();
            await FillAdminDto(result, profileId, isOwner, cancellationToken);
            return result;
        }

        public async Task<ProfileAdminDto> UpdateProfile(
            Guid profileId,
            UpdateProfileRequest request,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            var isOwner = await EnsureCanManageProfile(profileId, actor, canManageAny, cancellationToken);

            ValidateRequest(request.FullName, request.Translations, request.LinkedInUrl, request.GitHubUrl);

            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken) ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            request.MapRequestToEntity(dbProfile);

            await _dataContext.SaveChangesAsync(cancellationToken);

            var result = dbProfile.MapEntityToAdminDto();
            await FillAdminDto(result, profileId, isOwner, cancellationToken);
            return result;
        }

        /// <summary>
        /// Fills the fields of the administrator response that come from the profile's candidate.
        /// </summary>
        private static void FillAdminDto(ProfileAdminDto result, Guid? candidateId, string? publicUrlSegment, bool isOwner)
        {
            result.CandidateId = candidateId;
            result.PublicUrlSegment = publicUrlSegment;
            result.IsOwner = isOwner;
        }

        private async Task FillAdminDto(
            ProfileAdminDto result,
            Guid profileId,
            bool isOwner,
            CancellationToken cancellationToken)
        {
            var candidate = await _dataContext.Candidate
                .AsNoTracking()
                .Where(candidate => candidate.ProfileId == profileId)
                .Select(candidate => new { candidate.Id, candidate.PublicUrlSegment })
                .FirstOrDefaultAsync(cancellationToken);

            FillAdminDto(result, candidate?.Id, candidate?.PublicUrlSegment, isOwner);
        }

        private static void ValidateRequest(
            string fullName,
            IReadOnlyCollection<ProfileTranslationRequest> translations,
            string? linkedInUrl,
            string? gitHubUrl)
        {
            if (string.IsNullOrWhiteSpace(fullName))
            {
                throw new BadRequestException("FullName is required.");
            }

            if (!ProfileLinkUri.IsAllowed(linkedInUrl))
            {
                throw new BadRequestException("LinkedInUrl must be an http or https link.");
            }

            if (!ProfileLinkUri.IsAllowed(gitHubUrl))
            {
                throw new BadRequestException("GitHubUrl must be an http or https link.");
            }

            if (translations is null || translations.Count == 0)
            {
                throw new BadRequestException("At least one profile translation is required.");
            }

            ValidateTranslations(translations);
        }

        private static void ValidateTranslations(IReadOnlyCollection<ProfileTranslationRequest> translations)
        {
            var normalizedLanguageCodes = new HashSet<string>(StringComparer.Ordinal);
            foreach (var translation in translations)
            {
                if (translation is null || string.IsNullOrWhiteSpace(translation.LanguageCode))
                {
                    throw new BadRequestException("Each translation requires a language code.");
                }

                var normalizedLanguageCode = ProfileMapper.NormalizeLanguageCode(translation.LanguageCode);
                if (!ProfileMapper.IsSupportedLanguageCode(normalizedLanguageCode))
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

        private static string NormalizeAndValidateLanguageCode(string? languageCode)
        {
            var normalizedLanguageCode = ProfileMapper.NormalizeLanguageCode(languageCode);
            if (!ProfileMapper.IsSupportedLanguageCode(normalizedLanguageCode))
            {
                throw new BadRequestException($"Unsupported language code: {languageCode}");
            }

            return normalizedLanguageCode;
        }

        private static string NormalizeAndValidatePublicUrlSegment(string? publicUrlSegment)
        {
            var normalizedPublicUrlSegment = publicUrlSegment?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(normalizedPublicUrlSegment)
                || normalizedPublicUrlSegment.Length > 100
                || !PublicUrlSegmentFormat.IsWellFormed(normalizedPublicUrlSegment))
            {
                throw new BadRequestException(
                    "PublicUrlSegment must be 1-100 lowercase letters or numbers separated by single hyphens.");
            }

            if (ReservedPublicUrlSegments.Contains(normalizedPublicUrlSegment))
            {
                throw new BadRequestException($"The public CV URL segment '{normalizedPublicUrlSegment}' is reserved.");
            }

            return normalizedPublicUrlSegment;
        }

        private void EnsureCanSignUp(ExternalIdentity identity)
        {
            if (identity.Provider != LoginProvider.Google)
            {
                return;
            }

            var email = identity.Email?.Trim();
            var isInvited = identity.EmailVerified
                && !string.IsNullOrEmpty(email)
                && _googleOptions.AllowedSignUpEmails.Any(allowedEmail =>
                    string.Equals(allowedEmail?.Trim(), email, StringComparison.OrdinalIgnoreCase));

            if (!isInvited)
            {
                throw new ForbiddenException("This Google account is not allowed to create a CV.");
            }
        }
    }
}
