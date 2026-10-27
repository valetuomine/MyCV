namespace CV.LogicInterface.Pdf
{
    /// <summary>
    /// Settings for printing frontend pages to PDF in headless Chromium, bound from the
    /// <c>PdfPrinter</c> configuration section.
    /// </summary>
    public class PdfPrinterOptions
    {
        public const string SectionName = "PdfPrinter";

        /// <summary>
        /// Gets or sets the frontend's origin, such as <c>http://localhost:3000</c>, whose print
        /// routes are rendered. Defaults to the first CORS allowed origin.
        /// </summary>
        public string? FrontendBaseUrl { get; set; }

        /// <summary>
        /// Gets or sets the path of an installed Chrome or Chromium. When empty, Playwright's own
        /// Chromium is installed on first use, into the folder that the
        /// <c>PLAYWRIGHT_BROWSERS_PATH</c> environment variable names or Playwright's default.
        /// </summary>
        public string? ExecutablePath { get; set; }

        /// <summary>
        /// Gets or sets extra command-line arguments for Chromium, such as <c>--no-sandbox</c>
        /// in a container that runs as root.
        /// </summary>
        public string[] LaunchArgs { get; set; } = [];

        /// <summary>
        /// Gets or sets how long loading and printing one page may take, in seconds.
        /// </summary>
        public int TimeoutSeconds { get; set; } = 30;

        /// <summary>
        /// Gets or sets how many pages may be printed at the same time.
        /// </summary>
        public int MaxConcurrentPrints { get; set; } = 2;
    }
}
