using CV.DataAccess.Configurations;
using CV.DataAccess.Entity;
using Microsoft.EntityFrameworkCore;

namespace CV.DataAccess
{
    public class CvContext(DbContextOptions<CvContext> options) : DbContext(options)
    {
        public DbSet<Profile> Profile { get; set; } = null!;
        public DbSet<Candidate> Candidate { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfiguration(new ProfileConfiguration());
            modelBuilder.ApplyConfiguration(new CandidateConfiguration());

            // Alternative: automatically apply all IEntityTypeConfiguration implementations
            // from this assembly as the number of entity configurations grows.
            // modelBuilder.ApplyConfigurationsFromAssembly(typeof(CvContext).Assembly);
        }

        public override int SaveChanges(bool acceptAllChangesOnSuccess)
        {
            CascadeDeleteCandidateReferences();
            return base.SaveChanges(acceptAllChangesOnSuccess);
        }

        public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
        {
            CascadeDeleteCandidateReferences();
            return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        }

        // Candidate stores ids of related rows (ProfileId, later e.g. WorkHistoryId) instead of the
        // other way around, so deleting a Candidate must explicitly delete those related rows too.
        private void CascadeDeleteCandidateReferences()
        {
            var deletedCandidates = ChangeTracker.Entries<Candidate>()
                .Where(entry => entry.State == EntityState.Deleted)
                .Select(entry => entry.Entity)
                .ToList();

            foreach (var candidate in deletedCandidates)
            {
                if (candidate.ProfileId is Guid profileId)
                {
                    MarkForDeletion<Profile>(profileId);
                }
            }
        }

        private void MarkForDeletion<TEntity>(Guid id) where TEntity : BaseEntity, new()
        {
            var entity = ChangeTracker.Entries<TEntity>()
                .FirstOrDefault(entry => entry.Entity.Id == id)?.Entity;

            if (entity is null)
            {
                entity = new TEntity { Id = id };
                Set<TEntity>().Attach(entity);
            }

            Entry(entity).State = EntityState.Deleted;
        }
    }
}
