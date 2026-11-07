async (page) => {
  /**
   * Saves the `playwright-microsoft` MCP browser's session back to the
   * Microsoft test user's session file, so the tokens and cookies that the
   * browser renewed during a check keep the saved session alive. It saves
   * only when `/admin` shows the app signed in with a Playwright test user
   * and the app keeps the Microsoft session in local storage, so a lapsed
   * session, another account or a session without tokens never overwrites
   * the file. It checks on a desktop-sized page of its own, because the
   * header that names the user may be hidden at the size a check left the
   * browser in. Run it with the server's `browser_run_code_unsafe` tool and
   * `filename`; what it returns holds no token or name. The file must start
   * with the function, so this summary sits inside it.
   */
  const sessionFile = "src/Frontend/e2e/.auth/microsoft.json"
  const check = await page.context().newPage()
  try {
    await check.setViewportSize({ width: 1440, height: 900 })
    await check.goto("http://localhost:3000/admin")
    const isTestUser = await check
      .getByRole("paragraph")
      .filter({ hasText: /^Signed in as .*playwright/i })
      .first()
      .waitFor({ timeout: 20_000 })
      .then(() => true)
      .catch(() => false)
    if (!isTestUser) {
      return "Not saved: /admin doesn't show the app signed in with a Playwright test user."
    }
    const isStoredLocally = await check.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        /^msal\..*\|idtoken\|/.test(key),
      ),
    )
    if (!isStoredLocally) {
      return "Not saved: the app keeps the Microsoft session in session storage. Set VITE_AUTH_STORAGE=local in src/Frontend/.env.development.local and restart the dev server."
    }
    await check.context().storageState({ path: sessionFile })
    return "Saved this browser's Microsoft session to the session file."
  } finally {
    await check.close()
  }
}
