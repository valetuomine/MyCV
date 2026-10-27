using CV.LogicInterface.Dto.Profile;
using CV.LogicInterface.ServiceInterfaces;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace CV.Logic.Services
{
    public class ProfilePdfService(
        IProfileService profileService,
        IHtmlPdfPrinter printer,
        IMemoryCache cache) : IProfilePdfService
    {
        // The layout ships with the frontend, so a cached PDF must age out on a fixed
        // schedule for a frontend deploy to reach it, even when it is requested often.
        private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

        private static readonly object CacheGate = new();

        private readonly IProfileService _profileService = profileService;
        private readonly IHtmlPdfPrinter _printer = printer;
        private readonly IMemoryCache _cache = cache;

        public async Task<ProfilePdfDto> GetProfilePdf(
            Guid profileId,
            string? languageCode,
            CancellationToken cancellationToken = default)
        {
            // GetProfile validates the ID and language and resolves the translation,
            // falling back to Finnish when the requested one is missing.
            var profile = await _profileService.GetProfile(profileId, languageCode, cancellationToken);
            var lastModified = profile.UpdatedAt ?? profile.CreatedAt;

            var printedPdf = await GetOrStartPrint(profile, lastModified).WaitAsync(cancellationToken);

            return new ProfilePdfDto
            {
                FileName = $"{ToFileNameSlug(profile.FullName)}-CV-{profile.LanguageCode}.pdf",
                Content = printedPdf.Content,
                LastModified = printedPdf.PrintedAt,
                ETag = printedPdf.ETag
            };
        }

        /// <summary>
        /// Returns the cached print of this profile version, or starts one. Concurrent requests
        /// share one print, and a failed print is dropped from the cache so the next request retries.
        /// </summary>
        private Task<PrintedPdf> GetOrStartPrint(ProfileDto profile, DateTimeOffset lastModified)
        {
            // Saving the profile changes lastModified, so a stale PDF is never served.
            var key = (nameof(ProfilePdfService), profile.Id, profile.LanguageCode, lastModified);

            lock (CacheGate)
            {
                if (_cache.TryGetValue(key, out Task<PrintedPdf>? cachedPrint) && cachedPrint is not null)
                {
                    return cachedPrint;
                }

                // The print is shared, so one request's cancellation must not cancel it.
                var print = PrintAsync(profile);
                _cache.Set(key, print, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = CacheDuration
                });

                _ = print.ContinueWith(
                    _ => RemoveIfCurrent(key, print),
                    CancellationToken.None,
                    TaskContinuationOptions.NotOnRanToCompletion,
                    TaskScheduler.Default);

                return print;
            }
        }

        private void RemoveIfCurrent(object key, Task<PrintedPdf> print)
        {
            lock (CacheGate)
            {
                if (_cache.TryGetValue(key, out Task<PrintedPdf>? cachedPrint) && cachedPrint == print)
                {
                    _cache.Remove(key);
                }
            }
        }

        private async Task<PrintedPdf> PrintAsync(ProfileDto profile)
        {
            // The frontend's print route lays the CV out; the URL holds only the
            // validated ID and language, so it can't point anywhere else.
            var content = await _printer.PrintAsync($"print/{profile.Id}?lang={profile.LanguageCode}");

            // The ETag comes from the bytes, so a reprint after a frontend deploy is not
            // answered with 304 for an unchanged profile.
            var hash = Convert.ToHexString(SHA256.HashData(content), 0, 16);
            return new PrintedPdf(content, $"\"{hash}\"", DateTimeOffset.UtcNow);
        }

        private static string ToFileNameSlug(string fullName)
        {
            var builder = new StringBuilder();
            foreach (var character in fullName.Normalize(NormalizationForm.FormD))
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                if (char.IsAsciiLetterOrDigit(character))
                {
                    builder.Append(character);
                }
                else if (builder.Length > 0 && builder[^1] != '-')
                {
                    builder.Append('-');
                }
            }

            var slug = builder.ToString().Trim('-');
            return slug.Length > 0 ? slug : "Profile";
        }

        private sealed record PrintedPdf(byte[] Content, string ETag, DateTimeOffset PrintedAt);
    }
}
