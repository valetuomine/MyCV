import { useEffect, useState, type CSSProperties } from "react"

/** When the current load's first skeleton mounted, or null between loads. */
let loadStartedAt: number | null = null
/** The pending reset after a skeleton unmounts, which the next one cancels. */
let pendingReset: ReturnType<typeof setTimeout> | undefined

/**
 * Times a skeleton from the start of the whole load rather than from its own
 * mount. A load can swap one skeleton for another, such as the route's
 * `Suspense` fallback for the route's own loading state; without this, the
 * new one would start its 300 ms hold and its shimmer over, so a skeleton
 * already on screen would vanish and fade in again. The load ends once no
 * skeleton is mounted after a commit.
 *
 * @returns The style for the skeleton's visual part: an `animation-delay`
 * that keeps the fade-in on the load's clock, and `--cv-loading-elapsed`,
 * which the bars' `cv-skeleton` shimmer reads to keep its phase.
 */
export default function useSkeletonTiming(): CSSProperties {
  const [elapsed] = useState(() => {
    const now = performance.now()
    loadStartedAt ??= now
    return Math.round(now - loadStartedAt)
  })

  useEffect(() => {
    clearTimeout(pendingReset)
    return () => {
      pendingReset = setTimeout(() => {
        loadStartedAt = null
      })
    }
  }, [])

  return {
    animationDelay: `${300 - elapsed}ms`,
    "--cv-loading-elapsed": `${elapsed}ms`,
  } as CSSProperties
}
