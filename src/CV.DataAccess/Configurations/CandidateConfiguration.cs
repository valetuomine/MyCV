using CV.DataAccess.Entity;
using CV.DataAccess.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CV.DataAccess.Configurations
{
    public class CandidateConfiguration : IEntityTypeConfiguration<Candidate>
    {
        public void Configure(EntityTypeBuilder<Candidate> builder)
        {
            builder.ToTable("Candidate");

            builder.ConfigureTracking();

            builder.Property(candidate => candidate.Id)
                .HasColumnName("ID");

            builder.Property(candidate => candidate.PublicId)
                .IsRequired()
                .ValueGeneratedOnAdd();

            builder.HasIndex(candidate => candidate.PublicId)
                .IsUnique();

            builder.HasIndex(candidate => candidate.ProfileId)
                .IsUnique();

            // Candidate holds the reference to Profile; deleting a Profile only clears the reference.
            builder.HasOne(candidate => candidate.Profile)
                .WithOne()
                .HasForeignKey<Candidate>(candidate => candidate.ProfileId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}