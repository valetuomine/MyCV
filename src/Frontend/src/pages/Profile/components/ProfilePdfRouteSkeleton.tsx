import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import useSkeletonTiming from "./useSkeletonTiming"

/**
 * One line of text: the real text's size and leading on a box one line tall
 * (`h-lh`), with the bar centred inside it.
 */
const line = "flex h-lh items-center"

/**
 * A placeholder in the PDF view's layout while its route or its profile
 * loads: the way back, the eyebrow, the name, the two actions and the empty
 * see-through PDF frame, each where the page puts it. The frame stays empty,
 * since the frame's own indicator takes over once the PDF starts loading. The
 * shapes stay invisible for 300 ms of the load and then fade in, so a quick
 * load never flashes them, and share the CV skeleton's shimmer; screen
 * readers hear the status at once.
 *
 * @returns The busy main landmark with the placeholder.
 */
export default function ProfilePdfRouteSkeleton(): JSX.Element {
  const { t } = useTranslation()
  const timing = useSkeletonTiming()

  return (
    <main
      aria-busy="true"
      className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col pt-20 pb-12 lg:pt-12"
    >
      <output className="sr-only">{t("cv.loading")}</output>
      <div
        aria-hidden="true"
        style={timing}
        className="grid animate-cv-fade-in-delayed gap-8"
      >
        <div className="grid gap-6">
          <div className="flex h-11 items-center">
            <div className="h-3 w-28 rounded-lg cv-skeleton" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="grid gap-2">
              <div className={`${line} text-xs`}>
                <div className="h-2.5 w-20 rounded-md cv-skeleton" />
              </div>
              <div className={`${line} text-3xl leading-tight sm:text-4xl`}>
                <div className="h-6 w-64 rounded-xl cv-skeleton sm:h-7 sm:w-80" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="h-11 w-44 rounded-full cv-skeleton" />
              <div className="h-11 w-48 rounded-full cv-skeleton" />
            </div>
          </div>
        </div>
        <div className="h-[min(80dvh,70rem)] w-full rounded-3xl border border-cv-line bg-cv-wash shadow-cv-panel" />
      </div>
    </main>
  )
}
