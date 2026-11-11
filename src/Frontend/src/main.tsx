import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./index.css"
import { readPopupCallback } from "./auth/signInPopupState"
import { isSilentRenewalFrame } from "./auth/silentRenewalFrame"

/**
 * The sign-in response this page load holds as a sign-in popup, or null for
 * any other page load. It is read before the app's modules load, because a
 * popup must never run the app: MSAL and `googleAuth.ts` would handle the
 * response as a redirect inside the popup, and the popup's session storage
 * is a copy of the opening tab's, so a session stored there would never
 * reach the tab.
 */
const popupCallback = readPopupCallback()

if (popupCallback) {
  void import("./auth/relayPopupCallback").then(({ relayPopupCallback }) =>
    relayPopupCallback(popupCallback),
  )
} else if (isSilentRenewalFrame()) {
  import("./auth/relaySilentRenewal")
    .then(({ relaySilentRenewal }) => relaySilentRenewal())
    .catch((error: unknown) => {
      console.error("Loading the silent Microsoft token renewal failed", error)
    })
} else {
  void import("./startApp")
}
