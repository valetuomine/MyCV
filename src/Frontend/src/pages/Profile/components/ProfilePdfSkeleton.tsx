import type { JSX } from "react"
import { useTranslation } from "react-i18next"

interface ProfilePdfSkeletonProps {
  pulsing: boolean
}

/**
 * The PDF's first page in miniature, with a line saying that the PDF is on its
 * way. The page shrinks with the frame on short screens, whose height it takes
 * from the frame's `80dvh` minus the text and padding. It fades in late, so a
 * quick load never flashes it, and pulses only for users who accept motion.
 * Screen readers hear the frame's status instead, so it is hidden from them.
 *
 * @param props - The component props.
 * @param props.pulsing - Whether the bars pulse; off once the viewer covers them.
 * @returns The indicator, filling its positioned parent.
 */
export default function ProfilePdfSkeleton({
  pulsing,
}: ProfilePdfSkeletonProps): JSX.Element {
  const { t } = useTranslation()
  /** One placeholder bar, which stops pulsing once nothing shows it. */
  const bar = `rounded-full bg-cv-overlay ${pulsing ? "motion-safe:animate-pulse" : ""}`

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 grid animate-cv-fade-in-delayed place-content-center justify-items-center gap-6 p-8 text-center"
    >
      <div className="grid aspect-[1/1.414] h-[min(12.75rem,calc(80dvh-9rem))] content-start gap-2 overflow-hidden rounded-lg border border-cv-line bg-cv-wash p-4">
        <div className={`${bar} h-1 w-1/3`} />
        <div className={`${bar} h-2.5 w-4/5`} />
        <div className={`${bar} h-1.5 w-1/2`} />
        <div className="my-1 h-px bg-cv-line" />
        <div className={`${bar} h-1 w-1/4`} />
        <div className={`${bar} h-1 w-full`} />
        <div className={`${bar} h-1 w-11/12`} />
      </div>
      <div className="grid gap-1">
        <p className="m-0 text-lg leading-relaxed text-pretty text-cv-copy">
          {t("pdf.preparing")}
        </p>
        <p className="m-0 text-sm text-pretty text-cv-muted">
          {t("pdf.preparingHint")}
        </p>
      </div>
    </div>
  )
}
