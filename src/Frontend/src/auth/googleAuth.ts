import {
  clearSignInPromptRequired,
  storeLastSignInMethod,
} from "./adminLoginStorage"
import { RoutePaths } from "../routePaths"
import { SignInFailure, SignInMethod } from "../types"

/** MyCV's Google OAuth client ID, or "" when not configured. */
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ""
/** True when the Google client ID is set. */
export const isGoogleConfigured = Boolean(clientId)
/** Where Google sends the browser back after sign-in. */
export const googleRedirectUri = `${window.location.origin}${RoutePaths.GoogleAuthCallback}`

/** Google's OAuth 2.0 authorization endpoint. */
const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth"
/** The issuers that Google ID tokens may carry. */
const validIssuers = ["https://accounts.google.com", "accounts.google.com"]
/** How long before expiry a token stops being handed out, so it doesn't expire in flight. */
const tokenExpiryMarginMs = 60 * 1000
/** Session-storage key for the sign-in request waiting for Google's response. */
const pendingRequestKey = "mycv-google-sign-in-request"
/**
 * Session-storage key for the signed-in Google session. Session storage, like
 * MSAL's default cache, so the token never outlives the tab.
 */
const sessionKey = "mycv-google-session"

/** The sign-in request stored before the redirect to Google. */
interface PendingGoogleRequest {
  state: string
  nonce: string
  returnPath: string | null
  silent: boolean
}

/** The signed-in Google session. */
export interface GoogleSession {
  idToken: string
  sub: string
  exp: number
  name?: string
  email?: string
}

/** The claims that the browser checks in Google's ID token. */
interface GoogleIdTokenClaims {
  iss?: string
  aud?: string
  sub?: string
  exp?: number
  nonce?: string
  name?: string
  email?: string
}

/** What the Google callback found. */
export interface GoogleSignInResult {
  failure: SignInFailure | null
  isSignInRequired: boolean
  returnPath: string | null
  silent: boolean
}

interface StartGoogleSignInOptions {
  prompt?: "none" | "select_account"
  loginHint?: string
  returnPath?: string | null
}

/**
 * Parses a JSON value from session storage.
 *
 * @param key - The session-storage key.
 * @returns The parsed value, or null when it is missing or invalid.
 */
function readSessionJson<T>(key: string): T | null {
  try {
    const value = sessionStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

/** The signed-in Google session, or null. */
let googleSession = readSessionJson<GoogleSession>(sessionKey)
/** Components subscribed to `googleSession` through `useSyncExternalStore`. */
const googleSessionListeners = new Set<() => void>()

/**
 * Stores the Google session and notifies every subscriber.
 *
 * @param session - The session to store, or null to clear it.
 */
function setGoogleSession(session: GoogleSession | null): void {
  googleSession = session
  if (session) {
    sessionStorage.setItem(sessionKey, JSON.stringify(session))
  } else {
    sessionStorage.removeItem(sessionKey)
  }
  googleSessionListeners.forEach((listener) => listener())
}

/**
 * Subscribes to changes of the Google session.
 *
 * @param listener - Called whenever the session is stored or cleared.
 * @returns A function that unsubscribes the listener.
 */
export function subscribeGoogleSession(listener: () => void): () => void {
  googleSessionListeners.add(listener)
  return () => googleSessionListeners.delete(listener)
}

/**
 * Reads the Google session for `useSyncExternalStore`.
 *
 * @returns The current session, including one whose token has expired, or null.
 */
export function getGoogleSession(): GoogleSession | null {
  return googleSession
}

/** Signs out of the Google session within the app. */
export function clearGoogleSession(): void {
  if (googleSession) {
    setGoogleSession(null)
  }
}

/**
 * Hands out the Google ID token for the API while it stays valid for at
 * least `tokenExpiryMarginMs`.
 *
 * @returns The ID token, or null when nobody is signed in with Google or it is about to expire.
 */
export function getGoogleIdToken(): string | null {
  return googleSession &&
    googleSession.exp * 1000 - tokenExpiryMarginMs > Date.now()
    ? googleSession.idToken
    : null
}

/**
 * Sends the browser to Google sign-in for an ID token. Stores `state`, the
 * `nonce` and where to return in session storage, so the callback can check
 * the response belongs to this request.
 *
 * @param options - The sign-in options.
 * @param options.prompt - `none` for a silent renewal, `select_account` to let the user choose.
 * @param options.loginHint - The account to sign in, such as the previous token's `sub`.
 * @param options.returnPath - Where a silent renewal returns to.
 */
export function startGoogleSignIn({
  prompt,
  loginHint,
  returnPath = null,
}: StartGoogleSignInOptions = {}): void {
  const request: PendingGoogleRequest = {
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    returnPath,
    silent: prompt === "none",
  }
  sessionStorage.setItem(pendingRequestKey, JSON.stringify(request))

  const parameters = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce: request.nonce,
    state: request.state,
  })
  if (prompt) {
    parameters.set("prompt", prompt)
  }
  if (loginHint) {
    parameters.set("login_hint", loginHint)
  }

  window.location.assign(`${authorizationEndpoint}?${parameters}`)
}

