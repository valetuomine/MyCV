using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Extensions;
using CV.Logic.Mappers;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    public class CandidateService(CvContext dataContext) : BaseService(dataContext), ICandidateService
    {
        private readonly CvContext _dataContext = dataContext;

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

            _dataContext.Candidate.Remove(dbCandidate);
            await _dataContext.SaveChangesAsync(cancellationToken);
        }
    }
}