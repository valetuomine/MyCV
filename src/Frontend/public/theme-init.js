/**
 * Applies the saved or OS theme before first paint to avoid a flash. It is a
 * separate file, loaded as a blocking script from index.html, because the
 * Content Security Policy (`script-src 'self'`) refuses inline scripts.
 */
try {
  var saved = JSON.parse(localStorage.getItem("cv-theme"))
  var dark =
    saved === "dark" ||
    (saved !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.dataset.theme = dark ? "dark" : "light"
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", dark ? "#09090b" : "#fafafa")
} catch (e) {}
