using CV.Common.Exceptions;
using CV.LogicInterface.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

namespace CV.WebApi.Authentication
{
    /// <summary>
    /// Validates the token of a sign-in method that the caller wants to link, with the same rules
    /// as the bearer scheme that would accept it.
    /// </summary>
    public interface ILinkTokenValidator
    {
        /// <summary>
        /// Validates a link token and reads its sign-in identity.
        /// </summary>
        /// <param name="token">An Entra access token for the API, or a Google ID token.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The identity the token proves.</returns>
        /// <exception cref="BadRequestException">The token is missing, invalid or older than <see cref="LinkTokenValidator.MaxAge"/>.</exception>
        Task<ExternalIdentity> Validate(string? token, CancellationToken cancellationToken);
    }

    public sealed class LinkTokenValidator(
        IOptionsMonitor<JwtBearerOptions> jwtBearerOptions,
        IOptions<GoogleAuthenticationOptions> googleOptions,
        ILogger<LinkTokenValidator> logger) : ILinkTokenValidator
    {
        /// <summary>
        /// How long after sign-in a link token is still accepted.
        /// </summary>
        public static readonly TimeSpan MaxAge = TimeSpan.FromMinutes(10);

        private const string InvalidTokenMessage = "The sign-in to add could not be verified. Try again.";

        private readonly IOptionsMonitor<JwtBearerOptions> _jwtBearerOptions = jwtBearerOptions;
        private readonly GoogleAuthenticationOptions _googleOptions = googleOptions.Value;
        private readonly ILogger<LinkTokenValidator> _logger = logger;

        public async Task<ExternalIdentity> Validate(string? token, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new BadRequestException("LinkToken is required.");
            }

            var isGoogleConfigured = !string.IsNullOrWhiteSpace(_googleOptions.ClientId);
            var scheme = BearerSchemes.SelectForToken(token, isGoogleConfigured);
            var options = _jwtBearerOptions.Get(scheme);
            var parameters = await GetValidationParameters(options, cancellationToken);

            var handler = new JsonWebTokenHandler { MapInboundClaims = options.MapInboundClaims };
            var result = await handler.ValidateTokenAsync(token, parameters);
            if (!result.IsValid || result.SecurityToken is not JsonWebToken jwt)
            {
                _logger.LogInformation(
                    "Link token rejected by the {Scheme} rules: {Reason}",
                    scheme,
                    result.Exception?.GetType().Name);
                throw new BadRequestException(InvalidTokenMessage);
            }

            var now = DateTime.UtcNow;
            if (jwt.IssuedAt == DateTime.MinValue
                || jwt.IssuedAt < now - MaxAge
                || jwt.IssuedAt > now + parameters.ClockSkew)
            {
                _logger.LogInformation("Link token rejected: issued at {IssuedAt:o}", jwt.IssuedAt);
                throw new BadRequestException(InvalidTokenMessage);
            }

            return ExternalIdentityReader.Read(new ClaimsPrincipal(result.ClaimsIdentity))
                ?? throw new BadRequestException(InvalidTokenMessage);
        }

        /// <summary>
        /// Builds the validation parameters the way <see cref="JwtBearerHandler"/> does: the scheme's own
        /// parameters, plus the issuer and signing keys from its OpenID Connect metadata.
        /// </summary>
        /// <param name="options">The options of the scheme that matches the token.</param>
        /// <param name="cancellationToken">The token used to cancel loading the metadata.</param>
        /// <returns>A copy of the scheme's parameters, ready for validation.</returns>
        private static async Task<TokenValidationParameters> GetValidationParameters(
            JwtBearerOptions options,
            CancellationToken cancellationToken)
        {
            var parameters = options.TokenValidationParameters.Clone();
            if (options.ConfigurationManager is BaseConfigurationManager baseConfigurationManager)
            {
                parameters.ConfigurationManager = baseConfigurationManager;
            }
            else if (options.ConfigurationManager is not null)
            {
                var configuration = await options.ConfigurationManager.GetConfigurationAsync(cancellationToken);
                string[] issuers = [configuration.Issuer];
                parameters.ValidIssuers = parameters.ValidIssuers?.Concat(issuers) ?? issuers;
                parameters.IssuerSigningKeys = parameters.IssuerSigningKeys?.Concat(configuration.SigningKeys)
                    ?? configuration.SigningKeys;
            }

            return parameters;
        }
    }
}
