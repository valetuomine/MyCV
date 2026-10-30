import { useRef, type JSX, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ButtonVariant, PdfLoadStatus } from "../../../types"
import Button from "../../components/Button"
import ProfilePdfSkeleton from "./ProfilePdfSkeleton"
import useProfilePdfLoad from "./useProfilePdfLoad"

interface ProfilePdfFrameProps {
  url: string
  label: string
  children: ReactNode
}

/**
 * The frame of the PDF: an indicator while the PDF loads, the browser's viewer
 * once it has, and a message with a retry if it fails. The indicator stays
 * under the transparent `<object>` until the viewer paints over it, which
 * takes a round trip on a slow connection. The viewer gets the server's URL
 * rather than a blob URL, so its own save keeps the server's file name.
 *
 * The status region sits outside the busy frame, because screen readers may
 * hold back changes inside a busy element, and it keeps announcing through
 * the whole load. Retrying moves focus to the frame, since the button goes
 * away. Give the frame a `key` per URL, which restarts the load.
 *
 * @param props - The component props.
 * @param props.url - The PDF's URL.
 * @param props.label - The viewer's accessible name.
 * @param props.children - The fallback for browsers without a PDF viewer; it must be opaque, because the indicator lies beneath it.
 * @returns The status region and the frame.
 */
export default function ProfilePdfFrame({
  url,
  label,
  children,
}: ProfilePdfFrameProps): JSX.Element {
  const { t } = useTranslation()
  const { status, retry } = useProfilePdfLoad(url)
  const frameRef = useRef<HTMLDivElement>(null)
  /** Whether the PDF is still on its way to the page. */
  const isLoading =
    status === PdfLoadStatus.Starting || status === PdfLoadStatus.Pending
  /** Whether the `<object>` is in place, showing the PDF or its fallback. */
  const showsObject =
    status === PdfLoadStatus.Ready || status === PdfLoadStatus.NoViewer
  /**
   * The status region's text: empty at first, for a failure, which has its own
   * alert, and without a viewer, where no PDF appears to announce.
   */
  const announcement =
    status === PdfLoadStatus.Pending
      ? t("pdf.preparing")
      : status === PdfLoadStatus.Ready
        ? t("pdf.ready")
        : ""

  /** Loads the PDF again, keeping focus in the frame. */
  const handleRetry = (): void => {
    frameRef.current?.focus()
    retry()
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <div
        ref={frameRef}
        tabIndex={-1}
        aria-busy={isLoading || undefined}
        className="relative h-[min(80dvh,70rem)] w-full overflow-hidden rounded-3xl border border-cv-line bg-cv-surface shadow-cv-panel outline-none"
      >
        {status === PdfLoadStatus.Error ? (
          <div className="grid h-full place-content-center justify-items-center gap-4 p-8 text-center">
            <p
              role="alert"
              className="m-0 max-w-[40ch] text-lg leading-relaxed text-pretty text-cv-danger"
            >
              {t("pdf.loadFailed")}
            </p>
            <Button variant={ButtonVariant.Primary} onClick={handleRetry}>
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : (
          <ProfilePdfSkeleton pulsing={isLoading} />
        )}
        {showsObject && (
          <object
            data={url}
            type="application/pdf"
            aria-label={label}
            className="absolute inset-0 size-full"
          >
            {children}
          </object>
        )}
      </div>
    </>
  )
}
