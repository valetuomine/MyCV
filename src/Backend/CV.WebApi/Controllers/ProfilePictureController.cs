using System.Diagnostics.CodeAnalysis;
using CV.Common.Exceptions;
using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using CV.WebApi.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/Profile")]
    [ApiController]
    public class ProfilePictureController(
        IProfilePictureService profilePictureService,
        ICurrentUser currentUser) : ControllerBase
    {
        // The 10 MB picture limit, plus room for the multipart framing around it.
        private const long PictureRequestSizeLimit = 11 * 1024 * 1024;
        private const string PictureFormField = "file";

        private readonly IProfilePictureService _profilePictureService = profilePictureService;
        private readonly ICurrentUser _currentUser = currentUser;

        // Public, for the CV and its print route. The URL's version changes with every picture,
        // so the current version is cached for good and an old one is revalidated by its ETag.
        [HttpGet("{profileId:guid}/picture")]
        [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status200OK, "image/webp")]
        public async Task<IActionResult> GetProfilePicture(
            Guid profileId,
            [FromQuery(Name = "v")] string? version,
            CancellationToken cancellationToken)
        {
            var result = await _profilePictureService.GetPicture(profileId, version, cancellationToken);

            Response.Headers.CacheControl = result.IsCurrentVersion
                ? "public, max-age=31536000, immutable"
                : "public, no-cache";
            Response.Headers.XContentTypeOptions = "nosniff";

            return File(
                result.Content,
                result.ContentType,
                result.LastModified,
                new EntityTagHeaderValue(result.ETag));
        }

        // The form is read here rather than bound as an IFormFile, because model binding
        // reports a body over the limit as a generic 400 instead of 413.
        [SuppressMessage(
            "Major Code Smell",
            "S6932:Use model binding instead of reading raw request data",
            Justification = "The form is read by hand so that an image over the limit returns 413 instead of the generic 400 of model binding.")]
        [HttpPut("{profileId:guid}/picture")]
        [Authorize]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(PictureRequestSizeLimit)]
        [RequestFormLimits(MultipartBodyLengthLimit = PictureRequestSizeLimit)]
        public async Task<ActionResult<ProfilePictureDto>> SaveProfilePicture(
            Guid profileId,
            CancellationToken cancellationToken)
        {
            if (Request.ContentLength > PictureRequestSizeLimit)
            {
                throw new PayloadTooLargeException("The image must be 10 MB or smaller.");
            }

            IFormFile? file;
            try
            {
                var form = await Request.ReadFormAsync(cancellationToken);
                file = form.Files.GetFile(PictureFormField);
            }
            catch (BadHttpRequestException exception) when (exception.StatusCode == StatusCodes.Status413PayloadTooLarge)
            {
                throw new PayloadTooLargeException("The image must be 10 MB or smaller.");
            }
            catch (InvalidDataException)
            {
                throw new BadRequestException("The upload is not a valid multipart form.");
            }

            if (file is null)
            {
                throw new BadRequestException($"The form needs the image in its '{PictureFormField}' field.");
            }

            await using var content = file.OpenReadStream();
            var result = await _profilePictureService.SavePicture(
                profileId,
                content,
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
                cancellationToken);
            return Ok(result);
        }

        [HttpPut("{profileId:guid}/picture/google")]
        [Authorize]
        public async Task<ActionResult<ProfilePictureDto>> SaveGoogleProfilePicture(
            Guid profileId,
            CancellationToken cancellationToken)
        {
            var result = await _profilePictureService.SaveGooglePicture(
                profileId,
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
                cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{profileId:guid}/picture")]
        [Authorize]
        public async Task<IActionResult> DeleteProfilePicture(Guid profileId, CancellationToken cancellationToken)
        {
            await _profilePictureService.DeletePicture(
                profileId,
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
                cancellationToken);
            return NoContent();
        }
    }
}
