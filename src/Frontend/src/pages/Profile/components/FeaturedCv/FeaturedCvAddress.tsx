import { m as motion } from "framer-motion"
import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import { RoutePaths } from "../../../../routePaths"
import CopyLinkButton from "../../../components/CopyLinkButton"
import FeaturedCvAddressSkeleton from "./FeaturedCvAddressSkeleton"
import { revealItem } from "../../../components/reveal"
import { featuredCvAddressFrameClassName } from "./featuredCvLayout"
import useFeaturedCv from "./useFeaturedCv"
import { FeaturedCvStatus } from "../../../../types"

/**
 * The featured CV's link in the home page's hero, shown as something to use
 * rather than as a technical address: a pill on the Pane with the edge glow,
 * the site's host in Muted and the CV's path in Ink, and beside it the Copy
 * link button. The pill's frame stays put from its skeleton on, and the
 * address rises in inside it once the CV has loaded (`revealItem`). A
 * long host is cut short first, and the path only once the host is gone, so
 * the address never spills out of the pill. The host shrinks a thousand times
 * faster than the path rather than the path shrinking a thousand times
 * slower, because once the host is gone, flex shrink factors that sum to less
 * than one would take only that share of the overflow from the path, and it
 * would be clipped without an ellipsis. Below `lg` the button wraps under a
 * pill that does not fit beside it; in the two-column hero from `lg` up it
 * stays beside the pill, which cuts the address short instead, so the row
 * keeps one line and the card beside it stays low. The pill's frame fades
 * in with the hero's pane-safe entrance (`paneReveal`). It shows nothing
 * while it is still unknown whether a CV is featured, and when no
 * CV is featured, like the card.
 *
 * @returns The address and its copy button, their skeleton, or nothing.
 */
export default function FeaturedCvAddress(): JSX.Element | null {
  const { t } = useTranslation()
  const featured = useFeaturedCv()

  if (featured.status === FeaturedCvStatus.Loading) {
    return <FeaturedCvAddressSkeleton />
  }

  if (
    featured.status === FeaturedCvStatus.Checking ||
    featured.status === FeaturedCvStatus.None
  ) {
    return null
  }

  const path = RoutePaths.CandidateProfile(featured.publicUrlSegment)

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      className="flex min-w-0 flex-wrap items-start gap-3 lg:flex-nowrap"
    >
      <p className={featuredCvAddressFrameClassName}>
        <span className="sr-only">{t("home.addressLabel")}: </span>
        <motion.span
          variants={revealItem}
          className="flex min-w-0 items-baseline"
        >
          <span className="min-w-0 shrink-1000 truncate text-cv-muted">
            {window.location.host}
          </span>
          <span className="min-w-0 truncate font-medium text-cv-ink">
            {path}
          </span>
        </motion.span>
      </p>
      <div className="shrink-0 opacity-reveal">
        <CopyLinkButton
          url={`${window.location.origin}${path}`}
          label={t("cv.copyLink")}
        />
      </div>
    </motion.div>
  )
}
