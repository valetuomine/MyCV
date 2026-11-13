import {
  AuthError,
  BrowserAuthErrorCodes,
  BrowserCacheLocation,
  EventType,
  InteractionRequiredAuthError,
  InteractionType,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  type EventError,
  type EventMessage,
} from "@azure/msal-browser"
import {
  clearLinkSignInMarker,
  clearSignInPromptRequired,
  readLinkSignInMarker,
  storeLastSignInMethod,
} from "./adminLoginStorage"
import { isLocalAuthStorage } from "./authStorage"
import { microsoftSignInParameters } from "./signInLanguage"
import { isLinkPopupState } from "./signInPopupState"
import { RoutePaths } from "../routePaths"
import { SignInFailure, SignInMethod } from "../types"

/** The Entra app registration's client ID, or "" when not configured. */
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID?.trim() ?? ""
/** The Entra tenant ID, or "" when not configured. */
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim() ?? ""

/** The API scope that access tokens are requested for, or "" when not configured. */
export const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim() ?? ""
/** True when the client ID, tenant ID and API scope are all set. */
export const isEntraConfigured = Boolean(clientId && tenantId && apiScope)
/** Where Microsoft sends the browser back after sign-in. */
export const redirectUri = `${window.location.origin}/auth/callback`
/** Set while a token redirect is starting, so parallel requests start only one. */
let isTokenRedirectInProgress = false
/** Components subscribed to `isTokenRedirectInProgress` through `useSyncExternalStore`. */
const tokenRedirectListeners = new Set<() => void>()
/**
 * The account whose silent renewal last timed out, or null. Its later
 * requests skip the renewal instead of waiting for the same timeout again:
 * they go without a token, or start the redirect when they may. Any
 * successful sign-in or token acquisition clears it.
 */
let timedOutRenewalAccountId: string | null = null
/**
 * How long a sign-in popup waits for its response before it counts as
 * cancelled. MSAL's default of 60 seconds cuts off a normal sign-in with a
 * password and a second factor.
 */
export const signInPopupTimeoutMs = 10 * 60 * 1000

/**
 * The app's MSAL client. Without configuration it falls back to a placeholder
 * client ID and the multi-tenant authority, so the app still loads and the
 * sign-in routes explain that sign-in isn't set up. The cache stays in
 * session storage unless the Playwright tests' dev server moves it to local
 * storage (`isLocalAuthStorage`).
 */
export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: clientId || "00000000-0000-0000-0000-000000000000",
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/organizations",
    redirectUri,
  },
  cache: {
    cacheLocation: isLocalAuthStorage
      ? BrowserCacheLocation.LocalStorage
      : BrowserCacheLocation.SessionStorage,
  },
  system: { popupBridgeTimeout: signInPopupTimeoutMs },
})

/** The error from the last failed redirect sign-in, or null. */
let redirectSignInError: EventError = null
/** Components subscribed to `redirectSignInError` through `useSyncExternalStore`. */
const redirectSignInErrorListeners = new Set<() => void>()

/**
 * Stores the redirect sign-in error and notifies every subscriber.
 *
 * @param error - The error to store, or null to clear it.
 */
function setRedirectSignInError(error: EventError): void {
  redirectSignInError = error
  redirectSignInErrorListeners.forEach((listener) => listener())
}

/**
 * Stores whether a token redirect is starting and notifies every subscriber.
 *
 * @param isInProgress - True when the redirect starts, false when it failed to start.
 */
function setTokenRedirectInProgress(isInProgress: boolean): void {
  isTokenRedirectInProgress = isInProgress
  tokenRedirectListeners.forEach((listener) => listener())
}

/**
 * The result of a redirect sign-in that adds a Microsoft account to the
 * signed-in user's CV, recognised by the linking marker's ID in `state`, or
 * null. Kept in memory only.
 */
let linkRedirectResult: AuthenticationResult | null = null
/**
 * The correlation IDs of popups that added a Microsoft account to the CV,
 * recognised by their linking state, so their `LOGIN_SUCCESS` is skipped.
 */
const linkPopupCorrelationIds = new Set<string>()

/**
 * A linking marker left by a redirect the user never finished, for example
 * by coming back with the browser's Back button. Only the callback routes
 * read the marker, so any other page load drops it, and a later Microsoft
 * callback, such as a token renewal, isn't taken for linking.
 */
if (
  window.location.pathname !== RoutePaths.AuthCallback &&
  window.location.pathname !== RoutePaths.GoogleAuthCallback
) {
  clearLinkSignInMarker()
}