/**
 * Decodes a JWT's payload without verifying its signature, which the API does.
 *
 * @param token - The JWT.
 * @returns The payload's claims, or null when the token can't be decoded.
 */
function decodeTokenClaims(token: string): GoogleIdTokenClaims | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const bytes = Uint8Array.from(atob(payload), (character) =>
      character.charCodeAt(0),
    )
    return JSON.parse(new TextDecoder().decode(bytes)) as GoogleIdTokenClaims
  } catch {
    return null
  }
}

/**
 * Checks Google's response against the stored request and stores the
 * session when the ID token is for MyCV, unexpired and carries the request's
 * nonce. A silent renewal that fails, usually with `login_required`, clears
 * the session and asks for sign-in, so an expired token can't start the same
 * renewal again and again.
 *
 * @param response - The parameters from the callback URL's fragment, or null without one.
 * @returns What the callback found.
 */
function readGoogleResponse(
  response: URLSearchParams | null,
): GoogleSignInResult {
  const request = readSessionJson<PendingGoogleRequest>(pendingRequestKey)
  sessionStorage.removeItem(pendingRequestKey)
  const result: GoogleSignInResult = {
    failure: SignInFailure.Failed,
    isSignInRequired: false,
    returnPath: request?.returnPath ?? null,
    silent: request?.silent ?? false,
  }

  if (!response || !request || response.get("state") !== request.state) {
    return result
  }

  const error = response.get("error")
  if (error && request.silent) {
    clearGoogleSession()
    return { ...result, failure: null, isSignInRequired: true }
  }

  if (error) {
    return {
      ...result,
      failure:
        error === "access_denied"
          ? SignInFailure.Cancelled
          : SignInFailure.Failed,
    }
  }

  const idToken = response.get("id_token")
  const claims = idToken ? decodeTokenClaims(idToken) : null
  if (
    !idToken ||
    !claims?.sub ||
    !claims.exp ||
    claims.nonce !== request.nonce ||
    claims.aud !== clientId ||
    !validIssuers.includes(claims.iss ?? "") ||
    claims.exp * 1000 <= Date.now()
  ) {
    if (request.silent) {
      clearGoogleSession()
      return { ...result, failure: null, isSignInRequired: true }
    }

    return result
  }

  setGoogleSession({
    idToken,
    sub: claims.sub,
    exp: claims.exp,
    name: claims.name,
    email: claims.email,
  })
  storeLastSignInMethod(SignInMethod.Google)
  clearSignInPromptRequired()
  return { ...result, failure: null }
}

/** Whether this page load is Google's redirect back to the callback route. */
const isGoogleCallback =
  window.location.pathname === RoutePaths.GoogleAuthCallback

/**
 * Google's response, taken from the URL before React renders. MSAL reads the
 * fragment on every page load and would mistake Google's `state` for its
 * own, and the callback route loads lazily, so the fragment is captured and
 * removed from the address bar as soon as this module loads.
 */
const callbackResponse =
  isGoogleCallback && window.location.hash.length > 1
    ? new URLSearchParams(window.location.hash.slice(1))
    : null

if (callbackResponse) {
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`,
  )
}

/**
 * The callback's result, computed when the module loads, before any
 * component subscribes to the session, so storing the session never updates
 * a component while another one renders. Null outside the callback route.
 */
let googleSignInResult = isGoogleCallback
  ? readGoogleResponse(callbackResponse)
  : null

/**
 * Returns the result of the Google sign-in completed when this page loaded
 * on the callback route. Reached any other way, for example by in-app
 * navigation, the callback has no response and reports a failed sign-in.
 *
 * @returns Whether sign-in succeeded, was cancelled, failed, or needs the user after a silent renewal.
 */
export function completeGoogleSignIn(): GoogleSignInResult {
  googleSignInResult ??= readGoogleResponse(null)
  return googleSignInResult
}
