import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, type JSX } from "react"
import { useNavigate, useParams } from "react-router-dom"
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

  useEffect(() => {
    if (!publicUrlSegment || inProgress !== InteractionStatus.None) {
      return
    }

    if (accounts[0]) {
      navigate(RoutePaths.CandidateProfile(publicUrlSegment), {
        replace: true,
      })
    }
  }, [accounts, inProgress, navigate, publicUrlSegment])

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
