using CV.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CV.WebApi.Middleware
{
    public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            var (statusCode, detail) = exception switch
            {
                BadRequestException => (StatusCodes.Status400BadRequest, exception.Message),
                ForbiddenException => (StatusCodes.Status403Forbidden, exception.Message),
                NotFoundException => (StatusCodes.Status404NotFound, exception.Message),
                ConflictException => (StatusCodes.Status409Conflict, exception.Message),
                PayloadTooLargeException => (StatusCodes.Status413PayloadTooLarge, exception.Message),
                UnsupportedMediaTypeException => (StatusCodes.Status415UnsupportedMediaType, exception.Message),
                BadGatewayException => (StatusCodes.Status502BadGateway, exception.Message),
                ServiceUnavailableException => (StatusCodes.Status503ServiceUnavailable, exception.Message),
                _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
            };

            if (statusCode == StatusCodes.Status500InternalServerError)
            {
                logger.LogError(exception, "Unhandled exception while processing request");
            }
            else if (exception is BadGatewayException { InnerException: { } upstreamError })
            {
                logger.LogWarning(upstreamError, "Upstream request failed: {Detail}", detail);
            }

            httpContext.Response.StatusCode = statusCode;

            var problemDetails = new ProblemDetails
            {
                Status = statusCode,
                Detail = detail
            };

            if (exception is ConflictException { Code: { } code })
            {
                problemDetails.Extensions["code"] = code;
            }

            await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}