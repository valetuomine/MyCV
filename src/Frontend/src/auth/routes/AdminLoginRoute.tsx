import { type JSX } from "react"
import { Trans, useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
        <Trans
          i18nKey="signIn.manageTitle"
          values={{ cv: publicUrlSegment }}
          components={{ code: <code /> }}
        />
      }
      description={t("signIn.manageDescription")}
      pendingTitle={
        <Trans
          i18nKey="signIn.managePending"
          values={{ cv: publicUrlSegment }}
          components={{ code: <code /> }}
        />
      }
      backLabel={t("common.backToCv")}
      onBack={() =>
        navigate(RoutePaths.CandidateProfile(publicUrlSegment), {
          replace: true,
        })
      }
    />
  )
}
