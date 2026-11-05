using System.Text.RegularExpressions;

namespace CV.Logic.Validation
{
    /// <summary>
    /// Checks the profile's LinkedIn and GitHub links before they are saved. A link may be an
    /// <c>http</c> or <c>https</c> address, or have no scheme at all, such as <c>github.com/user</c>,
    /// which the client opens as <c>https</c>. Any other scheme, such as <c>javascript:</c> or
    /// <c>data:</c>, is refused, so a saved link can't run code when it is opened. The client form
    /// (<c>isAllowedProfileLink</c> in <c>profileFormUtils.ts</c>) applies the same rule.
    /// </summary>
    public static partial class ProfileLinkUri
    {
        // C0 controls and the space, which browsers trim from both ends of a link.
        private static readonly char[] TrimmedCharacters =
            [.. Enumerable.Range(0, 0x21).Select(code => (char)code)];

        [GeneratedRegex("^[a-z][a-z0-9+.-]*:", RegexOptions.IgnoreCase, matchTimeoutMilliseconds: 100)]
        private static partial Regex SchemeRegex();

        // A host with a port and no scheme, such as "github.com:443/user" or "localhost:3000". The host
        // must contain a dot or be localhost, so "javascript:1/alert(1)" still counts as a scheme.
        [GeneratedRegex(@"^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+|localhost):[0-9]+(?:[/?#]|$)", RegexOptions.IgnoreCase, matchTimeoutMilliseconds: 100)]
        private static partial Regex HostAndPortRegex();

        /// <summary>
        /// Tells whether a profile link may be saved.
        /// </summary>
        /// <param name="value">The link as sent by the client; null or blank means no link.</param>
        /// <returns>True for no link, a link without a scheme, or an absolute <c>http</c> or <c>https</c> address.</returns>
        public static bool IsAllowed(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return true;
            }

            // Browsers drop leading and trailing controls and spaces, and tabs and line breaks anywhere,
            // before they read the scheme, so "java\tscript:" is checked as "javascript:".
            var normalized = new string([.. value.Where(character => character is not ('\t' or '\n' or '\r'))])
                .Trim(TrimmedCharacters);

            if (!SchemeRegex().IsMatch(normalized) || HostAndPortRegex().IsMatch(normalized))
            {
                return true;
            }

            return Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
                && uri.Host.Length > 0;
        }
    }
}
