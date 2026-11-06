import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { assertTestDevServer } from "./devServer.ts"
import { baseURL, devEnvFile, providers, type E2EProvider } from "./settings.ts"
import { assertTestAccount } from "./testAccount.ts"

/** How long the user has to sign in, MFA included. */
const signInTimeoutMs = 10 * 60 * 1000

/**
 * Opens a visible browser on the app's sign-in page for one sign-in method,
 * lets the user sign in with its test user, and saves the browser's cookies
 * and local storage. Nothing types credentials: the user does that. The
 * browser drops Playwright's automation flag and `navigator.webdriver`,
 * because Google's sign-in page refuses a browser that reports automation.
 *
 * @param provider - The sign-in method to record.
 */
async function recordSession(provider: E2EProvider): Promise<void> {
  const browser = await chromium.launch({
    headless: false,
    channel: provider.channel,
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
  })
  try {
    const context = await browser.newContext({ locale: "en-US" })
    const page = await context.newPage()
    await page.goto(new URL("/admin", baseURL).toString())
    await page
      .getByRole("button", { name: `Sign in with ${provider.label}` })
      .click()
    console.log(
      `Sign in with the ${provider.label} Playwright test user in the browser window.`,
    )
    await page
      .getByRole("button", { name: "Create profile" })
      .waitFor({ timeout: signInTimeoutMs })

    /**
     * True when this sign-in method's own session is in local storage, which
     * the saved state holds.
     */
    const isStoredLocally = await page.evaluate(
      (pattern) =>
        Object.keys(localStorage).some((key) => new RegExp(pattern).test(key)),
      provider.sessionKeyPattern,
    )
    if (!isStoredLocally) {
      throw new Error(
        `The app kept the ${provider.label} session in session storage. Set VITE_AUTH_STORAGE=local in ${devEnvFile} and restart the dev server.`,
      )
    }

    await assertTestAccount(page)
    mkdirSync(path.dirname(provider.authFile), { recursive: true })
    await context.storageState({ path: provider.authFile })
    console.log(`Saved the ${provider.label} session.`)
  } finally {
    await browser.close()
  }
}

/**
 * Records the sessions named on the command line, or all of them. The
 * frontend must already run on `baseURL` with VITE_AUTH_STORAGE=local, which
 * is checked before any browser opens, so a sign-in is never lost to it.
 */
async function main(): Promise<void> {
  const names = process.argv.slice(2)
  /** The sign-in methods named on the command line, or all of them. */
  const selected = providers.filter(
    (provider) => names.length === 0 || names.includes(provider.name),
  )
  /** True when the frontend answers on `baseURL`. */
  const isAppUp = await fetch(baseURL)
    .then((response) => response.ok)
    .catch(() => false)
  if (!isAppUp) {
    throw new Error(
      `The frontend doesn't answer at ${baseURL}. Start it with npm --prefix src/Frontend run dev.`,
    )
  }
  await assertTestDevServer()

  for (const provider of selected) {
    await recordSession(provider)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
