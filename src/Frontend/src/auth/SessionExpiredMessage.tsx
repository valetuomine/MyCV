import { useEffect, useState, type JSX } from "react"
import type { ParseKeys } from "i18next"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import { useLocation } from "react-router-dom"
import { baseApi } from "../api/baseApi"
import { clearExpiredSession, useAuthSession } from "./authSession"
import { dismissSessionRefusal, reportSignedInAgain } from "./sessionRefusal"
import { signInPathFor } from "./signInPath"
import {
  cancelSignInPopup,
  openSignInPopup,
  prefersSignInPopup,
} from "./signInPopup"
import {
  ButtonVariant,
  SessionRefusal,
  SignInAgainStep,
  SignInPopupOutcome,
  Tone,
} from "../types"
import Button from "../pages/components/Button"
import RouteMessage from "../pages/Profile/components/RouteMessage"

interface SessionExpiredMessageProps {
  refusal: SessionRefusal
}

/** The step that each way a popup can end without signing in leads to. */
const popupEndSteps: Record<
  Exclude<SignInPopupOutcome, typeof SignInPopupOutcome.SignedIn>,
  SignInAgainStep
> = {
  [SignInPopupOutcome.Blocked]: SignInAgainStep.Blocked,
  [SignInPopupOutcome.Cancelled]: SignInAgainStep.Cancelled,
  [SignInPopupOutcome.Failed]: SignInAgainStep.Failed,
}

/** The warning before signing in again leaves the page. */
const redirectWarningKey: ParseKeys = "sessionExpired.redirectWarning"

/** The note above the buttons after a popup ended without signing in. */
const stepNoteKeys: Partial<Record<SignInAgainStep, ParseKeys>> = {
  [SignInAgainStep.Cancelled]: "sessionExpired.popupCancelled",
  [SignInAgainStep.Blocked]: "sessionExpired.popupBlocked",
}

/** The failure under the buttons after signing in again failed. */
const stepFailureKeys: Partial<Record<SignInAgainStep, ParseKeys>> = {
  [SignInAgainStep.Failed]: "sessionExpired.popupFailed",
  [SignInAgainStep.ClearFailed]: "sessionExpired.signInAgainFailed",
}

/**
 * The full-page message that shows over a signed-in view when the API
 * refuses the session, in the style and words of `/admin`'s former own
 * message. `Background` keeps the page mounted but hidden behind it, so an
 * edit form keeps its unsaved changes. On devices with a mouse or
 * trackpad, Sign in again opens the current method's popup right in the
 * click, without leaving the page: once signed in, the message closes,
 * focus returns to where it was and the queries tagged `Session` refetch,
 * so a failed save can be tried again. On touch devices, after a blocked
 * popup, or without a known method, it first warns that unsaved changes
 * are lost, then drops the session and opens the page's sign-in route
 * (`clearExpiredSession`). A session refused again right after signing in
 * again shows an error and offers no new sign-in, so it never loops. Not
 * now closes the message and shows the page again.
 *
 * @param props - The component props.
 * @param props.refusal - Whether the session expired or was refused again.
 * @returns The message.
 */
export default function SessionExpiredMessage({
  refusal,
}: Readonly<SessionExpiredMessageProps>): JSX.Element {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const location = useLocation()
  const { method } = useAuthSession()
  const [step, setStep] = useState<SignInAgainStep>(SignInAgainStep.Idle)
  /** The element that had focus before the page was hidden, read once during the first render. */
  const [returnFocus] = useState(() => document.activeElement)
  /** Whether Sign in again can open a popup instead of leaving the page. */
  const canUsePopup =
    method !== null && step !== SignInAgainStep.Blocked && prefersSignInPopup()

  useEffect(
    () => () => {
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
        returnFocus.focus()
      }
    },
    [returnFocus],
  )

  /**
   * Drops the refused session and opens the page's sign-in route. Shows an
   * error under the buttons when it can't be dropped.
   */
  const signInOnPage = (): void => {
    setStep(SignInAgainStep.Leaving)
    clearExpiredSession(signInPathFor(location.pathname)).catch(() =>
      setStep(SignInAgainStep.ClearFailed),
    )
  }

  /**
   * Opens the current method's popup in the click and handles how it ended:
   * signed in closes the message and refetches, a blocked window falls
   * back to signing in on the page after the warning, and a popup that
   * could not even start counts as failed.
   */
  const signInAgain = (): void => {
    if (!canUsePopup) {
      signInOnPage()
      return
    }

    setStep(SignInAgainStep.Popup)
    void openSignInPopup(method)
      .then((outcome) => {
        if (outcome === SignInPopupOutcome.SignedIn) {
          reportSignedInAgain()
          dispatch(baseApi.util.invalidateTags(["Session"]))
          return
        }

        setStep(popupEndSteps[outcome])
      })
      .catch(() => setStep(SignInAgainStep.Failed))
  }

  /** Cancels an open popup, or closes the message and shows the page again. */
  const cancelOrDismiss = (): void => {
    if (step === SignInAgainStep.Popup) {
      cancelSignInPopup()
      return
    }

    dismissSessionRefusal()
  }

  if (refusal === SessionRefusal.RefusedAgain) {
    return (
      <RouteMessage
        tone={Tone.Error}
        actions={
          <Button autoFocus onClick={dismissSessionRefusal}>
            {t("sessionExpired.notNow")}
          </Button>
        }
      >
        {t("sessionExpired.refusedAgain")}
      </RouteMessage>
    )
  }

  /** The note's key for this step: how the popup ended, or the warning before leaving the page. */
  const noteKey =
    stepNoteKeys[step] ?? (canUsePopup ? null : redirectWarningKey)
  /** The failure's key for this step, if any. */
  const failureKey = stepFailureKeys[step]
  const note = noteKey && t(noteKey)
  const failure = failureKey && t(failureKey)

  return (
    <RouteMessage
      description={t("sessionExpired.description")}
      actions={
        <>
          {note && (
            <output className="m-0 block basis-full text-base leading-relaxed text-pretty text-cv-ink">
              {note}
            </output>
          )}
          <Button
            autoFocus
            variant={ButtonVariant.Primary}
            onClick={signInAgain}
            loading={
              step === SignInAgainStep.Popup || step === SignInAgainStep.Leaving
            }
          >
            {t("sessionExpired.signInAgain")}
          </Button>
          <Button
            onClick={cancelOrDismiss}
            disabled={step === SignInAgainStep.Leaving}
          >
            {step === SignInAgainStep.Popup
              ? t("common.cancel")
              : t("sessionExpired.notNow")}
          </Button>
          {failure && (
            <p role="alert" className="m-0 basis-full text-sm text-cv-danger">
              {failure}
            </p>
          )}
        </>
      }
    >
      {t("sessionExpired.title")}
    </RouteMessage>
  )
}
