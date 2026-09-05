using CV.DataAccess.Configurations;
using CV.DataAccess.Entity;
using Microsoft.EntityFrameworkCore;

namespace CV.DataAccess
{
    public class CvContext(DbContextOptions<CvContext> options) : DbContext(options)
    {
        public DbSet<Profile> Profile { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.ApplyConfiguration(new ProfileConfiguration());

            // Alternative: automatically apply all IEntityTypeConfiguration implementations
            // from this assembly as the number of entity configurations grows.
            // modelBuilder.ApplyConfigurationsFromAssembly(typeof(CvContext).Assembly);
        }
    }
}
