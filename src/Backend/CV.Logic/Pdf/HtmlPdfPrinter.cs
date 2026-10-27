using CV.LogicInterface.Pdf;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.Extensions.Options;
using Microsoft.Playwright;

namespace CV.Logic.Pdf
{
    /// <summary>
    /// Prints frontend print routes to PDF with Playwright. One headless Chromium is
    /// launched on first use and shared by every print, each print gets its own browser
    /// context, and at most <see cref="PdfPrinterOptions.MaxConcurrentPrints"/> pages print
    /// at the same time.
    /// </summary>
    public sealed class HtmlPdfPrinter(IOptions<PdfPrinterOptions> options) : IHtmlPdfPrinter, IAsyncDisposable
    {
        /// <summary>
        /// The print route sets this attribute once its data and fonts have loaded.
        /// </summary>
        private const string ReadySelector = "[data-print-ready]";

        /// <summary>
        /// The print route sets this attribute when its data could not be loaded.
        /// </summary>
        private const string ErrorSelector = "[data-print-error]";

        private readonly PdfPrinterOptions _options = options.Value;
        private readonly object _installGate = new();
        private readonly SemaphoreSlim _launchLock = new(1, 1);
        private readonly SemaphoreSlim _printSlots = new(
            Math.Max(1, options.Value.MaxConcurrentPrints),
            Math.Max(1, options.Value.MaxConcurrentPrints));

        private IPlaywright? _playwright;
        private IBrowser? _browser;
        private Task? _installTask;

        /// <summary>
        /// The time one print may take, and may wait for a free print slot. Playwright treats 0
        /// as no timeout, so at least one second is used.
        /// </summary>
        private TimeSpan Timeout => TimeSpan.FromSeconds(Math.Max(1, _options.TimeoutSeconds));

        public Task PrepareAsync(CancellationToken cancellationToken = default)
        {
            return EnsureChromiumInstalledAsync().WaitAsync(cancellationToken);
        }

        public async Task<byte[]> PrintAsync(string relativeUrl, CancellationToken cancellationToken = default)
        {
            var pageUrl = BuildPageUrl(relativeUrl);
            var timeoutMilliseconds = (float)Timeout.TotalMilliseconds;

            if (!await _printSlots.WaitAsync(Timeout, cancellationToken))
            {
                throw new TimeoutException($"No print slot became free within {Timeout.TotalSeconds} seconds.");
            }

            try
            {
                var browser = await GetBrowserAsync(cancellationToken);
                await using var context = await browser.NewContextAsync();
                var page = await context.NewPageAsync();
                page.SetDefaultTimeout(timeoutMilliseconds);

                await page.GotoAsync(pageUrl, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });

                // Network idle is not enough on its own: the route marks itself ready only
                // after its data has loaded and its fonts are in use.
                var state = await page.WaitForSelectorAsync($"{ReadySelector}, {ErrorSelector}");
                if (state is null || await state.GetAttributeAsync("data-print-error") is not null)
                {
                    throw new InvalidOperationException($"The print route {relativeUrl} could not load its data.");
                }

                return await page.PdfAsync(new PagePdfOptions
                {
                    Format = "A4",
                    PrintBackground = true,
                    Margin = new Margin
                    {
                        Top = "16mm",
                        Bottom = "16mm",
                        Left = "17mm",
                        Right = "17mm"
                    }
                });
            }
            finally
            {
                _printSlots.Release();
            }
        }

        public async ValueTask DisposeAsync()
        {
            if (_browser is not null)
            {
                await _browser.DisposeAsync();
            }

            _playwright?.Dispose();
            _launchLock.Dispose();
            _printSlots.Dispose();
        }

        private string BuildPageUrl(string relativeUrl)
        {
            if (string.IsNullOrWhiteSpace(_options.FrontendBaseUrl))
            {
                throw new InvalidOperationException(
                    $"{PdfPrinterOptions.SectionName}:FrontendBaseUrl must be configured to print PDFs.");
            }

            return $"{_options.FrontendBaseUrl.TrimEnd('/')}/{relativeUrl.TrimStart('/')}";
        }

        private async Task<IBrowser> GetBrowserAsync(CancellationToken cancellationToken)
        {
            if (_browser is { IsConnected: true })
            {
                return _browser;
            }

            await _launchLock.WaitAsync(cancellationToken);
            try
            {
                if (_browser is { IsConnected: true })
                {
                    return _browser;
                }

                if (_browser is not null)
                {
                    await _browser.DisposeAsync();
                }

                if (string.IsNullOrWhiteSpace(_options.ExecutablePath))
                {
                    await EnsureChromiumInstalledAsync();
                }

                _playwright ??= await Playwright.CreateAsync();
                _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
                {
                    Headless = true,
                    ExecutablePath = string.IsNullOrWhiteSpace(_options.ExecutablePath) ? null : _options.ExecutablePath,
                    Args = _options.LaunchArgs
                });

                return _browser;
            }
            finally
            {
                _launchLock.Release();
            }
        }

        /// <summary>
        /// Installs Playwright's Chromium once, off the request thread, unless an installed
        /// browser is configured. Startup and the first print share the same install, and a
        /// failed install is retried on the next call.
        /// </summary>
        private Task EnsureChromiumInstalledAsync()
        {
            if (!string.IsNullOrWhiteSpace(_options.ExecutablePath))
            {
                return Task.CompletedTask;
            }

            lock (_installGate)
            {
                if (_installTask is null || _installTask.IsFaulted || _installTask.IsCanceled)
                {
                    _installTask = Task.Run(InstallChromium);
                }

                return _installTask;
            }
        }

        /// <summary>
        /// Installs the Chromium build that this Playwright version expects, unless it is
        /// already installed. A production host should install it at deploy time instead, or
        /// use an image that has it, and set <see cref="PdfPrinterOptions.ExecutablePath"/>.
        /// </summary>
        private static void InstallChromium()
        {
            var exitCode = Microsoft.Playwright.Program.Main(["install", "chromium"]);
            if (exitCode != 0)
            {
                throw new InvalidOperationException($"Installing Chromium for Playwright failed with exit code {exitCode}.");
            }
        }
    }
}
