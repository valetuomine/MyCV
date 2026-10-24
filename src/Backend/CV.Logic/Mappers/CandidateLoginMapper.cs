using CV.DataAccess.Entity;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Login;

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

        /// <summary>
        /// Maps a login entity to a DTO that leaves out the provider's tenant and user ID.
        /// </summary>
        /// <param name="dbLogin">The login entity to map.</param>
        /// <param name="actor">The caller's sign-in identity, used to mark the current method.</param>
        /// <returns>A data transfer object for the login.</returns>
        public static LoginDto MapEntityToDto(this CandidateLogin dbLogin, ExternalIdentity actor)
        {
            return new LoginDto
            {
                Id = dbLogin.Id,
                Provider = dbLogin.Provider,
                CreatedAt = TimestampMapper.ToFinlandTime(dbLogin.CreatedAt),
                LastSignInAt = TimestampMapper.ToFinlandTime(dbLogin.LastSignInAt),
                IsCurrent = dbLogin.Matches(actor)
            };
        }

        /// <summary>
        /// Checks whether a login is the given sign-in identity.
        /// </summary>
        /// <param name="dbLogin">The login entity.</param>
        /// <param name="identity">The sign-in identity to compare.</param>
        /// <returns>True when the provider, tenant and user ID all match.</returns>
        public static bool Matches(this CandidateLogin dbLogin, ExternalIdentity identity)
        {
            return dbLogin.Provider == identity.Provider
                && dbLogin.ProviderTenantId == identity.TenantId
                && dbLogin.ProviderUserId == identity.UserId;
        }
    }
}
