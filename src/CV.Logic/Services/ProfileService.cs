using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Mappers;
using CV.LogicInterface.Dto;
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

            await _dataContext.Profile.AddAsync(dbProfile, cancellationToken);
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

            return dbProfile == null
                ? throw new NotFoundException($"Profile not found with Id: {profileId}")
                : dbProfile.MapEntityToDto();
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
            dbProfile.UpdatedAt = DateTime.UtcNow;

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
