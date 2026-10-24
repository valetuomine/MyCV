using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Login;

namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Provides operations on the caller's own sign-in methods.
    /// </summary>
    public interface ILoginService
    {
        /// <summary>
        /// Retrieves the sign-in methods of the caller's candidate.
        /// </summary>
        /// <param name="actor">The caller's sign-in identity.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The candidate's sign-in methods, oldest first.</returns>
        Task<IReadOnlyCollection<LoginDto>> GetLogins(
            ExternalIdentity actor,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Links a validated sign-in identity to the caller's candidate.
        /// </summary>
        /// <param name="actor">The caller's sign-in identity.</param>
        /// <param name="linked">The identity proven by the link token.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        /// <returns>The linked method, and whether it was added now.</returns>
        Task<LinkLoginResult> LinkLogin(
            ExternalIdentity actor,
            ExternalIdentity linked,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Removes one of the caller's sign-in methods, other than the last one or the current one.
        /// </summary>
        /// <param name="loginId">The identifier of the method to remove.</param>
        /// <param name="actor">The caller's sign-in identity.</param>
        /// <param name="cancellationToken">The token used to cancel the operation.</param>
        Task DeleteLogin(
            Guid loginId,
            ExternalIdentity actor,
            CancellationToken cancellationToken = default);
    }
}
