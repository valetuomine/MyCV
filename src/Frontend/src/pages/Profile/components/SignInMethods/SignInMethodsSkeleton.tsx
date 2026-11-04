import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import useSkeletonTiming from "../useSkeletonTiming"

/**
 * Two placeholder rows while the sign-in methods load. They stay invisible
 * for 300 ms and then fade in, so a quick load never flashes them, and share
 * the skeleton shimmer; screen readers hear the status at once.
 *
 * @returns The busy placeholder.
 */
export default function SignInMethodsSkeleton(): JSX.Element {
  const { t } = useTranslation()
  const timing = useSkeletonTiming()

  return (
    <div aria-busy="true">
      <span className="sr-only">{t("signInMethods.loading")}</span>
      <div
        aria-hidden="true"
        style={timing}
        className="grid animate-cv-fade-in-delayed gap-3"
      >
        <div className="h-14 rounded-lg cv-skeleton" />
        <div className="h-14 rounded-lg cv-skeleton" />
      </div>
    </div>
  )
}
