namespace CV.LogicInterface.Dto.Login
{
    /// <summary>
    /// Represents the outcome of linking a sign-in method.
    /// </summary>
    /// <param name="Login">The linked method.</param>
    /// <param name="Created">True when the method was added now, false when it was already linked.</param>
    public sealed record LinkLoginResult(LoginDto Login, bool Created);
}
