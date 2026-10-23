namespace CV.LogicInterface.Authentication
{
    /// <summary>
    /// Google sign-in settings, bound from the <c>Authentication:Google</c> configuration section.
    /// </summary>
    public class GoogleAuthenticationOptions
    {
        public const string SectionName = "Authentication:Google";

        /// <summary>
        /// The issuer stored in <c>CandidateLogin.ProviderTenantId</c> for every Google login.
        /// </summary>
        public const string Issuer = "https://accounts.google.com";

        /// <summary>
        /// Gets the issuers that Google ID tokens may carry.
        /// </summary>
        public static readonly string[] ValidIssuers = [Issuer, "accounts.google.com"];

        /// <summary>
        /// Gets or sets MyCV's Google OAuth client ID, the required audience of Google ID tokens.
        /// </summary>
        public string? ClientId { get; set; }

        /// <summary>
        /// Gets or sets the verified email addresses that may create a CV with an unlinked Google identity.
        /// </summary>
        public string[] AllowedSignUpEmails { get; set; } = [];
    }
}
