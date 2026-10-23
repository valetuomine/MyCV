using CV.DataAccess.Entity;
using CV.LogicInterface.Authentication;

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
    }
}
