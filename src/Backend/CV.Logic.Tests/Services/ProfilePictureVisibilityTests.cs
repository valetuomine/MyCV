using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Mappers;
using CV.Logic.Pictures;
using CV.Logic.Services;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.ServiceInterfaces;
using CV.LogicInterface.Storage;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Tests.Services
{
    /// <summary>
    /// Checks that hiding a profile's picture section keeps the stored picture, hides it from the public
    /// profile and its picture endpoint, and that showing it again brings the same picture back. The queries
    /// run against an in-memory SQLite database, and storage is a fake that serves the stored blob name.
    /// </summary>
    [TestClass]
    public sealed class ProfilePictureVisibilityTests : IDisposable
    {
        private static readonly ExternalIdentity Owner = new(LoginProvider.Entra, "tenant", "owner", null, false);
        private static readonly ExternalIdentity Stranger = new(LoginProvider.Entra, "tenant", "stranger", null, false);

        private readonly SqliteConnection _connection = new("DataSource=:memory:");
        private readonly CvContext _context;
        private readonly FakePictureStore _pictureStore = new();
        private readonly ProfilePictureService _pictureService;
        private readonly ProfileService _profileService;
        private readonly Profile _profile;
        private readonly string _blobName;

        public ProfilePictureVisibilityTests()
        {
            _connection.Open();
            _context = new CvContext(new DbContextOptionsBuilder<CvContext>().UseSqlite(_connection).Options);
            _context.Database.EnsureCreated();

            _profile = new Profile
            {
                FullName = "Test Person",
                Translations = [new ProfileTranslation { LanguageCode = "fi", Title = "Kehittäjä" }]
            };
            _blobName = ProfilePictureNames.NewBlobName(_profile.Id);
            _profile.PictureBlobName = _blobName;

            var candidate = new Candidate { PublicUrlSegment = "test-cv", ProfileId = _profile.Id };
            candidate.Logins.Add(new CandidateLogin
            {
                Provider = Owner.Provider,
                ProviderTenantId = Owner.TenantId,
                ProviderUserId = Owner.UserId,
            });

            _context.Profile.Add(_profile);
            _context.Candidate.Add(candidate);
            _context.SaveChanges();
            _context.ChangeTracker.Clear();

            _pictureService = new ProfilePictureService(_context, _pictureStore, null!);
            _profileService = new ProfileService(_context, Options.Create(new GoogleAuthenticationOptions()), _pictureStore);
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [TestMethod]
        public void NewProfilesShowTheirPicture()
        {
            Assert.IsTrue(new Profile().ShowPicture);
        }

        [TestMethod]
        public async Task HidingKeepsTheStoredPictureAndSetsUpdatedAt()
        {
            var result = await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            Assert.IsFalse(result.IsVisible);
            var saved = await ReadProfile();
            Assert.IsFalse(saved.ShowPicture);
            Assert.AreEqual(_blobName, saved.PictureBlobName);
            Assert.IsNotNull(saved.UpdatedAt);
            Assert.AreEqual(0, _pictureStore.RemovedBlobNames.Count);
        }

        [TestMethod]
        public async Task SettingTheSameVisibilityLeavesUpdatedAtAlone()
        {
            var result = await _pictureService.SetPictureVisibility(_profile.Id, true, Owner, false);

            Assert.IsTrue(result.IsVisible);
            var saved = await ReadProfile();
            Assert.IsTrue(saved.ShowPicture);
            Assert.IsNull(saved.UpdatedAt);
        }

        [TestMethod]
        public async Task ShowingAgainServesTheSamePicture()
        {
            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);
            await _pictureService.SetPictureVisibility(_profile.Id, true, Owner, false);

            var profile = await _profileService.GetProfile(_profile.Id, "fi");
            Assert.IsTrue(profile.ShowPicture);
            Assert.AreEqual(ProfileMapper.ToPictureUrl(_profile.Id, _blobName), profile.PictureUrl);

            var picture = await _pictureService.GetPicture(_profile.Id, ProfilePictureNames.GetVersion(_blobName));
            await picture.Content.DisposeAsync();
            Assert.IsTrue(picture.IsCurrentVersion);
            Assert.AreEqual(_blobName, _pictureStore.DownloadedBlobNames.Single());
        }

        [TestMethod]
        public async Task CvAdminCanHideAnotherProfilesPicture()
        {
            await _pictureService.SetPictureVisibility(_profile.Id, false, Stranger, true);

            Assert.IsFalse((await ReadProfile()).ShowPicture);
        }

        [TestMethod]
        public async Task HidingWorksWithoutConfiguredStorage()
        {
            _pictureStore.IsConfigured = false;

            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            Assert.IsFalse((await ReadProfile()).ShowPicture);
        }

        [TestMethod]
        public async Task HidingWorksWithoutAStoredPicture()
        {
            await _context.Profile
                .Where(profile => profile.Id == _profile.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(profile => profile.PictureBlobName, (string?)null));

            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            var profile = await _profileService.GetProfile(_profile.Id, "fi");
            Assert.IsFalse(profile.ShowPicture);
            Assert.IsNull(profile.PictureUrl);
        }

        [TestMethod]
        public async Task NonOwnerCannotChangeTheVisibility()
        {
            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.SetPictureVisibility(_profile.Id, false, Stranger, false));
            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.SetPictureVisibility(_profile.Id, false, null, false));

            Assert.IsTrue((await ReadProfile()).ShowPicture);
        }

        [TestMethod]
        public async Task MissingProfileIsNotFoundEvenForCvAdmin()
        {
            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.SetPictureVisibility(Guid.NewGuid(), false, Owner, true));
        }

        [TestMethod]
        public async Task EmptyProfileIdIsABadRequest()
        {
            await Assert.ThrowsExactlyAsync<BadRequestException>(
                () => _pictureService.SetPictureVisibility(Guid.Empty, false, Owner, true));
        }

        [TestMethod]
        public async Task PublicProfileHasNoPictureUrlWhileHidden()
        {
            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            var profile = await _profileService.GetProfile(_profile.Id, "en");

            Assert.IsFalse(profile.ShowPicture);
            Assert.IsNull(profile.PictureUrl);
        }

        [TestMethod]
        public async Task AdminProfileKeepsThePictureUrlWhileHidden()
        {
            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            var profile = await _profileService.GetProfileAdmin(_profile.Id, Owner, false);

            Assert.IsFalse(profile.ShowPicture);
            Assert.AreEqual(ProfileMapper.ToPictureUrl(_profile.Id, _blobName), profile.PictureUrl);
        }

        [TestMethod]
        public async Task HiddenPictureIsNotFoundAtItsPublicUrl()
        {
            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.GetPicture(_profile.Id, ProfilePictureNames.GetVersion(_blobName)));
            Assert.AreEqual(0, _pictureStore.DownloadedBlobNames.Count);
        }

        [TestMethod]
        public async Task OwnerPreviewsTheHiddenPicture()
        {
            await _pictureService.SetPictureVisibility(_profile.Id, false, Owner, false);

            var picture = await _pictureService.GetPicturePreview(_profile.Id, Owner, false);
            await picture.Content.DisposeAsync();

            Assert.AreEqual(_blobName, _pictureStore.DownloadedBlobNames.Single());
        }

        [TestMethod]
        public async Task NonOwnerCannotPreviewThePicture()
        {
            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.GetPicturePreview(_profile.Id, Stranger, false));
            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.GetPicturePreview(_profile.Id, null, false));
            Assert.AreEqual(0, _pictureStore.DownloadedBlobNames.Count);
        }

        [TestMethod]
        public async Task PreviewWithoutAStoredPictureIsNotFound()
        {
            await _context.Profile
                .Where(profile => profile.Id == _profile.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(profile => profile.PictureBlobName, (string?)null));

            await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _pictureService.GetPicturePreview(_profile.Id, Owner, false));
        }

        private Task<Profile> ReadProfile()
        {
            return _context.Profile.AsNoTracking().SingleAsync(profile => profile.Id == _profile.Id);
        }

        /// <summary>
        /// Serves any blob name as a small picture and records what was downloaded or removed.
        /// </summary>
        private sealed class FakePictureStore : IProfilePictureStore
        {
            public bool IsConfigured { get; set; } = true;

            public List<string> DownloadedBlobNames { get; } = [];

            public List<string> RemovedBlobNames { get; } = [];

            public Task Upload(string blobName, byte[] content, string contentType, CancellationToken cancellationToken = default)
            {
                throw new NotSupportedException();
            }

            public Task<StoredProfilePicture?> Download(string blobName, CancellationToken cancellationToken = default)
            {
                DownloadedBlobNames.Add(blobName);
                return Task.FromResult<StoredProfilePicture?>(
                    new StoredProfilePicture(new MemoryStream([1, 2, 3]), "image/webp", DateTimeOffset.UtcNow));
            }

            public Task RemoveUnused(string blobName)
            {
                RemovedBlobNames.Add(blobName);
                return Task.CompletedTask;
            }
        }
    }
}
