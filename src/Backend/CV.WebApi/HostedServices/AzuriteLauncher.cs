using System.ComponentModel;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Azure.Storage.Blobs;
using CV.LogicInterface.Storage;

namespace CV.WebApi.HostedServices
{
    /// <summary>
    /// Starts the Azurite storage emulator with the API in Development, so profile pictures work without
    /// starting it by hand. An Azurite that already answers, such as one in Docker, is used as it is. The
    /// Azurite this service started is stopped with the API. A failure is only logged: the rest of the API
    /// works, and saving a picture answers 502 until Azurite runs.
    /// </summary>
    public sealed class AzuriteLauncher(Uri blobEndpoint, IHostEnvironment environment, ILogger<AzuriteLauncher> logger)
        : BackgroundService
    {
        // README.md's manual npx command names the same version; update both together.
        private const string Package = "azurite@3.37.0";
        private const string ReadmeHint = "Until Azurite runs, saving a profile picture fails. README.md, under Profile pictures, tells how to start it.";

        // A cold start downloads Azurite with npx, which took about 45 seconds; a warm start takes 2.
        private static readonly TimeSpan StartTimeout = TimeSpan.FromMinutes(2);
        private static readonly TimeSpan ProbeInterval = TimeSpan.FromMilliseconds(500);
        private static readonly TimeSpan ProbeTimeout = TimeSpan.FromSeconds(1);

        // Probing "localhost" tries ::1 first, and a refused connection takes Windows two seconds.
        private readonly IPAddress _address = IPAddress.TryParse(blobEndpoint.DnsSafeHost, out var address)
            ? address
            : IPAddress.Loopback;

        private Process? _process;
        private KillOnCloseJob? _job;

        /// <summary>
        /// Returns the blob endpoint when the settings point at a local Azurite: no <c>ServiceUri</c>, and a
        /// connection string such as <c>UseDevelopmentStorage=true</c> whose endpoint is a loopback address.
        /// </summary>
        public static Uri? GetLocalBlobEndpoint(BlobStorageOptions options)
        {
            if (options.ServiceUri is not null || string.IsNullOrWhiteSpace(options.ConnectionString))
            {
                return null;
            }

            try
            {
                var endpoint = new BlobServiceClient(options.ConnectionString).Uri;
                return endpoint.IsLoopback ? endpoint : null;
            }
            catch (Exception exception) when (exception is FormatException or ArgumentException)
            {
                return null;
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                if (await IsListening(stoppingToken))
                {
                    logger.LogInformation("Using the Azurite that already answers at {Endpoint}.", blobEndpoint);
                    return;
                }

                if (FindNpx() is not { } npx)
                {
                    logger.LogWarning("Could not start Azurite: npx, which comes with Node.js, was not found on the PATH. {ReadmeHint}", ReadmeHint);
                    return;
                }

                var location = FindDataLocation(environment.ContentRootPath);
                logger.LogInformation(
                    "Starting Azurite at {Endpoint} with its data in {Location}. The first start downloads it, which can take a minute.",
                    blobEndpoint,
                    location);
                var process = Start(npx, location);
                _process = process;

                var waited = Stopwatch.StartNew();
                while (waited.Elapsed < StartTimeout)
                {
                    if (process.HasExited)
                    {
                        logger.LogWarning("Azurite exited with code {ExitCode} before it answered. {ReadmeHint}", process.ExitCode, ReadmeHint);
                        return;
                    }

                    if (await IsListening(stoppingToken))
                    {
                        logger.LogInformation("Azurite answers at {Endpoint} and stops with the API.", blobEndpoint);
                        return;
                    }

                    await Task.Delay(ProbeInterval, stoppingToken);
                }

                logger.LogWarning(
                    "Azurite did not answer at {Endpoint} within {Timeout}; it keeps starting and stops with the API. {ReadmeHint}",
                    blobEndpoint,
                    StartTimeout,
                    ReadmeHint);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Could not start Azurite. {ReadmeHint}", ReadmeHint);
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            await base.StopAsync(cancellationToken);
            StopAzurite();
        }

        public override void Dispose()
        {
            StopAzurite();
            base.Dispose();
        }

        private async Task<bool> IsListening(CancellationToken cancellationToken)
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(ProbeTimeout);
            using var client = new TcpClient();

            try
            {
                await client.ConnectAsync(_address, blobEndpoint.Port, timeout.Token);
                return true;
            }
            catch (Exception exception) when (
                exception is SocketException
                || exception is OperationCanceledException && !cancellationToken.IsCancellationRequested)
            {
                return false;
            }
        }

        /// <summary>
        /// Starts only Azurite's blob service. On Windows, its own hidden console keeps Ctrl+C in the API's
        /// terminal from reaching it; on every system, the API stops it on shutdown. Its output is read into
        /// the log, so it can't fill the pipe.
        /// </summary>
        private Process Start(string npx, string location)
        {
            Directory.CreateDirectory(location);
            var startInfo = new ProcessStartInfo(npx)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = Path.GetDirectoryName(location) ?? location
            };

            string[] arguments =
            [
                "--yes", $"--package={Package}", "azurite-blob",
                "--blobHost", _address.ToString(),
                "--blobPort", blobEndpoint.Port.ToString(),
                "--location", location,
                "--skipApiVersionCheck",
                "--disableTelemetry"
            ];
            foreach (var argument in arguments)
            {
                startInfo.ArgumentList.Add(argument);
            }

            var process = new Process { StartInfo = startInfo };
            process.OutputDataReceived += (_, line) => LogOutput(line.Data, isError: false);
            process.ErrorDataReceived += (_, line) => LogOutput(line.Data, isError: true);

            var job = OperatingSystem.IsWindows() ? KillOnCloseJob.TryCreate() : null;
            process.Start();
            if (job is not null && !job.TryAdd(process))
            {
                job.Dispose();
                job = null;
            }

            if (OperatingSystem.IsWindows() && job is null)
            {
                logger.LogDebug("Azurite runs outside a job object, so an API that is killed can't stop it.");
            }

            _job = job;
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            return process;
        }

