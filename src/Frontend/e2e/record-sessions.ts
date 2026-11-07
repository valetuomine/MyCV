import { chromium, type Browser, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"
import path from "node:path"
import {
  SignInStoppedError,
  signInAutomatically,
  supportsAutoSignIn,
} from "./autoSignIn.ts"
import {
  readCredentials,
  redactCredentials,
  saveCredentialsHint,
} from "./credentials.ts"
import { assertTestDevServer } from "./devServer.ts"
import {
  baseURL,
  devEnvFile,
  isCI,
  providers,
  type E2EProvider,
} from "./settings.ts"
import { assertTestAccount } from "./testAccount.ts"

/** How long the user has to sign in, MFA included. */
const signInTimeoutMs = 10 * 60 * 1000

/** The command-line flags that the script knows. */
const knownFlags = new Set(["--auto", "--headed"])

/**
 * Tells how to record a session by signing in by hand, for when the
 * automatic sign-in stops.
 *
 * @param provider - The sign-in method.
 * @returns The instruction.
 */
function manualSignInHint(provider: E2EProvider): string {
  return `Sign in yourself with npm --prefix src/Frontend run e2e:auth -- ${provider.name}, and answer Yes to "Stay signed in?".`
}

/**
 * Starts the browser that a session is recorded in. It drops Playwright's
 * automation flag and `navigator.webdriver`, because Google's sign-in page
 * refuses a browser that reports automation.
 *
 * @param provider - The sign-in method, which picks the browser channel.
 * @param headless - Whether to run without a window.
 * @returns The browser.
 */
function launchBrowser(
  provider: E2EProvider,
  headless: boolean,
): Promise<Browser> {
  return chromium.launch({
    headless,
    channel: provider.channel,
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
  })
}

/** How long the app may take to open its sign-in window, in milliseconds. */
const signInWindowTimeoutMs = 10_000

/** The app's page and the page where the provider asks for the credentials. */
interface SignInPages {
  app: Page
  provider: Page
}

/**
 * Opens the app's sign-in page in a new, empty context and clicks the
 * sign-in method's button. The app signs in in a window of its own, so the
 * provider's pages open there; when no window opens, they open in the app's
 * page instead.
 *
 * @param browser - The browser to open the page in.
 * @param provider - The sign-in method.
 * @returns The app's page and the provider's sign-in page.
 */
async function startSignIn(
  browser: Browser,
  provider: E2EProvider,
): Promise<SignInPages> {
  const context = await browser.newContext({ locale: "en-US" })
  const app = await context.newPage()
  await app.goto(new URL("/admin", baseURL).toString())
  /** The sign-in window, or null when the app redirects instead. */
  const signInWindow = context
    .waitForEvent("page", { timeout: signInWindowTimeoutMs })
    .catch(() => null)
  await app
    .getByRole("button", { name: `Sign in with ${provider.label}` })
    .click()
  return { app, provider: (await signInWindow) ?? app }
}

/**
 * Saves a signed-in page's cookies and local storage to the sign-in method's
 * session file, but only when the app kept the session in local storage and
 * the account is a Playwright test user.
 *
 * @param page - A page that shows the app signed in.
 * @param provider - The sign-in method.
 */
async function saveSession(page: Page, provider: E2EProvider): Promise<void> {
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
  await page.context().storageState({ path: provider.authFile })
  console.log(`Saved the ${provider.label} session.`)
}

/**
 * Opens a visible browser on the app's sign-in page, lets the user sign in
 * with the test user, and saves the session.
 *
 * @param provider - The sign-in method to record.
 */
async function recordByHand(provider: E2EProvider): Promise<void> {
  const browser = await launchBrowser(provider, false)
  try {
    const { app: page } = await startSignIn(browser, provider)
    console.log(
      `Sign in with the ${provider.label} Playwright test user in the browser window, and answer Yes to "Stay signed in?".`,
    )
    await page
      .getByRole("button", { name: "Create profile" })
      .waitFor({ timeout: signInTimeoutMs })
    await saveSession(page, provider)
  } finally {
    await browser.close()
  }
}

/**
 * Signs in with the test user from Windows Credential Manager and saves the
 * session, with no one at the keyboard. The credentials stay in this
 * process's memory: nothing prints, logs or saves them, and Playwright
 * records no trace here. MFA, a captcha or any other unexpected step stops it
 * with an instruction to sign in by hand.
 *
 * @param provider - The sign-in method to record.
 * @param headless - Whether to run without a window.
 */
async function recordAutomatically(
  provider: E2EProvider,
  headless: boolean,
): Promise<void> {
  const credentials = await readCredentials(provider)
  if (!credentials) {
    throw new Error(
      `No ${provider.label} test user in Windows Credential Manager. ${saveCredentialsHint(provider)} Or ${manualSignInHint(provider)}`,
    )
  }
  console.log(`Signing in with the ${provider.label} test user automatically.`)
  const browser = await launchBrowser(provider, headless)
  /** What stopped the sign-in, if anything. It is rethrown without its original, which may quote a credential. */
  let failure: unknown = null
  try {
    const pages = await startSignIn(browser, provider)
    await signInAutomatically(
      pages.provider,
      provider,
      credentials,
      pages.app.getByRole("button", { name: "Create profile" }),
    )
    await saveSession(pages.app, provider)
  } catch (error) {
    failure = error
  } finally {
    await browser.close()
  }
  if (failure) {
    /** The failure's message without the credentials, which a call log can quote. */
    const message = redactCredentials(
      failure instanceof Error ? failure.message : String(failure),
      credentials,
    )
    throw new Error(
      failure instanceof SignInStoppedError
        ? `The automatic ${provider.label} sign-in stopped. ${message} ${manualSignInHint(provider)}`
        : message,
    )
  }
}

/**
 * Records the sessions named on the command line, or all of them. By default
 * the user signs in in a visible browser. With `--auto` the script signs in
 * by itself with the test users saved in Windows Credential Manager, without
 * a window unless `--headed` is given; it refuses in CI, which uses a mock
 * identity provider instead. The frontend must already run on `baseURL` with
 * VITE_AUTH_STORAGE=local, which is checked before any browser opens, so a
 * sign-in is never lost to it.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)
  /** The arguments that are flags, such as `--auto`. */
  const flags = args.filter((arg) => arg.startsWith("--"))
  /** The arguments that name sign-in methods. */
  const names = args.filter((arg) => !arg.startsWith("--"))
  /** The first flag that the script doesn't know. */
  const unknownFlag = flags.find((flag) => !knownFlags.has(flag))
  /** The first name that isn't a sign-in method. */
  const unknownName = names.find(
    (name) => !providers.some((provider) => provider.name === name),
  )
  if (unknownFlag || unknownName) {
    throw new Error(
      `Unknown argument ${unknownFlag ?? unknownName}. Use: e2e:auth -- [${providers.map((provider) => provider.name).join("|")}] [--auto] [--headed]`,
    )
  }
  /** True when the script signs in by itself. */
  const isAuto = flags.includes("--auto")
  /** True when the automatic sign-in runs without a window. */
  const headless = !flags.includes("--headed")
  if (isAuto && isCI) {
    throw new Error(
      "Automatic sign-in is refused in CI, which uses a mock identity provider instead of the test users.",
    )
  }

  /** The sign-in methods to record: the named ones, otherwise all that the mode supports. */
  const selected = providers.filter((provider) =>
    names.length > 0
      ? names.includes(provider.name)
      : !isAuto || supportsAutoSignIn(provider),
  )
  /** A named sign-in method that can't sign in by itself. */
  const manualOnly = isAuto
    ? selected.find((provider) => !supportsAutoSignIn(provider))
    : undefined
  if (manualOnly) {
    throw new Error(
      `Automatic sign-in isn't available for ${manualOnly.label} yet. ${manualSignInHint(manualOnly)}`,
    )
  }

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
    await (isAuto
      ? recordAutomatically(provider, headless)
      : recordByHand(provider))
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
