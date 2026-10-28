using CV.Common.Exceptions;
using SkiaSharp;

namespace CV.Logic.Pictures
{
    /// <summary>
    /// Turns an uploaded image into the stored profile picture with SkiaSharp: upright, at most
    /// <see cref="MaxSide"/> pixels on its longer side, and re-encoded as WebP. Only the pixels are
    /// encoded, so no EXIF, location or other metadata from the upload is kept.
    /// </summary>
    public static class ProfilePictureProcessor
    {
        public const string ContentType = "image/webp";

        /// <summary>
        /// The largest upload accepted, 10 MB.
        /// </summary>
        public const int MaxUploadBytes = 10 * 1024 * 1024;

        /// <summary>
        /// The longer side of a stored picture, in pixels.
        /// </summary>
        public const int MaxSide = 1200;

        /// <summary>
        /// The largest image accepted, about a 100-megapixel camera. Checked from the header before decoding.
        /// </summary>
        private const long MaxSourcePixels = 100_000_000;

        /// <summary>
        /// The most pixels decoded at once, 64 MB of memory. JPEG and WebP decode at a reduced size, so only
        /// a PNG or a format that can't scale reaches it.
        /// </summary>
        private const long MaxDecodedPixels = 16_000_000;

        private const int WebpQuality = 82;

        private static readonly byte[] JpegSignature = [0xFF, 0xD8, 0xFF];
        private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

        /// <summary>
        /// Checks, decodes, orients, scales and re-encodes an image.
        /// </summary>
        /// <param name="content">The image file's bytes.</param>
        /// <returns>The picture as WebP.</returns>
        /// <exception cref="PayloadTooLargeException">The file is over 10 MB or the image has too many pixels.</exception>
        /// <exception cref="UnsupportedMediaTypeException">The file isn't a readable JPEG, PNG or WebP image.</exception>
        public static byte[] ToWebp(byte[] content)
        {
            if (content.Length > MaxUploadBytes)
            {
                throw new PayloadTooLargeException("The image must be 10 MB or smaller.");
            }

            // The format comes from the file's own bytes; its name and declared type prove nothing.
            var expectedFormat = DetectFormat(content)
                ?? throw new UnsupportedMediaTypeException("Only JPEG, PNG and WebP images are accepted.");

            using var data = SKData.CreateCopy(content);
            using var codec = SKCodec.Create(data);
            if (codec is null || codec.EncodedFormat != expectedFormat)
            {
                throw new UnsupportedMediaTypeException("The image could not be read.");
            }

            var source = codec.Info;
            if (source.Width <= 0 || source.Height <= 0 || (long)source.Width * source.Height > MaxSourcePixels)
            {
                throw new PayloadTooLargeException("The image has too many pixels.");
            }

            using var decoded = Decode(codec);
            using var scaled = ScaleDown(decoded);
            using var upright = ApplyOrigin(scaled, codec.EncodedOrigin);
            return EncodeWebp(upright);
        }

        /// <summary>
        /// Encodes the pixels as lossy WebP. The pixels are already sRGB, which is what an untagged image
        /// means, so the colour space is left out and the file carries no ICC profile either.
        /// </summary>
        private static byte[] EncodeWebp(SKBitmap bitmap)
        {
            using var tagged = bitmap.PeekPixels();
            using var untagged = new SKPixmap(tagged.Info.WithColorSpace(null), tagged.GetPixels(), tagged.RowBytes);
            using var webp = untagged.Encode(new SKWebpEncoderOptions(SKWebpEncoderCompression.Lossy, WebpQuality))
                ?? throw new InvalidOperationException("The picture could not be encoded as WebP.");

            return webp.ToArray();
        }

        private static SKEncodedImageFormat? DetectFormat(ReadOnlySpan<byte> content)
        {
            if (content.StartsWith(JpegSignature))
            {
                return SKEncodedImageFormat.Jpeg;
            }

            if (content.StartsWith(PngSignature))
            {
                return SKEncodedImageFormat.Png;
            }

            if (content.Length >= 12 && content[..4].SequenceEqual("RIFF"u8) && content[8..12].SequenceEqual("WEBP"u8))
            {
                return SKEncodedImageFormat.Webp;
            }

            return null;
        }

