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
            _identity = new Lazy<ExternalIdentity?>(() => ReadIdentity(_user));
        }

        public ExternalIdentity? Identity => _identity.Value;

        public bool IsCvAdmin => _user?.IsInRole("CvAdmin") == true;

        private static ExternalIdentity? ReadIdentity(ClaimsPrincipal? user)
        {
            if (user?.Identity?.IsAuthenticated != true)
            {
                return null;
            }

            // The issuer was validated by the scheme that accepted the token.
            if (BearerSchemes.IsGoogleIssuer(user.FindFirst("iss")?.Value))
            {
                var subject = user.FindFirst("sub")?.Value;
                if (string.IsNullOrWhiteSpace(subject))
                {
                    return null;
                }

                return new ExternalIdentity(
                    LoginProvider.Google,
                    GoogleAuthenticationOptions.Issuer,
                    subject,
                    user.FindFirst("email")?.Value,
                    string.Equals(user.FindFirst("email_verified")?.Value, "true", StringComparison.OrdinalIgnoreCase));
            }

            var tenantId = user.FindFirst("tid")?.Value;
            var objectId = user.FindFirst("oid")?.Value;
            if (string.IsNullOrWhiteSpace(tenantId) || string.IsNullOrWhiteSpace(objectId))
            {
                return null;
            }

            return new ExternalIdentity(LoginProvider.Entra, tenantId, objectId, null, false);
        }
    }
}
