import { InteractionStatus, PromptValue } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useSyncExternalStore } from "react"
import { useTranslation } from "react-i18next"
import {
  clearLinkSignInMarker,
  isSignInPromptRequired,
  markExpiredSessionCleared,
  storeSignOutReturn,
} from "./adminLoginStorage"
import {
  acquireApiAuthenticationResult,
  apiScope,
  isEntraConfigured,
  isTokenRedirectPending,
  msalInstance,
  redirectUri,
  subscribeTokenRedirect,
  type ApiTokenRedirectOptions,
} from "./entraAuth"
import {
  clearGoogleSession,
  getGoogleIdToken,
  getGoogleSession,
  isGoogleConfigured,
  startGoogleSignIn,
  subscribeGoogleSession,
} from "./googleAuth"
import {
  hasAbandonedSignInPopup,
  subscribeAbandonedSignInPopup,
} from "./signInPopup"
import { microsoftSignInParameters } from "./signInLanguage"
import { RoutePaths } from "../routePaths"
import { SignInMethod, type SignOutReason } from "../types"

/** True when at least one sign-in method is set up. */
export const isSignInConfigured = isEntraConfigured || isGoogleConfigured
/** True when both sign-in methods are set up, so the user can switch between them. */
export const hasSignInChoice = isEntraConfigured && isGoogleConfigured

/** The provider name that sign-in messages show for each method. */
export const signInMethodNames: Record<SignInMethod, string> = {
  [SignInMethod.Microsoft]: "Microsoft",
  [SignInMethod.Google]: "Google",
}

/**
 * Tells whether a sign-in method is set up for this deployment.
 *
 * @param method - The sign-in method.
 * @returns True when the method's client configuration is present.
 */
export function isSignInMethodConfigured(method: SignInMethod): boolean {
  return method === SignInMethod.Microsoft
    ? isEntraConfigured
    : isGoogleConfigured
}

/** The signed-in account as the app shows it. */
interface SignedInAccount {
  name: string
  username: string
}

/** The sign-in state shared by Microsoft and Google. */
interface AuthSession {
  isSignedIn: boolean
  isBusy: boolean
  method: SignInMethod | null
  account: SignedInAccount | null
}

/**
 * Combines the MSAL account and the Google session into one sign-in state.
 * Only one is active at a time, because starting a sign-in clears the other.
 * The one exception is a Microsoft account being added to a Google
 * session's CV: it is never made active, and the Google session wins until
 * linking removes the account. MSAL stays busy with a Microsoft popup that
 * was cancelled until the next popup or its timeout ends it, which doesn't
 * count as busy here.
 *
 * @returns Whether someone is signed in, with which method and account, and whether MSAL is busy.
 */
export function useAuthSession(): AuthSession {
  const { t } = useTranslation()
  const { accounts, inProgress, instance } = useMsal()
  const googleSession = useSyncExternalStore(
    subscribeGoogleSession,
    getGoogleSession,
  )
  const hasAbandonedPopup = useSyncExternalStore(
    subscribeAbandonedSignInPopup,
    hasAbandonedSignInPopup,
  )
  const isBusy = inProgress !== InteractionStatus.None && !hasAbandonedPopup
  /** The first signed-in Microsoft account, which stands in for the active one only without a Google session. */
  const fallbackAccount = googleSession ? null : accounts[0]
  /** The active Microsoft account, or the first signed-in one when there is no Google session. */
  const msalAccount = accounts[0]
    ? (instance.getActiveAccount() ?? fallbackAccount)
    : null

  if (msalAccount) {
    return {
      isSignedIn: true,
      isBusy,
      method: SignInMethod.Microsoft,
      account: {
        name: msalAccount.name || msalAccount.username,
        username: msalAccount.username,
      },
    }
  }

  if (googleSession) {
    return {
      isSignedIn: true,
      isBusy,
      method: SignInMethod.Google,
      account: {
        name:
          googleSession.name ||
          googleSession.email ||
          t("signIn.googleAccount"),
        username: googleSession.email ?? "",
      },
    }
  }

  return { isSignedIn: false, isBusy, method: null, account: null }
}

/**
 * Starts the redirect to the chosen provider, after clearing the other
 * provider's session so only one is ever active. After a sign-out,
 * Microsoft asks for credentials again with `prompt=login`. Google has no
 * such prompt and ignores `max_age=0`, so it shows the account chooser.
 * Linking never uses this, because it must keep the current session; a
 * leftover linking marker is dropped so the callback treats this as a sign-in.
 *
 * @param method - The sign-in method.
 * @param redirectPath - The sign-in route that Microsoft completes the redirect on.
 * @returns A promise that rejects when the redirect can't be started.
 */