        /// <summary>
        /// Decodes the image's first frame into sRGB. JPEG and WebP decode straight to a smaller size
        /// that is still at least twice the final one, which keeps memory low and leaves detail for scaling.
        /// </summary>
        private static SKBitmap Decode(SKCodec codec)
        {
            var source = codec.Info;
            var finalScale = Math.Min(1f, MaxSide / (float)Math.Max(source.Width, source.Height));
            var size = codec.GetScaledDimensions(Math.Min(1f, finalScale * 2));
            if ((long)size.Width * size.Height > MaxDecodedPixels)
            {
                throw new PayloadTooLargeException("The image has too many pixels.");
            }

            var info = new SKImageInfo(
                size.Width,
                size.Height,
                SKColorType.Rgba8888,
                SKAlphaType.Premul,
                SKColorSpace.CreateSrgb());
            var bitmap = new SKBitmap(info);

            // A truncated file decodes as IncompleteInput with a grey remainder, so only a full decode counts.
            if (codec.GetPixels(info, bitmap.GetPixels()) != SKCodecResult.Success)
            {
                bitmap.Dispose();
                throw new UnsupportedMediaTypeException("The image could not be read.");
            }

            return bitmap;
        }

        /// <summary>
        /// Scales the longer side down to <see cref="MaxSide"/>, halving first while the image is still
        /// twice as large, so each step averages neighbouring pixels instead of skipping them.
        /// </summary>
        private static SKBitmap ScaleDown(SKBitmap bitmap)
        {
            var scale = Math.Min(1f, MaxSide / (float)Math.Max(bitmap.Width, bitmap.Height));
            var target = new SKSizeI(
                Math.Max(1, (int)Math.Round(bitmap.Width * scale)),
                Math.Max(1, (int)Math.Round(bitmap.Height * scale)));

            var current = bitmap.Copy();
            while (current.Width / 2 >= target.Width && current.Height / 2 >= target.Height)
            {
                var halved = Resize(current, new SKSizeI(current.Width / 2, current.Height / 2), new SKSamplingOptions(SKFilterMode.Linear));
                current.Dispose();
                current = halved;
            }

            if (current.Width == target.Width && current.Height == target.Height)
            {
                return current;
            }

            var resized = Resize(current, target, new SKSamplingOptions(SKCubicResampler.Mitchell));
            current.Dispose();
            return resized;
        }

        private static SKBitmap Resize(SKBitmap bitmap, SKSizeI size, SKSamplingOptions sampling)
        {
            return bitmap.Resize(size, sampling)
                ?? throw new InvalidOperationException("The picture could not be scaled.");
        }

        /// <summary>
        /// Turns the image upright by the EXIF orientation, which SkiaSharp reports but doesn't apply.
        /// </summary>
        private static SKBitmap ApplyOrigin(SKBitmap bitmap, SKEncodedOrigin origin)
        {
            var width = bitmap.Width;
            var height = bitmap.Height;

            // Each matrix maps a stored pixel (x, y) to where it shows.
            SKMatrix? matrix = origin switch
            {
                SKEncodedOrigin.TopRight => new SKMatrix(-1, 0, width, 0, 1, 0, 0, 0, 1),
                SKEncodedOrigin.BottomRight => new SKMatrix(-1, 0, width, 0, -1, height, 0, 0, 1),
                SKEncodedOrigin.BottomLeft => new SKMatrix(1, 0, 0, 0, -1, height, 0, 0, 1),
                SKEncodedOrigin.LeftTop => new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1),
                SKEncodedOrigin.RightTop => new SKMatrix(0, -1, height, 1, 0, 0, 0, 0, 1),
                SKEncodedOrigin.RightBottom => new SKMatrix(0, -1, height, -1, 0, width, 0, 0, 1),
                SKEncodedOrigin.LeftBottom => new SKMatrix(0, 1, 0, -1, 0, width, 0, 0, 1),
                _ => null
            };

            if (matrix is not { } transform)
            {
                return bitmap.Copy();
            }

            var swapsSides = origin is SKEncodedOrigin.LeftTop
                or SKEncodedOrigin.RightTop
                or SKEncodedOrigin.RightBottom
                or SKEncodedOrigin.LeftBottom;
            var upright = new SKBitmap(bitmap.Info.WithSize(swapsSides ? height : width, swapsSides ? width : height));
            using var canvas = new SKCanvas(upright);
            canvas.Clear(SKColors.Transparent);
            canvas.SetMatrix(transform);

            // Quarter turns and mirrors land every pixel on a pixel, so nearest sampling copies them exactly.
            canvas.DrawBitmap(bitmap, 0, 0, new SKSamplingOptions(SKFilterMode.Nearest));
            return upright;
        }
    }
}
