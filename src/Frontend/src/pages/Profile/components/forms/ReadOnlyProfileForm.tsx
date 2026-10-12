import { m as motion, type Variants } from "framer-motion"
import { useId, useState, type JSX } from "react"
import type { Profile } from "../../../../api/profileQueries"
import RHFInput from "../../../components/RHFInput"
import {
  externalLinkArrow,
  primaryButton,
  secondaryButton,
} from "../../../components/buttonStyles"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import { formatProfileDate, getInitials } from "../../utils/profileFormUtils"
import ProfilePortrait from "../ProfilePortrait"

interface ReadOnlyProfileFormProps {
  values: Profile
  onEdit?: () => void
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

function ExpandableSummary({ text }: { text: string }): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
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
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 min-h-11 text-sm font-medium text-cv-accent underline decoration-cv-accent/50 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  )
}

export default function ReadOnlyProfileForm({
  values,
  onEdit,
}: ReadOnlyProfileFormProps): JSX.Element {
  const updatedAt = formatProfileDate(values.updatedAt ?? values.createdAt)
  const hasActions = Boolean(values.gitHubUrl || values.linkedInUrl || onEdit)

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
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-cv-accent"
          />
          Curriculum vitae
          {updatedAt && (
            <span className="text-cv-meta normal-case tracking-normal">
              · Updated {updatedAt}
            </span>
          )}
        </motion.p>
        <motion.h1
          variants={item}
          dir="auto"
          className="mt-8 font-cv-display text-[clamp(3rem,8.5vw,7rem)] leading-[0.95] font-semibold tracking-tighter text-balance wrap-anywhere"
        >
          <RHFInput<ProfileSchema>
            name="fullName"
            label="Full name"
            isEditing={false}
            className="block bg-linear-to-b from-cv-ink to-cv-muted bg-clip-text pt-[0.15em] pb-[0.08em] text-transparent print:bg-none print:text-cv-ink forced-colors:bg-none forced-colors:text-[CanvasText]"
          />
        </motion.h1>
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
        {hasActions && (
          <motion.div variants={item} className="mt-10 flex flex-wrap gap-3">
            <RHFInput<ProfileSchema>
              name="gitHubUrl"
              label="GitHub"
              isEditing={false}
              link
              displayLabel="GitHub"
              linkClassName={`${primaryButton} ${externalLinkArrow}`}
            />
            <RHFInput<ProfileSchema>
              name="linkedInUrl"
              label="LinkedIn"
              isEditing={false}
              link
              displayLabel="LinkedIn"
              linkClassName={`${secondaryButton} ${externalLinkArrow}`}
            />
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className={`${secondaryButton} border-dashed`}
              >
                Edit profile
              </button>
            )}
          </motion.div>
        )}
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
