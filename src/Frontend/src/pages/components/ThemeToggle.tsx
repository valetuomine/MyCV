import { useAtom } from "jotai"
import { useEffect, type JSX } from "react"
import { themeAtom } from "../../state/themeAtoms"
import { Theme } from "../../types"

export default function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useAtom(themeAtom)
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

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? Theme.Light : Theme.Dark)}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-11 place-items-center rounded-full border border-cv-line bg-cv-wash text-cv-copy transition-colors transition-transform duration-150 ease-out hover:border-cv-meta hover:bg-cv-overlay hover:text-cv-ink active:scale-95 motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cv-accent"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-[1.125rem]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
        )}
      </svg>
    </button>
  )
}
