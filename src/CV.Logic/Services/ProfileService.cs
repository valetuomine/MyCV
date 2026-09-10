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
        public async Task<ProfileDto> GetProfile(int profileId, CancellationToken cancellationToken = default)
        {
            // Guards direct callers that bypass the controller's route validation (e.g. background jobs, other services).
            if (profileId <= 0)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var dbProfile = await DbContext.Profile
                .AsNoTracking()
                .FirstOrDefaultAsync(la => la.Id == profileId, cancellationToken);

            return dbProfile == null
                ? throw new NotFoundException($"Profile not found with Id: {profileId}")
                : dbProfile.MapEntityToDto();
        }
    }
}
