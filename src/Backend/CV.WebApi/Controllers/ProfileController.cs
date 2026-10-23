using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Filters;
using CV.WebApi.Authentication;
using CV.WebApi.Swagger.Examples;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController(IProfileService profileService, ICurrentUser currentUser) : ControllerBase
    {
        private readonly IProfileService _profileService = profileService;
        private readonly ICurrentUser _currentUser = currentUser;

        [HttpPost]
        [Authorize]
        [SwaggerRequestExample(typeof(CreateProfileRequest), typeof(CreateProfileRequestExample))]
        public async Task<ActionResult<ProfileAdminDto>> CreateProfile(
            CreateProfileRequest request,
            CancellationToken cancellationToken)
        {
            if (_currentUser.Identity is not { } owner)
            {
                return Unauthorized();
            }

            var result = await _profileService.CreateProfile(
                request,
                owner,
                _currentUser.IsCvAdmin,
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
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
                cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{profileId:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteProfile(Guid profileId, CancellationToken cancellationToken)
        {
            await _profileService.DeleteProfile(
                profileId,
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
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
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
                cancellationToken);
            return Ok(result);
        }
    }
}
