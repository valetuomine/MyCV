using System.ComponentModel.DataAnnotations;

namespace CV.LogicInterface.Dto.Profile
{
    /// <summary>
    /// Represents a request to show or hide the profile picture section on the CV.
    /// </summary>
    public class UpdateProfilePictureVisibilityRequest
    {
        /// <summary>
        /// Gets or sets whether the CV and its PDF show the picture section. Required. Hiding it keeps the
        /// stored picture, so showing it again needs no new upload.
        /// </summary>
        [Required]
        public required bool IsVisible { get; set; }
    }
}
