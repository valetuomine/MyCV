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
  /**
   * The heading without email addresses or extra whitespace. Each word with an
   * `@` between two characters counts as an address, checked word by word
   * because a regular expression across the whole heading backtracks.
   */
  const safeHeading = heading
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (/.@./.test(word) ? "<email>" : word))
    .join(" ")
    .slice(0, 120)
  /** The host only: the path can hold a tenant ID and the query string a login hint. */
  const where = URL.canParse(page.url())
    ? new URL(page.url()).host
    : "an unknown page"
  return `"${safeHeading || "no heading"}" on ${where}`
}

/**
 * Tells which of the given locators shows right now, checking each once. The
 * locators may be on different pages, such as the app and the sign-in window
 * that it opened.
 *
 * @param candidates - The locators to check, by name.
 * @returns The name of the first candidate that shows, or null when none does.
 */
async function firstShown<Name extends string>(
  candidates: Record<Name, Locator>,
): Promise<Name | null> {
  for (const name of Object.keys(candidates) as Name[]) {
    /** False also when the candidate's page has closed, as a sign-in window does. */
    const isShown = await candidates[name]
      .first()
      .isVisible()
      .catch(() => false)
    if (isShown) {
      return name
    }
  }
  return null
}

/**
 * Waits until one of the given locators shows and tells which one did.
 *
 * @param candidates - The locators to wait for, by name.
 * @param timeout - How long to wait, in milliseconds.
 * @returns The name of the first candidate that shows, or null on timeout.
 */
