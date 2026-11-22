import { AnimatePresence, m as motion, type Variants } from "framer-motion"
import { useId, useRef, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import {
  getProfilePictureUrl,
  type Profile,
} from "../../../../api/profileQueries"
import { Brand, ButtonVariant, type LanguageCode } from "../../../../types"
import BrandIcon from "../../../components/BrandIcon"
import Button from "../../../components/Button"
import CopyLinkButton from "../../../components/CopyLinkButton"
import Eyebrow from "../../../components/Eyebrow"
import LanguageFlag from "../../../components/LanguageFlag"
import Magnetic from "../../../components/Magnetic"
import {
  formatProfileDate,
  getInitials,
  toExternalUrl,
} from "../../utils/profileFormUtils"
import LocationIcon from "../LocationIcon"
import MissingLanguageNotice from "../MissingLanguageNotice"
import ProfileName from "../ProfileName"
import ProfilePortrait from "../ProfilePortrait"

interface ReadOnlyProfileFormProps {
  values: Profile
  onEdit?: (language?: LanguageCode) => void
  focusEdit?: boolean
  pdfPath?: string
  fallbackLanguage?: LanguageCode
  missingLanguages?: readonly LanguageCode[]
  onCloseMissingLanguages?: () => void
}

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
}

/**
 * The profile summary, clamped to six lines with a Read more toggle when long.
 *
 * @param props - The component props.
 * @param props.text - The summary.
 * @returns The summary with its toggle.
 */
function ExpandableSummary({ text }: Readonly<{ text: string }>): JSX.Element {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  /** Summaries over 300 characters start clamped. */
  const isLong = text.length > 300

  return (
    <div className="mt-4 grid max-w-[52ch] justify-items-start">
      <p
        id={id}
        dir="auto"
        className={`m-0 text-lg leading-relaxed whitespace-pre-line text-pretty text-cv-copy wrap-anywhere ${isLong && !expanded ? "line-clamp-6" : ""}`}
      >
        {text}
      </p>
      {isLong && (
        <Button
          variant={ButtonVariant.Text}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((current) => !current)}
          className="mt-1"
        >
          {expanded ? t("cv.showLess") : t("cv.readMore")}
        </Button>
      )}
    </div>
  )
}

/**
 * The CV: name, title, location, summary, links and portrait, entering one
 * after another. With a mouse, the actions lean toward the pointer. Coming
 * back from editing, focus returns to the Edit profile button that started it:
 * the CV mounts again then, so the button's `autoFocus` applies.
 * When the owner hides the picture section, the portrait and its initials are
 * left out and the text takes the whole width, capped so its lines stay
 * readable. When the CV has no translation in the UI language, its content
 * shows in the default language, with a quiet note under the eyebrow saying
 * so in the UI language. The owner's Edit profile sits on its own row under
 * the visitors' actions, so the rows break the same way in every language
 * rather than by the length of the labels. Under it, the owner sees the
 * notice about the CV's missing language versions; when the notice closes,
 * focus moves to Edit profile, so it isn't lost with the notice.
 *
 * @param props - The component props.
 * @param props.values - The public profile.
 * @param props.onEdit - Enters edit mode, in the given language or the
 *   default one; the Edit profile button shows only when given.
 * @param props.focusEdit - Whether to focus Edit profile, after editing.
 * @param props.pdfPath - The path of the CV's PDF view; the View as PDF link
 *   shows only when given.
 * @param props.fallbackLanguage - The language the content fell back to,
 *   when the CV has no translation in the UI language; the note shows only
 *   when given.
 * @param props.missingLanguages - The language versions the owner's CV
 *   lacks; the notice about them shows only when there are some and
 *   `onEdit` is given.
 * @param props.onCloseMissingLanguages - Hides the missing-language notice.
 * @returns The CV.
 */