/**
 * Tells whether a `LOGIN_SUCCESS` belongs to a sign-in that adds a method to
 * the CV: the redirect kept in `linkRedirectResult`, or a linking popup,
 * which is forgotten once its login is seen.
 *
 * @param correlationId - The event's correlation ID.
 * @returns True when the account must not become the session's.
 */
function isLinkLogin(correlationId: string): boolean {
  if (linkPopupCorrelationIds.delete(correlationId)) {
    return true
  }

  return linkRedirectResult !== null
}

/**
 * Makes the signed-in account active after a successful login, remembers
 * Microsoft as the last sign-in method and clears the credential prompt that
 * a sign-out required. A redirect or popup that adds a sign-in method is
 * kept apart instead, so the account being added never becomes the session:
 * the redirect by the linking marker's ID in `state`, the popup by its
 * linking state. Records the error when a redirect sign-in fails, and
 * forgets a timed-out silent renewal once a sign-in or token succeeds.
 *
 * @param message - The MSAL event. `LOGIN_SUCCESS` carries the account, and
 *   `ACQUIRE_TOKEN_SUCCESS`, which comes first, the full result.
 */
function handleMsalEvent(message: EventMessage): void {
  if (
    message.eventType === EventType.LOGIN_SUCCESS ||
    message.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
  ) {
    timedOutRenewalAccountId = null
  }

  if (
    message.eventType === EventType.ACQUIRE_TOKEN_SUCCESS &&
    message.payload
  ) {
    const result = message.payload as AuthenticationResult
    if (message.interactionType === InteractionType.Redirect) {
      const linkMarker = readLinkSignInMarker()
      if (linkMarker && result.state === linkMarker.id) {
        linkRedirectResult = result
      }
    } else if (
      message.interactionType === InteractionType.Popup &&
      isLinkPopupState(result.state)
    ) {
      linkPopupCorrelationIds.add(message.correlationId)
    }
  } else if (
    message.eventType === EventType.LOGIN_SUCCESS &&
    message.payload &&
    !isLinkLogin(message.correlationId)
  ) {
    msalInstance.setActiveAccount(message.payload as AccountInfo)
    storeLastSignInMethod(SignInMethod.Microsoft)
    clearSignInPromptRequired()
  } else if (
    message.eventType === EventType.ACQUIRE_TOKEN_FAILURE &&
    message.interactionType === InteractionType.Redirect
  ) {
    setRedirectSignInError(message.error)
  }
}

msalInstance.addEventCallback(handleMsalEvent)

/**
 * Returns the result of the redirect that added a Microsoft account, once
 * MSAL has handled it on the callback route.
 *
 * @returns The new account's authentication result, or null.
 */
export function getLinkRedirectResult(): AuthenticationResult | null {
  return linkRedirectResult
}

/**
 * Subscribes to changes of the redirect sign-in error.
 *
 * @param listener - Called whenever the error is set or cleared.
 * @returns A function that unsubscribes the listener.
 */
export function subscribeRedirectSignInError(listener: () => void): () => void {
  redirectSignInErrorListeners.add(listener)
  return () => redirectSignInErrorListeners.delete(listener)
}

/**
 * Reads the redirect sign-in error for `useSyncExternalStore`.
 *
 * @returns The current error, or null.
 */
export function getRedirectSignInError(): EventError {
  return redirectSignInError
}

/** Clears the redirect sign-in error, notifying subscribers only if one was set. */
export function clearRedirectSignInError(): void {
  if (redirectSignInError) {
    setRedirectSignInError(null)
  }
}

/**
 * Tells whether a sign-in error means the user cancelled or declined consent.
 *
 * @param error - The error from MSAL.
 * @returns True for a cancelled or declined sign-in.
 */
export function isSignInCancelled(error: unknown): boolean {
  return (
    error instanceof AuthError &&
    (error.errorCode === BrowserAuthErrorCodes.userCancelled ||
      error.errorCode === "access_denied")
  )
}

/**
 * Tells how a sign-in error ended the sign-in.
 *
 * @param error - The error from MSAL, or a falsy value when there is none.
 * @returns Cancelled for a cancelled or declined sign-in, Failed for any
 *   other error, or null without an error.
 */
export function signInFailureOf(error: unknown): SignInFailure | null {
  if (!error) {
    return null
  }

  return isSignInCancelled(error)
    ? SignInFailure.Cancelled
    : SignInFailure.Failed
}

/**
 * Tells whether MSAL gave up waiting for a response from its popup or
 * hidden iframe.
 *
 * @param error - The error from MSAL.
 * @returns True for MSAL's timeout error.
 */
export function isTimedOut(error: unknown): boolean {
  return (
    error instanceof AuthError &&
    error.errorCode === BrowserAuthErrorCodes.timedOut
  )
}

