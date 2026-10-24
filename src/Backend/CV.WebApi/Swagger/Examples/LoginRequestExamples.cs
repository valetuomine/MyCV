using CV.LogicInterface.Dto.Login;
using Swashbuckle.AspNetCore.Filters;

namespace CV.WebApi.Swagger.Examples
{
    public class LinkLoginRequestExample : IExamplesProvider<LinkLoginRequest>
    {
        public LinkLoginRequest GetExamples()
        {
            return new LinkLoginRequest
            {
                LinkToken = "eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20ifQ.signature"
            };
        }
    }
}
