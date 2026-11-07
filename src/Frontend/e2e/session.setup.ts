import type { Page, TestInfo } from "@playwright/test"
import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { supportsAutoSignIn } from "./autoSignIn"
import { expectSignedIn, SessionLapsedError, test as setup } from "./fixtures"
import { isCI, providers, renewSessionHint, type E2EProvider } from "./settings"
import { assertTestAccount } from "./testAccount"

/** Runs a program and resolves with its output, without a shell. */
const run = promisify(execFile)

/** The script that records sessions, which also signs in automatically. */
const recordSessionsScript = fileURLToPath(
  new URL("./record-sessions.ts", import.meta.url),
)

/** How long an automatic sign-in may take, in milliseconds. */
const renewalTimeoutMs = 3 * 60 * 1000

/**
 * Tells whether the page's saved session still signs in on `/admin`.
 *
 * @param page - The setup's page, with the saved session loaded.
 * @returns Null when it signs in, otherwise why it doesn't.
 */
async function findLapse(page: Page): Promise<string | null> {
  await page.goto("/admin")
  try {
    await expectSignedIn(
      page,
      page.getByRole("button", { name: "Create profile" }),
    )
    return null
  } catch (error) {
    if (error instanceof SessionLapsedError) {
      return error.message
    }
    throw error
  }
}

/**
 * Signs in again with the test user from Windows Credential Manager, by
 * running `record-sessions.ts --auto` in a child process. The child reads
 * and types the credentials, so they never pass through this test: they
 * can't reach its trace, report or output. Without saved credentials, outside
 * Windows, in CI, or when the sign-in method has no automatic sign-in, it
 * fails with how to renew the session.
 *
 * @param provider - The sign-in method whose session lapsed.
 * @param reason - Why the session needs renewing, for the error message.
 * @param testInfo - The setup's test info, to extend its timeout.
 */
async function renewSession(
  provider: E2EProvider,
  reason: string,
  testInfo: TestInfo,
): Promise<void> {
  if (!supportsAutoSignIn(provider) || isCI) {
    throw new Error(reason)
  }
  if (process.platform !== "win32") {
    throw new Error(
      `${reason} The automatic renewal reads the test user from Windows Credential Manager, so it runs only on Windows.`,
    )
  }

  testInfo.setTimeout(testInfo.timeout + renewalTimeoutMs)
  console.log(
    `The ${provider.label} session needs renewing: trying to sign in automatically.`,
  )
  /** The child's error output when it failed, which holds no credential, or null when it succeeded. */
  const childFailure = await run(
    process.execPath,
    [recordSessionsScript, provider.name, "--auto"],
    { windowsHide: true, timeout: renewalTimeoutMs },
  ).then(
    ({ stdout }) => {
      console.log(stdout.trim())
      return null
    },
    (error: unknown) =>
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr).trim()
        : "",
  )
  if (childFailure !== null) {
    throw new Error(
      `${reason} The automatic sign-in failed: ${childFailure || "no message"}`,
    )
  }
}

/**
 * Renews a lapsed session and loads it into the page, then checks on
 * `/admin` that the renewed session signs in with a test user.
 *
 * @param page - The setup's page.
 * @param provider - The sign-in method whose session lapsed.
 * @param reason - Why the session needs renewing.
 * @param testInfo - The setup's test info, to extend its timeout.
 */
async function renewAndLoad(
  page: Page,
  provider: E2EProvider,
  reason: string,
  testInfo: TestInfo,
): Promise<void> {
  await renewSession(provider, reason, testInfo)
  await page.context().setStorageState(provider.authFile)
  /** Why the renewed session doesn't sign in either, if it doesn't. */
  const renewedLapse = await findLapse(page)
  if (renewedLapse) {
    throw new Error(`The renewed session doesn't sign in. ${renewedLapse}`)
  }
  await assertTestAccount(page)
}

/**
 * Runs before each sign-in method's tests: checks on `/admin` that its saved
 * session signs in and belongs to a test user, then on the test CV, where the
 * app renews the tokens, that the session still signs in. When the session
 * is missing or lapses on either page, it signs in again automatically with
 * the test user saved in Windows Credential Manager and loads the new session
 * into the page, at most once. It creates the method's own test CV when it is
 * missing, so the tests never depend on data that already exists. It then
 * saves the session again, with the tokens and provider cookies that the app
 * renewed silently, so a session used regularly lasts longer than its first
 * tokens. It saves only a Playwright test user's session.
 */
setup(
  "saved session signs in and the test CV exists",
  async ({ page, testCv, authFile }, testInfo) => {
    setup.skip(!testCv, "No test CV configured for this project.")
    /** The sign-in method that this setup project runs for. */
    const provider = providers.find(
      (candidate) => candidate.authFile === authFile,
    )
    if (!provider) {
      throw new Error(`No sign-in method uses the session file ${authFile}.`)
    }

    /** Why the saved session can't be used, or null when it signs in. */
    const lapse = existsSync(authFile)
      ? await findLapse(page)
      : `No saved session at ${authFile}. ${renewSessionHint}`
    if (lapse) {
      await renewAndLoad(page, provider, lapse, testInfo)
    } else {
      await assertTestAccount(page)
    }

    const createButton = page.getByRole("button", { name: "Create profile" })
    const editButton = page.getByRole("button", { name: "Edit profile" })
    /** Shows when the test CV doesn't exist yet. */
    const missingCv = page
      .getByText("This candidate does not have a profile yet.")
      .or(page.getByText("We couldn't find that CV."))
    /** The test CV's page, where the app renews the tokens. */
    const testCvPath = `/${encodeURIComponent(testCv)}`

    await page.goto(testCvPath)
    try {
      await expectSignedIn(page, editButton.or(missingCv).first())
    } catch (error) {
      if (lapse || !(error instanceof SessionLapsedError)) {
        throw error
      }
      await renewAndLoad(page, provider, error.message, testInfo)
      await page.goto(testCvPath)
      await expectSignedIn(page, editButton.or(missingCv).first())
    }

    if (await missingCv.first().isVisible()) {
      await page.goto("/admin")
      await page.getByLabel("Your CV link").fill(testCv)
      await page.getByLabel("Full name").fill("Playwright")
      await page
        .getByLabel("Professional title (Finnish)")
        .fill("Testiprofiili")
      await createButton.click()
      await page.waitForURL(`**${testCvPath}`)
    }

    await expectSignedIn(page, editButton)
    await page.context().storageState({ path: authFile })
  },
)