export async function startSignInRedirect(
  method: SignInMethod,
  redirectPath: string,
): Promise<void> {
  const isPromptRequired = isSignInPromptRequired()
  clearLinkSignInMarker()

  if (method === SignInMethod.Google) {
    await msalInstance.clearCache()
    startGoogleSignIn({
      prompt: isPromptRequired ? "select_account" : undefined,
    })
    return
  }

  clearGoogleSession()
  await msalInstance.loginRedirect({
    scopes: [apiScope],
    redirectUri,
    redirectStartPage: `${window.location.origin}${redirectPath}`,
    prompt: isPromptRequired ? PromptValue.LOGIN : undefined,
    extraQueryParameters: microsoftSignInParameters(),
  })
}

/** Set while a silent Google renewal is starting, so parallel requests start only one. */
let isGoogleRenewalInProgress = false

/**
 * Gets the bearer token for the API: the Entra access token, or the Google
 * ID token. A Google session counts while no Microsoft account is active,
 * so a Microsoft account being added to its CV is never used. When the
 * Google token has expired, it starts one silent redirect to Google that
 * returns to the current page. When the Entra token needs interaction, it
 * starts a redirect to Microsoft only if `allowRedirect` allows it.
 *
 * @param options - How the Entra token is acquired.
 * @param options.allowRedirect - Whether an Entra token that needs interaction may start a redirect to Microsoft. Defaults to true.
 * @returns The token, or null when nobody is signed in or a renewal is needed.
 */
export async function acquireApiToken({
  allowRedirect = true,
}: ApiTokenRedirectOptions = {}): Promise<string | null> {
  const googleSession = getGoogleSession()
  if (googleSession && !msalInstance.getActiveAccount()) {
    const idToken = getGoogleIdToken()
    if (!idToken && !isGoogleRenewalInProgress) {
      isGoogleRenewalInProgress = true
      startGoogleSignIn({
        prompt: "none",
        loginHint: googleSession.sub,
        returnPath: `${window.location.pathname}${window.location.search}`,
      })
    }

    return idToken
  }

  const result = await acquireApiAuthenticationResult({ allowRedirect })
  return result?.accessToken ?? null
}

/**
 * Tells whether a token redirect to Microsoft has started, and renders the
 * component again when it starts or fails to start, so a view that waits
 * for the redirect never stays on its loader.
 *
 * @returns True while the token redirect is starting.
 */
export function useTokenRedirectPending(): boolean {
  return useSyncExternalStore(subscribeTokenRedirect, isTokenRedirectPending)
}

/**
 * Tells whether a silent Google renewal has started. The page is about to
 * leave for Google, so a request sent without a token meanwhile is refused
 * only because the renewal hasn't finished.
 *
 * @returns True while the renewal redirect is starting.
 */
export function isGoogleRenewalPending(): boolean {
  return isGoogleRenewalInProgress
}

/**
 * Drops a session the API no longer accepts and opens the page's sign-in
 * route, which returns to the same page once signed in. It clears MSAL's
 * accounts and tokens and the Google session without the post-sign-out
 * prompt, so the provider can sign the same account in again without
 * asking. Like `signOutInApp`, the full page load drops the data cached for
 * the old identity and any unsaved changes, so another account signing in
 * never sees them. It also marks the session as cleared
 * (`markExpiredSessionCleared`), so a sign-in the API refuses again shows
 * an error instead of looping.
 *
 * @param signInPath - The page's sign-in route.
 * @returns A promise that rejects, leaving the session as it was, when the cache can't be cleared.
 */
export async function clearExpiredSession(signInPath: string): Promise<void> {
  await msalInstance.clearCache()
  clearGoogleSession()
  markExpiredSessionCleared()
  if (signInPath === window.location.pathname) {
    window.location.reload()
  } else {
    window.location.replace(signInPath)
  }
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
 * Signs out within the app, without Microsoft's or Google's logout page:
 * clears MSAL's accounts and tokens and the Google session, then after
 * `signOutHoldMs` reloads Home, which returns to the CV and shows the
 * sign-out notice. The reload also drops any open editor and cached admin
 * data. The provider sessions stay, so the next sign-in asks for credentials
 * or an account instead (see `storeSignOutReturn`). Subscribers see the
 * sign-out as under way until the reload, or until it fails.
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
  clearGoogleSession()
  storeSignOutReturn(publicUrlSegment, reason)
  await new Promise((resolve) => setTimeout(resolve, signOutHoldMs))
  window.location.replace(RoutePaths.Home)
}
