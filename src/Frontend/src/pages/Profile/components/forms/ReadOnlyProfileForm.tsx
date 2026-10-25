import { m as motion, type Variants } from "framer-motion"
import { useEffect, useId, useRef, useState, type JSX } from "react"
import type { Profile } from "../../../../api/profileQueries"
import { ButtonVariant } from "../../../../types"
import Button from "../../../components/Button"
import CopyLinkButton from "../../../components/CopyLinkButton"
import {
  formatProfileDate,
  getInitials,
  toExternalUrl,
} from "../../utils/profileFormUtils"
import ProfileName from "../ProfileName"
import ProfilePortrait from "../ProfilePortrait"

interface ReadOnlyProfileFormProps {
  values: Profile
  onEdit?: () => void
  focusEdit?: boolean
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
function ExpandableSummary({ text }: { text: string }): JSX.Element {
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
          {expanded ? "Show less" : "Read more"}
        </Button>
      )}
    </div>
  )
}

/**
 * The CV: name, title, location, summary, links and portrait, entering one
 * after another. Coming back from editing, focus returns to the Edit profile
 * button that started it.
 *
 * @param props - The component props.
 * @param props.values - The public profile.
 * @param props.onEdit - Enters edit mode; the Edit profile button shows only
 *   when given.
 * @param props.focusEdit - Whether to focus Edit profile, after editing.
 * @returns The CV.
 */
export default function ReadOnlyProfileForm({
  values,
  onEdit,
  focusEdit = false,
}: ReadOnlyProfileFormProps): JSX.Element {
  const editButtonRef = useRef<HTMLButtonElement>(null)
  const publicUrl = `${window.location.origin}${window.location.pathname}`
  /** When the profile last changed, falling back to when it was created. */
  const updatedAt = formatProfileDate(values.updatedAt ?? values.createdAt)
  /** Whether there is a profile link or an edit action to show. */
  const hasActions = Boolean(values.gitHubUrl || values.linkedInUrl || onEdit)

  useEffect(() => {
    if (focusEdit) {
      editButtonRef.current?.focus()
    }
  }, [focusEdit])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid w-full grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16"
    >
      <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-center justify-items-start">
        <motion.p
          variants={item}
          className="flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase"
        >
          <span aria-hidden="true" className="relative grid size-2">
            <span className="absolute inset-0 animate-cv-pulse rounded-full bg-cv-accent motion-reduce:hidden print:hidden" />
            <span className="relative size-2 rounded-full bg-cv-accent" />
          </span>
          Curriculum vitae
          {updatedAt && (
            <span className="text-cv-meta normal-case tracking-normal">
              Updated {updatedAt}
            </span>
          )}
        </motion.p>
        <ProfileName fullName={values.fullName ?? ""} />
        {values.title && (
          <motion.p
            variants={item}
            dir="auto"
            className="mt-6 font-cv-display text-xl font-medium tracking-tight text-cv-accent sm:text-2xl"
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
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mt-1 size-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
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
          className="mt-10 flex flex-wrap items-start gap-3"
        >
          <CopyLinkButton url={publicUrl} label="Copy CV link" />
          {hasActions && (
            <>
              {values.gitHubUrl && (
                <Button
                  variant={ButtonVariant.Primary}
                  href={toExternalUrl(values.gitHubUrl)}
                >
                  GitHub
                </Button>
              )}
              {values.linkedInUrl && (
                <Button href={toExternalUrl(values.linkedInUrl)}>
                  LinkedIn
                </Button>
              )}
              {onEdit && (
                <Button
                  ref={editButtonRef}
                  onClick={onEdit}
                  className="border-dashed"
                >
                  Edit profile
                </Button>
              )}
            </>
          )}
        </motion.div>
      </section>
      <motion.div
        variants={item}
        className="w-full max-w-md lg:justify-self-end"
      >
        <ProfilePortrait
          fullName={values.fullName}
          initials={getInitials(values.fullName)}
        />
      </motion.div>
    </motion.div>
  )
}
