async (page) => {
  /**
   * Loads the Google test user's saved session file into the running
   * `playwright-google` MCP browser, so a renewed session takes effect
   * without restarting the server. Run `npm --prefix src/Frontend run
   * e2e:auth -- google --auto` first: this isolated browser can't renew the
   * Google session itself, so a loaded session lasts as long as its one-hour
   * token. Run it with the server's `browser_run_code_unsafe` tool and
   * `filename`, which passes the browser's current page; Playwright reads the
   * file itself, so no token passes through the agent. The path is relative
   * to the repository root, where Claude Code starts the MCP servers. The
   * file must start with the function, so this summary sits inside it.
   */
  const sessionFile = "src/Frontend/e2e/.auth/google.json"
  await page.context().setStorageState(sessionFile)
  return "Loaded the saved Google session into this browser. Navigate to the view to check."
}
