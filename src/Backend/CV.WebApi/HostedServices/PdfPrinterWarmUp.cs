using CV.LogicInterface.ServiceInterfaces;

namespace CV.WebApi.HostedServices
{
    /// <summary>
    /// Installs the PDF printer's browser in the background when the API starts, so the first
    /// PDF request doesn't wait for the download. A failure is only logged: the first print
    /// retries the install.
    /// </summary>
    public class PdfPrinterWarmUp(IHtmlPdfPrinter printer, ILogger<PdfPrinterWarmUp> logger) : BackgroundService
    {
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                await printer.PrepareAsync(stoppingToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Preparing the PDF printer failed; the first print will retry.");
            }
        }
    }
}
