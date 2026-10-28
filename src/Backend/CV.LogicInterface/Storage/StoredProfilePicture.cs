namespace CV.LogicInterface.Storage
{
    /// <summary>
    /// A profile picture read from storage.
    /// </summary>
    /// <param name="Content">The picture's bytes, streamed from storage; the caller disposes it.</param>
    /// <param name="ContentType">The media type the picture was stored with.</param>
    /// <param name="LastModified">When the picture was stored.</param>
    public sealed record StoredProfilePicture(
        Stream Content,
        string ContentType,
        DateTimeOffset LastModified);
}
