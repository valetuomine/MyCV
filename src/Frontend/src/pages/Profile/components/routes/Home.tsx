import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
  type SubmitEvent,
} from "react"
import { Navigate, useNavigate } from "react-router-dom"
import {
  clearAuthReturnPaths,
  logoutReturnPublicUrlSegmentKey,
} from "../../../../auth/adminLoginStorage"
import { signedOutLocationState } from "../../../../auth/signedOutState"
import { primaryButton } from "../../../components/buttonStyles"
import { RoutePaths } from "../../../../routePaths"

/**
 * Accepts a bare public URL segment or a full CV link and returns the segment.
 *
 * @param input - What the visitor typed.
 * @returns The link's last path segment, or the input without slashes.
 */
function extractPublicUrlSegment(input: string): string {
  const value = input.trim()
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean)
    return segments[segments.length - 1] ?? ""
  } catch {
    return value.replace(/^\/+|\/+$/g, "")
  }
}

/**
 * The home page, where a visitor opens a CV by its link or public address.
 * It is also where the logout redirect lands: it returns to the CV the user
 * signed out from, or stays here, and flags the sign-out for the notice.
 *
 * @returns A redirect to the CV after sign-out, otherwise the home page.
 */
export default function Home(): JSX.Element {
  const navigate = useNavigate()
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [value, setValue] = useState("")
  const [error, setError] = useState<string>()

  /** Set by `SignOutButton`: the CV to return to, or "" to stay on Home. */
  const [logoutReturnSegment] = useState(() =>
    sessionStorage.getItem(logoutReturnPublicUrlSegmentKey),
  )
  const hasHandledLogout = useRef(false)

  useEffect(() => {
    clearAuthReturnPaths()
    if (logoutReturnSegment === "" && !hasHandledLogout.current) {
      hasHandledLogout.current = true
      navigate(RoutePaths.Home, {
        replace: true,
        state: signedOutLocationState,
      })
    }
  }, [logoutReturnSegment, navigate])

  if (logoutReturnSegment) {
    return (
      <Navigate
        to={RoutePaths.CandidateProfile(logoutReturnSegment)}
        replace
        state={signedOutLocationState}
      />
    )
  }

  /**
   * Updates the input and clears its error.
   *
   * @param event - The input's change.
   */
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value)
    setError(undefined)
  }

  /**
   * Opens the CV the input points to, or shows an error when it is empty.
   *
   * @param event - The form's submit.
   */
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const publicUrlSegment = extractPublicUrlSegment(value)
    if (!publicUrlSegment) {
      setError("Enter a CV link or public address.")
      return
    }

    navigate(RoutePaths.CandidateProfile(publicUrlSegment))
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center pt-20 pb-12 lg:pt-4">
      <div className="grid w-full max-w-xl justify-items-start gap-8">
        <p className="flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-cv-accent"
          />
          MyCV
        </p>
        <div className="grid gap-4">
          <h1 className="m-0 font-cv-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Open a CV
          </h1>
          <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-pretty text-cv-copy">
            Every CV has its own link. Paste a CV link or public address to view
            it.
          </p>
        </div>
        <form noValidate onSubmit={handleSubmit} className="grid w-full gap-2">
          <label
            htmlFor={inputId}
            className="font-cv-mono text-xs tracking-wide text-cv-muted uppercase"
          >
            CV link or address
          </label>
          <div className="flex flex-wrap gap-3">
            <input
              id={inputId}
              value={value}
              onChange={handleChange}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-cv-field bg-cv-wash px-3.5 py-2.5 text-cv-ink transition-colors outline-none placeholder:text-cv-meta hover:border-cv-muted focus:border-cv-accent focus:ring-3 focus:ring-cv-accent/20 aria-invalid:border-cv-danger aria-invalid:ring-cv-danger/20"
            />
            <button type="submit" className={primaryButton}>
              Open CV
            </button>
          </div>
          {error && (
            <span id={errorId} role="alert" className="text-sm text-cv-danger">
              {error}
            </span>
          )}
        </form>
      </div>
    </main>
  )
}
