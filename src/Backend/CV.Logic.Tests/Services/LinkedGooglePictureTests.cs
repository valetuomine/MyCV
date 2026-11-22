using System.Net;
using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Services;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.ServiceInterfaces;
using CV.LogicInterface.Storage;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SkiaSharp;

namespace CV.Logic.Tests.Services
{
    /// <summary>
    /// Checks that a Google login stores its account picture address when it is linked and when its owner
    /// opens the CV's admin view, and that the CV's other sign-ins can then use that picture, but never another
    /// CV's. The queries run against an in-memory SQLite database; storage and Google are fakes.
    /// </summary>
    [TestClass]
    public sealed class LinkedGooglePictureTests : IDisposable
    {
        private const string GoogleIssuer = "https://accounts.google.com";
        private const string TokenPicture = "https://lh3.googleusercontent.com/a/owner-picture=s96-c";
        private const string StoredPicture = "https://lh3.googleusercontent.com/a/owner-picture=s1200-c";

        private static readonly ExternalIdentity Microsoft = new(LoginProvider.Entra, "tenant", "owner", null, false);
        private static readonly ExternalIdentity Google = new(
            LoginProvider.Google, GoogleIssuer, "google-owner", "owner@example.com", true, TokenPicture);
        private static readonly ExternalIdentity OtherMicrosoft = new(LoginProvider.Entra, "tenant", "other", null, false);
        private static readonly ExternalIdentity OtherGoogle = new(
            LoginProvider.Google,
            GoogleIssuer,
            "google-other",
            "other@example.com",
            true,
            "https://lh3.googleusercontent.com/a/other-picture=s96-c");

        private readonly SqliteConnection _connection = new("DataSource=:memory:");
        private readonly CvContext _context;
        private readonly FakePictureStore _pictureStore = new();
        private readonly FakeGoogleHandler _google = new();
        private readonly HttpClient _httpClient;
        private readonly ProfilePictureService _pictureService;
        private readonly ProfileService _profileService;
        private readonly LoginService _loginService;
        private readonly Profile _profile;
        private readonly Profile _otherProfile;

        public LinkedGooglePictureTests()
        {
            _connection.Open();
            _context = new CvContext(new DbContextOptionsBuilder<CvContext>().UseSqlite(_connection).Options);
            _context.Database.EnsureCreated();

            _profile = AddCandidate("owner-cv", Microsoft);
            _otherProfile = AddCandidate("other-cv", OtherMicrosoft, OtherGoogle);
            _context.SaveChanges();
            _context.ChangeTracker.Clear();

            _httpClient = new HttpClient(_google);
            _pictureService = new ProfilePictureService(_context, _pictureStore, _httpClient);
            _profileService = new ProfileService(_context, Options.Create(new GoogleAuthenticationOptions()));
            _loginService = new LoginService(_context);
        }

        public void Dispose()
        {
            _httpClient.Dispose();
            _context.Dispose();
            _connection.Dispose();
        }

        [TestMethod]
        public async Task LinkingAGoogleAccountStoresItsCheckedPictureAddress()
        {
            await _loginService.LinkLogin(Microsoft, Google);

            Assert.AreEqual(StoredPicture, await ReadStoredPicture(Google));
        }

        [TestMethod]
        public async Task LinkingTheSameGoogleAccountAgainRefreshesTheAddress()
        {
            await _loginService.LinkLogin(Microsoft, Google with { PictureUrl = null });
            Assert.IsNull(await ReadStoredPicture(Google));

            var result = await _loginService.LinkLogin(Microsoft, Google);

            Assert.IsFalse(result.Created);
            Assert.AreEqual(StoredPicture, await ReadStoredPicture(Google));
        }

