using CV.DataAccess.Entity;
using Microsoft.EntityFrameworkCore;

namespace CV.DataAccess
{
    public class CvContext(DbContextOptions<CvContext> options) : DbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
        }
    }
}
