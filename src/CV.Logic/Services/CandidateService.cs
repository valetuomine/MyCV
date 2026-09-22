using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Mappers;
using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    public class CandidateService(CvContext dataContext) : BaseService(dataContext), ICandidateService
    {
        private readonly CvContext _dataContext = dataContext;

        public async Task<CandidateDto> GetCandidate(Guid candidateId, CancellationToken cancellationToken = default)
        {
            if (candidateId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid candidate ID: {candidateId}");
            }

            var dbCandidate = await _dataContext.Candidate
                .AsNoTracking()
                .FirstOrDefaultAsync(candidate => candidate.Id == candidateId, cancellationToken);

            return dbCandidate == null
                ? throw new NotFoundException($"Candidate not found with Id: {candidateId}")
                : dbCandidate.MapEntityToDto();
        }

        public async Task DeleteCandidate(Guid candidateId, CancellationToken cancellationToken = default)
        {
            if (candidateId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid candidate ID: {candidateId}");
            }

            var dbCandidate = await _dataContext.Candidate
                .FirstOrDefaultAsync(candidate => candidate.Id == candidateId, cancellationToken)
                ?? throw new NotFoundException($"Candidate not found with Id: {candidateId}");

            _dataContext.Candidate.Remove(dbCandidate);
            await _dataContext.SaveChangesAsync(cancellationToken);
        }
    }
}