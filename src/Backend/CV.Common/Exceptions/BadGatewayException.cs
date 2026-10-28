namespace CV.Common.Exceptions
{
    /// <param name="message">The ProblemDetails <c>detail</c>.</param>
    /// <param name="innerException">The failure from the upstream service, logged but never returned.</param>
    public class BadGatewayException(string message, Exception? innerException = null) : Exception(message, innerException)
    {
    }
}
