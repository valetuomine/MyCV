import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, type JSX } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { isEntraConfigured } from "../entraAuth"
import { returnPublicUrlSegmentKey } from "../adminLoginStorage"
import useEntraLoginRedirect from "../useEntraLoginRedirect"
import { RoutePaths } from "../../routePaths"

export default function AdminLoginRoute(): JSX.Element {
  const { publicUrlSegment } = useParams()
  const { accounts, inProgress } = useMsal()
  const navigate = useNavigate()
  const { signInError } = useEntraLoginRedirect({
    enabled: Boolean(publicUrlSegment),
    redirectPath: RoutePaths.CandidateProfile(publicUrlSegment ?? ""),
    storageKey: returnPublicUrlSegmentKey,
    storageValue: publicUrlSegment ?? "",
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

  const message = !isEntraConfigured
    ? "Entra sign-in is not configured for this deployment."
    : signInError
      ? "Sign-in could not be started. Please try again."
      : "Redirecting to Microsoft sign-in…"

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-3 px-6 text-cv-copy">
      <p role={signInError || !isEntraConfigured ? "alert" : "status"}>
        {message}
      </p>
    </main>
  )
}
