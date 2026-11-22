using CV.DataAccess.Entity;
using CV.DataAccess.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CV.DataAccess.Configurations
{
    public class CandidateLoginConfiguration : IEntityTypeConfiguration<CandidateLogin>
    {
        /// <summary>
        /// The longest Google profile picture address that a login stores; a longer one is not stored.
        /// </summary>
        public const int GooglePictureUrlMaxLength = 2048;

        public void Configure(EntityTypeBuilder<CandidateLogin> builder)
        {
            builder.ToTable("CandidateLogin");

            builder.ConfigureTracking();

            builder.Property(login => login.Id)
                .HasColumnName("ID");

            builder.Property(login => login.Provider)
                .IsRequired()
                .HasMaxLength(20);

            builder.Property(login => login.ProviderTenantId)
                .IsRequired()
                .HasMaxLength(128);

            builder.Property(login => login.ProviderUserId)
                .IsRequired()
                .HasMaxLength(255);

            // Only a Google login has one, and only from the picture claim of a validated Google token.
            builder.Property(login => login.GooglePictureUrl)
                .HasMaxLength(GooglePictureUrlMaxLength);

            // One sign-in identity belongs to only one Candidate.
            builder.HasIndex(login => new { login.Provider, login.ProviderTenantId, login.ProviderUserId })
                .IsUnique();

            builder.HasIndex(login => login.CandidateId);

            builder.HasOne(login => login.Candidate)
                .WithMany(candidate => candidate.Logins)
                .HasForeignKey(login => login.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
