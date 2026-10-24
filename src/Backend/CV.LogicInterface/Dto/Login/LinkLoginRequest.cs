namespace CV.LogicInterface.Dto.Login
{
    /// <summary>
    /// Represents the proof of a sign-in method that the caller wants to add.
    /// </summary>
    public class LinkLoginRequest
    {
        /// <summary>
        /// Gets or sets the new method's token, signed in at most 10 minutes ago: an Entra access token
        /// for the API, or a Google ID token. Required.
        /// </summary>
        public string? LinkToken { get; set; }
    }
}
