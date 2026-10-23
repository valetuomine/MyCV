using CV.DataAccess.Entity;
using CV.LogicInterface.Authentication;

namespace CV.Logic.Mappers
{
    public static class CandidateLoginMapper
    {
        /// <summary>
        /// Maps a sign-in identity to a new login entity.
        /// </summary>
        /// <param name="identity">The validated sign-in identity.</param>
        /// <returns>A login entity with the identity's provider, tenant and user ID.</returns>
        public static CandidateLogin MapIdentityToLogin(this ExternalIdentity identity)
        {
            return new CandidateLogin
            {
                Provider = identity.Provider,
                ProviderTenantId = identity.TenantId,
                ProviderUserId = identity.UserId,
                LastSignInAt = DateTime.UtcNow
            };
        }
    }
}
