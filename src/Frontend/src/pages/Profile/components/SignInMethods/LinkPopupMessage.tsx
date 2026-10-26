import type { JSX } from "react"
import { useTranslation } from "react-i18next"
import { signInMethodNames } from "../../../../auth/authSession"
import { SignInMethod } from "../../../../types"
import Button from "../../../components/Button"

interface LinkPopupMessageProps {
  method: SignInMethod
  onCancel: () => void
}

/**
 * Takes the add buttons' place while the popup of a method being added is
 * open, with the sign-in screen's wording and a Cancel button that takes
 * focus when it appears. The pulse dot is hidden under reduced motion.
 * Microsoft's sign-in page cuts its popup off from this tab, so the app
 * can't tell when that window is closed, and the Microsoft message says so.
 *
 * @param props - The component props.
 * @param props.method - The method whose popup is open.
 * @param props.onCancel - Cancels the popup.
 * @returns The waiting message.
 */
export default function LinkPopupMessage({
  method,
  onCancel,
}: LinkPopupMessageProps): JSX.Element {
  const { t } = useTranslation()

  return (
    <div
      aria-busy="true"
      className="grid justify-items-start gap-4 rounded-lg border border-cv-line p-4"
    >
      <div role="status" className="grid gap-1">
        <p className="m-0 flex items-center gap-3 font-medium text-cv-ink">
          <span aria-hidden="true" className="relative grid size-2 shrink-0">
            <span className="absolute inset-0 animate-cv-pulse rounded-full bg-cv-accent motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-cv-accent" />
          </span>
          {t("signIn.popupTitle", { provider: signInMethodNames[method] })}
        </p>
        <p className="m-0 max-w-[60ch] text-sm text-pretty text-cv-copy">
          {t("signIn.popupDescription")}
          {method === SignInMethod.Microsoft && t("signIn.popupClosedHint")}
        </p>
      </div>
      <Button onClick={onCancel} autoFocus>
        {t("common.cancel")}
      </Button>
    </div>
  )
}
