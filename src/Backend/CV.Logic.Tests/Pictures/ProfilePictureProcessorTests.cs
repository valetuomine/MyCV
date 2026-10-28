using System.Buffers.Binary;
using System.Text;
using CV.Common.Exceptions;
using CV.Logic.Pictures;
using SkiaSharp;

namespace CV.Logic.Tests.Pictures
{
    [TestClass]
    public class ProfilePictureProcessorTests
    {
        [TestMethod]
        public void ScalesTheLongerSideDownTo1200()
        {
            using var picture = Decode(ProfilePictureProcessor.ToWebp(Image(4000, 3000, SKEncodedImageFormat.Jpeg)));

            Assert.AreEqual(1200, picture.Width);
            Assert.AreEqual(900, picture.Height);
        }

        [TestMethod]
        public void KeepsASmallPictureAtItsSize()
        {
            using var picture = Decode(ProfilePictureProcessor.ToWebp(Image(300, 200, SKEncodedImageFormat.Png)));

            Assert.AreEqual(300, picture.Width);
            Assert.AreEqual(200, picture.Height);
        }

        [TestMethod]
        public void AcceptsWebp()
        {
            using var picture = Decode(ProfilePictureProcessor.ToWebp(Image(2000, 3000, SKEncodedImageFormat.Webp)));

            Assert.AreEqual(800, picture.Width);
            Assert.AreEqual(1200, picture.Height);
        }

        [TestMethod]
        public void TurnsThePictureUprightByItsExifOrientation()
        {
            // Orientation 6 means the camera was turned a quarter clockwise, so the stored top-left
            // corner shows at the top right.
            var jpeg = WithExif(Image(1600, 1200, SKEncodedImageFormat.Jpeg), orientation: 6);

            using var picture = Decode(ProfilePictureProcessor.ToWebp(jpeg));

            Assert.AreEqual(900, picture.Width);
            Assert.AreEqual(1200, picture.Height);
            Assert.IsTrue(IsRed(picture.GetPixel(picture.Width - 5, 5)), "The red corner should be top right.");
            Assert.IsFalse(IsRed(picture.GetPixel(5, 5)), "The top left should not be red.");
        }

        [TestMethod]
        public void KeepsNoMetadata()
        {
            var jpeg = WithExif(Image(1600, 1200, SKEncodedImageFormat.Jpeg), orientation: 1);

            var webp = ProfilePictureProcessor.ToWebp(jpeg);

            CollectionAssert.AreEqual(new[] { "VP8 " }, WebpChunks(webp));
            Assert.IsFalse(Encoding.ASCII.GetString(webp).Contains("Exif"), "No EXIF bytes may remain.");
        }

        [TestMethod]
        public void RejectsAFileThatIsNotAnImage()
        {
            var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"/>");

            Assert.ThrowsExactly<UnsupportedMediaTypeException>(() => ProfilePictureProcessor.ToWebp(svg));
        }

        [TestMethod]
        public void RejectsAnImageFormatThatIsNotAccepted()
        {
            var gif = Encoding.ASCII.GetBytes("GIF89a").Concat(new byte[64]).ToArray();

            Assert.ThrowsExactly<UnsupportedMediaTypeException>(() => ProfilePictureProcessor.ToWebp(gif));
        }

        [TestMethod]
        public void RejectsAnEmptyFile()
        {
            Assert.ThrowsExactly<UnsupportedMediaTypeException>(() => ProfilePictureProcessor.ToWebp([]));
        }

        [TestMethod]
        public void RejectsATruncatedImage()
        {
            var jpeg = Image(1600, 1200, SKEncodedImageFormat.Jpeg);

            Assert.ThrowsExactly<UnsupportedMediaTypeException>(
                () => ProfilePictureProcessor.ToWebp(jpeg[..(jpeg.Length / 3)]));
        }

        [TestMethod]
        public void RejectsAFileOver10Megabytes()
        {
            var jpeg = Image(400, 300, SKEncodedImageFormat.Jpeg);
            var tooLarge = jpeg.Concat(new byte[ProfilePictureProcessor.MaxUploadBytes]).ToArray();

            Assert.ThrowsExactly<PayloadTooLargeException>(() => ProfilePictureProcessor.ToWebp(tooLarge));
        }

        [TestMethod]
        public void RejectsTooManyPixelsBeforeDecoding()
        {
            // A small file whose header claims 20000 × 20000 pixels, a decompression bomb.
            Assert.ThrowsExactly<PayloadTooLargeException>(
                () => ProfilePictureProcessor.ToWebp(PngHeader(20000, 20000)));
        }

