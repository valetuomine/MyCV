import { skipToken } from "@reduxjs/toolkit/query"
import { m as motion, type Variants } from "framer-motion"
import { useAtomValue } from "jotai"
import type { JSX } from "react"
import { useGetFeaturedCandidateQuery } from "../../../../api/candidateQueries"
import { useGetProfileQuery } from "../../../../api/profileQueries"
import { languageAtom } from "../../../../state/languageAtoms"
import FeaturedCvCard from "./FeaturedCvCard"
import FeaturedCvSkeleton from "./FeaturedCvSkeleton"

/** Lets the card rise into place once its data has arrived. */
const cardReveal: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
}

/**
 * The home page's featured CV: fetches the CV the API features and then its
 * profile in the current language, and shows a skeleton while either is on
 * its first load. When no CV is featured or a request fails, it renders
 * nothing, so the home page works without it.
 *
 * @returns The featured CV's card, its skeleton, or nothing.
 */
export default function FeaturedCvSection(): JSX.Element | null {
  const language = useAtomValue(languageAtom)
  const featuredQuery = useGetFeaturedCandidateQuery()
  const candidate = featuredQuery.currentData
  const profileId = candidate?.profileId
  const profileQuery = useGetProfileQuery(
    profileId ? { profileId, languageCode: language } : skipToken,
  )
  /**
   * The featured CV's profile once it has loaded. It keeps the previous
   * language's profile while another language loads, so the card doesn't
   * blink, and drops it when the request fails.
   */
  const profile = profileQuery.isError ? undefined : profileQuery.data

  if (featuredQuery.isLoading || profileQuery.isLoading) {
    return <FeaturedCvSkeleton />
  }

  if (!candidate?.publicUrlSegment || !profileId || !profile) {
    return null
  }

  return (
    <motion.div
      variants={cardReveal}
      initial="hidden"
      animate="visible"
      className="w-full"
    >
      <FeaturedCvCard
        profile={profile}
        publicUrlSegment={candidate.publicUrlSegment}
      />
    </motion.div>
  )
}
