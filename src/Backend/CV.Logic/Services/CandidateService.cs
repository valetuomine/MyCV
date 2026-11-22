using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Extensions;
using CV.Logic.Mappers;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Candidates;
using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Services
{
    public class CandidateService : BaseService, ICandidateService
    {
        private readonly CvContext _dataContext;
        private readonly IProfilePictureStore _pictureStore;
        private readonly FeaturedCandidateOptions _featuredOptions;

        public CandidateService(
            CvContext dataContext,
            IProfilePictureStore pictureStore,
            IOptions<FeaturedCandidateOptions> featuredOptions)
            : base(dataContext)
        {
            _dataContext = dataContext;
            _pictureStore = pictureStore;
            _featuredOptions = featuredOptions.Value;
        }

        public async Task<CandidateDto> GetCandidateByPublicUrlSegment(
            string publicUrlSegment,
            CancellationToken cancellationToken = default)
        {
            var normalizedPublicUrlSegment = publicUrlSegment?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(normalizedPublicUrlSegment))
            {
                throw new BadRequestException("Candidate public URL segment is required.");
            }

            var dbCandidate = await _dataContext.Candidate
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    candidate => candidate.PublicUrlSegment == normalizedPublicUrlSegment,
                    cancellationToken);

            return dbCandidate?.MapEntityToDto()
                ?? throw new NotFoundException(
                    $"Candidate not found with public URL segment: {normalizedPublicUrlSegment}");
        }

        public async Task<CandidateDto> GetFeaturedCandidate(CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(_featuredOptions.PublicUrlSegment))
            {
                throw new NotFoundException("No candidate is featured.");
            }

            return await GetCandidateByPublicUrlSegment(_featuredOptions.PublicUrlSegment, cancellationToken);
        }

        public async Task<OwnCandidateDto> GetOwnCandidate(
            ExternalIdentity owner,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(owner);

            var dbCandidate = await _dataContext.CandidateLogin
                .AsNoTracking()
                .ForIdentity(owner)
                .Select(login => login.Candidate)
                .FirstOrDefaultAsync(cancellationToken);

            return dbCandidate?.MapEntityToOwnDto()
                ?? throw new NotFoundException("No CV is linked to this sign-in.");
        }

        public async Task HideMissingLanguageNotice(
            ExternalIdentity owner,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(owner);

            var candidateId = await _dataContext.CandidateLogin
                .AsNoTracking()
                .ForIdentity(owner)
                .Select(login => (Guid?)login.CandidateId)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundException("No CV is linked to this sign-in.");

            // A UI setting, not a change to the CV, so the CV's public UpdatedAt stays as it is.
            await _dataContext.Candidate
                .Where(candidate => candidate.Id == candidateId)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(candidate => candidate.HideMissingLanguageNotice, true),
                    cancellationToken);
        }

        public async Task DeleteCandidate(
            Guid candidateId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken = default)
        {
            if (candidateId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid candidate ID: {candidateId}");
            }

            var dbCandidate = await _dataContext.Candidate
                .FirstOrDefaultAsync(candidate => candidate.Id == candidateId, cancellationToken)
                ?? throw new NotFoundException($"Candidate not found with Id: {candidateId}");

            await EnsureCanManageCandidate(candidateId, actor, canManageAny, cancellationToken);

            // CascadeDeleteCandidateReferences deletes the profile by ID only, so read its picture first.
            var pictureBlobName = await _dataContext.Profile
                .AsNoTracking()
                .Where(profile => profile.Id == dbCandidate.ProfileId)
                .Select(profile => profile.PictureBlobName)
                .FirstOrDefaultAsync(cancellationToken);

            _dataContext.Candidate.Remove(dbCandidate);
            await _dataContext.SaveChangesAsync(cancellationToken);

            if (pictureBlobName is not null)
            {
                await _pictureStore.RemoveUnused(pictureBlobName);
            }
        }
    }
}