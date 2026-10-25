import {
  AuthError,
  BrowserAuthErrorCodes,
  EventType,
  PromptValue,
  type AccountInfo,
  type EventMessage,
  type PopupEvent,
} from "@azure/msal-browser"
import {
  clearLinkSignInMarker,
  isSignInPromptRequired,
  markSignInPopupCancelled,
} from "./adminLoginStorage"
import {
  apiScope,
  isSignInCancelled,
  msalInstance,
  redirectUri,
  signInPopupTimeoutMs,
} from "./entraAuth"
import { clearGoogleSession, createGooglePopupSignIn } from "./googleAuth"
import { microsoftSignInParameters } from "./signInLanguage"
import { createPopupState, googlePopupChannelName } from "./signInPopupState"
import { SignInFailure, SignInMethod, SignInPopupOutcome } from "../types"

/** The popup's size, the same for both providers. */
const popupSize = { width: 500, height: 640 }
/** How often the Google popup is checked for having been closed. */
const closedPollMs = 250
/** Matches phones and tablets used by touch, which sign in with a redirect instead. */
const touchDeviceQuery = "(hover: none) and (pointer: coarse)"
/** The Google popup's window name, so a new attempt reuses a window left open. */
const googlePopupName = "mycv-google-sign-in"

/**
 * How a sign-in popup ended. A popup that adds a sign-in method also hands
 * back the new method's token, and for Microsoft the account it signed in.
 */
export interface SignInPopupResult {
  outcome: SignInPopupOutcome
  linkToken: string | null
  linkedAccount: AccountInfo | null
}

/** A sign-in popup that hasn't reported its outcome yet. */
interface SignInPopupAttempt {
  id: string
  isLink: boolean
  popup: Window | null
  resolve: (result: SignInPopupResult) => void
}

/** The attempt the sign-in screen is waiting for, or null. */
let currentAttempt: SignInPopupAttempt | null = null
/** Stops listening to the last Google popup, which can outlive its attempt. */
let stopGooglePopup: (() => void) | null = null
/** The Microsoft popup attempts whose `loginPopup` call hasn't settled yet. */
const pendingMicrosoftAttempts = new Set<string>()
/** Components subscribed to `hasAbandonedSignInPopup` through `useSyncExternalStore`. */
const abandonedPopupListeners = new Set<() => void>()

/** Notifies the subscribers that an attempt has started, ended or settled. */
function notifyAbandonedPopupListeners(): void {
  abandonedPopupListeners.forEach((listener) => listener())
}

/**
 * Subscribes to changes of whether a cancelled Microsoft popup is still
 * pending in MSAL.
 *
 * @param listener - Called whenever an attempt starts, ends or settles.
 * @returns A function that unsubscribes the listener.
 */
export function subscribeAbandonedSignInPopup(
  listener: () => void,
): () => void {
  abandonedPopupListeners.add(listener)
  return () => abandonedPopupListeners.delete(listener)
}

/**
 * Tells whether MSAL is still waiting for a Microsoft popup the app no longer
 * waits for. MSAL can't be told that a popup was cancelled, so it reports an
 * interaction in progress until the next popup replaces it or its timeout
 * ends it, and the session must not count that as busy.
 *
 * @returns True while a cancelled or replaced Microsoft popup is pending.
 */
export function hasAbandonedSignInPopup(): boolean {
  return [...pendingMicrosoftAttempts].some(
    (attemptId) => attemptId !== currentAttempt?.id,
  )
}

/**
 * Reports an attempt's outcome, once, if the screen still waits for it. A
 * later result of an attempt that was cancelled or replaced is dropped.
 *
 * @param attempt - The attempt.
 * @param outcome - How it ended.
 * @param linkToken - The added method's token, when a linking popup succeeded.
 * @param linkedAccount - The Microsoft account a linking popup signed in.
 */
