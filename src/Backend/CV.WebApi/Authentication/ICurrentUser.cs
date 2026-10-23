using CV.LogicInterface.Authentication;

namespace CV.WebApi.Authentication
{
    /// <summary>
    /// Provides the signed-in caller of the current request.
    /// </summary>
    public interface ICurrentUser
    {
        /// <summary>
        /// Gets the caller's validated sign-in identity, or null when the request carries none.
        /// </summary>
        ExternalIdentity? Identity { get; }

        /// <summary>
        /// Gets whether the caller has the <c>CvAdmin</c> role, which only Entra tokens can carry.
        /// </summary>
        bool IsCvAdmin { get; }
    }
}
