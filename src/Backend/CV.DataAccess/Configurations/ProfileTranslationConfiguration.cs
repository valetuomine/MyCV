using CV.DataAccess.Entity;
using CV.DataAccess.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CV.DataAccess.Configurations
{
    public class ProfileTranslationConfiguration : IEntityTypeConfiguration<ProfileTranslation>
    {
        public void Configure(EntityTypeBuilder<ProfileTranslation> builder)
        {
            builder.ToTable("ProfileTranslation");

            builder.ConfigureTracking();

            builder.Property(translation => translation.Id)
                .HasColumnName("ID");

            builder.Property(translation => translation.LanguageCode)
                .IsRequired()
                .HasMaxLength(5);

            builder.Property(translation => translation.Title)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(translation => translation.Summary)
                .HasMaxLength(2500);

            builder.Property(translation => translation.Location)
                .HasMaxLength(100);

            builder.HasIndex(translation => new { translation.ProfileId, translation.LanguageCode })
                .IsUnique();

            builder.HasOne(translation => translation.Profile)
                .WithMany(profile => profile.Translations)
                .HasForeignKey(translation => translation.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}