import {
  chromium,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test"
import { mkdirSync } from "node:fs"
import path from "node:path"
import {
  renewInProfile,
  SignInStoppedError,
  signInAutomatically,
  supportsAutoSignIn,
  waitForFirst,
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
import { adminSignedInButton } from "./adminSignedIn.ts"
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
  return `Sign in yourself with npm --prefix src/Frontend run e2e:auth -- ${provider.name}${provider.profileDir ? "." : ', and answer Yes to "Stay signed in?".'}`
}

/** A browser context to record a session in, and how to close it. */
interface SignInContext {
  context: BrowserContext
  close: () => Promise<void>
}

/**
 * Opens the browser context that a session is recorded in: the sign-in
 * method's persistent Chrome profile when it has one, otherwise a new, empty
 * context. It drops Playwright's automation flag and `navigator.webdriver`,
 * because Google's sign-in page refuses a browser that reports automation.
 *
 * @param provider - The sign-in method, which picks the browser channel and profile.
 * @param headless - Whether to run without a window.
 * @returns The context and how to close it.
 */
async function openSignInContext(
  provider: E2EProvider,
  headless: boolean,
): Promise<SignInContext> {
  const options = {
    headless,
    channel: provider.channel,
    ignoreDefaultArgs: ["--enable-automation"],
    args: ["--disable-blink-features=AutomationControlled"],
  }
  if (provider.profileDir) {
    mkdirSync(provider.profileDir, { recursive: true })
    /** The profile's context, or an error that names the window to close when another browser holds the profile. */
    const context = await chromium
      .launchPersistentContext(provider.profileDir, {
        ...options,
        locale: "en-US",
      })
      .catch((error: unknown) => {
        throw new Error(
          `Couldn't open the ${provider.label} Chrome profile at ${provider.profileDir}. Close any browser window that still uses it, then try again. ${error instanceof Error ? error.message.split("\n")[0] : ""}`,
        )
      })
    return { context, close: () => context.close() }
  }
  const browser = await chromium.launch(options)
  const context = await browser.newContext({ locale: "en-US" })
  return { context, close: () => browser.close() }
}

/**
 * Returns the context's first page, or a new one. A persistent profile opens
 * with a blank page of its own.
 *
 * @param context - The browser context.
 * @returns The page.
 */
async function firstPage(context: BrowserContext): Promise<Page> {
  return context.pages()[0] ?? (await context.newPage())
}

/** How long the app may take to open its sign-in window, in milliseconds. */
const signInWindowTimeoutMs = 10_000

/** How long the app may take to show its sign-in page, in milliseconds. */
const appReadyTimeoutMs = 30_000

/** The app's page and the page where the provider asks for the credentials, null when the app is already signed in. */
interface SignInPages {
  app: Page
  provider: Page | null
}

/**
 * Opens the app's sign-in page and clicks the sign-in method's button. The
 * app signs in in a window of its own, so the provider's pages open there;
 * when no window opens, they open in the app's page instead. When the app is
 * already signed in, as a persistent profile can be, nothing is clicked and
 * there is no provider page. When the app shows neither, it fails.
 *
 * @param context - The browser context to open the page in.
 * @param provider - The sign-in method.
 * @param signedIn - What the app shows once it is signed in.
 * @returns The app's page and the provider's sign-in page, or null when already signed in.
 */
async function startSignIn(
  context: BrowserContext,
  provider: E2EProvider,
  signedIn: (page: Page) => Locator,
): Promise<SignInPages> {
  const app = await firstPage(context)
  await app.goto(new URL("/admin", baseURL).toString())
  const signInButton = app.getByRole("button", {
    name: `Sign in with ${provider.label}`,
  })
  /** Which of the two the app shows first, or null when it shows neither. */
  const shown = await waitForFirst(
    { signedIn: signedIn(app), signInButton },
    appReadyTimeoutMs,
  )
  if (shown === "signedIn") {
    return { app, provider: null }
  }
  if (shown === null) {
    throw new Error(
      `The app showed neither the signed-in view nor the "Sign in with ${provider.label}" button on /admin. Check that the frontend and the API run.`,
    )
  }
  /** The sign-in window, or null when the app redirects instead. */
  const signInWindow = context
    .waitForEvent("page", { timeout: signInWindowTimeoutMs })
    .catch(() => null)
  await signInButton.click()
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
 * with the test user, and saves the session. A sign-in method with a
 * persistent profile signs in there, so later renewals can reuse it.
 *
 * @param provider - The sign-in method to record.
 */
async function recordByHand(provider: E2EProvider): Promise<void> {
  const { context, close } = await openSignInContext(provider, false)
  try {
    const { app: page, provider: signInPage } = await startSignIn(
      context,
      provider,
      adminSignedInButton,
    )
    console.log(
      signInPage
        ? `Sign in with the ${provider.label} Playwright test user in the browser window${provider.profileDir ? "" : ', and answer Yes to "Stay signed in?"'}.`
        : `The ${provider.label} profile is already signed in.`,
    )
    await adminSignedInButton(page).waitFor({ timeout: signInTimeoutMs })
    await saveSession(page, provider)
  } finally {
    await close()
  }
}

/**
 * Renews the session in the sign-in method's persistent Chrome profile and
 * saves it, with no one at the keyboard and no credentials: the profile keeps
 * the test user signed in to the provider, and the app renews its own token
 * there. A provider page that waits for a person stops it with an instruction
 * to sign in by hand.
 *
 * @param provider - The sign-in method to record, which has a persistent profile.
 * @param headless - Whether to run without a window.
 */
async function renewFromProfile(
  provider: E2EProvider,
  headless: boolean,
): Promise<void> {
  console.log(`Renewing the ${provider.label} session from its Chrome profile.`)
  const { context, close } = await openSignInContext(provider, headless)
  try {
    const page = await firstPage(context)
    await renewInProfile(
      provider,
      page,
      new URL("/admin", baseURL).toString(),
      adminSignedInButton(page),
      page.getByRole("button", { name: `Sign in with ${provider.label}` }),
    )
    await saveSession(page, provider)
  } catch (error) {
    throw error instanceof SignInStoppedError
      ? new Error(
          `The automatic ${provider.label} renewal stopped. ${error.message} ${manualSignInHint(provider)}`,
        )
      : error
  } finally {
    await close()
  }
}

/**
 * Signs in with the test user from Windows Credential Manager and saves the
 * session, with no one at the keyboard. The credentials stay in this
 * process's memory: nothing prints, logs or saves them, and Playwright
 * records no trace here. MFA, a captcha or any other unexpected step stops it
 * with an instruction to sign in by hand. A sign-in method with a persistent
 * profile renews from it instead, without credentials.
 *
 * @param provider - The sign-in method to record.
 * @param headless - Whether to run without a window.
 */
async function recordAutomatically(
  provider: E2EProvider,
  headless: boolean,
): Promise<void> {
  if (provider.profileDir) {
    await renewFromProfile(provider, headless)
    return
  }
  const credentials = await readCredentials(provider)
  if (!credentials) {
    throw new Error(
      `No ${provider.label} test user in Windows Credential Manager. ${saveCredentialsHint(provider)} Or ${manualSignInHint(provider)}`,
    )
  }
  console.log(`Signing in with the ${provider.label} test user automatically.`)
  const { context, close } = await openSignInContext(provider, headless)
  /** What stopped the sign-in, if anything. It is rethrown without its original, which may quote a credential. */
  let failure: unknown = null
  try {
    const pages = await startSignIn(context, provider, adminSignedInButton)
    if (pages.provider) {
      await signInAutomatically(
        pages.provider,
        provider,
        credentials,
        adminSignedInButton(pages.app),
      )
    }
    await saveSession(pages.app, provider)
  } catch (error) {
    failure = error
  } finally {
    await close()
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
 * by itself, without a window unless `--headed` is given: Microsoft with the
 * test user saved in Windows Credential Manager, Google by renewing the
 * session in its persistent Chrome profile. It refuses in CI, which uses a mock
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
