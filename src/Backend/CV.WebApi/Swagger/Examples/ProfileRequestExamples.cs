using CV.LogicInterface.Dto.Profile;
using Swashbuckle.AspNetCore.Filters;

namespace CV.WebApi.Swagger.Examples
{
    public class CreateProfileRequestExample : IExamplesProvider<CreateProfileRequest>
    {
        public CreateProfileRequest GetExamples()
        {
            return new CreateProfileRequest
            {
                FullName = "Jane Doe",
                Translations =
                [
                    new ProfileTranslationRequest
                    {
                        LanguageCode = "fi",
                        Title = "Ohjelmistokehittäjä",
                        Summary = "Rakennan verkkopalveluita.",
                        Location = "Tampere, Suomi"
                    },
                    new ProfileTranslationRequest
                    {
                        LanguageCode = "en",
                        Title = "Software Developer",
                        Summary = "I build web applications.",
                        Location = "Tampere, Finland"
                    }
                ],
                LinkedInUrl = "https://www.linkedin.com/in/jane-doe",
                GitHubUrl = "https://github.com/jane-doe"
            };
        }
    }

    public class UpdateProfileRequestExample : IExamplesProvider<UpdateProfileRequest>
    {
        public UpdateProfileRequest GetExamples()
        {
            return new UpdateProfileRequest
            {
                FullName = "Jane Doe",
                Translations =
                [
                    new ProfileTranslationRequest
                    {
                        LanguageCode = "fi",
                        Title = "Ohjelmistokehittäjä",
                        Summary = "Rakennan verkkopalveluita.",
                        Location = "Tampere, Suomi"
                    },
                    new ProfileTranslationRequest
                    {
                        LanguageCode = "en",
                        Title = "Software Developer",
                        Summary = "I build web applications.",
                        Location = "Tampere, Finland"
                    }
                ],
                LinkedInUrl = "https://www.linkedin.com/in/jane-doe",
                GitHubUrl = "https://github.com/jane-doe"
            };
        }
    }
}