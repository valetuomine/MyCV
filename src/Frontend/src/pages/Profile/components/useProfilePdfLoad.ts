import { useEffect, useState } from "react"
import { PdfLoadStatus } from "../../../types"

/** The hold in `animate-cv-fade-in-delayed`, so sight and sound start together. */
const announceDelayMs = 300

/**
 * Browsers without a PDF viewer only show `<object>`'s fallback, so they skip
 * the wait and the download.
 */
const hasPdfViewer = navigator.pdfViewerEnabled !== false

interface ProfilePdfLoad {
  status: PdfLoadStatus
  retry: () => void
}

/**
 * Fetches a PDF before the viewer asks for it, because the viewer stays empty
 * while the API prints and can't tell when it has finished. The whole body is
 * read, so the print is ready and the viewer's own request answers quickly.
 * This is a plain `fetch`, not RTK Query, which would keep the file in the
 * store and doesn't cancel a request when its component goes away.
 *
 * A load stays `Starting` for a moment before it turns `Pending`, so a quick
 * one never flashes, and the status region is in the page before its text
 * arrives, which screen readers need to announce it. Changing the URL needs a
 * new `key` on the caller, which also cancels the fetch.
 *
 * @param url - The PDF's URL.
 * @returns The load's status, and a function that loads the PDF again.
 */
export default function useProfilePdfLoad(url: string): ProfilePdfLoad {
  const [status, setStatus] = useState<PdfLoadStatus>(
    hasPdfViewer ? PdfLoadStatus.Starting : PdfLoadStatus.NoViewer,
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!hasPdfViewer) {
      return
    }

    const controller = new AbortController()
    const announceTimer = window.setTimeout(() => {
      setStatus((current) =>
        current === PdfLoadStatus.Starting ? PdfLoadStatus.Pending : current,
      )
    }, announceDelayMs)

    /**
     * Loads the PDF to the end and records how it went. A fetch cancelled by
     * leaving the page or changing the language is not a failure.
     *
     * @returns A promise that settles once the load has finished or failed.
     */
    const load = async (): Promise<void> => {
      try {
        const response = await fetch(url, { signal: controller.signal })
        await response.blob()
        setStatus(response.ok ? PdfLoadStatus.Ready : PdfLoadStatus.Error)
      } catch {
        if (!controller.signal.aborted) {
          setStatus(PdfLoadStatus.Error)
        }
      }
    }

    void load()

    return () => {
      controller.abort()
      window.clearTimeout(announceTimer)
    }
  }, [url, attempt])

  /** Starts the load over after a failure. */
  const retry = (): void => {
    setStatus(PdfLoadStatus.Starting)
    setAttempt((current) => current + 1)
  }

  return { status, retry }
}
