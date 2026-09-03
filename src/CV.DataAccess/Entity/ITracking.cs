namespace CV.DataAccess.Entity
{
    /// <summary>
    /// Defines the common tracking properties for an entity.
    /// </summary>
    public interface ITracking
    {
        /// <summary>
        /// Gets or sets the database-generated identifier.
        /// </summary>
        int Id { get; set; }

        /// <summary>
        /// Gets or sets the date and time when the entity was created.
        /// </summary>
        DateTime CreatedAt { get; set; }

        /// <summary>
        /// Gets or sets the date and time when the entity was last updated.
        /// </summary>
        DateTime? UpdatedAt { get; set; }
    }
}
