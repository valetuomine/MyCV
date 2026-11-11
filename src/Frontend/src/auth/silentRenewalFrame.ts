import { RoutePaths } from "../routePaths"

/**
 * Tells whether this page load is MSAL's hidden iframe coming back from a
 * silent Microsoft token renewal. MSAL v5 renews a token in an iframe on the
 * app's own callback route when the refresh token is missing or expired, and
 * waits for the response on a `BroadcastChannel` that only MSAL's redirect
 * bridge writes to. The app must never start in that iframe: it would handle
 * the response itself and start renewals of its own, so the tab would time
 * out. `frame-ancestors 'self'` keeps other sites from framing the route.
 *
 * @returns True for the Microsoft callback route loaded inside a frame.
 */
export function isSilentRenewalFrame(): boolean {
  return (
    window.location.pathname === RoutePaths.AuthCallback &&
    window.parent !== window
  )
}
