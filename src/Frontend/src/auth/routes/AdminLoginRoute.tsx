import { type JSX } from "react"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { returnPublicUrlSegmentKey } from "../adminLoginStorage"
import { useAuthSession } from "../authSession"
import SignInMessage from "../SignInMessage"
import useLoginRedirect from "../useLoginRedirect"
import { RoutePaths } from "../../routePaths"

/**
 * The `/:publicUrlSegment/admin` route. Lets the user choose a sign-in
 * method and signs them in, then returns them to the CV, where the edit
 * action appears if they may edit it.
 *
 * @returns A redirect to the CV once signed in, otherwise the sign-in screen.
 */
export default function AdminLoginRoute(): JSX.Element {
  const { publicUrlSegment = "" } = useParams()
  const { isSignedIn, isBusy } = useAuthSession()
  const navigate = useNavigate()

  const loginRedirect = useLoginRedirect({
    enabled: Boolean(publicUrlSegment),
    redirectPath: RoutePaths.CandidateAdmin(publicUrlSegment),
    storageKey: returnPublicUrlSegmentKey,
    storageValue: publicUrlSegment,
  })

  if (publicUrlSegment && !isBusy && isSignedIn) {
    return (
      <Navigate to={RoutePaths.CandidateProfile(publicUrlSegment)} replace />
    )
  }

  return (
    <SignInMessage
      {...loginRedirect}
      title={
        <>
          Sign in to manage <code>{publicUrlSegment}</code>
        </>
      }
      description="Use the method you created your CV with."
      pendingTitle={
        <>
          Signing in to manage <code>{publicUrlSegment}</code>
        </>
      }
      backLabel="Back to CV"
      onBack={() =>
        navigate(RoutePaths.CandidateProfile(publicUrlSegment), {
          replace: true,
        })
      }
    />
  )
}