        /// <summary>
        /// Draws a blue image with a red top-left quadrant, so its orientation can be checked.
        /// </summary>
        private static byte[] Image(int width, int height, SKEncodedImageFormat format)
        {
            using var bitmap = new SKBitmap(width, height);
            using (var canvas = new SKCanvas(bitmap))
            {
                canvas.Clear(SKColors.Blue);
                using var red = new SKPaint { Color = SKColors.Red };
                canvas.DrawRect(0, 0, width / 2f, height / 2f, red);
            }

            using var data = bitmap.Encode(format, 90);
            return data.ToArray();
        }

        private static SKBitmap Decode(byte[] webp)
        {
            return SKBitmap.Decode(webp) ?? throw new AssertFailedException("The output is not a readable image.");
        }

        private static bool IsRed(SKColor color)
        {
            return color.Red > 200 && color.Blue < 60;
        }

        /// <summary>
        /// Inserts an EXIF block after the JPEG's start marker, with the orientation and a GPS latitude.
        /// </summary>
        private static byte[] WithExif(byte[] jpeg, ushort orientation)
        {
            var tiff = new byte[92];
            void U16(int offset, ushort value) => BinaryPrimitives.WriteUInt16BigEndian(tiff.AsSpan(offset), value);
            void U32(int offset, uint value) => BinaryPrimitives.WriteUInt32BigEndian(tiff.AsSpan(offset), value);

            // Big-endian TIFF header, then IFD0 with Orientation and a pointer to the GPS IFD.
            tiff[0] = (byte)'M';
            tiff[1] = (byte)'M';
            U16(2, 42);
            U32(4, 8);
            U16(8, 2);
            U16(10, 0x0112);
            U16(12, 3);
            U32(14, 1);
            U16(18, orientation);
            U16(22, 0x8825);
            U16(24, 4);
            U32(26, 1);
            U32(30, 38);
            U32(34, 0);

            // GPS IFD: latitude reference "N" and latitude 60° 10' 0".
            U16(38, 2);
            U16(40, 0x0001);
            U16(42, 2);
            U32(44, 2);
            tiff[48] = (byte)'N';
            U16(52, 0x0002);
            U16(54, 5);
            U32(56, 3);
            U32(60, 68);
            U32(64, 0);
            U32(68, 60);
            U32(72, 1);
            U32(76, 10);
            U32(80, 1);
            U32(84, 0);
            U32(88, 1);

            var payload = Encoding.ASCII.GetBytes("Exif\0\0").Concat(tiff).ToArray();
            var segment = new byte[4 + payload.Length];
            segment[0] = 0xFF;
            segment[1] = 0xE1;
            BinaryPrimitives.WriteUInt16BigEndian(segment.AsSpan(2), (ushort)(payload.Length + 2));
            payload.CopyTo(segment, 4);

            return [.. jpeg[..2], .. segment, .. jpeg[2..]];
        }

        /// <summary>
        /// Lists the chunks of a WebP file's RIFF container.
        /// </summary>
        private static string[] WebpChunks(byte[] webp)
        {
            var chunks = new List<string>();
            for (var offset = 12; offset + 8 <= webp.Length;)
            {
                var size = BinaryPrimitives.ReadInt32LittleEndian(webp.AsSpan(offset + 4));
                chunks.Add(Encoding.ASCII.GetString(webp, offset, 4));
                offset += 8 + size + (size & 1);
            }

            return [.. chunks];
        }

        /// <summary>
        /// Builds a PNG that has only a header with the given size and an empty data chunk.
        /// </summary>
        private static byte[] PngHeader(uint width, uint height)
        {
            var header = new byte[13];
            BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(0), width);
            BinaryPrimitives.WriteUInt32BigEndian(header.AsSpan(4), height);
            header[8] = 8;
            header[9] = 6;

            byte[] signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
            return [.. signature, .. Chunk("IHDR", header), .. Chunk("IDAT", [0x78, 0x9C, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01]), .. Chunk("IEND", [])];
        }

        private static byte[] Chunk(string type, byte[] data)
        {
            var typeBytes = Encoding.ASCII.GetBytes(type);
            var chunk = new byte[12 + data.Length];
            BinaryPrimitives.WriteUInt32BigEndian(chunk.AsSpan(0), (uint)data.Length);
            typeBytes.CopyTo(chunk, 4);
            data.CopyTo(chunk, 8);
            BinaryPrimitives.WriteUInt32BigEndian(chunk.AsSpan(8 + data.Length), Crc32([.. typeBytes, .. data]));
            return chunk;
        }

        private static uint Crc32(byte[] bytes)
        {
            var crc = 0xFFFFFFFFu;
            foreach (var value in bytes)
            {
                crc ^= value;
                for (var bit = 0; bit < 8; bit++)
                {
                    crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
                }
            }

            return ~crc;
        }
    }
}
