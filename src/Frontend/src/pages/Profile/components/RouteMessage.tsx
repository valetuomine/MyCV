import type { JSX, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import Button from "../../components/Button"
import { RoutePaths } from "../../../routePaths"
import { ButtonVariant, Tone } from "../../../types"

interface RouteMessageProps {
  children: ReactNode
  description?: ReactNode
  tone?: Tone
  showHomeButton?: boolean
  onRetry?: () => void
  actions?: ReactNode
  delayed?: boolean
}

/**
 * A full-page message for loading, empty and error states. Shows the given
 * actions, or a retry and an Open a CV button. Errors are announced as
 * alerts, everything else as status.
 *
 * @param props - The component props.
 * @param props.children - The heading.
 * @param props.description - Text under the heading.
 * @param props.tone - Neutral, pending with a loader, or error.
 * @param props.showHomeButton - Whether to offer Open a CV.
 * @param props.onRetry - Shows Try again when given.
 * @param props.actions - Buttons that replace the default ones.
 * @param props.delayed - Whether to fade in late, so quick loads don't flash.
 * @returns The full-page message.
 */
export default function RouteMessage({
  children,
  description,
  tone = Tone.Neutral,
  showHomeButton = true,
  onRetry,
  actions,
  delayed = false,
}: RouteMessageProps): JSX.Element {
  const { t } = useTranslation()
  /** Red for errors, accent otherwise. */
  const dotColor = tone === Tone.Error ? "bg-cv-danger" : "bg-cv-accent"
  /** Pending screens are centred so the loader is the focal point. */
  const isPending = tone === Tone.Pending

  return (
    <main
      aria-busy={isPending ? true : undefined}
      className={`mx-auto flex min-h-dvh w-full max-w-6xl items-center ${isPending ? "justify-center" : ""}`}
    >
      <div
        className={`grid max-w-xl gap-8 ${isPending ? "justify-items-center text-center" : "justify-items-start"} ${delayed ? "animate-cv-fade-in-delayed" : ""}`}
      >
        <p className="flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          <span aria-hidden="true" className="relative grid size-2">
            {isPending && (
              <span
                className={`absolute inset-0 animate-cv-pulse rounded-full ${dotColor} motion-reduce:hidden`}
              />
            )}
            <span className={`relative size-2 rounded-full ${dotColor}`} />
          </span>
          MyCV
        </p>
        {isPending && (
          <span
            aria-hidden="true"
            className="relative grid size-24 place-items-center"
          >
            <span className="absolute -inset-10 bg-cv-glow opacity-20" />
            <span className="absolute inset-0 rounded-full border-4 border-cv-field/40" />
            <span className="absolute inset-0 animate-cv-spin motion-reduce:animate-cv-spin-slow">
              <span className="absolute inset-0 rounded-full bg-cv-orbit" />
              <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-cv-accent shadow-cv-accent" />
            </span>
            <span className="size-3.5 rounded-full bg-cv-accent" />
          </span>
        )}
        <div
          role={tone === Tone.Error ? "alert" : "status"}
          className="grid gap-4"
        >
          <h1 className="m-0 font-cv-display text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl [&_code]:rounded-md [&_code]:bg-cv-overlay [&_code]:px-2 [&_code]:py-0.5 [&_code]:font-cv-mono [&_code]:text-[0.7em] [&_code]:font-normal [&_code]:text-cv-accent">
            {children}
          </h1>
          {description && (
            <p
              className={`m-0 max-w-[52ch] text-lg leading-relaxed text-pretty text-cv-copy ${isPending ? "justify-self-center" : ""}`}
            >
              {description}
            </p>
          )}
        </div>
        {actions ? (
          <div
            className={`flex flex-wrap gap-3 ${isPending ? "justify-center" : ""}`}
          >
            {actions}
          </div>
        ) : (
          (onRetry || showHomeButton) && (
            <div className="flex flex-wrap gap-3">
              {onRetry && (
                <Button variant={ButtonVariant.Primary} onClick={onRetry}>
                  {t("common.tryAgain")}
                </Button>
              )}
              {showHomeButton && (
                <Button to={RoutePaths.Home}>{t("common.openCv")}</Button>
              )}
            </div>
          )
        )}
      </div>
    </main>
  )
}
