using CV.DataAccess.Entity;
using CV.DataAccess.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CV.DataAccess.Configurations
{
    public class ProfileConfiguration : IEntityTypeConfiguration<Profile>
    {
        public void Configure(EntityTypeBuilder<Profile> builder)
        {
            builder.ToTable("Profile");

            builder.ConfigureTracking();

            builder.Property(profile => profile.Id)
                .HasColumnName("ID");

            builder.Property(profile => profile.FullName)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(profile => profile.Title)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(profile => profile.Summary)
                .HasMaxLength(2500);

            builder.Property(profile => profile.Location)
                .HasMaxLength(100);

            builder.Property(profile => profile.LinkedInUrl)
                .HasMaxLength(500);

            builder.Property(profile => profile.GitHubUrl)
                .HasMaxLength(500);
        }
    }
}
