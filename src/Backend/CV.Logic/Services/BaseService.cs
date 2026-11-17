using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Extensions;
using CV.LogicInterface.Authentication;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    /// <summary>
    /// The base of every service that uses the database. It holds the shared owner-or-<c>CvAdmin</c> checks;
    /// each service keeps its own <c>_dataContext</c> field for its queries.
    /// </summary>
    public abstract class BaseService
    {
        private readonly CvContext _dataContext;

        protected BaseService(CvContext dataContext)
        {
            _dataContext = dataContext;
        }

        /// <summary>
        /// Lets the profile's owner, or any caller with <c>CvAdmin</c>, manage the profile.
        /// A caller who may not gets 404, like for a missing profile.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <param name="actor">The caller's sign-in identity, or null when the caller has none.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the query.</param>
        /// <returns>Whether the caller owns the profile, as opposed to managing it only as <c>CvAdmin</c>.</returns>
        protected async Task<bool> EnsureCanManageProfile(
            Guid profileId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken)
        {
            if (profileId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid profile ID: {profileId}");
            }

            var isOwner = await _dataContext.CandidateLogin.OwnsProfile(actor, profileId, cancellationToken);
            await EnsureOwnerOrAdmin(
                isOwner,
                canManageAny,
                () => _dataContext.Profile.AnyAsync(profile => profile.Id == profileId, cancellationToken),
                $"Profile not found with Id: {profileId}");

            return isOwner;
        }

        /// <summary>
        /// Lets the candidate's owner, or any caller with <c>CvAdmin</c>, manage the candidate.
        /// A caller who may not gets 404, like for a missing candidate.
        /// </summary>
        /// <param name="candidateId">The identifier of the candidate.</param>
        /// <param name="actor">The caller's sign-in identity, or null when the caller has none.</param>
        /// <param name="canManageAny">Whether the caller has the <c>CvAdmin</c> role.</param>
        /// <param name="cancellationToken">The token used to cancel the query.</param>
        protected async Task EnsureCanManageCandidate(
            Guid candidateId,
            ExternalIdentity? actor,
            bool canManageAny,
            CancellationToken cancellationToken)
        {
            var isOwner = actor is not null
                && await _dataContext.CandidateLogin
                    .ForIdentity(actor)
                    .AnyAsync(login => login.CandidateId == candidateId, cancellationToken);
            await EnsureOwnerOrAdmin(
                isOwner,
                canManageAny,
                () => _dataContext.Candidate.AnyAsync(candidate => candidate.Id == candidateId, cancellationToken),
                $"Candidate not found with Id: {candidateId}");
        }

        /// <summary>
        /// The owner-or-<c>CvAdmin</c> rule: an owner passes, a <c>CvAdmin</c> passes when the target exists,
        /// and everyone else gets 404, so that a caller can't tell a foreign target from a missing one.
        /// </summary>
        private static async Task EnsureOwnerOrAdmin(
            bool isOwner,
            bool canManageAny,
            Func<Task<bool>> targetExists,
            string notFoundMessage)
        {
            if (isOwner || (canManageAny && await targetExists()))
            {
                return;
            }

            throw new NotFoundException(notFoundMessage);
        }
    }
}
