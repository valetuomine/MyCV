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
  storeSignOutReturn,
} from "./adminLoginStorage"
import { RoutePaths } from "../routePaths"
import type { SignOutReason } from "../types"

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
 * Makes the signed-in account active after a successful login and clears
 * the credential prompt that a sign-out required. Records the error when a
 * redirect sign-in fails.
 *
 * @param message - The MSAL event.
 */
function handleMsalEvent(message: EventMessage): void {
  if (message.eventType === EventType.LOGIN_SUCCESS && message.payload) {
    msalInstance.setActiveAccount(
      (message.payload as AuthenticationResult).account,
    )
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

/** How long the sign-out message shows before the page reloads, like the sign-in hold. */
const signOutHoldMs = 3500
/** Why the user is being signed out while an in-app sign-out is under way, or null. */
let signingOutReason: SignOutReason | null = null
/** Components subscribed to `signingOutReason` through `useSyncExternalStore`. */
const signingOutListeners = new Set<() => void>()

/**
 * Stores the reason of the sign-out under way and notifies every subscriber.
 *
 * @param reason - Why the user is being signed out, or null when not signing out.
 */
function setSigningOutReason(reason: SignOutReason | null): void {
  signingOutReason = reason
  signingOutListeners.forEach((listener) => listener())
}

/**
 * Subscribes to the start and failure of an in-app sign-out.
 *
 * @param listener - Called whenever a sign-out starts or fails.
 * @returns A function that unsubscribes the listener.
 */
export function subscribeSigningOut(listener: () => void): () => void {
  signingOutListeners.add(listener)
  return () => signingOutListeners.delete(listener)
}

/**
 * Reads the sign-out under way for `useSyncExternalStore`.
 *
 * @returns Why the user is being signed out, or null when not signing out.
 */
export function getSigningOutReason(): SignOutReason | null {
  return signingOutReason
}

/**
 * Signs out within the app, without Microsoft's logout page: clears MSAL's
 * accounts and tokens, then after `signOutHoldMs` reloads Home, which returns
 * to the CV and shows the sign-out notice. The reload also drops any open
 * editor and cached admin data. The Microsoft session stays, so the next
 * sign-in asks for credentials instead (see `storeSignOutReturn`).
 * Subscribers see the sign-out as under way until the reload, or until it
 * fails.
 *
 * @param publicUrlSegment - The CV to return to, or undefined to stay on Home.
 * @param reason - Whether the user signed out or was signed out when idle.
 * @returns A promise that rejects, leaving the user signed in, when the cache can't be cleared.
 */
export async function signOutInApp(
  publicUrlSegment: string | undefined,
  reason: SignOutReason,
): Promise<void> {
  setSigningOutReason(reason)
  try {
    await msalInstance.clearCache()
  } catch (error) {
    setSigningOutReason(null)
    throw error
  }
  storeSignOutReturn(publicUrlSegment, reason)
  await new Promise((resolve) => setTimeout(resolve, signOutHoldMs))
  window.location.replace(RoutePaths.Home)
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
