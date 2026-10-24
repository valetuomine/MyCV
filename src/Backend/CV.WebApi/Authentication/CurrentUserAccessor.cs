using CV.LogicInterface.Authentication;
using System.Security.Claims;

namespace CV.WebApi.Authentication
{
    /// <summary>
    /// Reads the caller's identity from the validated token claims once per request.
    /// </summary>
    public sealed class CurrentUserAccessor : ICurrentUser
    {
        private readonly ClaimsPrincipal? _user;
        private readonly Lazy<ExternalIdentity?> _identity;

        public CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _user = httpContextAccessor.HttpContext?.User;
            _identity = new Lazy<ExternalIdentity?>(() => ExternalIdentityReader.Read(_user));
        }

        public ExternalIdentity? Identity => _identity.Value;

        public bool IsCvAdmin => _user?.IsInRole("CvAdmin") == true;
    }
}
