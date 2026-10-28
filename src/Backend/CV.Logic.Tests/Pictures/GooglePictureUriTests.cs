using CV.Logic.Pictures;

namespace CV.Logic.Tests.Pictures
{
    [TestClass]
    public class GooglePictureUriTests
    {
        [TestMethod]
        public void ReplacesTheTokensSizeWithTheStoredSize()
        {
            var uri = GooglePictureUri.ForStoredSize("https://lh3.googleusercontent.com/a/ACg8ocK3=s96-c");

            Assert.AreEqual("https://lh3.googleusercontent.com/a/ACg8ocK3=s1200-c", uri?.ToString());
        }

        [TestMethod]
        public void AddsTheStoredSizeWhenThePathHasNone()
        {
            var uri = GooglePictureUri.ForStoredSize("https://lh3.googleusercontent.com/-abc/photo.jpg");

            Assert.AreEqual("https://lh3.googleusercontent.com/-abc/photo.jpg=s1200-c", uri?.ToString());
        }

        [TestMethod]
        public void DropsTheQueryAndFragment()
        {
            var uri = GooglePictureUri.ForStoredSize("https://lh3.googleusercontent.com/a/ACg8ocK3=s96-c?sz=50#x");

            Assert.AreEqual("https://lh3.googleusercontent.com/a/ACg8ocK3=s1200-c", uri?.ToString());
        }

        [TestMethod]
        [DataRow(null)]
        [DataRow("")]
        [DataRow("/a/ACg8ocK3=s96-c")]
        [DataRow("http://lh3.googleusercontent.com/a/ACg8ocK3=s96-c")]
        [DataRow("https://evilgoogleusercontent.com/a/ACg8ocK3")]
        [DataRow("https://lh3.googleusercontent.com.example.com/a/ACg8ocK3")]
        [DataRow("https://example.com/lh3.googleusercontent.com/a/ACg8ocK3")]
        [DataRow("https://lh3.googleusercontent.com:8443/a/ACg8ocK3")]
        [DataRow("https://user:secret@lh3.googleusercontent.com/a/ACg8ocK3")]
        [DataRow("https://169.254.169.254/latest/meta-data")]
        [DataRow("file:///etc/passwd")]
        public void RejectsEverythingButGooglesPictureHost(string? pictureUrl)
        {
            Assert.IsNull(GooglePictureUri.ForStoredSize(pictureUrl));
        }
    }
}
