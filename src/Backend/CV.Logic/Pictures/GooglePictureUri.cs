namespace CV.Logic.Pictures
{
    /// <summary>
    /// Checks the <c>picture</c> claim of a Google sign-in before the API fetches it. Only an <c>https</c>
    /// address on Google's picture domain, on the default port and without user info, is accepted, so the
    /// claim can't point the API anywhere else.
    /// </summary>
    public static class GooglePictureUri
    {
        /// <summary>
        /// The domain that Google serves account pictures from; the only one the API fetches from.
        /// </summary>
        public const string Domain = "googleusercontent.com";

        /// <summary>
        /// Checks the claim and asks for the stored size, square-cropped, in place of the token's small one
        /// (<c>=s96-c</c>).
        /// </summary>
        /// <param name="pictureUrl">The <c>picture</c> claim from the validated Google token.</param>
        /// <returns>The address to fetch, or null when the claim isn't an accepted Google picture address.</returns>
        public static Uri? ForStoredSize(string? pictureUrl)
        {
            if (!Uri.TryCreate(pictureUrl, UriKind.Absolute, out var uri)
                || uri.Scheme != Uri.UriSchemeHttps
                || !uri.IsDefaultPort
                || uri.UserInfo.Length > 0
                || !(uri.Host.Equals(Domain, StringComparison.OrdinalIgnoreCase)
                    || uri.Host.EndsWith($".{Domain}", StringComparison.OrdinalIgnoreCase)))
            {
                return null;
            }

            // Google reads a picture's size options after the last "=" of its path.
            var path = uri.AbsolutePath;
            var optionsStart = path.LastIndexOf('=');
            var picturePath = optionsStart > path.LastIndexOf('/') ? path[..optionsStart] : path;
            return new Uri($"https://{uri.Host}{picturePath}=s{ProfilePictureProcessor.MaxSide}-c");
        }
    }
}
