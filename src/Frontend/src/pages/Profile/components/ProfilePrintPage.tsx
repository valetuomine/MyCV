import { Fragment, useEffect, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import type { Profile } from "../../../api/profileQueries"
import { Theme, type LanguageCode } from "../../../types"
import { formatProfileDate, toExternalUrl } from "../utils/profileFormUtils"

interface ProfilePrintPageProps {
  values: Profile
  languageCode: LanguageCode
}

interface ProfileLink {
  label: string
  url: string
}

const sectionHeading =
  "m-0 font-cv-mono text-[0.6875rem] tracking-widest text-cv-meta uppercase"

/**
 * Quotes text as a CSS string, escaping the quote, backslashes and line
 * breaks, so it can't end the string or the rule.
 *
 * @param value - The text.
 * @returns The quoted CSS string.
 */
function toCssString(value: string): string {
  const escaped = value.replace(/["\\]/g, "\\$&").replace(/\r?\n/g, "\\A ")
  return `"${escaped}"`
}

/**
 * The footer of every page, in the page's bottom margin: when the CV was
 * updated on the left and the page number out of the page count on the
 * right. Chromium prints `@page` margin boxes with the document's fonts.
 *
 * @param updatedText - The translated "Updated" line, or "" for none.
 * @returns The `@page` rule.
 */
function pageFooterCss(updatedText: string): string {
  const footer =
    "font-family: var(--font-cv-sans); font-size: 8pt; color: var(--cv-meta);"
  return `@page {
  @bottom-left { content: ${toCssString(updatedText)}; ${footer} }
  @bottom-right { content: counter(page) " / " counter(pages); ${footer} }
}`
}

/**
 * The CV laid out for an A4 PDF, which the API prints in headless Chromium:
 * name, title, location, summary and links on white paper in the light
 * theme, in the given language whatever the UI language is. Names the
 * document after the candidate, which becomes the PDF's title, prints the
 * updated date and page numbers on every page, and sets `data-print-ready`
 * once its fonts are in use, which the API waits for before printing.
 *
 * @param props - The component props.
 * @param props.values - The public profile in the print's language.
 * @param props.languageCode - The print's language, for its labels and date.
 * @returns The printable CV.
 */
export default function ProfilePrintPage({
  values,
  languageCode,
}: ProfilePrintPageProps): JSX.Element {
  const { t } = useTranslation(undefined, { lng: languageCode })
  const [ready, setReady] = useState(false)
  /** When the profile last changed, falling back to when it was created. */
  const updatedAt = formatProfileDate(
    values.updatedAt ?? values.createdAt,
    languageCode,
  )
  /** The profile links that are set, with their labels. */
  const links = [
    { label: "LinkedIn", url: values.linkedInUrl },
    { label: "GitHub", url: values.gitHubUrl },
  ].filter((link): link is ProfileLink => Boolean(link.url))

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = Theme.Light
    root.dataset.print = ""
    root.lang = languageCode
    document.title = t("meta.profileTitle", { name: values.fullName ?? "" })

    let active = true
    void document.fonts.ready.then(() => {
      if (active) {
        setReady(true)
      }
    })
    return () => {
      active = false
      delete root.dataset.print
    }
  }, [languageCode, t, values.fullName])

  return (
    <main
      data-print-ready={ready ? "" : undefined}
      className="grid gap-8 text-sm leading-relaxed text-cv-copy"
    >
      <style>
        {pageFooterCss(updatedAt ? t("cv.updated", { date: updatedAt }) : "")}
      </style>
      <header className="grid gap-2 border-b border-cv-line pb-6">
        <p className="m-0 font-cv-mono text-[0.6875rem] tracking-widest text-cv-accent uppercase">
          {t("cv.eyebrow")}
        </p>
        <h1
          dir="auto"
          className="m-0 mt-2 font-cv-display text-4xl leading-tight font-semibold tracking-tight wrap-anywhere text-cv-ink"
        >
          {values.fullName}
        </h1>
        {values.title && (
          <p
            dir="auto"
            className="m-0 font-cv-display text-lg font-medium text-cv-accent"
          >
            {values.title}
          </p>
        )}
        {values.location && (
          <p dir="auto" className="m-0 text-cv-meta">
            {values.location}
          </p>
        )}
      </header>
      {values.summary && (
        <section className="grid gap-2">
          <h2 className={sectionHeading}>{t("print.profile")}</h2>
          <p dir="auto" className="m-0 whitespace-pre-line wrap-anywhere">
            {values.summary}
          </p>
        </section>
      )}
      {links.length > 0 && (
        <section className="grid gap-2">
          <h2 className={sectionHeading}>{t("print.links")}</h2>
          <dl className="m-0 grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-1">
            {links.map(({ label, url }) => (
              <Fragment key={label}>
                <dt className="text-cv-meta">{label}</dt>
                <dd className="m-0">
                  <a
                    href={toExternalUrl(url)}
                    className="text-cv-accent underline underline-offset-2 wrap-anywhere"
                  >
                    {url}
                  </a>
                </dd>
              </Fragment>
            ))}
          </dl>
        </section>
      )}
    </main>
  )
}