function settleAttempt(
  attempt: SignInPopupAttempt,
  outcome: SignInPopupOutcome,
  linkToken: string | null = null,
  linkedAccount: AccountInfo | null = null,
): void {
  if (currentAttempt !== attempt) {
    return
  }

  currentAttempt = null
  attempt.resolve({ outcome, linkToken, linkedAccount })
  notifyAbandonedPopupListeners()
}

/**
 * Keeps the Microsoft popup's window, which MSAL opens, so Cancel can try to
 * close it. The attempt's ID is the request's correlation ID.
 *
 * @param message - The MSAL event.
 */
function handleMsalEvent(message: EventMessage): void {
  if (
    message.eventType === EventType.POPUP_OPENED &&
    currentAttempt?.id === message.correlationId
  ) {
    currentAttempt.popup = (message.payload as PopupEvent).popupWindow
  }
}

msalInstance.addEventCallback(handleMsalEvent)

/**
 * Opens a window like `window.open`, and paints the blank page that MSAL
 * opens first with the app's background and colour scheme, so the Microsoft
 * popup doesn't flash white in the dark theme before Microsoft's page loads.
 * The blank page shares this tab's origin until MSAL navigates it, which is
 * also how MSAL sets its title.
 *
 * @param url - The URL to open.
 * @param target - The window's name.
 * @param features - The window's size and position.
 * @returns The window, or null when the browser blocked it.
 */
function openThemedPopup(
  url?: string | URL,
  target?: string,
  features?: string,
): Window | null {
  const popup = window.open(url, target, features)
  if (!popup || url !== "about:blank") {
    return popup
  }

  try {
    const theme = getComputedStyle(document.documentElement)
    const { style } = popup.document.documentElement
    style.colorScheme = theme.colorScheme
    style.background = theme.getPropertyValue("--cv-background")
  } catch {
    return popup
  }

  return popup
}

/**
 * Stands in for this window as the Microsoft popup's parent, through MSAL's
 * `popupWindowParent` request option. MSAL reads the window's position and
 * size from it and opens the popup with its `open`, the only part replaced,
 * by `openThemedPopup`. MSAL's `navigatePopups: false` would skip the blank
 * page instead, but it opens the window only once the request is prepared,
 * which browsers can block as no longer part of the click.
 */
const themedPopupParent = new Proxy(window, {
  get(target, property) {
    if (property === "open") {
      return openThemedPopup
    }

    const value: unknown = Reflect.get(target, property)
    return typeof value === "function" ? value.bind(target) : value
  },
})

/**
 * Tells whether sign-in should open a popup. Phones and tablets used by
 * touch keep the full-page redirect, where a popup would open as a new tab.
 *
 * @returns True on devices with a mouse or trackpad.
 */
export function prefersSignInPopup(): boolean {
  return !window.matchMedia(touchDeviceQuery).matches
}

/**
 * Builds the popup's size and position, centred over this window.
 *
 * @returns The popup's width, height, top and left in screen pixels.
 */
function popupGeometry(): {
  width: number
  height: number
  top: number
  left: number
} {
  return {
    ...popupSize,
    top: Math.max(
      0,
      Math.round(window.screenY + (window.outerHeight - popupSize.height) / 2),
    ),
    left: Math.max(
      0,
      Math.round(window.screenX + (window.outerWidth - popupSize.width) / 2),
    ),
  }
}

/**
 * Turns a failed `loginPopup` into its outcome. A blocked window falls back
 * to the redirect, and the timeout counts as a cancel, like closing the
 * window.
 *
 * @param error - The error from MSAL.
 * @returns The outcome to report.
 */
function outcomeForMsalError(error: unknown): SignInPopupOutcome {
  if (
    error instanceof AuthError &&
    (error.errorCode === BrowserAuthErrorCodes.popupWindowError ||
      error.errorCode === BrowserAuthErrorCodes.emptyWindowError)
  ) {
    return SignInPopupOutcome.Blocked
  }

  return isSignInCancelled(error) ||
    (error instanceof AuthError &&
      error.errorCode === BrowserAuthErrorCodes.timedOut)
    ? SignInPopupOutcome.Cancelled
    : SignInPopupOutcome.Failed
}

