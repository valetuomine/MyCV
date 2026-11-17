using System.Text.RegularExpressions;

namespace CV.Logic.Validation
{
    /// <summary>
    /// Checks the form of a public CV URL segment, such as <c>my-cv</c>.
    /// </summary>
    public static partial class PublicUrlSegmentFormat
    {
        [GeneratedRegex("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.None, matchTimeoutMilliseconds: 100)]
        private static partial Regex FormatRegex();

        /// <summary>
        /// Tells whether a normalized segment has the allowed form.
        /// </summary>
        /// <param name="normalizedValue">The segment, already trimmed and lowercased.</param>
        /// <returns>True for lowercase letters or numbers separated by single hyphens.</returns>
        public static bool IsWellFormed(string normalizedValue)
        {
            return FormatRegex().IsMatch(normalizedValue);
        }
    }
}
