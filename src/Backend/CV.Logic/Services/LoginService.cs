using CV.Common.Exceptions;
using CV.DataAccess;
using CV.Logic.Extensions;
using CV.Logic.Mappers;
using CV.LogicInterface.Authentication;
using CV.LogicInterface.Dto.Login;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.EntityFrameworkCore;

namespace CV.Logic.Services
{
    public class LoginService(CvContext dataContext) : BaseService(dataContext), ILoginService
    {
        private readonly CvContext _dataContext = dataContext;

        public async Task<IReadOnlyCollection<LoginDto>> GetLogins(
            ExternalIdentity actor,
            CancellationToken cancellationToken = default)
        {
            var candidateId = await GetCandidateId(actor, cancellationToken);

            var dbLogins = await _dataContext.CandidateLogin
                .AsNoTracking()
                .Where(login => login.CandidateId == candidateId)
                .OrderBy(login => login.CreatedAt)
                .ToListAsync(cancellationToken);

            return [.. dbLogins.Select(login => login.MapEntityToDto(actor))];
        }

        public async Task<LinkLoginResult> LinkLogin(
            ExternalIdentity actor,
            ExternalIdentity linked,
            CancellationToken cancellationToken = default)
        {
            var candidateId = await GetCandidateId(actor, cancellationToken);

            if (IsSameIdentity(actor, linked))
            {
                throw new ConflictException(
                    "This is the sign-in you are using now. Choose another account.",
                    LoginConflictCode.IsCurrent);
            }

            var dbExisting = await _dataContext.CandidateLogin
                .AsNoTracking()
                .ForIdentity(linked)
                .FirstOrDefaultAsync(cancellationToken);

            if (dbExisting is not null)
            {
                return dbExisting.CandidateId == candidateId
                    ? new LinkLoginResult(dbExisting.MapEntityToDto(actor), Created: false)
                    : throw LinkedToAnotherCandidate();
            }

            var dbLogin = linked.MapIdentityToLogin();
            dbLogin.CandidateId = candidateId;
            await _dataContext.CandidateLogin.AddAsync(dbLogin, cancellationToken);

            try
            {
                await _dataContext.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Another request linked the same identity between the check and the insert.
                if (await _dataContext.CandidateLogin
                    .AsNoTracking()
                    .ForIdentity(linked)
                    .AnyAsync(cancellationToken))
                {
                    throw LinkedToAnotherCandidate();
                }

                throw;
            }

            return new LinkLoginResult(dbLogin.MapEntityToDto(actor), Created: true);
        }

        public async Task DeleteLogin(
            Guid loginId,
            ExternalIdentity actor,
            CancellationToken cancellationToken = default)
        {
            if (loginId == Guid.Empty)
            {
                throw new BadRequestException($"Invalid login ID: {loginId}");
            }

            var candidateId = await GetCandidateId(actor, cancellationToken);

            var dbLogin = await _dataContext.CandidateLogin
                .FirstOrDefaultAsync(
                    login => login.Id == loginId && login.CandidateId == candidateId,
                    cancellationToken)
                ?? throw new NotFoundException($"Sign-in method not found with Id: {loginId}");

            if (dbLogin.Matches(actor))
            {
                throw new ConflictException(
                    "You can't remove the sign-in method you are using now.",
                    LoginConflictCode.IsCurrent);
            }

            var loginCount = await _dataContext.CandidateLogin
                .CountAsync(login => login.CandidateId == candidateId, cancellationToken);
            if (loginCount <= 1)
            {
                throw new ConflictException(
                    "You can't remove your only sign-in method.",
                    LoginConflictCode.IsLast);
            }

            _dataContext.CandidateLogin.Remove(dbLogin);
            await _dataContext.SaveChangesAsync(cancellationToken);
        }

        private async Task<Guid> GetCandidateId(ExternalIdentity actor, CancellationToken cancellationToken)
        {
            var candidateId = await _dataContext.CandidateLogin
                .AsNoTracking()
                .ForIdentity(actor)
                .Select(login => (Guid?)login.CandidateId)
                .FirstOrDefaultAsync(cancellationToken);

            return candidateId ?? throw new NotFoundException("No CV is linked to this sign-in.");
        }

        private static bool IsSameIdentity(ExternalIdentity first, ExternalIdentity second)
        {
            return first.Provider == second.Provider
                && first.TenantId == second.TenantId
                && first.UserId == second.UserId;
        }

        private static ConflictException LinkedToAnotherCandidate()
        {
            return new ConflictException(
                "This sign-in is already linked to another CV.",
                LoginConflictCode.LinkedToAnotherCandidate);
        }
    }
}