/**
 * Starts the Microsoft popup. MSAL opens the window synchronously, so this
 * must run in the click. For a sign-in, `LOGIN_SUCCESS` in `entraAuth.ts`
 * makes the account active and remembers the method, and the Google session
 * is cleared first, so only one session is ever active. A popup that adds a
 * method keeps the session, and its linking state makes `entraAuth.ts`
 * leave its account inactive; the account and its access token are handed
 * back instead.
 *
 * @param attempt - The attempt.
 * @param prompt - The prompt to send, if any.
 */
function startMicrosoftPopup(
  attempt: SignInPopupAttempt,
  prompt: string | undefined,
): void {
  const { width, height, top, left } = popupGeometry()
  if (!attempt.isLink) {
    clearGoogleSession()
  }
  pendingMicrosoftAttempts.add(attempt.id)
  msalInstance
    .loginPopup({
      scopes: [apiScope],
      redirectUri,
      prompt,
      state: createPopupState(attempt.id, attempt.isLink),
      correlationId: attempt.id,
      extraQueryParameters: microsoftSignInParameters(),
      popupWindowAttributes: {
        popupSize: { width, height },
        popupPosition: { top, left },
      },
      popupWindowParent: themedPopupParent,
      overrideInteractionInProgress: true,
    })
    .then(
      (result) =>
        settleAttempt(
          attempt,
          SignInPopupOutcome.SignedIn,
          attempt.isLink ? result.accessToken : null,
          attempt.isLink ? result.account : null,
        ),
      (error: unknown) => settleAttempt(attempt, outcomeForMsalError(error)),
    )
    .finally(() => {
      pendingMicrosoftAttempts.delete(attempt.id)
      notifyAbandonedPopupListeners()
    })
}

/**
 * Starts the Google popup and waits for its fragment, which this tab checks
 * and stores, or hands back as the link token when the popup adds a method.
 * For a sign-in, MSAL's session is cleared only once the window is open, so
 * nothing is awaited before `window.open`. A closed window counts as a
 * cancel, but the channel stays open until the next attempt, so a false
 * "closed" (if Google's sign-in page ever enforces its opener policy) still
 * completes the attempt when the response arrives. After
 * `signInPopupTimeoutMs` the window is closed and the attempt cancelled.
 *
 * @param attempt - The attempt.
 * @param isAccountChoiceRequired - Whether to show Google's account chooser.
 */
