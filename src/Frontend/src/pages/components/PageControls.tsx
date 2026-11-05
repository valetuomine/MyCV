import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import SignOutButton from "../../auth/SignOutButton"
import LanguageToggle from "./LanguageToggle"
import ThemeToggle from "./ThemeToggle"

/**
 * The sign-out, language and theme controls in the page's top corner, in a
 * named landmark so that a screen reader user who jumps from landmark to
 * landmark finds them. The group sits in an `aside` because it is neither
 * page content nor a set of in-page links. The row wraps only on screens too
 * narrow for it, and it is not printed.
 *
 * @returns The named control group.
 */
export default function PageControls(): JSX.Element {
  const { t } = useTranslation()

  return (
    <aside
      aria-label={t("controls.label")}
      className="absolute top-5 right-6 z-20 flex max-w-[calc(100%-3rem)] flex-wrap items-start justify-end gap-2 sm:right-[clamp(1.5rem,5vw,5.5rem)] print:hidden"
    >
      <SignOutButton />
      <LanguageToggle />
      <ThemeToggle />
    </aside>
  )
}
