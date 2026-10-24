using CV.LogicInterface.Dto.Login;
using CV.LogicInterface.ServiceInterfaces;
using CV.WebApi.Authentication;
using CV.WebApi.Swagger.Examples;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Filters;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    /// <summary>
    /// Manages the caller's own sign-in methods. <c>CvAdmin</c> gets no extra rights here.
    /// </summary>
    [Route("api/me")]
    [ApiController]
    [Authorize]
    public class MeController(
        ILoginService loginService,
        ILinkTokenValidator linkTokenValidator,
        ICurrentUser currentUser) : ControllerBase
    {
        private readonly ILoginService _loginService = loginService;
        private readonly ILinkTokenValidator _linkTokenValidator = linkTokenValidator;
        private readonly ICurrentUser _currentUser = currentUser;

        [HttpGet("logins")]
        public async Task<ActionResult<IReadOnlyCollection<LoginDto>>> GetLogins(CancellationToken cancellationToken)
        {
            if (_currentUser.Identity is not { } actor)
            {
                return Unauthorized();
            }

            var result = await _loginService.GetLogins(actor, cancellationToken);
            return Ok(result);
        }

        [HttpPost("logins")]
        [SwaggerRequestExample(typeof(LinkLoginRequest), typeof(LinkLoginRequestExample))]
        public async Task<ActionResult<LoginDto>> LinkLogin(
            LinkLoginRequest request,
            CancellationToken cancellationToken)
        {
            if (_currentUser.Identity is not { } actor)
            {
                return Unauthorized();
            }

            var linked = await _linkTokenValidator.Validate(request.LinkToken, cancellationToken);
            var result = await _loginService.LinkLogin(actor, linked, cancellationToken);

            return result.Created
                ? CreatedAtAction(nameof(GetLogins), result.Login)
                : Ok(result.Login);
        }

        [HttpDelete("logins/{loginId:guid}")]
        public async Task<IActionResult> DeleteLogin(Guid loginId, CancellationToken cancellationToken)
        {
            if (_currentUser.Identity is not { } actor)
            {
                return Unauthorized();
            }

            await _loginService.DeleteLogin(loginId, actor, cancellationToken);
            return NoContent();
        }
    }
}
