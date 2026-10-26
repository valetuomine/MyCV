import type { JSX } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"

/**
 * Shows the Finnish CV as it will look while the form is being filled in. It
 * repeats what the fields already say, so it is hidden from assistive tech.
 *
 * @returns The preview card, shown on large screens.
 */
export default function ProfilePreview(): JSX.Element {
  const { control } = useFormContext<ProfileSchema>()
  const [fullName, title, location, summary, gitHubUrl, linkedInUrl] = useWatch(
    {
      control,
      name: [
        "fullName",
        "translations.0.title",
        "translations.0.location",
        "translations.0.summary",
        "gitHubUrl",
        "linkedInUrl",
      ],
    },
  )

  return (
    <aside
      aria-hidden="true"
      className="sticky top-24 hidden self-start lg:block"
    >
      <p className="m-0 flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
        <span className="size-2 rounded-full bg-cv-accent" />
        Live preview
        <span className="text-cv-meta normal-case tracking-normal">
          Finnish
        </span>
      </p>
      <div className="relative mt-5 overflow-hidden rounded-3xl bg-cv-line p-0.5 shadow-cv-panel">
        <div className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-1/2 bg-cv-sweep animate-cv-sweep motion-reduce:hidden" />
        <div className="relative grid justify-items-start rounded-[calc(1.5rem-2px)] bg-cv-surface p-8">
          <p
            dir="auto"
            className={`m-0 font-cv-display text-[2.75rem] leading-[0.95] font-semibold tracking-tighter text-balance wrap-anywhere ${fullName?.trim() ? "bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text pt-[0.15em] pb-[0.08em] text-transparent" : "text-cv-meta"}`}
          >
            {fullName?.trim() || "Your name"}
          </p>
          {title?.trim() && (
            <p
              dir="auto"
              className="mt-4 mb-0 font-cv-display text-lg font-medium tracking-tight text-cv-accent"
            >
              {title}
            </p>
          )}
          {location?.trim() && (
            <p dir="auto" className="mt-1 mb-0 text-sm text-cv-muted">
              {location}
            </p>
          )}
          {summary?.trim() && (
            <p
              dir="auto"
              className="mt-4 mb-0 line-clamp-5 text-sm leading-relaxed whitespace-pre-line text-pretty text-cv-copy wrap-anywhere"
            >
              {summary}
            </p>
          )}
          {(gitHubUrl?.trim() || linkedInUrl?.trim()) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {gitHubUrl?.trim() && (
                <span className={`${pill} bg-cv-accent text-cv-accent-ink`}>
                  GitHub ↗
                </span>
              )}
              {linkedInUrl?.trim() && (
                <span className={`${pill} border border-cv-line text-cv-ink`}>
                  LinkedIn ↗
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
