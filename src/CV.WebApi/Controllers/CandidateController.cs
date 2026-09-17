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
        [HttpGet("{candidateId:guid}")]
        public async Task<ActionResult<CandidateDto>> GetCandidate(
            Guid candidateId,
            CancellationToken cancellationToken)
        {
            var result = await candidateService.GetCandidate(candidateId, cancellationToken);
            return Ok(result);
        }
    }
}