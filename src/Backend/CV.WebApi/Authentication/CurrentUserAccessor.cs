using CV.LogicInterface.Authentication;
using System.Security.Claims;

namespace CV.WebApi.Authentication
{
    /// <summary>
    /// Reads the caller's identity from the validated token claims once per request.
    /// </summary>
    public sealed class CurrentUserAccessor : ICurrentUser
    {
        /// <summary>
        /// The Entra app role that lets a caller manage every CV.
        /// </summary>
        public const string CvAdminRole = "CvAdmin";

        private readonly ClaimsPrincipal? _user;
        private readonly Lazy<ExternalIdentity?> _identity;

        public CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _user = httpContextAccessor.HttpContext?.User;
            _identity = new Lazy<ExternalIdentity?>(() => ExternalIdentityReader.Read(_user));
        }

        public ExternalIdentity? Identity => _identity.Value;

        public bool IsCvAdmin => _user?.IsInRole(CvAdminRole) == true;
    }
}
