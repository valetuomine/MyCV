import { RoutePaths } from "../routePaths"
import { SignInMethod } from "../types"

/** The `state` prefix that marks a sign-in started in a popup, followed by the attempt ID. */
const popupStatePrefix = "mycv-popup."
/** What follows the popup prefix when the popup adds a sign-in method to the CV. */
const linkPopupMarker = "link."

/** A sign-in popup's response, as the popup reads it from its own URL. */
export interface PopupCallback {
  method: SignInMethod
  attemptId: string
}

/**
 * Builds the `state` of a popup sign-in. Microsoft gets it as the app's part
 * of MSAL's state, Google as the whole state. A popup that adds a sign-in
 * method carries its own state, so `entraAuth.ts` never makes its account
 * the session's.
 *
 * @param attemptId - The popup attempt's ID.
 * @param isLink - Whether the popup adds a sign-in method to the CV.
 * @returns The state that marks the response as a popup's.
 */
export function createPopupState(attemptId: string, isLink = false): string {
  return `${popupStatePrefix}${isLink ? linkPopupMarker : ""}${attemptId}`
}

/**
 * Tells whether a sign-in response's app state belongs to a popup that adds
 * a sign-in method to the CV.
 *
 * @param state - The app's part of the response's state, if any.
 * @returns True for a linking popup's state.
 */
export function isLinkPopupState(state: string | undefined): boolean {
  return state?.startsWith(`${popupStatePrefix}${linkPopupMarker}`) ?? false
}

/**
 * Names the channel that carries a Google popup's response to the tab that
 * opened it.
 *
 * @param attemptId - The popup attempt's ID.
 * @returns The `BroadcastChannel` name.
 */
export function googlePopupChannelName(attemptId: string): string {
  return `mycv-google-sign-in.${attemptId}`
}

/**
 * Tells whether this page load is a sign-in popup's response: a callback
 * route whose `state` carries the popup prefix. MSAL sends Microsoft's state
 * as `<library state>|<app state>`. Redirect sign-ins and redirect linking
 * use states without the prefix, so they load the app as before. A linking
 * popup's state carries the linking marker before the attempt ID.
 *
 * @returns The popup's method and attempt ID, or null for any other page load.
 */
export function readPopupCallback(): PopupCallback | null {
  const { pathname, hash, search } = window.location
  /** The provider whose callback route this is, or null. */
  const method =
    pathname === RoutePaths.AuthCallback
      ? SignInMethod.Microsoft
      : pathname === RoutePaths.GoogleAuthCallback
        ? SignInMethod.Google
        : null
  if (!method) {
    return null
  }

  /** The response's `state`, from the fragment or the query. */
  const state =
    new URLSearchParams(hash.slice(1)).get("state") ??
    new URLSearchParams(search).get("state")
  /** The app's part of the state; Microsoft's follows MSAL's own. */
  const appState =
    method === SignInMethod.Microsoft ? state?.split("|")[1] : state

  if (!appState?.startsWith(popupStatePrefix)) {
    return null
  }

  /** The attempt ID, after the linking marker when the popup adds a method. */
  const attemptId = appState.slice(popupStatePrefix.length)
  return {
    method,
    attemptId: attemptId.startsWith(linkPopupMarker)
      ? attemptId.slice(linkPopupMarker.length)
      : attemptId,
  }
}