export async function waitForFirst<Name extends string>(
  candidates: Record<Name, Locator>,
  timeout: number,
): Promise<Name | null> {
  /** When to stop waiting, as a timestamp in milliseconds. */
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    /** The candidate that shows now, if any. */
    const shown = await firstShown(candidates)
    if (shown) {
      return shown
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

/** The sign-in steps of each sign-in method that signs in with credentials. */
const providerSteps: Partial<Record<E2EProvider["name"], SignInSteps>> = {
  microsoft: signInToMicrosoft,
}

/**
 * Tells whether a sign-in method can sign in by itself: with credentials, or
 * by reopening its persistent browser profile.
 *
 * @param provider - The sign-in method.
 * @returns True when it has automatic sign-in steps or a persistent profile.
 */
export function supportsAutoSignIn(provider: E2EProvider): boolean {
  return (
    provider.name in providerSteps ||
    (Boolean(provider.profileDir) && provider.name in profileRenewals)
  )
}

/** The app's states that the Google profile renewal waits for. */
type AppStep = "signedIn" | "signInButton"

/**
 * How long a Google page may stay open before the renewal stops, in
 * milliseconds. Google's own pages forward a working sign-in back to the app
 * within a moment; one that stays waits for a person.
 */
const googlePageSettleMs = 5_000

/**
 * Matches what Google writes when it refuses the browser or wants proof of
 * the person, such as "This browser or app may not be secure".
 */
const googleBlockedText =
  /may not be secure|couldn't sign you in|unusual traffic|verify it's you|confirm it's you|not a robot/i

/**
 * Tells whether a page shows one of Google's own sign-in pages.
 *
 * @param page - The page to check.
 * @returns True on a `google.com` host.
 */
function isOnGooglePage(page: Page): boolean {
  return (
    URL.canParse(page.url()) &&
    /(^|\.)google\.com$/.test(new URL(page.url()).hostname)
  )
}

/**
 * Waits until the app shows the signed-in view or its Google sign-in button.
 * It watches every page of the browser context: the silent renewal leaves the
 * app's page for Google, while the app's Google button opens Google in a
 * window of its own on a desktop browser. A Google page that stays open
 * longer than `googlePageSettleMs` waits for a person, so it stops the
 * renewal at once.
 *
 * @param app - The app's page.
 * @param candidates - The app's signed-in view and, when it may show, its sign-in button.
 * @param timeout - How long to wait, in milliseconds.
 * @returns What the app shows, or null on timeout.
 */
async function waitForGoogleStep<Name extends AppStep>(
  app: Page,
  candidates: Record<Name, Locator>,
  timeout: number,
): Promise<Name | null> {
  /** When to stop waiting, as a timestamp in milliseconds. */
  const deadline = Date.now() + timeout
  /** When a page came to Google, or null while no page is on Google. */
  let onGoogleSince: number | null = null
  while (Date.now() < deadline) {
    /** The app's step that shows now, if any. */
    const step = await firstShown(candidates)
    if (step) {
      return step
    }
    /** The page that shows one of Google's pages, if any. */
    const googlePage = app.context().pages().find(isOnGooglePage)
    if (googlePage) {
      onGoogleSince ??= Date.now()
      if (Date.now() - onGoogleSince > googlePageSettleMs) {
        await stopOnGooglePage(googlePage)
      }
    } else {
      onGoogleSince = null
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }
  return null
}

/**
 * Stops the renewal on a Google page that waits for a person. The renewal
 * never answers Google's pages, so a refused browser, an account chooser or
 * any verification ends here with what the page shows.
 *
 * @param page - The page that stayed on Google.
 */
async function stopOnGooglePage(page: Page): Promise<never> {
  /** True when Google refused the browser or asked to verify the person. */
  const isBlocked = await page
    .getByText(googleBlockedText)
    .first()
    .isVisible()
    .catch(() => false)
  throw new SignInStoppedError(
    isBlocked
      ? `Google refused the automatic renewal: ${await describeStep(page)}.`
      : `Google asked for a person: ${await describeStep(page)}.`,
  )
}

/**
 * Renews the app's Google session in the persistent Chrome profile, which
 * keeps the test user signed in to Google. It opens `/admin`, where the app
 * renews an expired token silently with `prompt=none`, and opens it once
 * more when the app shows neither the signed-in view nor its sign-in button
 * in time. When the app shows its "Sign in with Google" button, it clicks it
 * once; the Google window that opens comes straight back while Google still
 * knows the account. It never types or clicks anything on Google's pages:
 * one that stays open, such as a refused browser or an account chooser,
 * stops it at once.
 *
 * @param page - The app's page in the persistent profile.
 * @param adminUrl - The app's `/admin` address.
 * @param signedIn - What the app shows once it is signed in.
 * @param signInButton - The app's "Sign in with Google" button.
 */
async function renewInGoogleProfile(
  page: Page,
  adminUrl: string,
  signedIn: Locator,
  signInButton: Locator,
): Promise<void> {
  await page.goto(adminUrl)
  let step = await waitForGoogleStep(
    page,
    { signedIn, signInButton },
    stepTimeoutMs,
  )
  if (step === null) {
    await page.goto(adminUrl)
    step = await waitForGoogleStep(
      page,
      { signedIn, signInButton },
      stepTimeoutMs,
    )
  }
  if (step === "signInButton") {
    await signInButton.first().click()
    step = await waitForGoogleStep(page, { signedIn }, returnTimeoutMs)
  }
  if (step !== "signedIn") {
    throw new SignInStoppedError(
      `The renewal didn't come back to the app: ${await describeStep(page)}.`,
    )
  }
}

/** Renews the app's session in a sign-in method's persistent browser profile. */
type ProfileRenewal = (
  page: Page,
  adminUrl: string,
  signedIn: Locator,
  signInButton: Locator,
) => Promise<void>

/** The renewal of each sign-in method that keeps a persistent profile. */
const profileRenewals: Partial<Record<E2EProvider["name"], ProfileRenewal>> = {
  google: renewInGoogleProfile,
}

/**
 * Renews the app's session in the sign-in method's persistent browser
 * profile, without credentials.
 *
 * @param provider - The sign-in method, which has a persistent profile.
 * @param page - The app's page in the profile.
 * @param adminUrl - The app's `/admin` address.
 * @param signedIn - What the app shows once it is signed in.
 * @param signInButton - The app's sign-in button for this method.
 */
export async function renewInProfile(
  provider: E2EProvider,
  page: Page,
  adminUrl: string,
  signedIn: Locator,
  signInButton: Locator,
): Promise<void> {
  /** The method's own renewal, if it has one. */
  const renew = profileRenewals[provider.name]
  if (!renew) {
    throw new Error(`The ${provider.label} sign-in has no profile renewal.`)
  }
  await renew(page, adminUrl, signedIn, signInButton)
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
