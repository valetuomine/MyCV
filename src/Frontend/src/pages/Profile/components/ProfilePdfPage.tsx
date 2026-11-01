import { useEffect, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { getProfilePdfUrl, type Profile } from "../../../api/profileQueries"
import { RoutePaths } from "../../../routePaths"
import {
  ButtonVariant,
  DownloadStatus,
  type LanguageCode,
} from "../../../types"
import Button from "../../components/Button"
import ProfilePdfFrame from "./ProfilePdfFrame"
import ProfilePrintPage from "./ProfilePrintPage"

interface ProfilePdfPageProps {
  values: Profile
  profileId: string
  publicUrlSegment: string
  languageCode: LanguageCode
}

/**
 * The CV as a PDF in the browser's own viewer, in the UI language, with
 * actions to download it or open it in a new tab. The frame shows that the
 * PDF is loading, and each language loads anew. Browsers without a PDF viewer
 * get a download button in its place. A download that would fail shows an
 * error instead of leaving the page. Names the browser tab after the candidate
 * while it is open. Printing shows only the CV's A4 layout, as in the
 * downloadable PDF, and leaves the rest of the page out.
 *
 * @param props - The component props.
 * @param props.values - The public profile, for the heading and tab title.
 * @param props.profileId - The profile whose PDF to show.
 * @param props.publicUrlSegment - The CV's public URL segment, for the way back.
 * @param props.languageCode - The language to render the PDF in.
 * @returns The page's main landmark with the PDF viewer, and the print layout
 * that only paper shows.
 */
export default function ProfilePdfPage({
  values,
  profileId,
  publicUrlSegment,
  languageCode,
}: ProfilePdfPageProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>(
    DownloadStatus.Idle,
  )
  const viewUrl = getProfilePdfUrl({ profileId, languageCode })
  const downloadUrl = getProfilePdfUrl({
    profileId,
    languageCode,
    download: true,
  })

  useEffect(() => {
    document.title = values.fullName
      ? t("meta.pdfTitle", { name: values.fullName })
      : t("meta.title")
    return () => {
      document.title = i18n.t("meta.title")
    }
  }, [i18n, t, values.fullName])

  /**
   * Downloads the PDF. A HEAD request first checks that the download will
   * succeed, since navigating to a failing URL would leave the page; the API
   * then serves the PDF as an attachment, so the page stays.
   *
   * @returns A promise that settles once the download has started or failed.
   */
  const download = async (): Promise<void> => {
    setDownloadStatus(DownloadStatus.Pending)
    try {
      const response = await fetch(downloadUrl, { method: "HEAD" })
      if (!response.ok) {
        setDownloadStatus(DownloadStatus.Error)
        return
      }
      window.location.assign(downloadUrl)
      setDownloadStatus(DownloadStatus.Idle)
    } catch {
      setDownloadStatus(DownloadStatus.Error)
    }
  }

  const downloadButton = (
    <Button
      variant={ButtonVariant.Primary}
      loading={downloadStatus === DownloadStatus.Pending}
      loadingText={t("pdf.downloading")}
      onClick={() => void download()}
    >
      {t("pdf.download")}
    </Button>
  )

  return (
    <>
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 pt-20 pb-12 lg:pt-12 print:hidden">
        <header className="grid gap-6">
          <Button
            variant={ButtonVariant.Text}
            to={RoutePaths.CandidateProfile(publicUrlSegment)}
            className="justify-self-start"
          >
            <span aria-hidden="true">←</span>
            {t("common.backToCv")}
          </Button>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="grid min-w-0 gap-2">
              <p className="m-0 font-cv-mono text-xs tracking-widest text-cv-meta uppercase">
                {t("pdf.eyebrow")}
              </p>
              <h1
                dir="auto"
                className="m-0 font-cv-display text-3xl leading-tight font-semibold tracking-tight text-balance wrap-anywhere text-cv-ink sm:text-4xl"
              >
                {values.fullName}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {downloadButton}
              <Button href={viewUrl}>{t("pdf.openInNewTab")}</Button>
            </div>
          </div>
          {downloadStatus === DownloadStatus.Error && (
            <p role="alert" className="m-0 text-sm text-cv-danger">
              {t("pdf.downloadFailed")}
            </p>
          )}
        </header>
        <ProfilePdfFrame
          key={viewUrl}
          url={viewUrl}
          label={t("pdf.viewerLabel", { name: values.fullName ?? "" })}
        >
          <div className="grid h-full place-content-center justify-items-center gap-4 bg-cv-surface p-8 text-center">
            <p className="m-0 max-w-[40ch] text-lg leading-relaxed text-pretty text-cv-copy">
              {t("pdf.unsupported")}
            </p>
            {downloadButton}
          </div>
        </ProfilePdfFrame>
      </main>
      <div className="hidden print:block">
        <ProfilePrintPage values={values} languageCode={languageCode} />
      </div>
    </>
  )
}
