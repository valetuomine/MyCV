namespace CV.LogicInterface.ServiceInterfaces
{
    /// <summary>
    /// Prints frontend pages to PDF. The layout lives in the frontend's print routes, so the
    /// backend only loads a page and prints it.
    /// </summary>
    public interface IHtmlPdfPrinter
    {
        /// <summary>
        /// Installs the browser when no installed one is configured, so the first print doesn't wait for it.
        /// </summary>
        /// <param name="cancellationToken">The token used to stop waiting for the install.</param>
        /// <returns>A task that completes once the browser is installed.</returns>
        Task PrepareAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Loads a frontend print route, waits until it marks itself ready, and prints it as an A4 PDF.
        /// </summary>
        /// <param name="relativeUrl">The print route's path and query, relative to the frontend's origin.</param>
        /// <param name="cancellationToken">The token used to cancel waiting for a free print slot.</param>
        /// <exception cref="TimeoutException">No print slot became free within the print timeout.</exception>
        /// <returns>The PDF bytes.</returns>
        Task<byte[]> PrintAsync(string relativeUrl, CancellationToken cancellationToken = default);
    }
}
