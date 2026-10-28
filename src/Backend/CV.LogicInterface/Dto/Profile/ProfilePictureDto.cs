namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents a profile picture that was just saved.
    /// </summary>
    public class ProfilePictureDto
    {
        /// <summary>
        /// Gets or sets the path of the saved picture, relative to the API's origin, with a version
        /// parameter that is new for every saved picture.
        /// </summary>
        public string PictureUrl { get; set; } = null!;
    }
}
