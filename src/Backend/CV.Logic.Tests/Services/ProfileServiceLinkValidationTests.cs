using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Services;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Profile;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Tests.Services
{
    /// <summary>
    /// Checks that creating a profile refuses LinkedIn and GitHub links with a scheme other than http or
    /// https. The request is validated before the database is touched, so the context has no provider. A
    /// create that passes validation asks to reattach a candidate without the right to, which fails with
    /// <see cref="NotFoundException"/> before any query runs. Updating shares the same
    /// <c>ValidateRequest</c> call, but checks ownership in the database first, so it can't be reached
    /// here; <see cref="Validation.ProfileLinkUriTests"/> covers the rule itself.
    /// </summary>
    [TestClass]
    public sealed class ProfileServiceLinkValidationTests : IDisposable
    {
        private static readonly ExternalIdentity Owner = new("entra", "tenant", "user", null, false);

        private readonly CvContext _context = new(new DbContextOptions<CvContext>());
        private readonly ProfileService _service;

        public ProfileServiceLinkValidationTests()
        {
            _service = new ProfileService(_context, Options.Create(new GoogleAuthenticationOptions()), null!);
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        [TestMethod]
        public async Task CreateRejectsAJavaScriptLinkedInLink()
        {
            var request = CreateRequest(linkedInUrl: "javascript:alert(document.cookie)");

            var exception = await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _service.CreateProfile(request, Owner, canManageAny: false));

            Assert.AreEqual("LinkedInUrl must be an http or https link.", exception.Message);
        }

        [TestMethod]
        public async Task CreateRejectsAJavaScriptGitHubLink()
        {
            var request = CreateRequest(gitHubUrl: "javascript:alert(1)");

            var exception = await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _service.CreateProfile(request, Owner, canManageAny: false));

            Assert.AreEqual("GitHubUrl must be an http or https link.", exception.Message);
        }

        [TestMethod]
        [DataRow("https://www.linkedin.com/in/jane-doe", "https://github.com/jane-doe")]
        [DataRow("www.linkedin.com/in/jane-doe", "github.com/jane-doe")]
        [DataRow(null, null)]
        public async Task CreateAcceptsHttpsAndSchemelessLinks(string? linkedInUrl, string? gitHubUrl)
        {
            var request = CreateRequest(linkedInUrl, gitHubUrl);
            request.CandidateId = Guid.NewGuid();

            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _service.CreateProfile(request, Owner, canManageAny: false));
        }

        private static CreateProfileRequest CreateRequest(string? linkedInUrl = null, string? gitHubUrl = null)
        {
            return new CreateProfileRequest
            {
                PublicUrlSegment = "jane-doe",
                FullName = "Jane Doe",
                Translations =
                [
                    new ProfileTranslationRequest { LanguageCode = "fi", Title = "Ohjelmistokehittäjä" },
                ],
                LinkedInUrl = linkedInUrl,
                GitHubUrl = gitHubUrl,
            };
        }
    }
}
