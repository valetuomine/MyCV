import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge"
import { isSignInPopupCancelled } from "./adminLoginStorage"
import { googlePopupChannelName, type PopupCallback } from "./signInPopupState"
import { SignInMethod } from "../types"

/**
 * Runs in a sign-in popup instead of the app: hands the provider's response
 * to the tab that opened the popup and closes it. It never reads or writes
 * session storage, which the popup has as a copy of the tab's, so the
 * session is only ever stored by the tab. A popup whose attempt was
 * cancelled in the app closes without handing anything over, so finishing
 * in a stale window never signs the user in. Microsoft's response goes
 * through MSAL's redirect bridge, which closes the window itself. Google's
 * fragment goes as is over a `BroadcastChannel`, and the tab checks it.
 *
 * @param callback - The popup's method and attempt ID.
 * @returns A promise that settles once the response is handed over.
 */
export async function relayPopupCallback(
  callback: PopupCallback,
): Promise<void> {
  const { method, attemptId } = callback
  if (isSignInPopupCancelled(attemptId)) {
    window.history.replaceState(null, "", window.location.pathname)
    window.close()
    return
  }

  if (method === SignInMethod.Microsoft) {
    try {
      await broadcastResponseToMainFrame()
    } catch {
      window.close()
    }
    return
  }

  const fragment = window.location.hash.slice(1)
  window.history.replaceState(null, "", window.location.pathname)
  const channel = new BroadcastChannel(googlePopupChannelName(attemptId))
  channel.postMessage(fragment)
  channel.close()
  window.close()
}
