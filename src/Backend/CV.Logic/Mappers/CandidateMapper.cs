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
                PublicUrlSegment = dbCandidate.PublicUrlSegment,
                CreatedAt = TimestampMapper.ToFinlandTime(dbCandidate.CreatedAt),
                UpdatedAt = TimestampMapper.ToFinlandTime(dbCandidate.UpdatedAt),
                ProfileId = dbCandidate.ProfileId
            };
        }

        /// <summary>
        /// Maps a candidate entity to the owner's own candidate, with the owner's settings.
        /// </summary>
        /// <param name="dbCandidate">The candidate entity to map.</param>
        /// <returns>A data transfer object containing the candidate data and the owner's settings.</returns>
        public static OwnCandidateDto MapEntityToOwnDto(this Candidate dbCandidate)
        {
            return new OwnCandidateDto
            {
                Id = dbCandidate.Id,
                PublicUrlSegment = dbCandidate.PublicUrlSegment,
                CreatedAt = TimestampMapper.ToFinlandTime(dbCandidate.CreatedAt),
                UpdatedAt = TimestampMapper.ToFinlandTime(dbCandidate.UpdatedAt),
                ProfileId = dbCandidate.ProfileId,
                HideMissingLanguageNotice = dbCandidate.HideMissingLanguageNotice
            };
        }
    }
}