/**
 * Tells whether a token redirect to Microsoft has started. The page is about
 * to leave, so a request sent without a token meanwhile is refused only
 * because the redirect hasn't finished.
 *
 * @returns True while the token redirect is starting.
 */
export function isTokenRedirectPending(): boolean {
  return isTokenRedirectInProgress
}

/**
 * Subscribes to a token redirect starting or failing to start.
 *
 * @param listener - Called whenever `isTokenRedirectPending` changes.
 * @returns A function that unsubscribes the listener.
 */
export function subscribeTokenRedirect(listener: () => void): () => void {
  tokenRedirectListeners.add(listener)
  return () => tokenRedirectListeners.delete(listener)
}

/**
 * Tells whether a failed silent token renewal needs the user to sign in
 * with Microsoft again. Besides MSAL's `InteractionRequiredAuthError`, this
 * covers a hidden-iframe renewal that timed out: when Microsoft's session
 * has ended, its sign-in page in the iframe tries to take over the whole
 * tab, the iframe's sandbox blocks it, and MSAL only sees a timeout.
 *
 * @param error - The error from `acquireTokenSilent`.
 * @returns True when the token needs an interactive sign-in.
 */
function isInteractionNeeded(error: unknown): boolean {
  return error instanceof InteractionRequiredAuthError || isTimedOut(error)
}

/** Whether acquiring an API token may leave the page for Microsoft. */
export interface ApiTokenRedirectOptions {
  /**
   * Whether a token that needs interaction may start a redirect to
   * Microsoft. False for a background check or a save, which must not leave
   * the page; the request then goes without a token and the API's 401 is
   * handled as an expired session. Defaults to true.
   */
  allowRedirect?: boolean
}

/** How `acquireApiAuthenticationResult` acquires the token. */
export interface ApiTokenOptions extends ApiTokenRedirectOptions {
  /** The account to acquire the token for, when not the active one. */
  account?: AccountInfo
}

/**
 * Starts one token redirect to Microsoft for the account, unless one is
 * already starting. Subscribers learn when it starts, and again if it fails
 * to start, so a view waiting for it doesn't wait forever.
 *
 * @param account - The account to renew the token for.
 */
function startTokenRedirect(account: AccountInfo): void {
  if (isTokenRedirectInProgress) {
    return
  }

  setTokenRedirectInProgress(true)
  msalInstance
    .acquireTokenRedirect({
      account,
      scopes: [apiScope],
      redirectUri,
      redirectStartPage: window.location.href,
      extraQueryParameters: microsoftSignInParameters(),
    })
    .catch((error: unknown) => {
      console.error("Starting the Microsoft token redirect failed", error)
      setTokenRedirectInProgress(false)
    })
}

/**
 * Acquires an API access token silently for the given account, the active
 * account or the first signed-in account. Returns null when sign-in isn't
 * configured, nobody is signed in or the token needs interaction; in the last
 * case it also starts one token redirect, unless `allowRedirect` is false.
 * After a silent renewal of the account has timed out, it skips the renewal
 * until a sign-in or token succeeds: a request that may not redirect goes
 * without a token at once, and one that may redirect starts the redirect
 * without waiting for another timeout.
 *
 * @param options - The account and whether a redirect may start.
 * @param options.account - The account to acquire the token for, when not the active one.
 * @param options.allowRedirect - Whether a token that needs interaction may start a redirect.
 * @returns The authentication result with the access token, or null.
 */
export async function acquireApiAuthenticationResult({
  account,
  allowRedirect = true,
}: ApiTokenOptions = {}): Promise<AuthenticationResult | null> {
  if (!isEntraConfigured || !apiScope) {
    return null
  }

  const selectedAccount =
    account ??
    msalInstance.getActiveAccount() ??
    msalInstance.getAllAccounts()[0]

  if (!selectedAccount) {
    return null
  }

  if (timedOutRenewalAccountId === selectedAccount.homeAccountId) {
    if (allowRedirect) {
      startTokenRedirect(selectedAccount)
    }
    return null
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      account: selectedAccount,
      scopes: [apiScope],
    })
    msalInstance.setActiveAccount(result.account)
    return result
  } catch (error) {
    if (!isInteractionNeeded(error)) {
      console.error("Acquiring the API token failed", error)
      return null
    }

    if (isTimedOut(error)) {
      timedOutRenewalAccountId = selectedAccount.homeAccountId
      console.warn(
        allowRedirect
          ? "The silent Microsoft token renewal timed out, so the app signs in again with a redirect"
          : "The silent Microsoft token renewal timed out, so requests go without a token until the user signs in again",
        error,
      )
    }

    if (allowRedirect) {
      startTokenRedirect(selectedAccount)
    }

    return null
  }
}
