import { m as motion } from "framer-motion"
import { useId, type JSX } from "react"
import { useTranslation } from "react-i18next"
import {
  getProfilePictureUrl,
  type Profile,
} from "../../../../api/profileQueries"
import { RoutePaths } from "../../../../routePaths"
import { ButtonSize, ButtonVariant } from "../../../../types"
import Button from "../../../components/Button"
import Eyebrow from "../../../components/Eyebrow"
import LitCard from "../../../components/LitCard"
import {
  formatProfileDate,
  getInitials,
  toExternalUrl,
} from "../../utils/profileFormUtils"
import LocationIcon from "../LocationIcon"
import FeaturedCvAvatar from "./FeaturedCvAvatar"
import { featuredCvGridClassName, featuredCvReveal } from "./featuredCvLayout"

interface FeaturedCvCardProps {
  profile: Profile
  publicUrlSegment: string
}

/**
 * The home page's card for the featured CV: a live eyebrow with the date the
 * CV last changed, which shows that the link always leads to the latest
 * version, then its name, title, location and
 * portrait, a button that opens the CV, and its GitHub and LinkedIn links.
 * It is a `LitCard`, so its surface lights up like the edit view's preview
 * card. Its content rises in on the reveal that `FeaturedCvSection` starts,
 * while the card stays in place. A profile without a location keeps that
 * line empty, so the card stays the size of its skeleton.
 *
 * @param props - The component props.
 * @param props.profile - The featured CV's public profile.
 * @param props.publicUrlSegment - The featured CV's public address.
 * @returns The card.
 */
export default function FeaturedCvCard({
  profile,
  publicUrlSegment,
}: Readonly<FeaturedCvCardProps>): JSX.Element {
  const { t, i18n } = useTranslation()
  const nameId = useId()
  /** When the profile last changed, falling back to when it was created. */
  const updatedAt = formatProfileDate(
    profile.updatedAt ?? profile.createdAt,
    i18n.language,
  )

  return (
    <LitCard
      as="article"
      labelledBy={nameId}
      className="w-full"
      contentClassName={featuredCvGridClassName}
    >
      <motion.div
        variants={featuredCvReveal}
        className="grid min-w-0 justify-items-start [grid-area:text]"
      >
        <Eyebrow
          pulse
          meta={updatedAt ? t("cv.updated", { date: updatedAt }) : undefined}
        >
          {t("home.featuredLabel")}
        </Eyebrow>
        <h2
          id={nameId}
          dir="auto"
          className="mt-4 mb-0 font-cv-display text-3xl leading-tight font-semibold tracking-tighter text-balance wrap-anywhere sm:text-4xl"
        >
          {profile.fullName}
        </h2>
        <p
          dir="auto"
          className="mt-1 mb-0 font-cv-display text-lg font-medium tracking-tight wrap-anywhere text-cv-accent"
        >
          {profile.title}
        </p>
        {profile.location ? (
          <p
            dir="auto"
            className="mt-2 mb-0 flex items-start gap-2 text-sm text-cv-muted"
          >
            <LocationIcon className="mt-0.5 size-4 shrink-0" />
            {profile.location}
          </p>
        ) : (
          <span aria-hidden="true" className="mt-2 block h-lh text-sm" />
        )}
      </motion.div>
      <FeaturedCvAvatar
        initials={getInitials(profile.fullName)}
        imageUrl={getProfilePictureUrl(profile.pictureUrl)}
      />
      <motion.div
        variants={featuredCvReveal}
        className="flex flex-wrap items-center gap-3 [grid-area:actions]"
      >
        <Button
          variant={ButtonVariant.Primary}
          to={RoutePaths.CandidateProfile(publicUrlSegment)}
        >
          {t("home.viewCv")}
        </Button>
        {profile.gitHubUrl && (
          <Button
            size={ButtonSize.Small}
            href={toExternalUrl(profile.gitHubUrl)}
          >
            GitHub
          </Button>
        )}
        {profile.linkedInUrl && (
          <Button
            size={ButtonSize.Small}
            href={toExternalUrl(profile.linkedInUrl)}
          >
            LinkedIn
          </Button>
        )}
      </motion.div>
    </LitCard>
  )
}
