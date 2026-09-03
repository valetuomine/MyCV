using CV.DataAccess.Entity;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CV.DataAccess.Extensions
{
    public static class EntityTypeBuilderExtensions
    {
        public static void ConfigureTracking<TEntity>(
            this EntityTypeBuilder<TEntity> builder)
            where TEntity : class, ITracking
        {
            builder.HasKey(entity => entity.Id);

            builder.Property(entity => entity.Id)
                .ValueGeneratedOnAdd();

            builder.Property(entity => entity.CreatedAt)
                .IsRequired();
        }
    }
}
