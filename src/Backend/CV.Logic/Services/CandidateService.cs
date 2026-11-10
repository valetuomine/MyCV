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
    public class CandidateService(
        CvContext dataContext,
        IProfilePictureStore pictureStore,
        IOptions<FeaturedCandidateOptions> featuredOptions) : BaseService(dataContext), ICandidateService
    {
        private readonly CvContext _dataContext = dataContext;
        private readonly IProfilePictureStore _pictureStore = pictureStore;
        private readonly FeaturedCandidateOptions _featuredOptions = featuredOptions.Value;

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

        public async Task<CandidateDto> GetOwnCandidate(
            ExternalIdentity owner,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(owner);

            var dbCandidate = await _dataContext.CandidateLogin
                .AsNoTracking()
                .ForIdentity(owner)
                .Select(login => login.Candidate)
                .FirstOrDefaultAsync(cancellationToken);

            return dbCandidate?.MapEntityToDto()
                ?? throw new NotFoundException("No CV is linked to this sign-in.");
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

            if (!canManageAny && (actor is null
                || !await _dataContext.CandidateLogin
                    .ForIdentity(actor)
                    .AnyAsync(login => login.CandidateId == candidateId, cancellationToken)))
            {
                throw new NotFoundException($"Candidate not found with Id: {candidateId}");
            }

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