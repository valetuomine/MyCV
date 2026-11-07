import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import useSkeletonTiming from "../useSkeletonTiming"
import {
  featuredCvGridClassName,
  featuredCvPortraitClassName,
} from "./featuredCvLayout"

/**
 * Stands for the featured CV's card while it loads: the same grid, rows,
 * portrait and buttons, so nothing moves when the card arrives. The button
 * shapes are at least as wide as the real buttons, so both wrap at the same
 * width. The shapes hold back for 300 ms. The wrapper is busy, and the
 * status inside it tells screen readers about the load at once.
 *
 * @returns The card's skeleton.
 */
export default function FeaturedCvSkeleton(): JSX.Element {
  const { t } = useTranslation()
  const timing = useSkeletonTiming()

  return (
    <div aria-busy="true" className="w-full">
      <div role="status">
        <span className="sr-only">{t("home.featuredLoading")}</span>
      </div>
      <div
        aria-hidden="true"
        style={timing}
        className={`animate-cv-fade-in-delayed rounded-3xl border-2 border-cv-line bg-cv-wash ${featuredCvGridClassName}`}
      >
        <div className="grid w-full min-w-0 [grid-area:text]">
          <div className="flex h-lh items-center text-xs">
            <div className="cv-skeleton h-3 w-28 rounded-full" />
          </div>
          <div className="mt-4 flex h-lh items-center text-3xl leading-tight sm:text-4xl">
            <div className="cv-skeleton h-[0.7em] w-3/4 rounded-full" />
          </div>
          <div className="mt-1 flex h-lh items-center text-lg">
            <div className="cv-skeleton h-[0.7em] w-1/2 rounded-full" />
          </div>
          <div className="mt-2 flex h-lh items-center text-sm">
            <div className="cv-skeleton h-[0.7em] w-1/3 rounded-full" />
          </div>
        </div>
        <div className={`cv-skeleton ${featuredCvPortraitClassName}`} />
        <div className="flex flex-wrap items-center gap-3 [grid-area:actions]">
          <div className="cv-skeleton h-11 w-24 rounded-full" />
          <div className="cv-skeleton h-9 w-24 rounded-full" />
          <div className="cv-skeleton h-9 w-28 rounded-full" />
        </div>
      </div>
    </div>
  )
}
