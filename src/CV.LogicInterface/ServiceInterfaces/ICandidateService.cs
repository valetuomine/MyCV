using CV.LogicInterface.Dto.Candidate;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations for retrieving candidates.
    /// </summary>
    public interface ICandidateService
    {
        /// <summary>
        /// Retrieves a candidate by its identifier.
        /// </summary>
        /// <param name="candidateId">The identifier of the candidate to retrieve.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The candidate matching the specified identifier.</returns>
        Task<CandidateDto> GetCandidate(Guid candidateId, CancellationToken cancellationToken = default);
    }
}