        /// <summary>
        /// Logs Azurite's access log and npm's install notices as debug, and any other error output as a warning.
        /// </summary>
        private void LogOutput(string? line, bool isError)
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                return;
            }

            var isNpmNotice = line.StartsWith("npm warn", StringComparison.OrdinalIgnoreCase)
                || line.StartsWith("npm notice", StringComparison.OrdinalIgnoreCase);
            logger.Log(isError && !isNpmNotice ? LogLevel.Warning : LogLevel.Debug, "Azurite: {Line}", line);
        }

        /// <summary>
        /// Stops the Azurite this service started, with npx and Node under it, so nothing stays on the port.
        /// On Windows, closing the job ends them all; elsewhere, or outside a job, the process tree is killed.
        /// </summary>
        private void StopAzurite()
        {
            var process = Interlocked.Exchange(ref _process, null);
            var job = Interlocked.Exchange(ref _job, null);
            if (process is null)
            {
                job?.Dispose();
                return;
            }

            try
            {
                if (!process.HasExited)
                {
                    job?.Dispose();
                    if (job is null || !process.WaitForExit(TimeSpan.FromSeconds(5)))
                    {
                        process.Kill(entireProcessTree: true);
                        process.WaitForExit(TimeSpan.FromSeconds(5));
                    }

                    logger.LogInformation("Stopped the Azurite started with the API.");
                }
            }
            catch (Exception exception) when (exception is InvalidOperationException or Win32Exception)
            {
                logger.LogWarning(exception, "Could not stop Azurite (process {ProcessId}).", process.Id);
            }
            finally
            {
                job?.Dispose();
                process.Dispose();
            }
        }

        /// <summary>
        /// Finds npx on the PATH. On Windows it is npx.cmd, or npx.exe with some Node version managers.
        /// </summary>
        private static string? FindNpx()
        {
            string[] names = OperatingSystem.IsWindows() ? ["npx.cmd", "npx.exe"] : ["npx"];
            var directories = (Environment.GetEnvironmentVariable("PATH") ?? string.Empty)
                .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            return directories
                .SelectMany(directory => names.Select(name => Path.Combine(directory.Trim('"'), name)))
                .FirstOrDefault(File.Exists);
        }

        /// <summary>
        /// Keeps Azurite's data in <c>.azurite</c> at the repository root, found through <c>src/MyCV.sln</c>,
        /// or next to the API when the API runs outside the repository.
        /// </summary>
        private static string FindDataLocation(string contentRoot)
        {
            for (var directory = new DirectoryInfo(contentRoot); directory is not null; directory = directory.Parent)
            {
                if (File.Exists(Path.Combine(directory.FullName, "src", "MyCV.sln")))
                {
                    return Path.Combine(directory.FullName, ".azurite");
                }
            }

            return Path.Combine(contentRoot, ".azurite");
        }
    }
}
