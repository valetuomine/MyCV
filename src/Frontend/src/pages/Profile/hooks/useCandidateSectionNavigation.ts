import { useAtom } from "jotai"
import { useEffect, useRef, useState } from "react"
import { selectedSectionIndexAtom } from "../../../state/cvAtoms"

export default function useCandidateSectionNavigation(
  sectionCount: number,
  isNavigationEnabled = true,
) {
  const [storedSelectedIndex, setSelectedIndex] = useAtom(
    selectedSectionIndexAtom,
  )
  const maxIndex = Math.max(0, sectionCount - 1)
  const selectedIndex = Math.max(0, Math.min(storedSelectedIndex, maxIndex))
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedIndexRef = useRef(selectedIndex)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
    if (storedSelectedIndex !== selectedIndex) {
      setSelectedIndex(selectedIndex)
    }
  }, [selectedIndex, setSelectedIndex, storedSelectedIndex])

  useEffect(() => {
    if (!isNavigationEnabled) {
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    let lastWheelNavigationAt = 0
    const navigate = (step: number): void => {
      const currentIndex = selectedIndexRef.current
      const nextIndex = Math.max(
        0,
        Math.min(maxIndex, currentIndex + step),
      )
      if (nextIndex === currentIndex) {
        return
      }

      selectedIndexRef.current = nextIndex
      setDirection(nextIndex > currentIndex ? 1 : -1)
      setSelectedIndex(nextIndex)
    }
    const handleWheel = (event: WheelEvent): void => {
      if (event.deltaY === 0) {
        return
      }

      event.preventDefault()
      const now = Date.now()
      if (now - lastWheelNavigationAt < 700) {
        return
      }

      lastWheelNavigationAt = now
      navigate(event.deltaY > 0 ? 1 : -1)
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            "input, textarea, select, button, a, [contenteditable='true']",
          ))
      ) {
        return
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return
      }

      event.preventDefault()
      navigate(event.key === "ArrowDown" ? 1 : -1)
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      container.removeEventListener("wheel", handleWheel)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isNavigationEnabled, maxIndex, setSelectedIndex])

  return { containerRef, direction, selectedIndex }
}