export default function ReadOnlyProfileForm({
  values,
  onEdit,
  focusEdit = false,
  pdfPath,
  fallbackLanguage,
  missingLanguages = [],
  onCloseMissingLanguages,
}: Readonly<ReadOnlyProfileFormProps>): JSX.Element {
  const { t, i18n } = useTranslation()
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const publicUrl = `${window.location.origin}${window.location.pathname}`
  /** When the profile last changed, falling back to when it was created. */
  const updatedAt = formatProfileDate(
    values.updatedAt ?? values.createdAt,
    i18n.language,
  )
  /** Whether the owner shows the portrait; profiles from before the choice do. */
  const showPortrait = values.showPicture !== false

  /** Hides the missing-language notice and moves focus to Edit profile. */
  const closeMissingLanguages = (): void => {
    onCloseMissingLanguages?.()
    editButtonRef.current?.focus()
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className={`grid w-full grid-cols-[minmax(0,1fr)] items-center gap-14 lg:gap-16 ${showPortrait ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" : ""}`}
    >
      <section
        data-cv-trace-avoid
        className={`@container grid min-w-0 grid-cols-[minmax(0,1fr)] content-center justify-items-start ${showPortrait ? "" : "max-w-5xl"}`}
      >
        <Eyebrow
          variants={item}
          pulse
          meta={updatedAt ? t("cv.updated", { date: updatedAt }) : undefined}
        >
          {t("cv.eyebrow")}
        </Eyebrow>
        {fallbackLanguage && (
          <motion.p
            variants={item}
            className="mt-3 mb-0 flex items-center gap-2 text-sm text-cv-muted"
          >
            <LanguageFlag language={fallbackLanguage} />
            {t(`cv.onlyAvailableIn.${fallbackLanguage}`)}
          </motion.p>
        )}
        <ProfileName fullName={values.fullName ?? ""} />
        {values.title && (
          <motion.p
            variants={item}
            dir="auto"
            className="mt-6 font-cv-profile text-xl font-medium tracking-tight wrap-anywhere text-cv-accent-strong sm:text-2xl"
          >
            {values.title}
          </motion.p>
        )}
        {values.location && (
          <motion.p
            variants={item}
            dir="auto"
            className="mt-2 flex items-start gap-2 text-base text-cv-muted"
          >
            <LocationIcon className="mt-1 size-4 shrink-0" />
            {values.location}
          </motion.p>
        )}
        {values.summary && (
          <motion.div variants={item} className="min-w-0">
            <ExpandableSummary text={values.summary} />
          </motion.div>
        )}
        <motion.div
          variants={item}
          className="mt-10 grid justify-items-start gap-3"
        >
          <div className="flex flex-wrap items-start gap-3">
            <CopyLinkButton url={publicUrl} label={t("cv.copyLink")} magnetic />
            {pdfPath && (
              <Magnetic>
                <Button to={pdfPath}>{t("cv.viewPdf")}</Button>
              </Magnetic>
            )}
            {values.gitHubUrl && (
              <Magnetic>
                <Button
                  variant={ButtonVariant.Primary}
                  href={toExternalUrl(values.gitHubUrl)}
                >
                  <BrandIcon brand={Brand.GitHub} />
                  GitHub
                </Button>
              </Magnetic>
            )}
            {values.linkedInUrl && (
              <Magnetic>
                <Button href={toExternalUrl(values.linkedInUrl)}>
                  <BrandIcon brand={Brand.LinkedIn} />
                  LinkedIn
                </Button>
              </Magnetic>
            )}
          </div>
          {onEdit && (
            <Magnetic>
              <Button
                ref={editButtonRef}
                autoFocus={focusEdit}
                onClick={() => onEdit()}
                className="border-dashed"
              >
                {t("cv.editProfile")}
              </Button>
            </Magnetic>
          )}
          <AnimatePresence>
            {onEdit && missingLanguages.length > 0 && (
              <MissingLanguageNotice
                key="missing-language"
                languages={missingLanguages}
                onEditLanguage={onEdit}
                onClose={closeMissingLanguages}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </section>
      {showPortrait && (
        <motion.div
          variants={item}
          className="w-full max-w-md lg:justify-self-end"
        >
          <ProfilePortrait
            fullName={values.fullName}
            initials={getInitials(values.fullName)}
            imageUrl={getProfilePictureUrl(values.pictureUrl)}
          />
        </motion.div>
      )}
    </motion.div>
  )
}