        [TestMethod]
        public async Task LinkingAGoogleAccountAgainMakesItsPictureTheOneUsed()
        {
            var secondGoogle = Google with
            {
                UserId = "google-second",
                PictureUrl = "https://lh3.googleusercontent.com/a/second-picture=s96-c"
            };
            await _loginService.LinkLogin(Microsoft, Google);
            await _loginService.LinkLogin(Microsoft, secondGoogle);

            await _loginService.LinkLogin(
                Microsoft,
                Google with { PictureUrl = "https://lh3.googleusercontent.com/a/fresh=s96-c" });
            await _pictureService.SaveGooglePicture(_profile.Id, Microsoft, false);

            Assert.AreEqual(
                "https://lh3.googleusercontent.com/a/fresh=s1200-c",
                _google.RequestedUris.Single().AbsoluteUri);
        }

        [TestMethod]
        public async Task LinkingAMicrosoftAccountStoresNoAddress()
        {
            await _loginService.LinkLogin(Microsoft, Google);
            var linkedMicrosoft = new ExternalIdentity(LoginProvider.Entra, "tenant", "second", null, false, TokenPicture);

            await _loginService.LinkLogin(Google, linkedMicrosoft);

            Assert.IsNull(await ReadStoredPicture(linkedMicrosoft));
        }

        [TestMethod]
        public async Task OpeningTheAdminViewInAGoogleSessionRefreshesTheAddress()
        {
            await _loginService.LinkLogin(Microsoft, Google with { PictureUrl = null });

            var profile = await _profileService.GetProfileAdmin(_profile.Id, Google, false);

            Assert.IsTrue(profile.CanUseGooglePicture);
            Assert.AreEqual(StoredPicture, await ReadStoredPicture(Google));
        }

        [TestMethod]
        public async Task OpeningTheAdminViewInAGoogleSessionWithoutAPictureClearsTheAddress()
        {
            await _loginService.LinkLogin(Microsoft, Google);

            var profile = await _profileService.GetProfileAdmin(_profile.Id, Google with { PictureUrl = null }, false);

            Assert.IsFalse(profile.CanUseGooglePicture);
            Assert.IsNull(await ReadStoredPicture(Google));
        }

        [TestMethod]
        public async Task OpeningTheAdminViewInAMicrosoftSessionKeepsTheAddress()
        {
            await _loginService.LinkLogin(Microsoft, Google);

            var profile = await _profileService.GetProfileAdmin(_profile.Id, Microsoft, false);

            Assert.IsTrue(profile.CanUseGooglePicture);
            Assert.AreEqual(StoredPicture, await ReadStoredPicture(Google));
        }

        [TestMethod]
        public async Task MicrosoftSessionWithoutALinkedGoogleAccountCannotUseAGooglePicture()
        {
            var profile = await _profileService.GetProfileAdmin(_profile.Id, Microsoft, false);

            Assert.IsFalse(profile.CanUseGooglePicture);
            await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _pictureService.SaveGooglePicture(_profile.Id, Microsoft, false));
            Assert.AreEqual(0, _google.RequestedUris.Count);
        }

        [TestMethod]
        public async Task MicrosoftSessionSavesThePictureOfTheLinkedGoogleAccount()
        {
            await _loginService.LinkLogin(Microsoft, Google);

            var result = await _pictureService.SaveGooglePicture(_profile.Id, Microsoft, false);

            Assert.AreEqual(StoredPicture, _google.RequestedUris.Single().AbsoluteUri);
            Assert.AreEqual(1, _pictureStore.UploadedBlobNames.Count);
            StringAssert.StartsWith(result.PictureUrl, $"/api/Profile/{_profile.Id}/picture");
        }

        [TestMethod]
        public async Task GoogleSessionStillUsesItsOwnToken()
        {
            var tokenOnly = Google with { PictureUrl = "https://lh3.googleusercontent.com/a/fresh=s96-c" };
            await _loginService.LinkLogin(Microsoft, Google);

            await _pictureService.SaveGooglePicture(_profile.Id, tokenOnly, false);

            Assert.AreEqual(
                "https://lh3.googleusercontent.com/a/fresh=s1200-c",
                _google.RequestedUris.Single().AbsoluteUri);
        }

