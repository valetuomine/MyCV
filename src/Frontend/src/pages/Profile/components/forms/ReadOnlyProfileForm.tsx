import { m as motion, type Variants } from "framer-motion"
import { useEffect, useId, useState, type JSX } from "react"
import type { Profile } from "../../../../api/profileQueries"
import { CopyStatus } from "../../../../types"
import RHFInput from "../../../components/RHFInput"
import {
  externalLinkArrow,
  primaryButton,
  secondaryButton,
} from "../../../components/buttonStyles"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import { formatProfileDate, getInitials } from "../../utils/profileFormUtils"
import ProfileName from "../ProfileName"
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

const copiedResetMs = 2000

const swapLabel =
  "col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none"

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
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(CopyStatus.Idle)
  const publicUrl = `${window.location.origin}${window.location.pathname}`
  const updatedAt = formatProfileDate(values.updatedAt ?? values.createdAt)
  const hasActions = Boolean(values.gitHubUrl || values.linkedInUrl || onEdit)
  const isCopied = copyStatus === CopyStatus.Copied

  useEffect(() => {
    if (copyStatus !== CopyStatus.Copied) {
      return
    }

    const timeout = window.setTimeout(
      () => setCopyStatus(CopyStatus.Idle),
      copiedResetMs,
    )
    return () => window.clearTimeout(timeout)
  }, [copyStatus])

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyStatus(CopyStatus.Copied)
    } catch {
      setCopyStatus(CopyStatus.Error)
    }
  }

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
          <div className="grid justify-items-start gap-2">
            <button
              type="button"
              onClick={() => void copyPublicUrl()}
              className={secondaryButton}
            >
              {/* Both labels share one grid cell, so the button keeps its width. */}
              <span className="grid">
                <span
                  className={`${swapLabel} ${isCopied ? "-translate-y-2 opacity-0" : "opacity-100"}`}
                >
                  Copy CV link
                </span>
                <span
                  aria-hidden="true"
                  className={`${swapLabel} inline-flex items-center justify-center gap-1.5 text-cv-accent ${isCopied ? "opacity-100" : "translate-y-2 opacity-0"}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="m5 12.5 4.5 4.5L19 7.5"
                      pathLength={1}
                      className={`[stroke-dasharray:1] transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none ${isCopied ? "[stroke-dashoffset:0] delay-100" : "[stroke-dashoffset:1]"}`}
                    />
                  </svg>
                  Copied
                </span>
              </span>
            </button>
            <span role="status" className="sr-only">
              {isCopied ? "CV link copied to clipboard." : ""}
            </span>
            {copyStatus === CopyStatus.Error && (
              <p role="alert" className="m-0 max-w-52 text-sm text-cv-danger">
                Could not copy the CV link. Copy the page address from your
                browser.
              </p>
            )}
          </div>
          {hasActions && (
            <>
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
