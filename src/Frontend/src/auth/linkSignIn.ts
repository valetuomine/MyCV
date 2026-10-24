import { PromptValue, type AccountInfo } from "@azure/msal-browser"
import {
  clearLinkSignInMarker,
  storeLinkSignInMarker,
  type LinkSignInMarker,
} from "./adminLoginStorage"
import { apiScope, msalInstance, redirectUri } from "./entraAuth"
import { getGoogleIdToken, startGoogleSignIn } from "./googleAuth"
import type { LinkLoginResponse } from "../api/loginQueries"
import { LinkOutcome, SignInFailure, SignInMethod } from "../types"

/** The API's ProblemDetails `code` values for a refused link. */
const conflictOutcomes: Record<string, LinkOutcome> = {
  "login-linked-to-another-cv": LinkOutcome.LinkedElsewhere,
  "login-is-current": LinkOutcome.SameAccount,
}

/**
 * Sends the browser to sign in with the method being added, keeping the
 * current session. It never uses `startSignInRedirect`, which clears the
 * other provider's session. Microsoft returns to `/auth/callback` itself
 * (`redirectStartPage` is the redirect URI), and the marker's ID travels as
 * `state` so the callback can tell the response apart from a sign-in. Google
 * gets a link-mode request, so its token is kept apart from the session.
 *
 * @param method - The method to add.
 * @param publicUrlSegment - The CV to return to.
 * @param sessionMethod - The method the user is signed in with now.
 * @returns A promise that rejects, with the marker cleared, when the redirect can't start.
 */
export async function startLinkSignIn(
  method: SignInMethod,
  publicUrlSegment: string,
  sessionMethod: SignInMethod,
): Promise<void> {
  /** The Microsoft account of the session, restored as the active one on return. */
  const msalAccount =
    sessionMethod === SignInMethod.Microsoft
      ? (msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0])
      : undefined
  const marker: LinkSignInMarker = {
    id: crypto.randomUUID(),
    method,
    publicUrlSegment,
    sessionMethod,
    msalAccountId: msalAccount?.homeAccountId ?? null,
  }
  storeLinkSignInMarker(marker)

  try {
    if (method === SignInMethod.Google) {
      startGoogleSignIn({ prompt: "select_account", link: true })
      return
    }

    await msalInstance.loginRedirect({
      scopes: [apiScope],
      redirectUri,
      redirectStartPage: redirectUri,
      prompt: PromptValue.SELECT_ACCOUNT,
      state: marker.id,
    })
  } catch (error) {
    clearLinkSignInMarker()
    throw error
  }
}

/**
 * Makes the session's Microsoft account active again, after removing the
 * account that was signed in only to be added. The account stays when it is
 * the session's own account, chosen again. Setting the active account also
 * makes MSAL React re-read its accounts.
 *
 * @param marker - The linking marker.
 * @param linkedAccount - The Microsoft account signed in for linking, if any.
 */
async function restoreSession(
  marker: LinkSignInMarker,
  linkedAccount: AccountInfo | null,
): Promise<void> {
  if (linkedAccount && linkedAccount.homeAccountId !== marker.msalAccountId) {
    await msalInstance.clearCache({ account: linkedAccount })
  }

  msalInstance.setActiveAccount(
    marker.msalAccountId
      ? msalInstance.getAccount({ homeAccountId: marker.msalAccountId })
      : null,
  )
}

/**
 * Reads the session's API token without starting any redirect, unlike
 * `acquireApiToken`, so an expired session ends the linking instead of
 * leaving the page.
 *
 * @param marker - The linking marker.
 * @returns The session's token, or null when it has expired.
 */
async function acquireSessionToken(
  marker: LinkSignInMarker,
): Promise<string | null> {
  if (marker.sessionMethod === SignInMethod.Google) {
    return getGoogleIdToken()
  }

  const account = marker.msalAccountId
    ? msalInstance.getAccount({ homeAccountId: marker.msalAccountId })
    : null
  if (!account) {
    return null
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      account,
      scopes: [apiScope],
    })
    return result.accessToken
  } catch {
    return null
  }
}

/**
 * Turns a refused link request into its outcome: a 409's `code` tells
 * whether the account belongs to another CV or is the session's own, and a
 * 401 means the session expired.
 *
 * @param error - The RTK Query error.
 * @returns The outcome to show.
 */
function outcomeForError(error: unknown): LinkOutcome {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return LinkOutcome.Failed
  }

  if (error.status === 401) {
    return LinkOutcome.SessionExpired
  }

  /** The ProblemDetails `code` of a 409, when present. */
  const code =
    error.status === 409 &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "code" in error.data &&
    typeof error.data.code === "string"
      ? error.data.code
      : null

  return (code && conflictOutcomes[code]) || LinkOutcome.Failed
}

interface CompleteLinkSignInOptions {
  marker: LinkSignInMarker
  linkToken: string | null
  linkedAccount: AccountInfo | null
  failure: SignInFailure | null
  submit: (
    linkToken: string,
    sessionToken: string,
  ) => Promise<LinkLoginResponse>
}

/**
 * Finishes adding a sign-in method once the new method's token is in hand,
 * however it was obtained (today a redirect, later possibly a popup). It
 * first restores the session, so the new account never stays signed in,
 * then sends the new token with the session's token. Never throws.
 *
 * @param options - The linking state.
 * @param options.marker - The linking marker stored before leaving.
 * @param options.linkToken - The new method's token, or null when sign-in didn't complete.
 * @param options.linkedAccount - The Microsoft account signed in for linking, if any.
 * @param options.failure - Whether the new method's sign-in was cancelled or failed.
 * @param options.submit - Posts the link request with both tokens.
 * @returns How the linking ended.
 */
export async function completeLinkSignIn({
  marker,
  linkToken,
  linkedAccount,
  failure,
  submit,
}: CompleteLinkSignInOptions): Promise<LinkOutcome> {
  try {
    await restoreSession(marker, linkedAccount)

    if (failure === SignInFailure.Cancelled) {
      return LinkOutcome.Cancelled
    }

    if (failure || !linkToken) {
      return LinkOutcome.Failed
    }

    const sessionToken = await acquireSessionToken(marker)
    if (!sessionToken) {
      return LinkOutcome.SessionExpired
    }

    const { created } = await submit(linkToken, sessionToken)
    return created ? LinkOutcome.Linked : LinkOutcome.AlreadyLinked
  } catch (error) {
    return outcomeForError(error)
  }
}
