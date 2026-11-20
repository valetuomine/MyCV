import type { JSX } from "react"
import useSkeletonTiming from "../useSkeletonTiming"
import { featuredCvAddressFrameClassName } from "./featuredCvLayout"

/**
 * Stands for the featured CV's address while it loads: the pill's own frame
 * with a shimmer line in it, and the copy button's shape beside it, so
 * nothing moves when the address arrives. Only the shapes hold back for
 * 300 ms; the frame shows from the start. The card's skeleton tells screen
 * readers about the load, so this one stays hidden from them.
 *
 * @returns The address's skeleton.
 */
export default function FeaturedCvAddressSkeleton(): JSX.Element {
  const timing = useSkeletonTiming()

  return (
    <div
      aria-hidden="true"
      className="flex flex-wrap items-start gap-3 lg:flex-nowrap"
    >
      <div className={featuredCvAddressFrameClassName}>
        <div
          style={timing}
          className="cv-skeleton h-3 w-56 max-w-full animate-cv-fade-in-delayed rounded-full"
        />
      </div>
      <div
        style={timing}
        className="cv-skeleton h-11 w-32 shrink-0 animate-cv-fade-in-delayed rounded-full"
      />
    </div>
  )
}
