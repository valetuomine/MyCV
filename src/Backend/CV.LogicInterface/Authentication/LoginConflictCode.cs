namespace CV.LogicInterface.Authentication
{
    /// <summary>
    /// Names the reasons a sign-in method can't be linked or removed, returned as the ProblemDetails <c>code</c> of a 409.
    /// </summary>
    public static class LoginConflictCode
    {
        public const string LinkedToAnotherCandidate = "login-linked-to-another-cv";
        public const string IsCurrent = "login-is-current";
        public const string IsLast = "login-is-last";
    }
}
