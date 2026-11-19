import { m as motion } from "framer-motion"
import type { JSX } from "react"
import FeaturedCvCard from "./FeaturedCvCard"
import FeaturedCvSkeleton from "./FeaturedCvSkeleton"
import useFeaturedCv from "./useFeaturedCv"
import { FeaturedCvStatus } from "../../../../types"

/**
 * The home page's featured CV card (`useFeaturedCv`), with a skeleton while
 * it loads. When no CV is featured or a request fails, it renders nothing,
 * so the home page works without it. The wrapper only starts the card's
 * reveal: the card's content rises in (`featuredCvReveal`) while the card
 * itself stays where the skeleton was.
 *
 * @returns The featured CV's card, its skeleton, or nothing.
 */
export default function FeaturedCvSection(): JSX.Element | null {
  const featured = useFeaturedCv()

  if (featured.status === FeaturedCvStatus.Loading) {
    return <FeaturedCvSkeleton />
  }

  if (featured.status === FeaturedCvStatus.None) {
    return null
  }

  return (
    <motion.div initial="hidden" animate="visible" className="w-full">
      <FeaturedCvCard
        profile={featured.profile}
        publicUrlSegment={featured.publicUrlSegment}
      />
    </motion.div>
  )
}
