import { useStore } from "jotai"
import { useEffect, useState, type JSX } from "react"
import { maxEchoes, nameEchoAtom } from "../../state/nameEchoAtom"

/**
 * The name's echo as light: every echo in `nameEchoAtom` carries one wide band
 * of light up the page from the bottom, as `LightSweep` carries one from the
 * left, on the same duration and curve. It moves by transform and opacity only,
 * and `DotEcho` lights the dots under it. The box turns with the sweep's tilt
 * and the band sits straight inside it, so it keeps its full strength from edge
 * to edge on any screen. Each band leaves once its animation ends, so a quick
 * second echo doesn't cut the first one off, and all of them leave with the
 * name. At most `maxEchoes` stay, as on the canvas, which also limits the bands
 * that never animate, under forced colours. Reduced motion writes no echo, and
 * hides a band already there.
 *
 * @returns The running bands.
 */
export default function LightEcho(): JSX.Element {
  const store = useStore()
  const [echoes, setEchoes] = useState<number[]>([])

  useEffect(() => {
    /** Adds a band for a new echo, or clears them when the name leaves. */
    const followEcho = (): void => {
      const echo = store.get(nameEchoAtom)
      setEchoes((current) =>
        echo === null ? [] : [...current, echo].slice(-maxEchoes),
      )
    }

    return store.sub(nameEchoAtom, followEcho)
  }, [store])

  /**
   * Removes a band whose animation has ended.
   *
   * @param echo - The band's echo.
   */
  const dropEcho = (echo: number): void => {
    setEchoes((current) => current.filter((running) => running !== echo))
  }

  return (
    <>
      {echoes.map((echo) => (
        <div
          key={echo}
          onAnimationEnd={() => dropEcho(echo)}
          className="absolute top-0 left-1/2 h-[70dvh] w-[calc(105vw+30dvh)] bg-cv-light-echo motion-safe:animate-cv-light-echo motion-reduce:hidden"
        />
      ))}
    </>
  )
}
