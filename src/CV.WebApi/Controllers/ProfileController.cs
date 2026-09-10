using System.ComponentModel.DataAnnotations;
using CV.LogicInterface.Dto;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.AspNetCore.Mvc;
using RouteAttribute = Microsoft.AspNetCore.Mvc.RouteAttribute;

namespace CV.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfileController(IProfileService profileService) : ControllerBase
    {
        [HttpGet("{profileId}")]
        public async Task<ActionResult<ProfileDto>> GetProfile([Range(1, int.MaxValue)] int profileId, CancellationToken cancellationToken)
        {
            var result = await profileService.GetProfile(profileId, cancellationToken);
            return Ok(result);
        }
    }
}