function startGooglePopup(
  attempt: SignInPopupAttempt,
  isAccountChoiceRequired: boolean,
): void {
  const { width, height, top, left } = popupGeometry()
  const signIn = createGooglePopupSignIn(
    createPopupState(attempt.id, attempt.isLink),
    isAccountChoiceRequired ? "select_account" : undefined,
    attempt.isLink,
  )
  const popup = window.open(
    signIn.url,
    googlePopupName,
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`,
  )
  if (!popup) {
    settleAttempt(attempt, SignInPopupOutcome.Blocked)
    return
  }

  attempt.popup = popup
  if (!attempt.isLink) {
    void msalInstance.clearCache()
  }
  const channel = new BroadcastChannel(googlePopupChannelName(attempt.id))
  const closedPoll = window.setInterval(() => {
    if (popup.closed) {
      window.clearInterval(closedPoll)
      settleAttempt(attempt, SignInPopupOutcome.Cancelled)
    }
  }, closedPollMs)
  const timeout = window.setTimeout(() => {
    popup.close()
    stop()
    settleAttempt(attempt, SignInPopupOutcome.Cancelled)
  }, signInPopupTimeoutMs)

  /** Stops watching the window and listening for its response. */
  const stop = (): void => {
    window.clearInterval(closedPoll)
    window.clearTimeout(timeout)
    channel.close()
    if (stopGooglePopup === stop) {
      stopGooglePopup = null
    }
  }

  stopGooglePopup = stop
  channel.onmessage = (event: MessageEvent<string>) => {
    stop()
    const { failure, linkToken } = signIn.complete(event.data)
    settleAttempt(
      attempt,
      failure === null
        ? SignInPopupOutcome.SignedIn
        : failure === SignInFailure.Cancelled
          ? SignInPopupOutcome.Cancelled
          : SignInPopupOutcome.Failed,
      linkToken,
    )
  }
}

/**
 * Cancels the sign-in popup the screen is waiting for: remembers the
 * attempt as cancelled, so its window closes without signing in if the user
 * finishes there anyway, tries to close the window and reports the attempt
 * as cancelled. Microsoft's sign-in page usually cuts the window off from
 * this tab, and closing it then does nothing. Does nothing without a popup.
 */
export function cancelSignInPopup(): void {
  const attempt = currentAttempt
  if (!attempt) {
    return
  }

  markSignInPopupCancelled(attempt.id)
  attempt.popup?.close()
  stopGooglePopup?.()
  settleAttempt(attempt, SignInPopupOutcome.Cancelled)
}

/**
 * Starts a popup attempt with the chosen provider, after cancelling an
 * attempt still under way. A popup that adds a method always lets the user
 * choose the account; a sign-in asks for the credentials or the account
 * again only after a sign-out.
 *
 * @param method - The sign-in method.
 * @param isLink - Whether the popup adds a sign-in method to the CV.
 * @returns A promise of how the attempt ended.
 */
function startPopupAttempt(
  method: SignInMethod,
  isLink: boolean,
): Promise<SignInPopupResult> {
  cancelSignInPopup()
  stopGooglePopup?.()
  const isPromptRequired = isLink || isSignInPromptRequired()

  return new Promise((resolve) => {
    const attempt: SignInPopupAttempt = {
      id: crypto.randomUUID(),
      isLink,
      popup: null,
      resolve,
    }
    currentAttempt = attempt
    notifyAbandonedPopupListeners()

    if (method === SignInMethod.Google) {
      startGooglePopup(attempt, isPromptRequired)
    } else {
      startMicrosoftPopup(
        attempt,
        isLink
          ? PromptValue.SELECT_ACCOUNT
          : isPromptRequired
            ? PromptValue.LOGIN
            : undefined,
      )
    }
  })
}

/**
 * Opens the chosen provider's sign-in in a popup. It must be called in the
 * click handler, with nothing awaited before it, or the browser blocks the
 * window. Like `startSignInRedirect`, it clears the other provider's session
 * and a leftover linking marker, and after a sign-out it asks for the
 * credentials or the account again. An attempt still under way is
 * cancelled first.
 *
 * @param method - The sign-in method.
 * @returns A promise of the attempt's outcome: signed in, cancelled (in the
 *   app, by closing Google's window or by the timeout), failed, or blocked.
 *   A result that arrives after the attempt ended is dropped.
 */
export function openSignInPopup(
  method: SignInMethod,
): Promise<SignInPopupOutcome> {
  clearLinkSignInMarker()
  return startPopupAttempt(method, false).then(({ outcome }) => outcome)
}

/**
 * Opens the sign-in of a method being added to the CV in a popup, in the
 * click handler like `openSignInPopup`, with the same Cancel, timeout and
 * cancelled-window handling. It keeps the current session: it clears
 * neither provider's session, and leaves the "Last used" method and the
 * post-sign-out prompt alone.
 *
 * @param method - The method being added.
 * @returns A promise of the outcome, with the new method's token and, for
 *   Microsoft, its account when the sign-in succeeded.
 */
export function openLinkSignInPopup(
  method: SignInMethod,
): Promise<SignInPopupResult> {
  return startPopupAttempt(method, true)
}
