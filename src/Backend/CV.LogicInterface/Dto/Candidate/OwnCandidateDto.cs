namespace CV.LogicInterface.Dto.Candidate
{
    /// <summary>
    /// Represents the signed-in owner's own candidate, with the owner's settings that public responses leave out.
    /// </summary>
    public class OwnCandidateDto : CandidateDto
    {
        /// <summary>
        /// Gets or sets whether the owner chose never to see the notice about the profile's missing languages.
        /// </summary>
        public bool HideMissingLanguageNotice { get; set; }
    }
}
