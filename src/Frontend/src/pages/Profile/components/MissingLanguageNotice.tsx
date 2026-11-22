import { m as motion, type Transition } from "framer-motion"
import { useId, useRef, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { useHideMissingLanguageNoticeMutation } from "../../../api/candidateQueries"
import { ButtonSize, ButtonVariant, type LanguageCode } from "../../../types"
import Button from "../../components/Button"
import LanguageFlag from "../../components/LanguageFlag"

interface MissingLanguageNoticeProps {
  languages: readonly LanguageCode[]
  onEditLanguage: (language: LanguageCode) => void
  onClose: () => void
}

const enterTransition: Transition = {
  duration: 0.25,
  ease: [0.23, 1, 0.32, 1],
}

const exitTransition: Transition = {
  duration: 0.15,
  ease: [0.23, 1, 0.32, 1],
}

/**
 * Tells the CV's owner which language versions their CV lacks, with a way
 * to add each one, a close button and Don't show again. The close button
 * only hides it until the next page load; Don't show again saves the choice
 * through the API, so it holds on every device, and closes the notice once
 * saved. When saving fails, the notice stays with the error, announced to
 * screen readers. Once saved, it closes and moves focus on only while
 * focus is still inside it, so a user who has moved on stays where they
 * are. The region is named by its message, so a screen reader
 * user who lands in it hears what it is about. It rises in briefly and
 * leaves faster than it came; reduced motion keeps only the fade.
 *
 * @param props - The component props.
 * @param props.languages - The missing languages, at least one.
 * @param props.onEditLanguage - Opens the edit view in a language.
 * @param props.onClose - Hides the notice and moves focus out of it.
 * @returns The notice.
 */
export default function MissingLanguageNotice({
  languages,
  onEditLanguage,
  onClose,
}: Readonly<MissingLanguageNoticeProps>): JSX.Element {
  const { t, i18n } = useTranslation()
  const messageId = useId()
  const sectionRef = useRef<HTMLElement>(null)
  const [hideNotice, hideState] = useHideMissingLanguageNoticeMutation()
  /** The missing languages' names in the UI language, joined as a list. */
  const languageList = new Intl.ListFormat(i18n.language, {
    type: "conjunction",
  }).format(languages.map((code) => t(`cv.missingLanguage.names.${code}`)))

  /**
   * Saves Don't show again, and once it is saved closes the notice while
   * focus is still in it; otherwise the saved choice hides it without
   * moving focus.
   */
  const hideForGood = async (): Promise<void> => {
    const result = await hideNotice()
    if (!result.error && sectionRef.current?.contains(document.activeElement)) {
      onClose()
    }
  }

  return (
    <motion.section
      ref={sectionRef}
      aria-labelledby={messageId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: enterTransition }}
      exit={{ opacity: 0, y: 4, transition: exitTransition }}
      className="relative grid w-full max-w-xl gap-4 rounded-3xl border border-cv-line bg-cv-pane p-5 pr-16 inset-shadow-cv-rim"
    >
      <div className="grid gap-1">
        <p
          id={messageId}
          className="m-0 flex items-baseline gap-2.5 text-base font-medium text-pretty text-cv-ink"
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 -translate-y-0.5 rounded-full bg-cv-accent"
          />
          {t("cv.missingLanguage.message", {
            count: languages.length,
            languages: languageList,
          })}
        </p>
        <p className="m-0 pl-4.5 text-sm text-pretty text-cv-copy">
          {t("cv.missingLanguage.hint", { count: languages.length })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pl-4.5">
        {languages.map((code) => (
          <Button
            key={code}
            size={ButtonSize.Small}
            onClick={() => onEditLanguage(code)}
            className="gap-2"
          >
            <LanguageFlag language={code} />
            {t(`cv.missingLanguage.add.${code}`)}
          </Button>
        ))}
        <Button
          variant={ButtonVariant.Text}
          loading={hideState.isLoading}
          loadingText={t("cv.missingLanguage.hiding")}
          onClick={() => void hideForGood()}
        >
          {t("cv.missingLanguage.dontShowAgain")}
        </Button>
      </div>
      {hideState.isError && (
        <p role="alert" className="m-0 pl-4.5 text-sm text-cv-danger">
          {t("cv.missingLanguage.hideFailed")}
        </p>
      )}
      <div className="absolute top-3 right-3">
        <Button
          variant={ButtonVariant.Icon}
          size={ButtonSize.Small}
          aria-label={t("cv.missingLanguage.close")}
          onClick={onClose}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </Button>
      </div>
    </motion.section>
  )
}
