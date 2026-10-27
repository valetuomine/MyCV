import type { JSX } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import usePointerLight from "../../../components/usePointerLight"
import type { ProfileSchema } from "../../schemas/profile-form-schema"

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"

/**
 * Shows the Finnish CV as it will look while the form is being filled in. It
 * repeats what the fields already say, so it is hidden from assistive tech.
 *
 * The card lights up like the form's fields. With a mouse, a light follows
 * the pointer around its border and faintly tints the surface beneath the
 * text. While the card is hovered or any field of the edit form (the
 * `group/edit` around it) has focus, a soft light drifts slowly from side to
 * side inside it, and pauses where it is otherwise, so the card wakes while
 * the profile is edited. Touch gets no pointer light, and reduced motion
 * neither light.
 *
 * @returns The preview card, shown on large screens.
 */
export default function ProfilePreview(): JSX.Element {
  const { t } = useTranslation()
  const trackPointer = usePointerLight()
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
        {t("profileForm.livePreview")}
        <span className="text-cv-meta normal-case tracking-normal">
          {t("profileForm.previewLanguage")}
        </span>
      </p>
      <div
        onPointerEnter={trackPointer}
        onPointerMove={trackPointer}
        className="group/preview relative mt-5 overflow-hidden rounded-3xl bg-cv-line p-0.5 shadow-cv-panel"
      >
        <div className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[200%] -translate-1/2 bg-cv-sweep animate-cv-sweep motion-reduce:hidden" />
        <div className="pointer-events-none absolute inset-0 bg-cv-field-edge opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100 motion-reduce:hidden" />
        <div className="relative isolate grid justify-items-start rounded-[calc(1.5rem-2px)] bg-cv-surface p-8">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/preview:opacity-100 group-has-[[data-field-frame]:focus-within]/edit:opacity-100 motion-reduce:hidden">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-cv-field-drift animate-cv-drift [--drift-strength:10%] [animation-play-state:paused] group-hover/preview:[animation-play-state:running] group-has-[[data-field-frame]:focus-within]/edit:[animation-play-state:running]" />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-cv-field-glow opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100 motion-reduce:hidden" />
          <p
            dir="auto"
            className={`m-0 font-cv-display text-[2.75rem] leading-[0.95] font-semibold tracking-tighter text-balance wrap-anywhere ${fullName?.trim() ? "bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text pt-[0.15em] pb-[0.08em] text-transparent" : "text-cv-meta"}`}
          >
            {fullName?.trim() || t("profileForm.previewName")}
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
