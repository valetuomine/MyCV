import type { TFunction } from "i18next"
import { useId, useState, type JSX, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import Button from "../pages/components/Button"
import { readLastSignInMethod } from "./adminLoginStorage"
import {
  hasSignInChoice,
  isSignInConfigured,
  isSignInMethodConfigured,
  signInMethodNames,
} from "./authSession"
import SignInMethodButton from "./SignInMethodButton"
import { ButtonVariant, SignInFailure, SignInMethod, Tone } from "../types"

interface SignInMessageProps {
  title: ReactNode
  description: string
  pendingTitle: ReactNode
  pendingMethod: SignInMethod | null
  popupMethod: SignInMethod | null
  cancelledMethod: SignInMethod | null
  isCancelledInPopup: boolean
  failedMethod: SignInMethod | null
  signInFailure: SignInFailure | null
  isBusy: boolean
  isRedirectLeaving: boolean
  isRedirectSlow: boolean
  startSignIn: (method: SignInMethod) => void
  cancelSignIn: () => void
  retrySignIn: () => void
  chooseAnotherMethod: () => void
  backLabel: string
  onBack: () => void
}

/**
 * Words a cancelled or failed sign-in.
 *
 * @param signInFailure - Whether sign-in was cancelled or failed.
 * @param failedMethod - The method that was tried, or null when it is unknown.
 * @param t - The translation function.
 * @returns The message's tone, title and description, which names the
 *   provider of a failed sign-in when it is known.
 */
function describeFailure(
  signInFailure: SignInFailure,
  failedMethod: SignInMethod | null,
  t: TFunction,
): { tone: Tone; title: string; description: string } {
  if (signInFailure === SignInFailure.Cancelled) {
    return {
      tone: Tone.Neutral,
      title: t("signIn.cancelledTitle"),
      description: t("signIn.cancelledDescription"),
    }
  }

  return {
    tone: Tone.Error,
    title: t("signIn.failedTitle"),
    description: failedMethod
      ? t("signIn.failedDescription", {
          provider: signInMethodNames[failedMethod],
        })
      : t("signIn.failedDescriptionGeneric"),
  }
}

/**
 * Words the pending screen's help line.
 *
 * @param isRedirectSlow - Whether the redirect is taking too long.
 * @param pendingMethod - The method being redirected to, or null while MSAL checks a response.
 * @param t - The translation function.
 * @returns The slow-redirect hint, the redirect naming its provider, or the check.
 */
function describePending(
  isRedirectSlow: boolean,
  pendingMethod: SignInMethod | null,
  t: TFunction,
): string {
  if (isRedirectSlow) {
    return t("signIn.slow")
  }

  return pendingMethod
    ? t("signIn.redirecting", { provider: signInMethodNames[pendingMethod] })
    : t("signIn.checking")
}

/**
 * The sign-in route's screen: explains when sign-in isn't configured, offers
 * a retry or another method when it failed, asks the user to continue in
 * the popup with a Cancel button that takes focus, shows the pending message
 * while a redirect is on its way, and otherwise lets the user choose between
 * the configured methods. While the redirect waits, a Cancel button that
 * takes focus stops it; once the redirect has left, Cancel stays in place
 * but is unavailable (`aria-disabled`, so it keeps focus), and once it is
 * slow, Reload page takes its place. The pending screen always offers the
 * way back and keeps one row of actions, so its text and loader don't move
 * when Cancel comes or goes. The popup message shows at once, because it
 * answers a click. The choice fades in late, so a signed-in user who is
 * forwarded at once never sees it flash, except after a cancelled popup or
 * redirect: then it shows at once with a status line, and focus returns to
 * the method that was tried. Cancel and Back have keys, so React mounts
 * Cancel instead of reusing another button, and its `autoFocus` applies.
 * Microsoft's sign-in page cuts its popup off from this tab, so the app
 * can't tell when that window is closed or always close it, and the
 * Microsoft messages say so.
 *
 * @param props - The component props.
 * @param props.title - The heading of the method choice.
 * @param props.description - The help line under the method choice.
 * @param props.pendingTitle - The heading while sign-in is on its way.
 * @param props.pendingMethod - The method being redirected to, or null before a choice.
 * @param props.popupMethod - The method whose popup is open, or null.
 * @param props.cancelledMethod - The method whose popup or redirect was just cancelled, or null.
 * @param props.isCancelledInPopup - Whether the cancelled sign-in was a popup.
 * @param props.failedMethod - The method whose sign-in was cancelled or failed.
 * @param props.signInFailure - Whether sign-in was cancelled or failed.
 * @param props.isBusy - Whether MSAL is still handling a redirect.
 * @param props.isRedirectLeaving - Whether the redirect has left, so it can't be cancelled.
 * @param props.isRedirectSlow - Whether the redirect is taking too long.
 * @param props.startSignIn - Starts sign-in with the chosen method.
 * @param props.cancelSignIn - Cancels the popup, or the redirect while it waits.
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
  isCancelledInPopup,
  failedMethod,
  signInFailure,
  isBusy,
  isRedirectLeaving,
  isRedirectSlow,
  startSignIn,
  cancelSignIn,
  retrySignIn,
  chooseAnotherMethod,
  backLabel,
  onBack,
}: Readonly<SignInMessageProps>): JSX.Element {
  const { t } = useTranslation()
  const [lastUsedMethod] = useState(readLastSignInMethod)
  const cancelledNoteId = useId()
  /**
   * The button that leaves the sign-in view.
   *
   * @param className - Extra classes, such as `w-full` to fill a column.
   * @returns The back button.
   */
  const renderBackButton = (className?: string): JSX.Element => (
    <Button onClick={onBack} className={className}>
      {backLabel}
    </Button>
  )
  const backButton = renderBackButton()

  if (!isSignInConfigured) {
    return (
      <RouteMessage
        tone={Tone.Error}
        description={t("signIn.notConfiguredDescription")}
        actions={backButton}
      >
        {t("signIn.notConfiguredTitle")}
      </RouteMessage>
    )
  }

  if (signInFailure) {
    const failure = describeFailure(signInFailure, failedMethod, t)

    return (
      <RouteMessage
        tone={failure.tone}
        description={failure.description}
        actions={
          <>
            <Button variant={ButtonVariant.Primary} onClick={retrySignIn}>
              {t("common.tryAgain")}
            </Button>
            {hasSignInChoice && (
              <Button onClick={chooseAnotherMethod}>
                {t("signIn.useAnotherWay")}
              </Button>
            )}
            {backButton}
          </>
        }
      >
        {failure.title}
      </RouteMessage>
    )
  }

  if (popupMethod) {
    const isMicrosoft = popupMethod === SignInMethod.Microsoft

    return (
      <RouteMessage
        tone={Tone.Pending}
        description={`${t("signIn.popupDescription")}${isMicrosoft ? t("signIn.popupClosedHint") : ""}`}
        actions={
          <Button key="cancel" onClick={cancelSignIn} autoFocus>
            {t("common.cancel")}
          </Button>
        }
        showHomeButton={false}
      >
        {t("signIn.popupTitle", {
          provider: signInMethodNames[popupMethod],
        })}
      </RouteMessage>
    )
  }

  if (pendingMethod || isBusy) {
    return (
      <RouteMessage
        tone={Tone.Pending}
        delayed
        description={describePending(isRedirectSlow, pendingMethod, t)}
        actions={
          <>
            {isRedirectSlow ? (
              <Button
                key="reload"
                variant={ButtonVariant.Primary}
                onClick={() => window.location.reload()}
              >
                {t("signIn.reloadPage")}
              </Button>
            ) : (
              pendingMethod && (
                <Button
                  key="cancel-redirect"
                  onClick={cancelSignIn}
                  aria-disabled={isRedirectLeaving || undefined}
                  autoFocus
                >
                  {t("common.cancel")}
                </Button>
              )
            )}
            {backButton}
          </>
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
        <div className="grid basis-full gap-4">
          {cancelledMethod && (
            <output id={cancelledNoteId} className="m-0 block text-cv-copy">
              {t("signIn.cancelledNote")}
              {isCancelledInPopup &&
                cancelledMethod === SignInMethod.Microsoft &&
                t("signIn.microsoftWindowHint")}
            </output>
          )}
          <div className="grid w-[min(20rem,calc(100vw-3rem))] gap-4">
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
            {renderBackButton("w-full")}
          </div>
        </div>
      }
    >
      {title}
    </RouteMessage>
  )
}
