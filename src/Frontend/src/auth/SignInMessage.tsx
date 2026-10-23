import { useState, type JSX, type ReactNode } from "react"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import {
  primaryButton,
  secondaryButton,
} from "../pages/components/buttonStyles"
import { readLastSignInMethod } from "./adminLoginStorage"
import {
  hasSignInChoice,
  isSignInConfigured,
  isSignInMethodConfigured,
  signInMethodNames,
} from "./authSession"
import SignInMethodButton from "./SignInMethodButton"
import { SignInFailure, SignInMethod, Tone } from "../types"

interface SignInMessageProps {
  title: ReactNode
  description: string
  pendingTitle: ReactNode
  pendingMethod: SignInMethod | null
  failedMethod: SignInMethod | null
  signInFailure: SignInFailure | null
  isBusy: boolean
  isRedirectSlow: boolean
  startSignIn: (method: SignInMethod) => void
  retrySignIn: () => void
  chooseAnotherMethod: () => void
  backLabel: string
  onBack: () => void
}

/**
 * The sign-in route's screen: explains when sign-in isn't configured, offers
 * a retry or another method when it was cancelled or failed, shows the
 * pending message once a method is chosen, with a reload option once the
 * redirect is slow, and otherwise lets the user choose between the
 * configured methods. The choice fades in late, so a signed-in user who is
 * forwarded at once never sees it flash.
 *
 * @param props - The component props.
 * @param props.title - The heading of the method choice.
 * @param props.description - The help line under the method choice.
 * @param props.pendingTitle - The heading while sign-in is on its way.
 * @param props.pendingMethod - The method being signed in with, or null before a choice.
 * @param props.failedMethod - The method whose sign-in was cancelled or failed.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.isBusy - Whether MSAL is still handling a redirect.
 * @param props.isRedirectSlow - Whether the redirect is taking too long.
 * @param props.startSignIn - Starts sign-in with the chosen method.
 * @param props.retrySignIn - Starts the failed method again.
 * @param props.chooseAnotherMethod - Returns to the method choice.
 * @param props.backLabel - The label of the back button.
 * @param props.onBack - Leaves the sign-in route.
 * @returns The sign-in screen for the current state.
 */
export default function SignInMessage({
  title,
  description,
  pendingTitle,
  pendingMethod,
  failedMethod,
  signInFailure,
  isBusy,
  isRedirectSlow,
  startSignIn,
  retrySignIn,
  chooseAnotherMethod,
  backLabel,
  onBack,
}: SignInMessageProps): JSX.Element {
  const [lastUsedMethod] = useState(readLastSignInMethod)
  const backButton = (
    <button type="button" onClick={onBack} className={secondaryButton}>
      {backLabel}
    </button>
  )

  if (!isSignInConfigured) {
    return (
      <RouteMessage
        tone={Tone.Error}
        description="Sign-in isn't configured for this deployment."
        actions={backButton}
      >
        Sign-in isn't set up
      </RouteMessage>
    )
  }

  if (signInFailure) {
    const isCancelled = signInFailure === SignInFailure.Cancelled
    /** The provider the failure concerns, for the message. */
    const providerName = failedMethod
      ? signInMethodNames[failedMethod]
      : "Sign-in"

    return (
      <RouteMessage
        tone={isCancelled ? Tone.Neutral : Tone.Error}
        description={
          isCancelled
            ? "You weren't signed in. Try again when you're ready."
            : `${providerName} sign-in couldn't be completed. Try again, or come back later.`
        }
        actions={
          <>
            <button
              type="button"
              onClick={retrySignIn}
              className={primaryButton}
            >
              Try again
            </button>
            {hasSignInChoice && (
              <button
                type="button"
                onClick={chooseAnotherMethod}
                className={secondaryButton}
              >
                Use another way
              </button>
            )}
            {backButton}
          </>
        }
      >
        {isCancelled ? "Sign-in was cancelled" : "Sign-in didn't go through"}
      </RouteMessage>
    )
  }

  if (pendingMethod || isBusy) {
    return (
      <RouteMessage
        tone={Tone.Pending}
        delayed
        description={
          isRedirectSlow
            ? "This is taking longer than usual. Reloading the page usually helps."
            : pendingMethod
              ? `You'll be sent to ${signInMethodNames[pendingMethod]} to confirm it's you.`
              : "Checking whether you're already signed in."
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

  return (
    <RouteMessage
      delayed
      description={description}
      actions={
        <>
          <div className="grid basis-full gap-4 sm:max-w-80">
            {Object.values(SignInMethod)
              .filter(isSignInMethodConfigured)
              .map((method) => (
                <SignInMethodButton
                  key={method}
                  method={method}
                  isLastUsed={hasSignInChoice && method === lastUsedMethod}
                  onSelect={startSignIn}
                />
              ))}
          </div>
          {backButton}
        </>
      }
    >
      {title}
    </RouteMessage>
  )
}
