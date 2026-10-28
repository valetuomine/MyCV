namespace CV.LogicInterface.Authentication
{
    /// <summary>
    /// The validated sign-in identity of the caller.
    /// </summary>
    /// <param name="Provider">The sign-in provider, one of <see cref="LoginProvider"/>.</param>
    /// <param name="TenantId">Entra's <c>tid</c> claim, or the normalized Google issuer.</param>
    /// <param name="UserId">Entra's <c>oid</c> claim, or Google's <c>sub</c> claim.</param>
    /// <param name="Email">The email address from the token, used only for the Google sign-up list.</param>
    /// <param name="EmailVerified">Whether the provider has verified <paramref name="Email"/>.</param>
    /// <param name="PictureUrl">Google's <c>picture</c> claim, the account's profile picture; null for Entra.</param>
    public sealed record ExternalIdentity(
        string Provider,
        string TenantId,
        string UserId,
        string? Email,
        bool EmailVerified,
        string? PictureUrl = null);
}
