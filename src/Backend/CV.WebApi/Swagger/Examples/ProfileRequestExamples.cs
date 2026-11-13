using CV.LogicInterface.Dto.Profile;
using Swashbuckle.AspNetCore.Filters;

namespace CV.WebApi.Swagger.Examples
{
    internal static class ExampleProfileLinks
    {
        public const string Handle = "jane-doe";
    }

    public class CreateProfileRequestExample : IExamplesProvider<CreateProfileRequest>
    {
        public CreateProfileRequest GetExamples()
        {
            return new CreateProfileRequest
            {
                PublicUrlSegment = "valtteri-tuominen",
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
                LinkedInUrl = $"https://www.linkedin.com/in/{ExampleProfileLinks.Handle}",
                GitHubUrl = $"https://github.com/{ExampleProfileLinks.Handle}"
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
                LinkedInUrl = $"https://www.linkedin.com/in/{ExampleProfileLinks.Handle}",
                GitHubUrl = $"https://github.com/{ExampleProfileLinks.Handle}"
            };
        }
    }
}