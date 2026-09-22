using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Mvc;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CandidateController(ICandidateService candidateService) : ControllerBase
    {
        private readonly ICandidateService _candidateService = candidateService;

        [HttpGet("{candidateId:guid}")]
        public async Task<ActionResult<CandidateDto>> GetCandidate(
            Guid candidateId,
            CancellationToken cancellationToken)
        {
            var result = await _candidateService.GetCandidate(candidateId, cancellationToken);
            return Ok(result);
        }

        [HttpDelete("{candidateId:guid}")]
        public async Task<IActionResult> DeleteCandidate(Guid candidateId, CancellationToken cancellationToken)
        {
            await _candidateService.DeleteCandidate(candidateId, cancellationToken);
            return NoContent();
        }
    }
}