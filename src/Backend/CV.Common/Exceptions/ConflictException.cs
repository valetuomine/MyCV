namespace CV.Common.Exceptions
{
    /// <param name="message">The ProblemDetails <c>detail</c>.</param>
    /// <param name="code">An optional machine-readable reason, returned as the ProblemDetails <c>code</c> extension.</param>
    public class ConflictException(string message, string? code = null) : Exception(message)
    {
        public string? Code { get; } = code;
    }
}
