import { useReducedMotion } from "framer-motion"
import { useAtom } from "jotai"
import { useEffect, type JSX, type MouseEvent } from "react"
import { flushSync } from "react-dom"
import { themeAtom } from "../../state/themeAtoms"
import { Theme } from "../../types"

const revealDurationMs = 520
const revealEasing = "cubic-bezier(0.23, 1, 0.32, 1)"

const iconClassName =
  "col-start-1 row-start-1 size-[1.125rem] transition-[rotate,scale,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"

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

    // Grow the new theme out of the button as a circle that ends up covering
    // the farthest corner of the viewport.
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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-11 place-items-center rounded-full border border-cv-line bg-cv-wash text-cv-copy transition-colors transition-transform duration-150 ease-out hover:border-cv-meta hover:bg-cv-overlay hover:text-cv-ink active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent"
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
    </button>
  )
}
