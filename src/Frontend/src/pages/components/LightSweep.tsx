import { useAtomValue } from "jotai"
import type { JSX } from "react"
import { lightSweepAtom } from "../../state/lightSweepAtom"

/**
 * One wide band of light that crosses the page from the left when the CV's
 * name starts its reveal, at the portrait foil's 105° angle. It reaches the
 * portrait about when the card's own foil sweep starts, so the two read as one
 * light. It moves by transform and opacity only, and `DotEcho` lights the dots
 * under it. `LightEcho` starts with it, from the bottom. Each new count in
 * `lightSweepAtom` remounts it, which runs it once more. Reduced motion writes
 * no count, and hides a band already there.
 *
 * @returns The band, or nothing before the first sweep.
 */
export default function LightSweep(): JSX.Element | null {
  const sweepCount = useAtomValue(lightSweepAtom)

  return sweepCount > 0 ? (
    <div
      key={sweepCount}
      className="absolute inset-y-0 left-0 w-[70vw] bg-cv-light-sweep motion-safe:animate-cv-light-sweep motion-reduce:hidden"
    />
  ) : null
}
