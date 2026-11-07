import { test as base, expect, type Locator, type Page } from "@playwright/test"
import { baseURL, renewSessionHint } from "./settings"

/** The per-project options that `playwright.config.ts` sets. */
export interface TestOptions {
  testCv: string
  authFile: string
}

/**
 * The tests' `test`, with the project's test CV and session file, and a page
 * that always shows the app in English, whatever the saved session chose.
 */
export const test = base.extend<TestOptions>({
  testCv: ["", { option: true }],
  authFile: ["", { option: true }],
  /**
   * Sets the language before any page script runs.
   *
   * @param fixtures - Playwright's fixtures.
   * @param fixtures.page - The test's page.
   * @param provide - Hands the page to the test.
   */
  page: async ({ page }, provide) => {
    await page.addInitScript(() =>
      localStorage.setItem("cv-language", JSON.stringify("en")),
    )
    await provide(page)
  },
})

export { expect }

/**
 * Thrown when a saved session no longer signs in, so the session setup can
 * tell a lapsed session from any other failure and renew it.
 */
export class SessionLapsedError extends Error {
  override name = "SessionLapsedError"
}

/** The app's origin; any other origin is a provider's sign-in page. */
const appOrigin = new URL(baseURL).origin

/** How a session check ended. */
type SessionState = "ready" | "signed-out" | "away" | "pending"

/** Why a session check that didn't reach the signed-in view failed. */
const failureReasons: Record<Exclude<SessionState, "ready">, string> = {
  "signed-out": "the app asks for sign-in",
  away: "the browser stayed on the provider's sign-in page",
  pending:
    "the signed-in view never showed (is the test CV owned by another user?)",
}

/**
 * How long the sign-in buttons must keep showing, in milliseconds, before the
 * session counts as signed out, so a slow restore of a valid session (a cold
 * dev server, a token renewal) doesn't fail the check.
 */
const signedOutGraceMs = 3_000

/**
 * Waits until a view that needs a signed-in user shows, and fails with the
 * fix instead of a bare timeout when the saved session no longer signs in:
 * the sign-in buttons keep showing, or the browser stays on a provider's
 * sign-in page. Those two throw a `SessionLapsedError`. A silent token
 * renewal that leaves the app and comes back counts as signed in.
 *
 * @param page - The page that opened the view.
 * @param ready - What shows once the view is signed in.
 * @param timeout - How long to wait, in milliseconds.
 */
export async function expectSignedIn(
  page: Page,
  ready: Locator,
  timeout = 20_000,
): Promise<void> {
  const signInButton = page.getByRole("button", { name: /^Sign in with / })
  let state = "pending" as SessionState
  let signedOutSince: number | null = null

  await expect
    .poll(
      async () => {
        if (await ready.isVisible()) {
          state = "ready"
        } else if (await signInButton.first().isVisible()) {
          state = "signed-out"
        } else {
          state = new URL(page.url()).origin === appOrigin ? "pending" : "away"
        }
        signedOutSince =
          state === "signed-out" ? (signedOutSince ?? Date.now()) : null
        return state === "signed-out" &&
          Date.now() - (signedOutSince ?? 0) < signedOutGraceMs
          ? "pending"
          : state
      },
      { timeout, intervals: [250] },
    )
    .toMatch(/^(ready|signed-out)$/)
    .catch(() => undefined)

  if (state === "pending") {
    throw new Error(
      `The saved session doesn't sign in: ${failureReasons[state]}. ${renewSessionHint}`,
    )
  }
  if (state !== "ready") {
    throw new SessionLapsedError(
      `The saved session doesn't sign in: ${failureReasons[state]}. ${renewSessionHint}`,
    )
  }
}
