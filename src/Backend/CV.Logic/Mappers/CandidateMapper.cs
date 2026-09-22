using CV.DataAccess.Entity;
using CV.LogicInterface.Dto.Candidate;

namespace CV.Logic.Mappers
{
    /// <summary>
    /// Provides mappings between candidate entities and data transfer objects.
    /// </summary>
    public static class CandidateMapper
    {
        /// <summary>
        /// Maps a candidate entity to a candidate data transfer object.
        /// </summary>
        /// <param name="dbCandidate">The candidate entity to map.</param>
        /// <returns>A data transfer object containing the candidate data.</returns>
        public static CandidateDto MapEntityToDto(this Candidate dbCandidate)
        {
            return new CandidateDto
            {
                Id = dbCandidate.Id,
                PublicId = dbCandidate.PublicId,
                ProfileId = dbCandidate.ProfileId
            };
        }
    }
}