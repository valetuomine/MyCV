namespace CV.LogicInterface.Candidates
{
    /// <summary>
    /// Settings for the CV featured on the home page, bound from the <c>FeaturedCandidate</c>
    /// configuration section.
    /// </summary>
    public class FeaturedCandidateOptions
    {
        public const string SectionName = "FeaturedCandidate";

        /// <summary>
        /// Gets or sets the public URL segment of the featured CV. When empty, no CV is featured.
        /// </summary>
        public string? PublicUrlSegment { get; set; }
    }
}
