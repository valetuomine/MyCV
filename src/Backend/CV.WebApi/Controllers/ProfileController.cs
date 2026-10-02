using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Filters;
using CV.WebApi.Swagger.Examples;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController(IProfileService profileService) : ControllerBase
    {
        private readonly IProfileService _profileService = profileService;

        //[Authorize(Policy = "CvAdmin")]
        [HttpPost]
        [SwaggerRequestExample(typeof(CreateProfileRequest), typeof(CreateProfileRequestExample))]
        public async Task<ActionResult<ProfileAdminDto>> CreateProfile(
            CreateProfileRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _profileService.CreateProfile(request, cancellationToken);

            return CreatedAtAction(nameof(GetProfile), new { profileId = result.Id }, result);
        }

        [HttpGet("{profileId:guid}")]
        public async Task<ActionResult<ProfileDto>> GetProfile(
            Guid profileId,
            [FromQuery(Name = "lang")] string? languageCode,
            CancellationToken cancellationToken)
        {
            var result = await _profileService.GetProfile(profileId, languageCode, cancellationToken);
            return Ok(result);
        }

        //[Authorize(Policy = "CvAdmin")]
        [HttpGet("{profileId:guid}/admin")]
        public async Task<ActionResult<ProfileAdminDto>> GetProfileAdmin(Guid profileId, CancellationToken cancellationToken)
        {
            var result = await _profileService.GetProfileAdmin(profileId, cancellationToken);
            return Ok(result);
        }

        //[Authorize(Policy = "CvAdmin")]
        [HttpDelete("{profileId:guid}")]
        public async Task<IActionResult> DeleteProfile(Guid profileId, CancellationToken cancellationToken)
        {
            await _profileService.DeleteProfile(profileId, cancellationToken);
            return NoContent();
        }

        //[Authorize(Policy = "CvAdmin")]
        [HttpPut("{profileId:guid}")]
        [SwaggerRequestExample(typeof(UpdateProfileRequest), typeof(UpdateProfileRequestExample))]
        public async Task<ActionResult<ProfileAdminDto>> UpdateProfile(
            Guid profileId,
            UpdateProfileRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _profileService.UpdateProfile(profileId, request, cancellationToken);
            return Ok(result);
        }
    }
}
