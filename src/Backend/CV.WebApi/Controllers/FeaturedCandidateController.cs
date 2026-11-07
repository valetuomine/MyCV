using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Mvc;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FeaturedCandidateController(ICandidateService candidateService) : ControllerBase
    {
        private readonly ICandidateService _candidateService = candidateService;

        [HttpGet]
        public async Task<ActionResult<CandidateDto>> GetFeaturedCandidate(CancellationToken cancellationToken)
        {
            var result = await _candidateService.GetFeaturedCandidate(cancellationToken);
            return Ok(result);
        }
    }
}
