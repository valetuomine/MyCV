import {
  AuthError,
  BrowserAuthErrorCodes,
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
  clearSignInPromptRequired,
  readLinkSignInMarker,
  storeLastSignInMethod,
} from "./adminLoginStorage"
import { SignInMethod } from "../types"

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
/**
 * How long a sign-in popup waits for its response before it counts as
 * cancelled. MSAL's default of 60 seconds cuts off a normal sign-in with a
 * password and a second factor.
 */
export const signInPopupTimeoutMs = 10 * 60 * 1000

/**
 * The app's MSAL client. Without configuration it falls back to a placeholder
 * client ID and the multi-tenant authority, so the app still loads and the
 * sign-in routes explain that sign-in isn't set up.
 */
export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: clientId || "00000000-0000-0000-0000-000000000000",
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/organizations",
    redirectUri,
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
 * The result of a redirect sign-in that adds a Microsoft account to the
 * signed-in user's CV, recognised by the linking marker's ID in `state`, or
 * null. Kept in memory only.
 */
let linkRedirectResult: AuthenticationResult | null = null

/**
 * Makes the signed-in account active after a successful login, remembers
 * Microsoft as the last sign-in method and clears the credential prompt that
 * a sign-out required. A redirect that adds a sign-in method is kept apart
 * instead, so the account being added never becomes the session. Records
 * the error when a redirect sign-in fails.
 *
 * @param message - The MSAL event. `LOGIN_SUCCESS` carries the account, and
 *   the redirect's `ACQUIRE_TOKEN_SUCCESS`, which comes first, the full result.
 */
function handleMsalEvent(message: EventMessage): void {
  if (
    message.eventType === EventType.ACQUIRE_TOKEN_SUCCESS &&
    message.interactionType === InteractionType.Redirect &&
    message.payload
  ) {
    const result = message.payload as AuthenticationResult
    const linkMarker = readLinkSignInMarker()
    if (linkMarker && result.state === linkMarker.id) {
      linkRedirectResult = result
    }
  } else if (
    message.eventType === EventType.LOGIN_SUCCESS &&
    message.payload &&
    !linkRedirectResult
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
 * Acquires an API access token silently for the given account, the active
 * account or the first signed-in account. Returns null when sign-in isn't
 * configured, nobody is signed in or the token needs interaction; in the last
 * case it also starts one token redirect.
 *
 * @param account - The account to acquire the token for, when not the active one.
 * @returns The authentication result with the access token, or null.
 */
export async function acquireApiAuthenticationResult(
  account?: AccountInfo,
): Promise<AuthenticationResult | null> {
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

  try {
    const result = await msalInstance.acquireTokenSilent({
      account: selectedAccount,
      scopes: [apiScope],
    })
    msalInstance.setActiveAccount(result.account)
    return result
  } catch (error) {
    if (
      error instanceof InteractionRequiredAuthError &&
      !isTokenRedirectInProgress
    ) {
      isTokenRedirectInProgress = true
      void msalInstance
        .acquireTokenRedirect({
          account: selectedAccount,
          scopes: [apiScope],
          redirectUri,
          redirectStartPage: window.location.href,
        })
        .catch(() => {
          isTokenRedirectInProgress = false
        })
    }

    return null
  }
}
