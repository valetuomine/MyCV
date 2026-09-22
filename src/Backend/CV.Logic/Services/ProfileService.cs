using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Mappers;
using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    public class ProfileService(CvContext dataContext) : BaseService(dataContext), IProfileService
    {
        private readonly CvContext _dataContext = dataContext;

        public async Task<ProfileDto> CreateProfile(CreateProfileRequest request, CancellationToken cancellationToken = default)
        {
            ValidateRequest(request.FullName, request.Title);

            var dbProfile = request.MapRequestToEntity();
            Candidate? dbCandidate = null;

            if (request.CandidatePublicId is Guid candidatePublicId)
            {
                var candidate = await _dataContext.Candidate
                    .FirstOrDefaultAsync(ca => ca.PublicId == candidatePublicId, cancellationToken)
                    ?? throw new NotFoundException($"Candidate not found with PublicId: {candidatePublicId}");

                if (candidate.ProfileId is not null)
                {
                    throw new BadRequestException("Candidate already has a profile.");
                }

                candidate.ProfileId = dbProfile.Id;
                dbCandidate = candidate;
            }
            else
            {
                dbCandidate = dbProfile.MapProfileIdToCandidate();
            }

            await _dataContext.Profile.AddAsync(dbProfile, cancellationToken);
            if (request.CandidatePublicId is null)
            {
                await _dataContext.Candidate.AddAsync(dbCandidate, cancellationToken);
            }
            await _dataContext.SaveChangesAsync(cancellationToken);

            return dbProfile.MapEntityToDto();
        }

        public async Task<ProfileDto> GetProfile(Guid profileId, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var dbProfile = await _dataContext.Profile
                .AsNoTracking()
                .FirstOrDefaultAsync(la => la.Id == profileId, cancellationToken);

            return dbProfile?.MapEntityToDto()
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");
        }

        public async Task DeleteProfile(Guid profileId, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var dbProfile = await _dataContext.Profile
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken)
                ?? throw new NotFoundException($"Profile not found with Id: {profileId}");

            var dbCandidate = await _dataContext.Candidate
                .FirstOrDefaultAsync(candidate => candidate.ProfileId == profileId, cancellationToken);

            dbCandidate?.ProfileId = null;

            _dataContext.Profile.Remove(dbProfile);
            await _dataContext.SaveChangesAsync(cancellationToken);
        }

        public async Task<ProfileDto> UpdateProfile(Guid profileId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            ValidateRequest(request.FullName, request.Title);

            var dbProfile = await _dataContext.Profile
                .FirstOrDefaultAsync(profile => profile.Id == profileId, cancellationToken) ?? throw new NotFoundException($"Profile not found with Id: {profileId}");
                
            request.MapRequestToEntity(dbProfile);

            await _dataContext.SaveChangesAsync(cancellationToken);

            return dbProfile.MapEntityToDto();
        }

        private static void ValidateRequest(string fullName, string title)
        {
            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(title))
            {
                throw new BadRequestException("FullName and Title are required.");
            }
        }
    }
}
