import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import useSkeletonTiming from "./useSkeletonTiming"

/**
 * One line of text: the real text's size and leading on a box one line tall
 * (`h-lh`), with the bar centred inside it.
 */
const line = "flex h-lh w-full items-center"

/**
 * A placeholder in the CV's exact layout while the CV loads, so nothing moves
 * when it arrives: the eyebrow, a two-line name at the name's size, the title,
 * the location, the summary and the row of actions, beside a see-through
 * portrait card the height of the photo card. Each line carries its text's
 * classes, so it is as tall as the text's line. The summary has four lines,
 * and seven on phones, where the same text wraps into a narrower column. The
 * shapes stay invisible for 300 ms of the load and then fade in, so a quick
 * load goes straight to the CV; screen readers hear the status at once. One
 * light crosses all the shapes together (`cv-skeleton`) and stands still
 * under reduced motion.
 *
 * @returns The busy main landmark with the placeholder.
 */
export default function ProfileSkeleton(): JSX.Element {
  const { t } = useTranslation()
  const timing = useSkeletonTiming()

  return (
    <main
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col pt-20 lg:pt-4"
    >
      <div className="flex flex-1 items-center overflow-y-clip py-12 sm:py-16">
        <div role="status" className="w-full">
          <span className="sr-only">{t("cv.loading")}</span>
          <div
            aria-hidden="true"
            style={timing}
            className="grid w-full animate-cv-fade-in-delayed grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16"
          >
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-center justify-items-start">
              <div className={`${line} text-xs`}>
                <div className="h-2.5 w-56 max-w-full rounded-md cv-skeleton" />
              </div>
              <div className="mt-8 w-full text-[clamp(3rem,8.5vw,7rem)] leading-[0.95]">
                <div className={line}>
                  <div className="h-[0.7em] w-[4.6em] max-w-full rounded-xl cv-skeleton" />
                </div>
                <div className={line}>
                  <div className="h-[0.7em] w-[5.8em] max-w-full rounded-xl cv-skeleton" />
                </div>
              </div>
              <div className={`${line} mt-6 text-xl sm:text-2xl`}>
                <div className="h-4 w-72 max-w-full rounded-lg cv-skeleton sm:h-5" />
              </div>
              <div className={`${line} mt-2 text-base`}>
                <div className="h-3.5 w-36 rounded-lg cv-skeleton" />
              </div>
              <div className="mt-4 w-full max-w-[52ch] text-lg leading-relaxed">
                <div className={line}>
                  <div className="h-3.5 w-full rounded-lg cv-skeleton" />
                </div>
                <div className={line}>
                  <div className="h-3.5 w-11/12 rounded-lg cv-skeleton" />
                </div>
                <div className={line}>
                  <div className="h-3.5 w-full rounded-lg cv-skeleton" />
                </div>
                <div className={`${line} sm:hidden`}>
                  <div className="h-3.5 w-full rounded-lg cv-skeleton" />
                </div>
                <div className={`${line} sm:hidden`}>
                  <div className="h-3.5 w-full rounded-lg cv-skeleton" />
                </div>
                <div className={`${line} sm:hidden`}>
                  <div className="h-3.5 w-11/12 rounded-lg cv-skeleton" />
                </div>
                <div className={line}>
                  <div className="h-3.5 w-3/5 rounded-lg cv-skeleton" />
                </div>
              </div>
              <div className="mt-10 flex flex-wrap items-start gap-3">
                <div className="h-11 w-36 rounded-full cv-skeleton" />
                <div className="h-11 w-32 rounded-full cv-skeleton" />
                <div className="h-11 w-24 rounded-full cv-skeleton" />
                <div className="h-11 w-28 rounded-full cv-skeleton" />
              </div>
            </div>
            <div className="w-full max-w-md lg:justify-self-end">
              <div className="h-[calc(clamp(20rem,68dvh,40rem)+4px)] w-full rounded-3xl border-2 border-cv-line bg-cv-wash shadow-cv-panel" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
