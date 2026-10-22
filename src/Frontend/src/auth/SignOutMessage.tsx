import type { JSX } from "react"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import { SignOutReason, Tone } from "../types"

interface SignOutMessageProps {
  reason: SignOutReason
}

/**
 * The pending screen while a sign-out clears the session and reloads the
 * page, matching the sign-in screen. Says when the user is signed out for
 * being idle.
 *
 * @param props - The component props.
 * @param props.reason - Whether the user signed out or is signed out when idle.
 * @returns The sign-out screen.
 */
export default function SignOutMessage({
  reason,
}: SignOutMessageProps): JSX.Element {
  return (
    <RouteMessage
      tone={Tone.Pending}
      description={
        reason === SignOutReason.Idle
          ? "The app wasn't used for 5 minutes, so you're being signed out."
          : "Clearing your session on this device."
      }
      showHomeButton={false}
    >
      Signing out
    </RouteMessage>
  )
}
