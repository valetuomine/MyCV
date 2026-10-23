using CV.LogicInterface.Dto.Candidate;
using CV.LogicInterface.ServiceInterfaces;
using CV.WebApi.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CandidateController(ICandidateService candidateService, ICurrentUser currentUser) : ControllerBase
    {
        private readonly ICandidateService _candidateService = candidateService;
        private readonly ICurrentUser _currentUser = currentUser;

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
                _currentUser.Identity,
                _currentUser.IsCvAdmin,
                cancellationToken);
            return NoContent();
        }
    }
}