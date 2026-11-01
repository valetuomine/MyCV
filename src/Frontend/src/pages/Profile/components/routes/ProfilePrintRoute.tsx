import { skipToken } from "@reduxjs/toolkit/query"
import { useEffect, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { useParams, useSearchParams } from "react-router-dom"
import { useGetProfileQuery } from "../../../../api/profileQueries"
import { LanguageCode, Theme } from "../../../../types"
import ProfilePrintPage from "../ProfilePrintPage"

/** The languages a print can be in. */
const languageCodes: readonly string[] = Object.values(LanguageCode)

/**
 * Reads the print's language from the `lang` query parameter.
 *
 * @param value - The parameter's value.
 * @returns The language, or Finnish when the value isn't one.
 */
function toLanguageCode(value: string | null): LanguageCode {
  return value && languageCodes.includes(value)
    ? (value as LanguageCode)
    : LanguageCode.Finnish
}

/**
 * The print route `/print/:profileId?lang=fi|en`, which the API opens in
 * headless Chromium to print the CV as a PDF. It runs outside the page frame,
 * so it has no controls, and takes its language from the URL instead of the
 * saved UI language. It sets the light theme, the language and the title on
 * `<html>`, and the title once the profile has loaded. A failed load sets `data-print-error`, so the API stops waiting at
 * once.
 *
 * @returns The printable CV, nothing while it loads, or the error marker.
 */
export default function ProfilePrintRoute(): JSX.Element | null {
  const { profileId } = useParams()
  const [searchParams] = useSearchParams()
  const languageCode = toLanguageCode(searchParams.get("lang"))
  const { t } = useTranslation(undefined, { lng: languageCode })
  const profileQuery = useGetProfileQuery(
    profileId ? { profileId, languageCode } : skipToken,
  )

  const loaded = profileQuery.data !== undefined
  const fullName = profileQuery.data?.fullName

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = Theme.Light
    root.lang = languageCode
    if (loaded) {
      document.title = t("meta.profileTitle", { name: fullName ?? "" })
    }
  }, [languageCode, t, loaded, fullName])

  if (!profileId || profileQuery.isError) {
    return (
      <p data-print-error="" role="alert">
        {t("cv.failed")}
      </p>
    )
  }

  if (!profileQuery.data) {
    return null
  }

  return (
    <main>
      <ProfilePrintPage
        values={profileQuery.data}
        languageCode={languageCode}
      />
    </main>
  )
}
