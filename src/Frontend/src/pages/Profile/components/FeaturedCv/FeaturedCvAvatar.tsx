import { useState, type JSX } from "react"
import { featuredCvPortraitClassName } from "./featuredCvLayout"

interface FeaturedCvAvatarProps {
  initials: string
  imageUrl?: string
}

/**
 * The featured CV's portrait: its photo, or its initials in the accent when
 * it has none or the photo fails to load. It sits in the card grid's
 * `portrait` area: beside the name on phones, and from the top of the card's
 * content to the bottom of its buttons on wider screens. The photo is placed
 * absolutely and cropped to fit, so a tall photo never makes the card taller.
 * The name already says whose CV it is, so assistive tech skips it.
 *
 * @param props - The component props.
 * @param props.initials - The candidate's initials.
 * @param props.imageUrl - The profile photo, if there is one.
 * @returns The portrait.
 */
export default function FeaturedCvAvatar({
  initials,
  imageUrl,
}: Readonly<FeaturedCvAvatarProps>): JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string>()
  /** Shows the photo unless there is none or this URL failed to load. */
  const showPhoto = Boolean(imageUrl) && imageUrl !== failedUrl

  return (
    <div
      aria-hidden="true"
      className={`relative grid place-items-center overflow-hidden border border-cv-line bg-cv-wash ${featuredCvPortraitClassName}`}
    >
      {showPhoto ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <span className="font-cv-display text-3xl font-semibold tracking-tighter text-cv-accent select-none sm:text-5xl">
          {initials}
        </span>
      )}
    </div>
  )
}
