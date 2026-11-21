using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Mappers;
using CV.Logic.Services;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Profile;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Tests.Services
{
    /// <summary>
    /// Checks the profile's default language: validation and storage on create and update, and the mapping
    /// that falls back to the default language. The queries run against an in-memory SQLite database.
    /// </summary>
    [TestClass]
    public sealed class ProfileDefaultLanguageTests : IDisposable
    {
        private static readonly ExternalIdentity Owner = new(LoginProvider.Entra, "tenant", "owner", null, false);
        private static readonly ExternalIdentity NewUser = new(LoginProvider.Entra, "tenant", "new-user", null, false);

        private readonly SqliteConnection _connection = new("DataSource=:memory:");
        private readonly CvContext _context;
        private readonly ProfileService _service;
        private readonly Guid _profileId;

        public ProfileDefaultLanguageTests()
        {
            _connection.Open();
            _context = new CvContext(new DbContextOptionsBuilder<CvContext>().UseSqlite(_connection).Options);
            _context.Database.EnsureCreated();

            var profile = new Profile
            {
                FullName = "Test Person",
                Translations = [new ProfileTranslation { LanguageCode = "fi", Title = "Kehittäjä" }]
            };
            _profileId = profile.Id;

            var candidate = new Candidate { PublicUrlSegment = "test-cv", ProfileId = profile.Id };
            candidate.Logins.Add(new CandidateLogin
            {
                Provider = Owner.Provider,
                ProviderTenantId = Owner.TenantId,
                ProviderUserId = Owner.UserId,
            });

            _context.Profile.Add(profile);
            _context.Candidate.Add(candidate);
            _context.SaveChanges();
            _context.ChangeTracker.Clear();

            _service = new ProfileService(_context, Options.Create(new GoogleAuthenticationOptions()));
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [TestMethod]
        public async Task CreateStoresAnEnglishDefaultWithoutFinnish()
        {
            var result = await _service.CreateProfile(
                CreateRequest("en", ("en", "Software Developer")), NewUser);

            Assert.AreEqual("en", result.DefaultLanguageCode);
            Assert.AreEqual(1, result.Translations.Count);
            Assert.AreEqual("en", result.Translations.Single().LanguageCode);
        }

        [TestMethod]
        [DataRow(null)]
        [DataRow("")]
        [DataRow(" ")]
        public async Task CreateTreatsAMissingDefaultAsFinnish(string? defaultLanguageCode)
        {
            var result = await _service.CreateProfile(
                CreateRequest(defaultLanguageCode, ("fi", "Ohjelmistokehittäjä")), NewUser);

            Assert.AreEqual("fi", result.DefaultLanguageCode);
        }

        [TestMethod]
        public async Task CreateRejectsAMissingDefaultLanguageTranslation()
        {
            var request = CreateRequest("en", ("fi", "Ohjelmistokehittäjä"));

            var exception = await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _service.CreateProfile(request, NewUser));

            StringAssert.Contains(exception.Message, "default language (en)");
        }

        [TestMethod]
        public async Task CreateRejectsADefaultTranslationWithoutTitle()
        {
            var request = CreateRequest("en", ("en", " "));

            var exception = await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _service.CreateProfile(request, NewUser));

            StringAssert.Contains(exception.Message, "Title is required");
        }

        [TestMethod]
        public async Task CreateRejectsAnUnsupportedDefaultLanguage()
        {
            var request = CreateRequest("sv", ("sv", "Utvecklare"));

            var exception = await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _service.CreateProfile(request, NewUser));

            StringAssert.Contains(exception.Message, "Unsupported language code");
        }

        [TestMethod]
        public async Task UpdateSwitchesTheDefaultToANewLanguageWhenItsTranslationIsIncluded()
        {
            var result = await _service.UpdateProfile(
                _profileId,
                UpdateRequest("en", ("fi", "Kehittäjä"), ("en", "Developer")),
                Owner,
                canManageAny: false);

            _context.ChangeTracker.Clear();
            var stored = await _context.Profile.Include(profile => profile.Translations).SingleAsync();
            Assert.AreEqual("en", result.DefaultLanguageCode);
            Assert.AreEqual("en", stored.DefaultLanguageCode);
            CollectionAssert.AreEquivalent(
                new[] { "fi", "en" },
                stored.Translations.Select(item => item.LanguageCode).ToArray());
        }

        [TestMethod]
        public async Task UpdateRejectsSwitchingTheDefaultWithoutItsTranslation()
        {
            var request = UpdateRequest("en", ("fi", "Kehittäjä"));

            var exception = await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _service.UpdateProfile(_profileId, request, Owner, canManageAny: false));

            StringAssert.Contains(exception.Message, "default language (en)");
            _context.ChangeTracker.Clear();
            Assert.AreEqual("fi", (await _context.Profile.SingleAsync()).DefaultLanguageCode);
        }

        [TestMethod]
        public async Task UpdateWithoutADefaultKeepsTheStoredOne()
        {
            await _service.UpdateProfile(
                _profileId,
                UpdateRequest("en", ("fi", "Kehittäjä"), ("en", "Developer")),
                Owner,
                canManageAny: false);

            var result = await _service.UpdateProfile(
                _profileId,
                UpdateRequest(null, ("en", "Senior Developer")),
                Owner,
                canManageAny: false);

            Assert.AreEqual("en", result.DefaultLanguageCode);
        }

        [TestMethod]
        public async Task GetProfileFallsBackToTheStoredDefaultLanguage()
        {
            await _service.UpdateProfile(
                _profileId,
                UpdateRequest("en", ("en", "Developer")),
                Owner,
                canManageAny: false);

            var dto = await _service.GetProfile(_profileId, "fi");

            Assert.AreEqual("en", dto.LanguageCode);
            Assert.AreEqual("en", dto.DefaultLanguageCode);
            Assert.AreEqual("Developer", dto.Title);
        }

        [TestMethod]
        public void MapReturnsTheRequestedLanguageWhenItExists()
        {
            var profile = new Profile
            {
                FullName = "Jane Doe",
                DefaultLanguageCode = "en",
                Translations =
                [
                    new ProfileTranslation { LanguageCode = "en", Title = "Software Developer" },
                    new ProfileTranslation { LanguageCode = "fi", Title = "Ohjelmistokehittäjä" }
                ]
            };

            var dto = profile.MapEntityToDto("fi");

            Assert.AreEqual("fi", dto.LanguageCode);
            Assert.AreEqual("en", dto.DefaultLanguageCode);
            Assert.AreEqual("Ohjelmistokehittäjä", dto.Title);
        }

        private static CreateProfileRequest CreateRequest(
            string? defaultLanguageCode,
            params (string Code, string Title)[] translations)
        {
            return new CreateProfileRequest
            {
                PublicUrlSegment = "jane-doe",
                FullName = "Jane Doe",
                DefaultLanguageCode = defaultLanguageCode,
                Translations = [.. translations.Select(item => new ProfileTranslationRequest
                {
                    LanguageCode = item.Code,
                    Title = item.Title
                })]
            };
        }

        private static UpdateProfileRequest UpdateRequest(
            string? defaultLanguageCode,
            params (string Code, string Title)[] translations)
        {
            return new UpdateProfileRequest
            {
                FullName = "Test Person",
                DefaultLanguageCode = defaultLanguageCode,
                Translations = [.. translations.Select(item => new ProfileTranslationRequest
                {
                    LanguageCode = item.Code,
                    Title = item.Title
                })]
            };
        }
    }
}
