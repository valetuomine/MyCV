using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CandidateController(ICandidateService candidateService) : ControllerBase
    {
        private readonly ICandidateService _candidateService = candidateService;

        [HttpGet("{publicUrlSegment}")]
        public async Task<ActionResult<CandidateDto>> GetCandidate(
            string publicUrlSegment,
            CancellationToken cancellationToken)
        {
            var result = await _candidateService.GetCandidateByPublicUrlSegment(
                publicUrlSegment,
                cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{candidateId:guid}")]
        [Authorize]
        public async Task<IActionResult> DeleteCandidate(Guid candidateId, CancellationToken cancellationToken)
        {
            await _candidateService.DeleteCandidate(
                candidateId,
                User.FindFirst("oid")?.Value,
                User.IsInRole("CvAdmin"),
                cancellationToken);
            return NoContent();
        }
    }
}