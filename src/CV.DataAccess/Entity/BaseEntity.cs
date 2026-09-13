namespace CV.DataAccess.Entity
{
    /// <summary>
    /// Provides the common identifier and tracking properties for an entity.
    /// </summary>
    public class BaseEntity : ITracking
    {
        /// <summary>
        /// Gets or sets the globally unique identifier for the entity.
        /// </summary>
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the UTC date and time when the entity was created.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the UTC date and time when the entity was last updated.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
    }
}
