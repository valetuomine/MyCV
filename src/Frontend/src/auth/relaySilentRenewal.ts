import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge"

/**
 * Runs in MSAL's hidden iframe instead of the app: hands Microsoft's
 * response, a code or an error such as `interaction_required`, to the tab
 * through MSAL's redirect bridge. A load without a valid response has
 * nothing to hand over, so it logs the error and the tab's renewal fails
 * with MSAL's own timeout.
 *
 * @returns A promise that settles once the response is handed over or the hand-over has failed.
 */
export async function relaySilentRenewal(): Promise<void> {
  try {
    await broadcastResponseToMainFrame()
  } catch (error) {
    console.error(
      "Handing the silent Microsoft token renewal to the tab failed",
      error,
    )
  }
}
