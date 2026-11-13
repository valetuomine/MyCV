using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/Profile")]
    [ApiController]
    [Tags("Profile")]
    public class ProfilePdfController(IProfilePdfService profilePdfService) : ControllerBase
    {
        private readonly IProfilePdfService _profilePdfService = profilePdfService;

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
    }
}
