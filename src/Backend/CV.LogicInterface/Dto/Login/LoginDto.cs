namespace CV.LogicInterface.Dto.Login
{
    /// <summary>
    /// Represents one of the caller's sign-in methods, without the provider's user identifiers.
    /// </summary>
    public class LoginDto
    {
        /// <summary>
        /// Gets or sets the login's internal identifier, used to remove it.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the sign-in provider, either "entra" or "google".
        /// </summary>
        public string Provider { get; set; } = null!;

        /// <summary>
        /// Gets or sets when the method was linked to the CV, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets when the method was last used to open the CV's admin view, with the Finland UTC offset.
        /// </summary>
        public DateTimeOffset? LastSignInAt { get; set; }

        /// <summary>
        /// Gets or sets whether the caller is signed in with this method in the current request.
        /// </summary>
        public bool IsCurrent { get; set; }
    }
}
