import type { JSX, Ref } from "react"
import { useTranslation } from "react-i18next"
import SignOutButton from "../../auth/SignOutButton"
import LanguageToggle from "./LanguageToggle"
import ThemeToggle from "./ThemeToggle"

interface PageControlsProps {
  ownerToolsRef?: Ref<HTMLDivElement>
  ownerToolsHidden?: boolean
}

/**
 * The owner's tools, sign-out, language and theme controls in the page's
 * top corner, in a named landmark so that a screen reader user who jumps
 * from landmark to landmark finds them. The group sits in an `aside`
 * because it is neither page content nor a set of in-page links. The
 * owner's tools (`OwnerTools`, such as the CV's Edit profile) sit in the
 * account group of `SignOutButton`, after the account name and before the
 * sign-out, and the language and theme form another group, so on a screen
 * too narrow for one row the account's actions take the first row and the
 * settings the second, rather than leaving the theme alone on a row. The
 * tools' slot is `display: contents`, so it takes no room while empty. It
 * exists only while the account shows, so nobody signed in means no slot
 * and no owner's tools, and `ownerToolsRef` receives null. The row is not
 * printed.
 *
 * @param props - The component props.
 * @param props.ownerToolsRef - Receives the slot that holds the owner's tools.
 * @param props.ownerToolsHidden - Whether to hide the owner's tools while
 *   they stay mounted, as while the page itself is hidden.
 * @returns The named control group.
 */
export default function PageControls({
  ownerToolsRef,
  ownerToolsHidden = false,
}: Readonly<PageControlsProps>): JSX.Element {
  const { t } = useTranslation()

  return (
    <aside
      aria-label={t("controls.label")}
      data-cv-trace-avoid
      className="absolute top-5 right-6 z-20 flex max-w-[calc(100%-3rem)] flex-wrap items-start justify-end gap-2 sm:right-[clamp(1.5rem,5vw,5.5rem)] print:hidden"
    >
      <SignOutButton
        tools={
          <div
            ref={ownerToolsRef}
            className={ownerToolsHidden ? "hidden" : "contents"}
          />
        }
      />
      <div className="flex items-start gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </aside>
  )
}
