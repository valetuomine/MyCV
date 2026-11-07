async (page) => {
  /**
   * Loads the Microsoft test user's saved session file into the running
   * `playwright-microsoft` MCP browser, so a renewed session takes effect
   * without restarting the server. Run it with the server's
   * `browser_run_code_unsafe` tool and `filename`, which passes the browser's
   * current page; Playwright reads the file itself, so no token passes through
   * the agent. The path is relative to the repository root, where Claude Code
   * starts the MCP servers. The file must start with the function, so this
   * summary sits inside it.
   */
  const sessionFile = "src/Frontend/e2e/.auth/microsoft.json"
  await page.context().setStorageState(sessionFile)
  return "Loaded the saved Microsoft session into this browser. Navigate to the view to check."
}
