import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, useRef, type JSX } from "react"
import { useNavigate } from "react-router-dom"
import {
  clearLoginReturnPaths,
  returnPublicUrlSegmentKey,
  returnAdminPathKey,
} from "../adminLoginStorage"
import { RoutePaths } from "../../routePaths"

export default function AuthCallbackRoute(): JSX.Element {
  const { accounts, inProgress, instance } = useMsal()
  const navigate = useNavigate()
  const hasNavigated = useRef(false)

  useEffect(() => {
    if (inProgress !== InteractionStatus.None || hasNavigated.current) {
      return
    }

    const publicUrlSegment = sessionStorage.getItem(returnPublicUrlSegmentKey)
    const returnAdminPath = sessionStorage.getItem(returnAdminPathKey)
    clearLoginReturnPaths()

    if (accounts[0]) {
      instance.setActiveAccount(accounts[0])
    }

    const destination =
      accounts[0] && returnAdminPath === RoutePaths.AdminCreateProfile
        ? RoutePaths.AdminCreateProfile
        : accounts[0] && publicUrlSegment
          ? RoutePaths.CandidateProfile(publicUrlSegment)
          : RoutePaths.Home
    navigate(destination, { replace: true })
    hasNavigated.current = true
  }, [accounts, inProgress, instance, navigate])

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl content-center gap-3 px-6 text-cv-copy">
      <p role="status">Completing Microsoft sign-in…</p>
    </main>
  )
}
