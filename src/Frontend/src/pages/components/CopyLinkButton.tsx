import { useEffect, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { CopyStatus } from "../../types"
import Button from "./Button"

interface CopyLinkButtonProps {
  url: string
  label: string
}

const copiedResetMs = 2000

const swapLabel =
  "col-start-1 row-start-1 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none"

/**
 * Copies a link and swaps its label to a drawn check mark for
 * `copiedResetMs`. Both labels share one grid cell, so the button keeps its
 * width. Shows an error when the clipboard can't be written.
 *
 * @param props - The component props.
 * @param props.url - The link to copy.
 * @param props.label - The button's label before copying.
 * @returns The copy button with its status and error messages.
 */
export default function CopyLinkButton({
  url,
  label,
}: CopyLinkButtonProps): JSX.Element {
  const { t } = useTranslation()
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(CopyStatus.Idle)
  const isCopied = copyStatus === CopyStatus.Copied

  useEffect(() => {
    if (copyStatus !== CopyStatus.Copied) {
      return
    }

    const timeout = window.setTimeout(
      () => setCopyStatus(CopyStatus.Idle),
      copiedResetMs,
    )
    return () => window.clearTimeout(timeout)
  }, [copyStatus])

  /** Writes the link to the clipboard and records whether it worked. */
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus(CopyStatus.Copied)
    } catch {
      setCopyStatus(CopyStatus.Error)
    }
  }

  return (
    <div className="grid justify-items-start gap-2">
      <Button onClick={() => void copyUrl()}>
        <span className="grid">
          <span
            className={`${swapLabel} ${isCopied ? "-translate-y-2 opacity-0" : "opacity-100"}`}
          >
            {label}
          </span>
          <span
            aria-hidden="true"
            className={`${swapLabel} inline-flex items-center justify-center gap-1.5 text-cv-accent ${isCopied ? "opacity-100" : "translate-y-2 opacity-0"}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                pathLength={1}
                className={`[stroke-dasharray:1] transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none ${isCopied ? "[stroke-dashoffset:0] delay-100" : "[stroke-dashoffset:1]"}`}
              />
            </svg>
            {t("copyLink.copied")}
          </span>
        </span>
      </Button>
      <span role="status" className="sr-only">
        {isCopied ? t("copyLink.copiedStatus") : ""}
      </span>
      {copyStatus === CopyStatus.Error && (
        <p role="alert" className="m-0 max-w-52 text-sm text-cv-danger">
          {t("copyLink.failed")}
        </p>
      )}
    </div>
  )
}
