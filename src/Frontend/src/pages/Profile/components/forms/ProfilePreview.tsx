import { m as motion } from "framer-motion"
import type { JSX } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Brand } from "../../../../types"
import BrandIcon from "../../../components/BrandIcon"
import Eyebrow from "../../../components/Eyebrow"
import LitCard from "../../../components/LitCard"
import { paneReveal } from "../../../components/reveal"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import { useFormLanguage } from "./formLanguageContext"

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"

/**
 * Shows the CV in the language being edited as it will look while the form
 * is being filled in, named by that language above the card. It
 * repeats what the fields already say, so it is hidden from assistive tech.
 * The name is set in the CV name's script, with room round the background-
 * clipped text for its swashes and descenders.
 *
 * The card is a `LitCard`, so it lights up like the form's fields, and its
 * drifting light also runs while any field of the edit form has focus, so
 * the card wakes while the profile is edited. It takes its turn in the edit
 * form's entrance with the pane-safe fade (`paneReveal`), so the eyebrow and
 * the card's layers fade while the card's blur stays on.
 *
 * @returns The preview card, shown on large screens.
 */
export default function ProfilePreview(): JSX.Element {
  const { t } = useTranslation()
  const { control } = useFormContext<ProfileSchema>()
  const { activeLanguage } = useFormLanguage()
  const [fullName, translations, gitHubUrl, linkedInUrl] = useWatch({
    control,
    name: ["fullName", "translations", "gitHubUrl", "linkedInUrl"],
  })
  /** The translation in the language being edited. */
  const translation = translations?.find(
    ({ languageCode }) => languageCode === activeLanguage,
  )
  const title = translation?.title
  const location = translation?.location
  const summary = translation?.summary

  return (
    <motion.aside
      variants={paneReveal}
      aria-hidden="true"
      className="sticky top-24 hidden self-start lg:block"
    >
      <div className="opacity-reveal">
        <Eyebrow meta={t(`profileFields.languageLabels.${activeLanguage}`)}>
          {t("profileForm.livePreview")}
        </Eyebrow>
      </div>
      <LitCard
        className="mt-5"
        contentClassName="grid justify-items-start p-8"
        wakesWithEditForm
      >
        <p
          dir="auto"
          className={`m-0 -mx-[0.35em] px-[0.35em] pt-[0.3em] pb-[0.35em] font-cv-name text-[3.25rem] leading-[1.1] font-normal text-balance wrap-anywhere ${fullName?.trim() ? "bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text text-transparent" : "text-cv-meta"}`}
        >
          {fullName?.trim() || t("profileForm.previewName")}
        </p>
        {title?.trim() && (
          <p
            dir="auto"
            className="mt-4 mb-0 font-cv-profile text-lg font-medium tracking-tight wrap-anywhere text-cv-accent"
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
                <BrandIcon brand={Brand.GitHub} />
                GitHub ↗
              </span>
            )}
            {linkedInUrl?.trim() && (
              <span className={`${pill} border border-cv-line text-cv-ink`}>
                <BrandIcon brand={Brand.LinkedIn} />
                LinkedIn ↗
              </span>
            )}
          </div>
        )}
      </LitCard>
    </motion.aside>
  )
}
