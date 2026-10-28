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
    }
}
