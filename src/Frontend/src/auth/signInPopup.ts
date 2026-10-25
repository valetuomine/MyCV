import {
  AuthError,
  BrowserAuthErrorCodes,
  EventType,
  PromptValue,
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

/** A sign-in popup that hasn't reported its outcome yet. */
interface SignInPopupAttempt {
  id: string
  popup: Window | null
  resolve: (outcome: SignInPopupOutcome) => void
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
 * Reports an attempt's outcome, once, if the sign-in screen still waits
 * for it. A later result of an attempt that was cancelled or replaced is
 * dropped.
 *
 * @param attempt - The attempt.
 * @param outcome - How it ended.
 */
function settleAttempt(
  attempt: SignInPopupAttempt,
  outcome: SignInPopupOutcome,
): void {
  if (currentAttempt !== attempt) {
    return
  }

  currentAttempt = null
  attempt.resolve(outcome)
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
 * must run in the click. `LOGIN_SUCCESS` in `entraAuth.ts` makes the account
 * active and remembers the method. The Google session is cleared first, so
 * only one session is ever active.
 *
 * @param attempt - The attempt.
 * @param isPromptRequired - Whether a sign-out requires the credentials again.
 */
function startMicrosoftPopup(
  attempt: SignInPopupAttempt,
  isPromptRequired: boolean,
): void {
  const { width, height, top, left } = popupGeometry()
  clearGoogleSession()
  pendingMicrosoftAttempts.add(attempt.id)
  msalInstance
    .loginPopup({
      scopes: [apiScope],
      redirectUri,
      prompt: isPromptRequired ? PromptValue.LOGIN : undefined,
      state: createPopupState(attempt.id),
      correlationId: attempt.id,
      popupWindowAttributes: {
        popupSize: { width, height },
        popupPosition: { top, left },
      },
      overrideInteractionInProgress: true,
    })
    .then(
      () => settleAttempt(attempt, SignInPopupOutcome.SignedIn),
      (error: unknown) => settleAttempt(attempt, outcomeForMsalError(error)),
    )
    .finally(() => {
      pendingMicrosoftAttempts.delete(attempt.id)
      notifyAbandonedPopupListeners()
    })
}

/**
 * Starts the Google popup and waits for its fragment, which this tab checks
 * and stores. MSAL's session is cleared only once the window is open, so
 * nothing is awaited before `window.open`. A closed window counts as a
 * cancel, but the channel stays open until the next attempt, so a false
 * "closed" (if Google's sign-in page ever enforces its opener policy) still
 * signs the user in when the response arrives. After `signInPopupTimeoutMs`
 * the window is closed and the attempt cancelled.
 *
 * @param attempt - The attempt.
 * @param isPromptRequired - Whether a sign-out requires choosing the account again.
 */
function startGooglePopup(
  attempt: SignInPopupAttempt,
  isPromptRequired: boolean,
): void {
  const { width, height, top, left } = popupGeometry()
  const signIn = createGooglePopupSignIn(
    createPopupState(attempt.id),
    isPromptRequired ? "select_account" : undefined,
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
  void msalInstance.clearCache()
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
    const failure = signIn.complete(event.data)
    settleAttempt(
      attempt,
      failure === null
        ? SignInPopupOutcome.SignedIn
        : failure === SignInFailure.Cancelled
          ? SignInPopupOutcome.Cancelled
          : SignInPopupOutcome.Failed,
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
 * Opens the chosen provider's sign-in in a popup. It must be called in the
 * click handler, with nothing awaited before it, or the browser blocks the
 * window. Like `startSignInRedirect`, it clears the other provider's session
 * and a leftover linking marker, and after a sign-out it asks for the
 * credentials or the account again. Linking never uses this. An attempt
 * still under way is cancelled first.
 *
 * @param method - The sign-in method.
 * @returns A promise of the attempt's outcome: signed in, cancelled (in the
 *   app, by closing Google's window or by the timeout), failed, or blocked.
 *   A result that arrives after the attempt ended is dropped.
 */
export function openSignInPopup(
  method: SignInMethod,
): Promise<SignInPopupOutcome> {
  cancelSignInPopup()
  stopGooglePopup?.()
  const isPromptRequired = isSignInPromptRequired()
  clearLinkSignInMarker()

  return new Promise((resolve) => {
    const attempt: SignInPopupAttempt = {
      id: crypto.randomUUID(),
      popup: null,
      resolve,
    }
    currentAttempt = attempt
    notifyAbandonedPopupListeners()

    if (method === SignInMethod.Google) {
      startGooglePopup(attempt, isPromptRequired)
    } else {
      startMicrosoftPopup(attempt, isPromptRequired)
    }
  })
}
