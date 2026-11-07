using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Services;
using CV.LogicInterface.Candidates;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CV.Logic.Tests.Services
{
    /// <summary>
    /// Checks that the featured candidate is not found when the <c>FeaturedCandidate:PublicUrlSegment</c>
    /// setting is missing. The setting is checked before the database is touched, so the context has no
    /// provider. A set value needs the database, which these tests don't have, so that path is checked
    /// through <c>GET /api/FeaturedCandidate</c> instead.
    /// </summary>
    [TestClass]
    public sealed class CandidateServiceFeaturedTests : IDisposable
    {
        private readonly CvContext _context = new(new DbContextOptions<CvContext>());

        public void Dispose()
        {
            _context.Dispose();
        }

        [TestMethod]
        [DataRow(null)]
        [DataRow("")]
        [DataRow("   ")]
        public async Task GetFeaturedCandidateIsNotFoundWithoutTheSetting(string? publicUrlSegment)
        {
            var service = new CandidateService(
                _context,
                null!,
                Options.Create(new FeaturedCandidateOptions { PublicUrlSegment = publicUrlSegment }));

            var exception = await Assert.ThrowsExactlyAsync<NotFoundException>(
                () => service.GetFeaturedCandidate());

            Assert.AreEqual("No candidate is featured.", exception.Message);
        }
    }
}
