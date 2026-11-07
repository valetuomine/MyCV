import type { Locator, Page } from "@playwright/test"
import type { TestCredentials } from "./credentials.ts"
import type { E2EProvider } from "./settings.ts"

/**
 * Thrown when the automatic sign-in meets something it must not or can't
 * answer, such as MFA, a captcha or a rejected password. Its message tells
 * the user what to do and never holds a credential.
 */
export class SignInStoppedError extends Error {
  override name = "SignInStoppedError"
}

/** Signs in on a provider's own pages, from its first page until the app shows the signed-in view. */
type SignInSteps = (
  page: Page,
  credentials: TestCredentials,
  signedIn: Locator,
) => Promise<void>

/** The Microsoft sign-in states that the automatic sign-in tells apart. */
type MicrosoftStep =
  | "signedIn"
  | "userName"
  | "password"
  | "staySignedIn"
  | "rejected"
  | "unexpected"

/** How long one provider page may take to show its next step, in milliseconds. */
const stepTimeoutMs = 30_000

/** How often the sign-in looks for the next step, in milliseconds. */
const pollIntervalMs = 250

/** How long the app may take to show the signed-in view after the last provider page. */
const returnTimeoutMs = 60_000

/**
 * Matches the headings of Microsoft pages that need a person: MFA, security
 * info registration, account protection and password changes. They stop the
 * sign-in at once instead of after a timeout.
 */
const microsoftUnexpectedHeading =
  /verify your identity|approve sign.?in|enter code|protect your account|keep your account secure|more information required|help us protect|update your password|password has expired|account (is )?locked|prove you're not a robot|solve this puzzle/i

/** Matches what Microsoft writes under a rejected sign-in name or password. */
const microsoftRejectedText =
  /password is incorrect|account or password is incorrect|account doesn't exist|couldn't find an account|enter a valid email|this username may be incorrect/i

/**
 * Describes the step a provider page shows, for an error message: its main
 * heading, with anything that looks like an email address replaced, because
 * Microsoft shows the sign-in name on some steps.
 *
 * @param page - The provider's page.
 * @returns The heading in quotes and the page's host.
 */
