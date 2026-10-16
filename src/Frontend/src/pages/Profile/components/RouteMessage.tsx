import type { JSX, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { primaryButton, secondaryButton } from "../../components/buttonStyles"
import { RoutePaths } from "../../../routePaths"

interface RouteMessageProps {
  children: ReactNode
  description?: ReactNode
  tone?: "neutral" | "error"
  showHomeButton?: boolean
  onRetry?: () => void
}

export default function RouteMessage({
  children,
  description,
  tone = "neutral",
  showHomeButton = true,
  onRetry,
}: RouteMessageProps): JSX.Element {
  const navigate = useNavigate()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center">
      <div className="grid max-w-xl justify-items-start gap-8">
        <p className="flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          <span
            aria-hidden="true"
            className={`size-2 rounded-full ${tone === "error" ? "bg-cv-danger" : "bg-cv-accent"}`}
          />
          MyCV
        </p>
        <div
          role={tone === "error" ? "alert" : "status"}
          className="grid gap-4"
        >
          <h1 className="m-0 font-cv-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl [&_code]:rounded-md [&_code]:bg-cv-overlay [&_code]:px-2 [&_code]:py-0.5 [&_code]:font-cv-mono [&_code]:text-[0.7em] [&_code]:font-normal [&_code]:text-cv-accent">
            {children}
          </h1>
          {description && (
            <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-pretty text-cv-copy">
              {description}
            </p>
          )}
        </div>
        {(onRetry || showHomeButton) && (
          <div className="flex flex-wrap gap-3">
            {onRetry && (
              <button type="button" onClick={onRetry} className={primaryButton}>
                Try again
              </button>
            )}
            {showHomeButton && (
              <button
                type="button"
                onClick={() => navigate(RoutePaths.Home)}
                className={secondaryButton}
              >
                Open a CV
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
