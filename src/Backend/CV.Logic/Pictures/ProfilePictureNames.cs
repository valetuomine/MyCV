namespace CV.Logic.Pictures
{
    /// <summary>
    /// Names profile picture blobs, <c>{profileId}/{guid}.webp</c>. Every picture gets a new name, so a stored
    /// picture never changes, and the name's random part is the version in the picture's URL.
    /// </summary>
    public static class ProfilePictureNames
    {
        /// <summary>
        /// Names a new picture's blob.
        /// </summary>
        /// <param name="profileId">The identifier of the profile.</param>
        /// <returns>A blob name that has never been used.</returns>
        public static string NewBlobName(Guid profileId)
        {
            return $"{profileId}/{Guid.NewGuid():N}.webp";
        }

        /// <summary>
        /// Reads a picture's version, the random part of its blob name.
        /// </summary>
        /// <param name="blobName">The picture's blob name.</param>
        /// <returns>The version.</returns>
        public static string GetVersion(string blobName)
        {
            return Path.GetFileNameWithoutExtension(blobName);
        }
    }
}
