import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { type JSX } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { returnPublicUrlSegmentKey } from "../adminLoginStorage"
import SignInMessage from "../SignInMessage"
import useEntraLoginRedirect from "../useEntraLoginRedirect"
import { RoutePaths } from "../../routePaths"

export default function AdminLoginRoute(): JSX.Element {
  const { publicUrlSegment = "" } = useParams()
  const { accounts, inProgress } = useMsal()
  const navigate = useNavigate()

  const { signInFailure, isRedirectSlow, retrySignIn } = useEntraLoginRedirect({
    enabled: Boolean(publicUrlSegment),
    redirectPath: RoutePaths.CandidateAdmin(publicUrlSegment),
    storageKey: returnPublicUrlSegmentKey,
    storageValue: publicUrlSegment,
  })

  if (
    publicUrlSegment &&
    inProgress === InteractionStatus.None &&
    accounts[0]
  ) {
    return (
      <Navigate to={RoutePaths.CandidateProfile(publicUrlSegment)} replace />
    )
  }

  return (
    <SignInMessage
      pendingTitle={
        <>
          Signing in to manage <code>{publicUrlSegment}</code>
        </>
      }
      signInFailure={signInFailure}
      isRedirectSlow={isRedirectSlow}
      onRetry={retrySignIn}
      backLabel="Back to CV"
      onBack={() =>
        navigate(RoutePaths.CandidateProfile(publicUrlSegment), {
          replace: true,
        })
      }
    />
  )
}
