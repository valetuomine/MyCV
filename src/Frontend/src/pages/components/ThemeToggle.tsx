import { useReducedMotion } from "framer-motion"
import { useAtom } from "jotai"
import { useEffect, type JSX, type MouseEvent } from "react"
import { flushSync } from "react-dom"
import { themeAtom } from "../../state/themeAtoms"
import { ButtonVariant, Theme } from "../../types"
import Button from "./Button"

const revealDurationMs = 520
const revealEasing = "cubic-bezier(0.23, 1, 0.32, 1)"

const iconClassName =
  "col-start-1 row-start-1 size-[1.125rem] transition-[rotate,scale,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"

/**
 * Switches between the light and dark themes. Keeps `data-theme` on `<html>`
 * and the browser's `theme-color` in step with the active theme.
 *
 * @returns The theme toggle button.
 */
export default function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useAtom(themeAtom)
  const prefersReducedMotion = useReducedMotion()
  const isDark = theme === Theme.Dark

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const background = getComputedStyle(document.documentElement)
      .getPropertyValue("--cv-background")
      .trim()
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", background)
  }, [theme])

  /**
   * Switches the theme. Where view transitions are supported and motion
   * isn't reduced, the new theme grows out of the button as a circle that
   * ends up covering the farthest corner of the viewport.
   *
   * @param event - The click, whose button the circle grows from.
   */
  const toggleTheme = (event: MouseEvent<HTMLButtonElement>): void => {
    const nextTheme = isDark ? Theme.Light : Theme.Dark
    const root = document.documentElement

    if (
      typeof document.startViewTransition !== "function" ||
      prefersReducedMotion
    ) {
      setTheme(nextTheme)
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    const x = bounds.left + bounds.width / 2
    const y = bounds.top + bounds.height / 2
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    root.dataset.themeTransition = ""
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme))
      root.dataset.theme = nextTheme
    })

    void transition.ready.then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: revealDurationMs,
          easing: revealEasing,
          pseudoElement: "::view-transition-new(root)",
        },
      )
    })
    void transition.finished.finally(() => {
      delete root.dataset.themeTransition
    })
  }

  /**
   * Keeps quick repeated clicks, which count as double and triple clicks,
   * from selecting nearby text.
   *
   * @param event - The mouse press on the button.
   */
  const preventMultiClickSelection = (
    event: MouseEvent<HTMLButtonElement>,
  ): void => {
    if (event.detail > 1) {
      event.preventDefault()
    }
  }

  return (
    <Button
      variant={ButtonVariant.Icon}
      onClick={toggleTheme}
      onMouseDown={preventMultiClickSelection}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`${iconClassName} ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-50 opacity-0"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={`${iconClassName} ${isDark ? "-rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
      </svg>
    </Button>
  )
}
