using CV.LogicInterface.Dto.Candidate;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations for retrieving candidates.
    /// </summary>
    public interface ICandidateService
    {
        /// <summary>
        /// Retrieves a candidate by its public URL segment.
        /// </summary>
        /// <param name="publicUrlSegment">The public URL segment of the candidate to retrieve.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The candidate matching the specified identifier.</returns>
        Task<CandidateDto> GetCandidateByPublicUrlSegment(
            string publicUrlSegment,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Deletes a candidate and its related rows.
        /// </summary>
        /// <param name="candidateId">The identifier of the candidate to delete.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        Task DeleteCandidate(
            Guid candidateId,
            string? actorObjectId,
            bool canManageAny,
            CancellationToken cancellationToken = default);
    }
}