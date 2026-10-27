using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using Swashbuckle.AspNetCore.Filters;
using CV.WebApi.Authentication;
using CV.WebApi.Swagger.Examples;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController(
        IProfileService profileService,
        IProfilePdfService profilePdfService,
        ICurrentUser currentUser) : ControllerBase
    {
        private readonly IProfileService _profileService = profileService;
        private readonly IProfilePdfService _profilePdfService = profilePdfService;
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

        // HEAD lets the frontend check that the download will succeed before leaving the page.
        [HttpGet("{profileId:guid}/pdf")]
        [HttpHead("{profileId:guid}/pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, ProfilePdfDto.ContentType)]
        public async Task<IActionResult> GetProfilePdf(
            Guid profileId,
            [FromQuery(Name = "lang")] string? languageCode,
            [FromQuery] bool download,
            CancellationToken cancellationToken)
        {
            var result = await _profilePdfService.GetProfilePdf(profileId, languageCode, cancellationToken);

            // Inline lets the browser show the PDF in the frontend's viewer;
            // download=true saves it, since cross-origin links ignore the download attribute.
            var contentDisposition = new ContentDispositionHeaderValue(download ? "attachment" : "inline");
            contentDisposition.SetHttpFileName(result.FileName);
            Response.Headers.ContentDisposition = contentDisposition.ToString();

            // no-cache makes the browser revalidate, so an edited profile shows at once,
            // while an unchanged one is answered with 304 from the ETag.
            Response.Headers.CacheControl = "public, no-cache";

            return File(
                result.Content,
                ProfilePdfDto.ContentType,
                result.LastModified,
                new EntityTagHeaderValue(result.ETag));
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