async function describeStep(page: Page): Promise<string> {
  /** The page's first heading, or "" when it has none. */
  const heading =
    (await page
      .getByRole("heading")
      .first()
      .textContent({ timeout: 1_000 })
      .catch(() => null)) ?? ""
  /** The heading without email addresses or extra whitespace. */
  const safeHeading = heading
    .replace(/\S+@\S+/g, "<email>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
  /** The host only: the path can hold a tenant ID and the query string a login hint. */
  const where = URL.canParse(page.url())
    ? new URL(page.url()).host
    : "an unknown page"
  return `"${safeHeading || "no heading"}" on ${where}`
}

/**
 * Waits until one of the given locators shows and tells which one did. The
 * locators may be on different pages, such as the app and the sign-in window
 * that it opened, so it checks each in turn.
 *
 * @param candidates - The locators to wait for, by name.
 * @param timeout - How long to wait, in milliseconds.
 * @returns The name of the first candidate that shows, or null on timeout.
 */
async function waitForFirst<Name extends string>(
  candidates: Record<Name, Locator>,
  timeout: number,
): Promise<Name | null> {
  /** The candidates' names, in the order they are checked. */
  const names = Object.keys(candidates) as Name[]
  /** When to stop waiting, as a timestamp in milliseconds. */
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    for (const name of names) {
      /** False also when the candidate's page has closed, as a sign-in window does. */
      const isShown = await candidates[name]
        .first()
        .isVisible()
        .catch(() => false)
      if (isShown) {
        return name
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }
  return null
}

/**
 * Signs in on Microsoft's pages: the sign-in name, the password, and "Stay
 * signed in?" answered Yes, which keeps the Microsoft cookies long enough
 * for the app to renew its tokens silently after the 24-hour refresh token
 * ends. Each credential is entered at most once, so a rejected password is
 * never retried and can't lock the account. Any other step stops the
 * sign-in.
 *
 * @param page - The provider's sign-in page: the window that the app opened, or the app's own page when it redirected.
 * @param credentials - The test user's sign-in name and password.
 * @param signedIn - What the app shows once it is signed in.
 */
async function signInToMicrosoft(
  page: Page,
  credentials: TestCredentials,
  signedIn: Locator,
): Promise<void> {
  const userNameField = page.locator(
    'input[type="email"]:visible, input[name="loginfmt"]:visible',
  )
  const passwordField = page.locator('input[type="password"]:visible')
  const submitButton = page.locator(
    'input[type="submit"]:visible, button[type="submit"]:visible',
  )
  const staySignedIn = page.getByText("Stay signed in?", { exact: true })
  const yesButton = page.getByRole("button", { name: "Yes", exact: true })
  const rejected = page.getByText(microsoftRejectedText)
  const unexpected = page.getByRole("heading", {
    name: microsoftUnexpectedHeading,
  })

  /**
   * Stops the sign-in with the step that the page shows.
   *
   * @param what - What went wrong, as a sentence start.
   */
  const stop = async (what: string): Promise<never> => {
    throw new SignInStoppedError(`${what}: ${await describeStep(page)}.`)
  }

  let step: MicrosoftStep | null = await waitForFirst(
    { signedIn, userName: userNameField, password: passwordField, unexpected },
    stepTimeoutMs,
  )
  if (step === "signedIn") {
    return
  }
  if (step === "userName") {
    await userNameField.first().fill(credentials.username)
    await submitButton.first().click()
    step = await waitForFirst(
      { password: passwordField, rejected, unexpected },
      stepTimeoutMs,
    )
  }
  if (step === "rejected") {
    await stop("Microsoft didn't accept the test user's sign-in name")
  }
  if (step !== "password") {
    await stop(
      "Microsoft showed a step that the automatic sign-in doesn't handle",
    )
  }

  await passwordField.first().fill(credentials.password)
  await submitButton.first().click()
  step = await waitForFirst(
    { signedIn, staySignedIn, rejected, unexpected },
    stepTimeoutMs,
  )
  if (
    step === "rejected" ||
    (step === null &&
      (await passwordField
        .first()
        .isVisible()
        .catch(() => false)))
  ) {
    await stop(
      "Microsoft didn't accept the test user's password, and it isn't retried",
    )
  }
  if (step === "staySignedIn") {
    await yesButton.first().click()
    step = await waitForFirst({ signedIn, unexpected }, returnTimeoutMs)
  }
  if (step === "unexpected") {
    await stop(
      "Microsoft showed a step that the automatic sign-in doesn't handle",
    )
  }
  if (step !== "signedIn") {
    await stop("The sign-in didn't come back to the app")
  }
}

/** The sign-in steps of each sign-in method that can sign in by itself. */
const providerSteps: Partial<Record<E2EProvider["name"], SignInSteps>> = {
  microsoft: signInToMicrosoft,
}

/**
 * Tells whether a sign-in method can sign in by itself.
 *
 * @param provider - The sign-in method.
 * @returns True when it has automatic sign-in steps.
 */
export function supportsAutoSignIn(provider: E2EProvider): boolean {
  return provider.name in providerSteps
}

/**
 * Signs in with a test user after the app's sign-in button was clicked, and
 * waits until the app shows the signed-in view. It doesn't save anything.
 *
 * @param page - The provider's sign-in page: the window that the app opened, or the app's own page when it redirected.
 * @param provider - The sign-in method.
 * @param credentials - The test user's sign-in name and password.
 * @param signedIn - What the app shows once it is signed in.
 */
export async function signInAutomatically(
  page: Page,
  provider: E2EProvider,
  credentials: TestCredentials,
  signedIn: Locator,
): Promise<void> {
  /** The sign-in method's own steps, or undefined when it has none yet. */
  const steps = providerSteps[provider.name]
  if (!steps) {
    throw new SignInStoppedError(
      `Automatic sign-in isn't available for ${provider.label} yet.`,
    )
  }
  await steps(page, credentials, signedIn)
}
