import { useSyncExternalStore } from "react"
import { getSigningOutReason, subscribeSigningOut } from "./entraAuth"
import type { SignOutReason } from "../types"

/**
 * Follows the in-app sign-out, from its start until the page reloads.
 *
 * @returns Why the user is being signed out, or null when not signing out.
 */
export default function useSigningOutReason(): SignOutReason | null {
  return useSyncExternalStore(subscribeSigningOut, getSigningOutReason)
}
