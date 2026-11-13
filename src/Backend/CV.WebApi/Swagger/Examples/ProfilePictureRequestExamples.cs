using CV.LogicInterface.Dto.Profile;
using Swashbuckle.AspNetCore.Filters;

namespace CV.WebApi.Swagger.Examples
{
    public class UpdateProfilePictureVisibilityRequestExample : IExamplesProvider<UpdateProfilePictureVisibilityRequest>
    {
        public UpdateProfilePictureVisibilityRequest GetExamples()
        {
            return new UpdateProfilePictureVisibilityRequest
            {
                IsVisible = false
            };
        }
    }
}
