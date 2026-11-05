using CV.Logic.Validation;

namespace CV.Logic.Tests.Validation
{
    [TestClass]
    public class ProfileLinkUriTests
    {
        [TestMethod]
        [DataRow(null)]
        [DataRow("")]
        [DataRow("   ")]
        public void AllowsNoLink(string? value)
        {
            Assert.IsTrue(ProfileLinkUri.IsAllowed(value));
        }

        [TestMethod]
        [DataRow("https://www.linkedin.com/in/jane-doe")]
        [DataRow("http://github.com/jane-doe")]
        [DataRow("HTTPS://GITHUB.COM/jane-doe")]
        [DataRow("  https://github.com/jane-doe  ")]
        public void AllowsHttpAndHttpsLinks(string value)
        {
            Assert.IsTrue(ProfileLinkUri.IsAllowed(value));
        }

        [TestMethod]
        [DataRow("github.com/jane-doe")]
        [DataRow("www.linkedin.com/in/jane-doe")]
        [DataRow("github.com/jane-doe?tab=repositories:all")]
        [DataRow("github.com:443/jane-doe")]
        [DataRow("www.linkedin.com:443")]
        [DataRow("localhost:3000/jane-doe")]
        public void AllowsLinksWithoutAScheme(string value)
        {
            Assert.IsTrue(ProfileLinkUri.IsAllowed(value));
        }

        [TestMethod]
        [DataRow("javascript:alert(1)")]
        [DataRow("javascript:1/alert(1)")]
        [DataRow("javascript:1")]
        [DataRow("JavaScript:alert(1)")]
        [DataRow(" javascript:alert(1)")]
        [DataRow("\u0001javascript:alert(1)")]
        [DataRow("java\tscript:alert(1)")]
        [DataRow("java\nscript:alert(1)")]
        [DataRow("data:text/html,<script>alert(1)</script>")]
        [DataRow("vbscript:msgbox(1)")]
        [DataRow("file:///etc/passwd")]
        [DataRow("mailto:jane@example.com")]
        [DataRow("https:")]
        [DataRow("https:///no-host")]
        public void RejectsOtherSchemesAndHttpLinksWithoutAHost(string value)
        {
            Assert.IsFalse(ProfileLinkUri.IsAllowed(value));
        }
    }
}