        [TestMethod]
        public async Task StoredAddressOffGooglesPictureHostIsNotFetched()
        {
            await _loginService.LinkLogin(Microsoft, Google);
            await _context.CandidateLogin
                .Where(login => login.ProviderUserId == Google.UserId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(
                    login => login.GooglePictureUrl,
                    "https://attacker.example/a/picture=s1200-c"));

            await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _pictureService.SaveGooglePicture(_profile.Id, Microsoft, false));
            Assert.AreEqual(0, _google.RequestedUris.Count);
        }

        [TestMethod]
        public async Task AnotherCvsGooglePictureIsNeverUsed()
        {
            await _profileService.GetProfileAdmin(_otherProfile.Id, OtherGoogle, false);
            Assert.IsNotNull(await ReadStoredPicture(OtherGoogle));

            var profile = await _profileService.GetProfileAdmin(_profile.Id, Microsoft, false);

            Assert.IsFalse(profile.CanUseGooglePicture);
            await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _pictureService.SaveGooglePicture(_profile.Id, Microsoft, false));
            Assert.AreEqual(0, _google.RequestedUris.Count);
        }

        [TestMethod]
        public async Task CvAdminCannotUseTheOwnersLinkedGooglePicture()
        {
            await _profileService.GetProfileAdmin(_otherProfile.Id, OtherGoogle, false);

            var profile = await _profileService.GetProfileAdmin(_otherProfile.Id, Microsoft, true);

            Assert.IsFalse(profile.CanUseGooglePicture);
            await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _pictureService.SaveGooglePicture(_otherProfile.Id, Microsoft, true));
            Assert.AreEqual(0, _google.RequestedUris.Count);
        }

        private Profile AddCandidate(string publicUrlSegment, params ExternalIdentity[] identities)
        {
            var profile = new Profile
            {
                FullName = publicUrlSegment,
                Translations = [new ProfileTranslation { LanguageCode = "fi", Title = "Kehittäjä" }]
            };

            var candidate = new Candidate { PublicUrlSegment = publicUrlSegment, ProfileId = profile.Id };
            foreach (var identity in identities)
            {
                candidate.Logins.Add(new CandidateLogin
                {
                    Provider = identity.Provider,
                    ProviderTenantId = identity.TenantId,
                    ProviderUserId = identity.UserId,
                });
            }

            _context.Profile.Add(profile);
            _context.Candidate.Add(candidate);
            return profile;
        }

        private Task<string?> ReadStoredPicture(ExternalIdentity identity)
        {
            return _context.CandidateLogin
                .AsNoTracking()
                .Where(login => login.Provider == identity.Provider
                    && login.ProviderTenantId == identity.TenantId
                    && login.ProviderUserId == identity.UserId)
                .Select(login => login.GooglePictureUrl)
                .SingleAsync();
        }

        /// <summary>
        /// Answers every request with a small PNG and records the requested addresses.
        /// </summary>
        private sealed class FakeGoogleHandler : HttpMessageHandler
        {
            public List<Uri> RequestedUris { get; } = [];

            protected override Task<HttpResponseMessage> SendAsync(
                HttpRequestMessage request,
                CancellationToken cancellationToken)
            {
                RequestedUris.Add(request.RequestUri!);

                using var bitmap = new SKBitmap(40, 40);
                using (var canvas = new SKCanvas(bitmap))
                {
                    canvas.Clear(SKColors.Blue);
                }

                using var png = bitmap.Encode(SKEncodedImageFormat.Png, 90);
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(png.ToArray())
                });
            }
        }

        /// <summary>
        /// Stores nothing and records the uploaded blob names.
        /// </summary>
        private sealed class FakePictureStore : IProfilePictureStore
        {
            public bool IsConfigured => true;

            public List<string> UploadedBlobNames { get; } = [];

            public Task Upload(string blobName, byte[] content, string contentType, CancellationToken cancellationToken = default)
            {
                UploadedBlobNames.Add(blobName);
                return Task.CompletedTask;
            }

            public Task<StoredProfilePicture?> Download(string blobName, CancellationToken cancellationToken = default)
            {
                throw new NotSupportedException();
            }

            public Task RemoveUnused(string blobName)
            {
                return Task.CompletedTask;
            }
        }
    }
}
