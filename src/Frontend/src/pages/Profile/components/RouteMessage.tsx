import type { JSX, ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { primaryButton, secondaryButton } from "../../components/buttonStyles"
import { RoutePaths } from "../../../routePaths"
import { Tone } from "../../../types"

interface RouteMessageProps {
  children: ReactNode
  description?: ReactNode
  tone?: Tone
  showHomeButton?: boolean
  onRetry?: () => void
  actions?: ReactNode
  delayed?: boolean
}

export default function RouteMessage({
  children,
  description,
  tone = Tone.Neutral,
  showHomeButton = true,
  onRetry,
  actions,
  delayed = false,
}: RouteMessageProps): JSX.Element {
  const navigate = useNavigate()
  const dotColor = tone === Tone.Error ? "bg-cv-danger" : "bg-cv-accent"

  return (
    <main
      aria-busy={tone === Tone.Pending ? true : undefined}
      className="mx-auto flex min-h-dvh w-full max-w-6xl items-center"
    >
      <div
        className={`grid max-w-xl justify-items-start gap-8 ${delayed ? "animate-cv-fade-in-delayed" : ""}`}
      >
        <p className="flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          <span aria-hidden="true" className="relative grid size-2">
            {tone === Tone.Pending && (
              <span
                className={`absolute inset-0 animate-cv-pulse rounded-full ${dotColor} motion-reduce:hidden`}
              />
            )}
            <span className={`relative size-2 rounded-full ${dotColor}`} />
          </span>
          MyCV
        </p>
        <div
          role={tone === Tone.Error ? "alert" : "status"}
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
        {actions ? (
          <div className="flex flex-wrap gap-3">{actions}</div>
        ) : (
          (onRetry || showHomeButton) && (
            <div className="flex flex-wrap gap-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={primaryButton}
                >
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
          )
        )}
      </div>
    </main>
  )
}
