using CV.Common.Exceptions;
using CV.DataAccess;
using CV.DataAccess.Entity;
using CV.Logic.Services;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Candidates;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Tests.Services
{
    /// <summary>
    /// Checks that <see cref="CandidateService.GetOwnCandidate"/> returns the CV linked to the sign-in identity
    /// and nobody else's. The queries run against an in-memory SQLite database, so the identity filter and the
    /// projection to the candidate are translated to real SQL. SQLite compares text case-sensitively, unlike
    /// SQL Server's default collation, so these tests don't cover identities that differ only in case.
    /// </summary>
    [TestClass]
    public sealed class CandidateServiceOwnCandidateTests : IDisposable
    {
        private static readonly ExternalIdentity Owner = new(LoginProvider.Entra, "tenant", "owner", null, false);
        private static readonly ExternalIdentity OtherOwner =
            new(LoginProvider.Google, GoogleAuthenticationOptions.Issuer, "other", null, true);

        private readonly SqliteConnection _connection = new("DataSource=:memory:");
        private readonly CvContext _context;
        private readonly CandidateService _service;
        private readonly Candidate _ownCandidate = new() { PublicUrlSegment = "owner-cv" };
        private readonly Candidate _otherCandidate = new() { PublicUrlSegment = "other-cv" };

        public CandidateServiceOwnCandidateTests()
        {
            _connection.Open();
            _context = new CvContext(new DbContextOptionsBuilder<CvContext>().UseSqlite(_connection).Options);
            _context.Database.EnsureCreated();

            _ownCandidate.Logins.Add(CreateLogin(Owner));
            _otherCandidate.Logins.Add(CreateLogin(OtherOwner));
            _context.Candidate.AddRange(_ownCandidate, _otherCandidate);
            _context.SaveChanges();
            _context.ChangeTracker.Clear();

            _service = new CandidateService(_context, null!, Options.Create(new FeaturedCandidateOptions()));
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        [TestMethod]
        public async Task GetOwnCandidateReturnsTheCvLinkedToTheIdentity()
        {
            var result = await _service.GetOwnCandidate(Owner);

            Assert.AreEqual(_ownCandidate.Id, result.Id);
            Assert.AreEqual("owner-cv", result.PublicUrlSegment);
        }

        [TestMethod]
        public async Task GetOwnCandidateReturnsEachIdentitysOwnCv()
        {
            var result = await _service.GetOwnCandidate(OtherOwner);

            Assert.AreEqual(_otherCandidate.Id, result.Id);
            Assert.AreEqual("other-cv", result.PublicUrlSegment);
        }

        [TestMethod]
        public async Task GetOwnCandidateIsNotFoundWithoutALinkedCv()
        {
            var identity = new ExternalIdentity(LoginProvider.Entra, "tenant", "no-cv", null, false);

            var exception = await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => _service.GetOwnCandidate(identity));

            Assert.AreEqual("No CV is linked to this sign-in.", exception.Message);
        }

        /// <summary>
        /// An identity that shares two of the owner's three identifying values is still another identity.
        /// </summary>
        [TestMethod]
        [DataRow(LoginProvider.Google, "tenant", "owner")]
        [DataRow(LoginProvider.Entra, "another-tenant", "owner")]
        [DataRow(LoginProvider.Entra, "tenant", "another-user")]
        public async Task GetOwnCandidateDoesNotReturnAnotherIdentitysCv(
            string provider,
            string tenantId,
            string userId)
        {
            var identity = new ExternalIdentity(provider, tenantId, userId, null, false);

            await Assert.ThrowsExactlyAsync<NotFoundException>(() => _service.GetOwnCandidate(identity));
        }

        [TestMethod]
        public async Task GetOwnCandidateRequiresAnIdentity()
        {
            await Assert.ThrowsExactlyAsync<ArgumentNullException>(() => _service.GetOwnCandidate(null!));
        }

        private static CandidateLogin CreateLogin(ExternalIdentity identity)
        {
            return new CandidateLogin
            {
                Provider = identity.Provider,
                ProviderTenantId = identity.TenantId,
                ProviderUserId = identity.UserId,
            };
        }
    }
}
