using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Mvc;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController(IProfileService profileService) : ControllerBase
    {
        private readonly IProfileService _profileService = profileService;

        [HttpPost]
        public async Task<ActionResult<ProfileDto>> CreateProfile(
            CreateProfileRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _profileService.CreateProfile(request, cancellationToken);

            return CreatedAtAction(nameof(GetProfile), new { profileId = result.Id }, result);
        }

        [HttpGet("{profileId:guid}")]
        public async Task<ActionResult<ProfileDto>> GetProfile(Guid profileId, CancellationToken cancellationToken)
        {
            var result = await _profileService.GetProfile(profileId, cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{profileId:guid}")]
        public async Task<IActionResult> DeleteProfile(Guid profileId, CancellationToken cancellationToken)
        {
            await _profileService.DeleteProfile(profileId, cancellationToken);
            return NoContent();
        }

        [HttpPut("{profileId:guid}")]
        public async Task<ActionResult<ProfileDto>> UpdateProfile(
            Guid profileId,
            UpdateProfileRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _profileService.UpdateProfile(profileId, request, cancellationToken);
            return Ok(result);
        }
    }
}
