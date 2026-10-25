import { useId, useState, type JSX, type ReactNode } from "react"
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
  popupMethod: SignInMethod | null
  cancelledMethod: SignInMethod | null
  failedMethod: SignInMethod | null
  signInFailure: SignInFailure | null
  isBusy: boolean
  isRedirectSlow: boolean
  startSignIn: (method: SignInMethod) => void
  cancelSignIn: () => void
  retrySignIn: () => void
  chooseAnotherMethod: () => void
  backLabel: string
  onBack: () => void
}

/**
 * The sign-in route's screen: explains when sign-in isn't configured, offers
 * a retry or another method when it failed, asks the user to continue in
 * the popup with a Cancel button that takes focus, shows the pending message
 * while a redirect is on its way, with a reload option once it is slow, and
 * otherwise lets the user choose between the configured methods. The popup
 * message shows at once, because it answers a click. The choice fades in
 * late, so a signed-in user who is forwarded at once never sees it flash,
 * except after a cancelled popup: then it shows at once with a status line,
 * and focus returns to the method that was tried. Cancel has a key, so
 * React mounts it instead of reusing the choice's Back button, and its
 * `autoFocus` applies. Microsoft's sign-in page
 * cuts its popup off from this tab, so the app can't tell when that window
 * is closed or always close it, and the Microsoft messages say so.
 *
 * @param props - The component props.
 * @param props.title - The heading of the method choice.
 * @param props.description - The help line under the method choice.
 * @param props.pendingTitle - The heading while sign-in is on its way.
 * @param props.pendingMethod - The method being redirected to, or null before a choice.
 * @param props.popupMethod - The method whose popup is open, or null.
 * @param props.cancelledMethod - The method whose popup was just cancelled, or null.
 * @param props.failedMethod - The method whose sign-in was cancelled or failed.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.isBusy - Whether MSAL is still handling a redirect.
 * @param props.isRedirectSlow - Whether the redirect is taking too long.
 * @param props.startSignIn - Starts sign-in with the chosen method.
 * @param props.cancelSignIn - Cancels the popup sign-in.
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
  popupMethod,
  cancelledMethod,
  failedMethod,
  signInFailure,
  isBusy,
  isRedirectSlow,
  startSignIn,
  cancelSignIn,
  retrySignIn,
  chooseAnotherMethod,
  backLabel,
  onBack,
}: SignInMessageProps): JSX.Element {
  const [lastUsedMethod] = useState(readLastSignInMethod)
  const cancelledNoteId = useId()
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

  if (popupMethod) {
    const isMicrosoft = popupMethod === SignInMethod.Microsoft

    return (
      <RouteMessage
        tone={Tone.Pending}
        description={`Sign in in the window that opened. This page carries on once you're done.${isMicrosoft ? " Closed the window? Choose Cancel." : ""}`}
        actions={
          <button
            key="cancel"
            type="button"
            onClick={cancelSignIn}
            autoFocus
            className={secondaryButton}
          >
            Cancel
          </button>
        }
        showHomeButton={false}
      >
        Continue in the {signInMethodNames[popupMethod]} window
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
      delayed={!cancelledMethod}
      description={description}
      actions={
        <>
          <div className="grid basis-full gap-4">
            {cancelledMethod && (
              <p
                id={cancelledNoteId}
                role="status"
                className="m-0 text-cv-copy"
              >
                Sign-in was cancelled.
                {cancelledMethod === SignInMethod.Microsoft &&
                  " If the Microsoft window is still open, you can close it."}
              </p>
            )}
            <div className="grid gap-4 sm:max-w-80">
              {Object.values(SignInMethod)
                .filter(isSignInMethodConfigured)
                .map((method) => (
                  <SignInMethodButton
                    key={method}
                    method={method}
                    isLastUsed={hasSignInChoice && method === lastUsedMethod}
                    autoFocus={method === cancelledMethod}
                    describedBy={
                      method === cancelledMethod ? cancelledNoteId : undefined
                    }
                    onSelect={startSignIn}
                  />
                ))}
            </div>
          </div>
          {backButton}
        </>
      }
    >
      {title}
    </RouteMessage>
  )
}
