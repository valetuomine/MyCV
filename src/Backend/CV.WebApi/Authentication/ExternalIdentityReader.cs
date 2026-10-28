using CV.LogicInterface.Authentication;
using System.Security.Claims;

namespace CV.WebApi.Authentication
{
    /// <summary>
    /// Turns the claims of a validated Entra or Google token into a sign-in identity.
    /// </summary>
    public static class ExternalIdentityReader
    {
        /// <summary>
        /// Reads the sign-in identity from validated token claims.
        /// </summary>
        /// <param name="user">The principal built from a token that a bearer scheme has already validated.</param>
        /// <returns>The identity, or null when the principal is unauthenticated or lacks the identifying claims.</returns>
        public static ExternalIdentity? Read(ClaimsPrincipal? user)
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
                    string.Equals(user.FindFirst("email_verified")?.Value, "true", StringComparison.OrdinalIgnoreCase),
                    user.FindFirst("picture")?.Value);
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
