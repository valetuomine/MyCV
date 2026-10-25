import type { AccountInfo } from "@azure/msal-browser"
import { useEffect, useRef, useState, type JSX } from "react"
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

/**
 * The callback screen of a sign-in that adds a method to the CV, shared by
 * Microsoft and Google. Once the provider has handled its response, it
 * clears the linking marker, restores the session and sends the new token,
 * then returns to the CV's admin view, which shows the outcome. An expired
 * session can't open the admin view, so that outcome shows here, as does a
 * response that arrives without its marker.
 *
 * @param props - The component props.
 * @param props.method - The method being added.
 * @param props.marker - The linking marker read when the route opened, or null without one.
 * @param props.isReady - Whether the provider has handled its response.
 * @param props.linkToken - The new method's token, or null when its sign-in didn't complete.
 * @param props.linkedAccount - The Microsoft account signed in for linking, if any.
 * @param props.failure - Whether the new method's sign-in was cancelled or failed.
 * @param props.onLeave - Clears the provider's error on unmount.
 * @returns The pending message, or the outcome that can't be shown on the CV.
 */
export default function LinkSignInCallback({
  method,
  marker,
  isReady,
  linkToken,
  linkedAccount = null,
  failure,
  onLeave,
}: LinkSignInCallbackProps): JSX.Element {
  const navigate = useNavigate()
  const [linkLogin] = useLinkLoginMutation()
  const hasStarted = useRef(false)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const methodName = signInMethodNames[method]

  useEffect(() => {
    if (!isReady || hasStarted.current) {
      return
    }

    hasStarted.current = true
    clearLinkSignInMarker()

    if (!marker) {
      return
    }

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

      navigate(RoutePaths.CandidateProfile(marker.publicUrlSegment), {
        replace: true,
        state: linkSignInLocationState({ method, outcome: result }),
      })
    })
  }, [
    failure,
    isReady,
    linkLogin,
    linkToken,
    linkedAccount,
    marker,
    method,
    navigate,
  ])

  useEffect(() => onLeave, [onLeave])

  if (isSessionExpired && marker) {
    /** Returns to the CV, which renews or asks for the session's sign-in. */
    const backToCv = (): void => {
      navigate(RoutePaths.CandidateProfile(marker.publicUrlSegment), {
        replace: true,
      })
    }

    return (
      <RouteMessage
        description={`Your session ended while you were away, so ${methodName} wasn't added. Sign in again, then add it from your CV.`}
        actions={
          <Button variant={ButtonVariant.Primary} onClick={backToCv}>
            Back to CV
          </Button>
        }
      >
        Sign in again to add {methodName}
      </RouteMessage>
    )
  }

  if (isReady && !marker) {
    return (
      <RouteMessage
        tone={Tone.Error}
        description="Open your CV and add the sign-in method again."
      >
        {methodName} wasn't added
      </RouteMessage>
    )
  }

  return (
    <RouteMessage
      tone={Tone.Pending}
      delayed
      description="Taking you back to your CV in a moment."
      showHomeButton={false}
    >
      Adding {methodName} sign-in
    </RouteMessage>
  )
}
