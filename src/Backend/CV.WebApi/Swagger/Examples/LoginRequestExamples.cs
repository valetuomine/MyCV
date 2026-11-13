using System.Diagnostics.CodeAnalysis;
using CV.LogicInterface.Dto.Login;
using Swashbuckle.AspNetCore.Filters;

namespace CV.WebApi.Swagger.Examples
{
    public class LinkLoginRequestExample : IExamplesProvider<LinkLoginRequest>
    {
        [SuppressMessage(
            "Major Vulnerability",
            "S6418:Hard-coded secrets are security-sensitive",
            Justification = "LinkToken is the name of a Swagger example field and the value is a dummy placeholder, not a secret.")]
        public LinkLoginRequest GetExamples()
        {
            return new LinkLoginRequest
            {
                LinkToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20ifQ.signature"
            };
        }
    }
}
