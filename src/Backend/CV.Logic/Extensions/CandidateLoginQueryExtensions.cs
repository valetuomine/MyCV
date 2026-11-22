using CV.DataAccess.Entity;
using CV.LogicInterface.Authentication;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Extensions
{
    public static class CandidateLoginQueryExtensions
    {
        /// <summary>
        /// Filters logins to the one that matches the sign-in identity.
        /// </summary>
        /// <param name="logins">The logins to filter.</param>
        /// <param name="identity">The validated sign-in identity.</param>
        /// <returns>The logins with the identity's provider, tenant and user ID.</returns>
        public static IQueryable<CandidateLogin> ForIdentity(
            this IQueryable<CandidateLogin> logins,
            ExternalIdentity identity)
        {
            return logins.Where(login => login.Provider == identity.Provider
                && login.ProviderTenantId == identity.TenantId
                && login.ProviderUserId == identity.UserId);
        }

        /// <summary>
        /// Tells whether the sign-in identity is one of the logins of the candidate whose profile this is.
        /// </summary>
        /// <param name="logins">The logins to search.</param>
        /// <param name="identity">The validated sign-in identity, or null when the caller has none.</param>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="cancellationToken">The token used to cancel the query.</param>
        /// <returns>Whether the identity owns the profile.</returns>
        public static async Task<bool> OwnsProfile(
            this IQueryable<CandidateLogin> logins,
            ExternalIdentity? identity,
            Guid profileId,
            CancellationToken cancellationToken = default)
        {
            return identity is not null
                && await logins
                    .ForIdentity(identity)
                    .AnyAsync(login => login.Candidate.ProfileId == profileId, cancellationToken);
        }

        /// <summary>
        /// Selects the stored Google picture addresses of the profile's candidate, but only when the sign-in
        /// identity is one of that same candidate's logins, so that one CV never uses another CV's picture.
        /// The most recently used Google login comes first.
        /// </summary>
        /// <param name="logins">The logins to search.</param>
        /// <param name="identity">The validated sign-in identity of the caller.</param>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <returns>The stored addresses, most recently used Google login first.</returns>
        public static IQueryable<string> LinkedGooglePictureUrls(
            this IQueryable<CandidateLogin> logins,
            ExternalIdentity identity,
            Guid profileId)
        {
            return logins
                .Where(login => login.Provider == LoginProvider.Google
                    && login.GooglePictureUrl != null
                    && login.Candidate.ProfileId == profileId
                    && login.Candidate.Logins.Any(own => own.Provider == identity.Provider
                        && own.ProviderTenantId == identity.TenantId
                        && own.ProviderUserId == identity.UserId))
                .OrderByDescending(login => login.LastSignInAt)
                .ThenByDescending(login => login.CreatedAt)
                .Select(login => login.GooglePictureUrl!);
        }
    }
}
