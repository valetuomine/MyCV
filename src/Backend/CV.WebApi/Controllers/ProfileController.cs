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

        [HttpPost]
        [Authorize]
        [SwaggerRequestExample(typeof(CreateProfileRequest), typeof(CreateProfileRequestExample))]
        public async Task<ActionResult<ProfileAdminDto>> CreateProfile(
            CreateProfileRequest request,
            CancellationToken cancellationToken)
        {
            var ownerObjectId = User.FindFirst("oid")?.Value;
            if (string.IsNullOrWhiteSpace(ownerObjectId))
            {
                return Unauthorized();
            }

            var result = await _profileService.CreateProfile(
                request,
                ownerObjectId,
                User.IsInRole("CvAdmin"),
                cancellationToken);

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

        [HttpGet("{profileId:guid}/admin")]
        [Authorize]
        public async Task<ActionResult<ProfileAdminDto>> GetProfileAdmin(Guid profileId, CancellationToken cancellationToken)
        {
            var result = await _profileService.GetProfileAdmin(
                profileId,
                User.FindFirst("oid")?.Value,
                User.IsInRole("CvAdmin"),
                cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{profileId:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteProfile(Guid profileId, CancellationToken cancellationToken)
        {
            await _profileService.DeleteProfile(
                profileId,
                User.FindFirst("oid")?.Value,
                User.IsInRole("CvAdmin"),
                cancellationToken);
            return NoContent();
        }

        [HttpPut("{profileId:guid}")]
        [Authorize]
        [SwaggerRequestExample(typeof(UpdateProfileRequest), typeof(UpdateProfileRequestExample))]
        public async Task<ActionResult<ProfileAdminDto>> UpdateProfile(
            Guid profileId,
            UpdateProfileRequest request,
            CancellationToken cancellationToken)
        {
            var result = await _profileService.UpdateProfile(
                profileId,
                request,
                User.FindFirst("oid")?.Value,
                User.IsInRole("CvAdmin"),
                cancellationToken);
            return Ok(result);
        }
    }
}
