import { RoutePaths } from "../routePaths"
import { SignInMethod } from "../types"

/** The `state` prefix that marks a sign-in started in a popup, followed by the attempt ID. */
const popupStatePrefix = "mycv-popup."

/** A sign-in popup's response, as the popup reads it from its own URL. */
export interface PopupCallback {
  method: SignInMethod
  attemptId: string
}

/**
 * Builds the `state` of a popup sign-in. Microsoft gets it as the app's part
 * of MSAL's state, Google as the whole state.
 *
 * @param attemptId - The popup attempt's ID.
 * @returns The state that marks the response as a popup's.
 */
export function createPopupState(attemptId: string): string {
  return `${popupStatePrefix}${attemptId}`
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
 * as `<library state>|<app state>`. Redirect sign-ins and linking use states
 * without the prefix, so they load the app as before.
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

  return appState?.startsWith(popupStatePrefix)
    ? { method, attemptId: appState.slice(popupStatePrefix.length) }
    : null
}
