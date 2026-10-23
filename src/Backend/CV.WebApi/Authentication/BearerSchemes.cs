using CV.LogicInterface.Authentication;
using Microsoft.IdentityModel.JsonWebTokens;

namespace CV.WebApi.Authentication
{
    /// <summary>
    /// Names the JWT bearer schemes and picks the one that validates a request's token.
    /// </summary>
    public static class BearerSchemes
    {
        public const string Entra = "Entra";
        public const string Google = "Google";

        private const string BearerPrefix = "Bearer ";

        /// <summary>
        /// Checks whether an issuer is one of Google's ID token issuers.
        /// </summary>
        /// <param name="issuer">The token's <c>iss</c> value.</param>
        /// <returns>True for a Google issuer.</returns>
        public static bool IsGoogleIssuer(string? issuer)
        {
            return GoogleAuthenticationOptions.ValidIssuers.Contains(issuer, StringComparer.Ordinal);
        }

        /// <summary>
        /// Picks the scheme from the bearer token's issuer. The token is read without validation,
        /// only to choose the scheme; the chosen scheme then validates it fully.
        /// </summary>
        /// <param name="context">The current request.</param>
        /// <param name="isGoogleConfigured">Whether the Google scheme is registered.</param>
        /// <returns><see cref="Google"/> for a Google-issued token, otherwise <see cref="Entra"/>.</returns>
        public static string Select(HttpContext context, bool isGoogleConfigured)
        {
            if (!isGoogleConfigured)
            {
                return Entra;
            }

            var authorization = context.Request.Headers.Authorization.ToString();
            if (!authorization.StartsWith(BearerPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return Entra;
            }

            var token = authorization[BearerPrefix.Length..].Trim();
            var handler = new JsonWebTokenHandler();
            if (!handler.CanReadToken(token))
            {
                return Entra;
            }

            try
            {
                return IsGoogleIssuer(handler.ReadJsonWebToken(token).Issuer) ? Google : Entra;
            }
            catch (ArgumentException)
            {
                return Entra;
            }
        }
    }
}
