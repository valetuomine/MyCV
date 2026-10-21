import type { JSX, ReactNode } from "react"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import {
  primaryButton,
  secondaryButton,
} from "../pages/components/buttonStyles"
import { isEntraConfigured } from "./entraAuth"
import { SignInFailure, Tone } from "../types"

interface SignInMessageProps {
  pendingTitle: ReactNode
  signInFailure: SignInFailure | null
  isRedirectSlow: boolean
  onRetry: () => void
  backLabel: string
  onBack: () => void
}

/**
 * The sign-in route's screen: explains when sign-in isn't configured, offers
 * a retry when it was cancelled or failed, and otherwise shows the pending
 * message, with a reload option once the redirect is slow.
 *
 * @param props - The component props.
 * @param props.pendingTitle - The heading while sign-in is on its way.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.isRedirectSlow - Whether the redirect is taking too long.
 * @param props.onRetry - Starts sign-in again.
 * @param props.backLabel - The label of the back button.
 * @param props.onBack - Leaves the sign-in route.
 * @returns The sign-in screen for the current state.
 */
export default function SignInMessage({
  pendingTitle,
  signInFailure,
  isRedirectSlow,
  onRetry,
  backLabel,
  onBack,
}: SignInMessageProps): JSX.Element {
  const backButton = (
    <button type="button" onClick={onBack} className={secondaryButton}>
      {backLabel}
    </button>
  )

  if (!isEntraConfigured) {
    return (
      <RouteMessage
        tone={Tone.Error}
        description="Microsoft sign-in isn't configured for this deployment."
        actions={backButton}
      >
        Sign-in isn't set up
      </RouteMessage>
    )
  }

  if (signInFailure) {
    return (
      <RouteMessage
        tone={
          signInFailure === SignInFailure.Cancelled ? Tone.Neutral : Tone.Error
        }
        description={
          signInFailure === SignInFailure.Cancelled
            ? "You weren't signed in. Try again when you're ready."
            : "Microsoft sign-in couldn't be completed. Try again, or come back later."
        }
        actions={
          <>
            <button type="button" onClick={onRetry} className={primaryButton}>
              Try again
            </button>
            {backButton}
          </>
        }
      >
        {signInFailure === SignInFailure.Cancelled
          ? "Sign-in was cancelled"
          : "Sign-in didn't go through"}
      </RouteMessage>
    )
  }

  return (
    <RouteMessage
      tone={Tone.Pending}
      delayed
      description={
        isRedirectSlow
          ? "This is taking longer than usual. Reloading the page usually helps."
          : "You'll be sent to Microsoft to confirm it's you."
      }
      actions={
        isRedirectSlow ? (
          <>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={primaryButton}
            >
              Reload page
            </button>
            {backButton}
          </>
        ) : null
      }
      showHomeButton={false}
    >
      {pendingTitle}
    </RouteMessage>
  )
}
