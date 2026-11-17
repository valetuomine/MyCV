import type { AccountInfo } from "@azure/msal-browser"
import { useEffect, useRef, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  clearLinkSignInMarker,
  type LinkSignInMarker,
} from "./adminLoginStorage"
import { signInMethodNames } from "./authSession"
import { completeLinkSignIn } from "./linkSignIn"
import { linkSignInLocationState } from "./signInLocationState"
import { useLinkLoginMutation } from "../api/loginQueries"
import RouteMessage from "../pages/Profile/components/RouteMessage"
import Button from "../pages/components/Button"
import { RoutePaths } from "../routePaths"
import {
  ButtonVariant,
  LinkOutcome,
  Tone,
  type SignInFailure,
  type SignInMethod,
} from "../types"

interface LinkSignInCallbackProps {
  method: SignInMethod
  marker: LinkSignInMarker | null
  isReady: boolean
  linkToken: string | null
  linkedAccount?: AccountInfo | null
  failure: SignInFailure | null
  onLeave?: () => void
}

interface LinkSignInMethodProps {
  method: SignInMethod
}

interface LinkSignInSubmitProps {
  method: SignInMethod
  marker: LinkSignInMarker
  linkToken: string | null
  linkedAccount: AccountInfo | null
  failure: SignInFailure | null
}

/**
 * Shows that a response arrived without its linking marker, so no method
 * was added. It clears any marker left for another method when it opens.
 *
 * @param props - The component props.
 * @param props.method - The method that was being added.
 * @returns The error message.
 */
function LinkSignInNotAdded({
  method,
}: Readonly<LinkSignInMethodProps>): JSX.Element {
  const { t } = useTranslation()

  useEffect(() => {
    clearLinkSignInMarker()
  }, [])

  return (
    <RouteMessage
      tone={Tone.Error}
      description={t("linkCallback.notAddedDescription")}
    >
      {t("linkCallback.notAddedTitle", {
        provider: signInMethodNames[method],
      })}
    </RouteMessage>
  )
}

/**
 * Finishes adding a method once the provider has handled its response. When
 * it opens, it clears the linking marker, restores the session and sends the
 * new token once, then returns to the CV's admin view, which shows the
 * outcome. An expired session can't open the admin view, so that outcome
 * shows here.
 *
 * @param props - The component props.
 * @param props.method - The method being added.
 * @param props.marker - The linking marker read when the route opened.
 * @param props.linkToken - The new method's token, or null when its sign-in didn't complete.
 * @param props.linkedAccount - The Microsoft account signed in for linking, if any.
 * @param props.failure - Whether the new method's sign-in was cancelled or failed.
 * @returns The pending message, or the expired session's message.
 */
function LinkSignInSubmit({
  method,
  marker,
  linkToken,
  linkedAccount,
  failure,
}: Readonly<LinkSignInSubmitProps>): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [linkLogin] = useLinkLoginMutation()
  const hasStarted = useRef(false)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const methodName = signInMethodNames[method]

  useEffect(() => {
    if (hasStarted.current) {
      return
    }

    hasStarted.current = true
    clearLinkSignInMarker()

    void completeLinkSignIn({
      marker,
      linkToken,
      linkedAccount,
      failure,
      submit: (token, sessionToken) =>
        linkLogin({ linkToken: token, sessionToken }).unwrap(),
    }).then((result) => {
      if (result === LinkOutcome.SessionExpired) {
        setIsSessionExpired(true)
        return
      }

      void navigate(RoutePaths.CandidateProfile(marker.publicUrlSegment), {
        replace: true,
        state: linkSignInLocationState({ method, outcome: result }),
      })
    })
  }, [failure, linkLogin, linkToken, linkedAccount, marker, method, navigate])

  if (isSessionExpired) {
    /** Returns to the CV, which renews or asks for the session's sign-in. */
    const backToCv = (): void => {
      void navigate(RoutePaths.CandidateProfile(marker.publicUrlSegment), {
        replace: true,
      })
    }

    return (
      <RouteMessage
        description={t("linkCallback.sessionExpiredDescription", {
          provider: methodName,
        })}
        actions={
          <Button variant={ButtonVariant.Primary} onClick={backToCv}>
            {t("common.backToCv")}
          </Button>
        }
      >
        {t("linkCallback.sessionExpiredTitle", { provider: methodName })}
      </RouteMessage>
    )
  }

  return <LinkSignInPending method={method} />
}

/**
 * Shows that adding a method is still in progress.
 *
 * @param props - The component props.
 * @param props.method - The method being added.
 * @returns The pending message.
 */
function LinkSignInPending({
  method,
}: Readonly<LinkSignInMethodProps>): JSX.Element {
  const { t } = useTranslation()

  return (
    <RouteMessage
      tone={Tone.Pending}
      delayed
      description={t("linkCallback.pendingDescription")}
      showHomeButton={false}
    >
      {t("linkCallback.pendingTitle", { provider: signInMethodNames[method] })}
    </RouteMessage>
  )
}

/**
 * The callback screen of a sign-in that adds a method to the CV, shared by
 * Microsoft and Google. It waits until the provider has handled its
 * response, then `LinkSignInSubmit` finishes the linking, or
 * `LinkSignInNotAdded` explains a response that arrived without its marker.
 * Once ready, it stays ready, so the provider getting busy again can't
 * unmount the linking and send the token twice.
 *
 * @param props - The component props.
 * @param props.method - The method being added.
 * @param props.marker - The linking marker read when the route opened, or null without one.
 * @param props.isReady - Whether the provider has handled its response.
 * @param props.linkToken - The new method's token, or null when its sign-in didn't complete.
 * @param props.linkedAccount - The Microsoft account signed in for linking, if any.
 * @param props.failure - Whether the new method's sign-in was cancelled or failed.
 * @param props.onLeave - Clears the provider's error on unmount.
 * @returns The pending message, the linking, or the missing marker's message.
 */
export default function LinkSignInCallback({
  method,
  marker,
  isReady,
  linkToken,
  linkedAccount = null,
  failure,
  onLeave,
}: Readonly<LinkSignInCallbackProps>): JSX.Element {
  const [wasReady, setWasReady] = useState(isReady)

  if (isReady && !wasReady) {
    setWasReady(true)
  }

  useEffect(() => onLeave, [onLeave])

  if (!wasReady) {
    return <LinkSignInPending method={method} />
  }

  if (!marker) {
    return <LinkSignInNotAdded method={method} />
  }

  return (
    <LinkSignInSubmit
      method={method}
      marker={marker}
      linkToken={linkToken}
      linkedAccount={linkedAccount}
      failure={failure}
    />
  )
}
