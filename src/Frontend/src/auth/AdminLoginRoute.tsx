import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, useRef, useState, type JSX } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { apiScope, isEntraConfigured, redirectUri } from "./entraAuth"

const returnCandidateKey = "mycv-admin-return-candidate"

export default function AdminLoginRoute(): JSX.Element {
  const { candidateId } = useParams()
  const { accounts, inProgress, instance } = useMsal()
  const navigate = useNavigate()
  const redirectStarted = useRef(false)
  const [signInError, setSignInError] = useState(false)

  useEffect(() => {
    if (!candidateId || inProgress !== InteractionStatus.None) {
      return
    }

    if (accounts[0]) {
      navigate(`/${encodeURIComponent(candidateId)}`, { replace: true })
      return
    }

    if (!isEntraConfigured || redirectStarted.current) {
      return
    }

    redirectStarted.current = true
    sessionStorage.setItem(returnCandidateKey, candidateId)
    void instance
      .loginRedirect({
        scopes: [apiScope],
        redirectUri,
        redirectStartPage: `${window.location.origin}/${encodeURIComponent(candidateId)}`,
      })
      .catch(() => {
        sessionStorage.removeItem(returnCandidateKey)
        setSignInError(true)
      })
  }, [accounts, candidateId, inProgress, instance, navigate])

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

export { returnCandidateKey }
