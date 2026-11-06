import type { Page } from "@playwright/test"

/** The word that every Playwright test user's display name contains. */
const testAccountPattern = /playwright/i

/**
 * Reads the signed-in account's display name from the page header, where
 * the app shows it beside the sign-out button.
 *
 * @param page - A page that shows the app signed in, at desktop width.
 * @returns The display name, or an empty string when none shows.
 */
async function readSignedInName(page: Page): Promise<string> {
  /** The header line that names the signed-in account. */
  const label = page
    .getByRole("paragraph")
    .filter({ hasText: /^Signed in as / })
    .first()
  await label.waitFor({ timeout: 10_000 }).catch(() => undefined)
  /** The line's text, or an empty string when it never showed. */
  const text = (await label.textContent().catch(() => null)) ?? ""
  return text.replace(/^Signed in as /, "").trim()
}

/**
 * Makes sure the browser is signed in with a Playwright test user before its
 * session is saved, so an administrator's or anyone else's session never
 * ends up in a session file. Test users have "Playwright" in their display
 * name.
 *
 * @param page - A page that shows the app signed in, at desktop width.
 */
export async function assertTestAccount(page: Page): Promise<void> {
  const name = await readSignedInName(page)
  if (!testAccountPattern.test(name)) {
    throw new Error(
      `Signed in as "${name || "an unknown account"}", which isn't a Playwright test user. The session was not saved. Sign in with the test user whose display name contains "Playwright".`,
    )
  }
}
