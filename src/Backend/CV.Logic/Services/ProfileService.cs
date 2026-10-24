using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Extensions;
using CV.Logic.Mappers;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Text.RegularExpressions;

namespace CV.Logic.Services
{
    public partial class ProfileService(
        CvContext dataContext,
        IOptions<GoogleAuthenticationOptions> googleOptions) : BaseService(dataContext), IProfileService
    {
        private readonly CvContext _dataContext = dataContext;
        private readonly GoogleAuthenticationOptions _googleOptions = googleOptions.Value;
        private static readonly HashSet<string> SupportedLanguageCodes = ["fi", "en"];

        [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.None, matchTimeoutMilliseconds: 100)]
        private static partial Regex PublicUrlSegmentRegex();

        public async Task<ProfileAdminDto> CreateProfile(
            CreateProfileRequest request,
            ExternalIdentity owner,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            ValidateRequest(request.FullName, request.Translations);

            var dbProfile = request.MapRequestToEntity();
            Candidate? dbCandidate = null;

            if (request.CandidateId is Guid candidateId)
            {
                if (!canManageAny)
                {
                    throw new NotFoundException($"Candidate not found with Id: {candidateId}");
                }

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

                dbCandidate = dbProfile.MapProfileIdToCandidate(publicUrlSegment);
                dbCandidate.Logins.Add(owner.MapIdentityToLogin());
            }

            await _dataContext.Profile.AddAsync(dbProfile, cancellationToken);
            if (request.CandidateId is null)
            {
                await _dataContext.Candidate.AddAsync(dbCandidate, cancellationToken);
            }
            await _dataContext.SaveChangesAsync(cancellationToken);

            var result = dbProfile.MapEntityToAdminDto();
            result.CandidateId = dbCandidate.Id;
            result.PublicUrlSegment = dbCandidate.PublicUrlSegment;
            result.IsOwner = await IsOwner(dbProfile.Id, owner, cancellationToken);
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

        public async Task<ProfileAdminDto> GetProfileAdmin(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

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
            var candidate = await _dataContext.Candidate
                .AsNoTracking()
                .Where(candidate => candidate.ProfileId == profileId)
                .Select(candidate => new { candidate.Id, candidate.PublicUrlSegment })
                .FirstOrDefaultAsync(cancellationToken);

            result.CandidateId = candidate?.Id;
            result.PublicUrlSegment = candidate?.PublicUrlSegment;
            result.IsOwner = isOwner;

            return result;
        }

        public async Task DeleteProfile(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            await EnsureCanManageProfile(profileId, actor, canManageAny, cancellationToken);

            var dbProfile = await _dataContext.Profile
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            var dbCandidate = await _dataContext.Candidate
                .FirstOrDefaultAsync(candidate => candidate.ProfileId == profileId, cancellationToken);

            dbCandidate?.ProfileId = null;

            _dataContext.Profile.Remove(dbProfile);
            await _dataContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<ProfileAdminDto> UpdateProfile(
            Guid profileId,
            UpdateProfileRequest request,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var isOwner = await EnsureCanManageProfile(profileId, actor, canManageAny, cancellationToken);

            ValidateRequest(request.FullName, request.Translations);

            var dbProfile = await _dataContext.Profile
                .Include(profile => profile.Translations)
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken) ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            request.MapRequestToEntity(dbProfile);

            await _dataContext.SaveChangesAsync(cancellationToken);

            var result = dbProfile.MapEntityToAdminDto();
            var candidate = await _dataContext.Candidate
                .AsNoTracking()
                .Where(candidate => candidate.ProfileId == profileId)
                .Select(candidate => new { candidate.Id, candidate.PublicUrlSegment })
                .FirstOrDefaultAsync(cancellationToken);
            result.CandidateId = candidate?.Id;
            result.PublicUrlSegment = candidate?.PublicUrlSegment;
            result.IsOwner = isOwner;

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

        private static string NormalizeAndValidatePublicUrlSegment(string? publicUrlSegment)
        {
            var normalizedPublicUrlSegment = publicUrlSegment?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(normalizedPublicUrlSegment)
                || normalizedPublicUrlSegment.Length > 100
                || !PublicUrlSegmentRegex().IsMatch(normalizedPublicUrlSegment))
            {
                throw new BadRequestException(
                    "PublicUrlSegment must be 1-100 lowercase letters or numbers separated by single hyphens.");
            }

            if (normalizedPublicUrlSegment == "admin")
            {
                throw new BadRequestException("The public CV URL segment 'admin' is reserved.");
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

        /// <summary>
        /// Lets the profile's owner, or any caller with <c>CvAdmin</c>, manage the profile.
        /// </summary>
        /// <returns>Whether the caller owns the profile, as opposed to managing it only as <c>CvAdmin</c>.</returns>
        private async Task<bool> EnsureCanManageProfile(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken)
        {
            var isOwner = await IsOwner(profileId, actor, cancellationToken);
            if (!isOwner && !canManageAny)
            {
                throw new NotFoundException($"Profile not found with Id: {profileId}");
            }

            return isOwner;
        }

        private async Task<bool> IsOwner(Guid profileId, ExternalIdentity? actor, CancellationToken cancellationToken)
        {
            return actor is not null
                && await _dataContext.CandidateLogin
                    .ForIdentity(actor)
                    .AnyAsync(login => login.Candidate.ProfileId == profileId, cancellationToken);
        }
    }
}
