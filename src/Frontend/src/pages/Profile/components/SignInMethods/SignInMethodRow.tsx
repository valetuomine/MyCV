import { useEffect, useId, useRef, type JSX } from "react"
import { useTranslation } from "react-i18next"
import type { Login } from "../../../../api/loginQueries"
import googleLogo from "../../../../assets/google-g-logo.svg"
import microsoftLogo from "../../../../assets/microsoft-logo.svg"
import { signInMethodNames } from "../../../../auth/authSession"
import { ButtonSize, ButtonVariant, SignInMethod } from "../../../../types"
import Button from "../../../components/Button"
import { formatProfileDate } from "../../utils/profileFormUtils"

/** Each method's logo. */
const methodLogos: Record<SignInMethod, string> = {
  [SignInMethod.Microsoft]: microsoftLogo,
  [SignInMethod.Google]: googleLogo,
}

interface SignInMethodRowProps {
  login: Login
  method: SignInMethod
  sessionEmail?: string
  removeBlockedReason: string | null
  isConfirming: boolean
  isRemoving: boolean
  onRequestRemove: () => void
  onConfirmRemove: () => void
  onKeep: () => void
}

/**
 * One linked sign-in method: the provider's logo and name, when it was
 * added and last used, and Remove. The method of this session is marked and
 * shows the session's email, read from the browser; the API stores no email.
 * Remove asks for confirmation in place, and is unavailable, with the reason
 * beside it, for the session's method and the last one. It stays focusable
 * (`aria-disabled`), so keyboard and screen reader users reach the reason. Focus moves to
 * Keep when the confirmation opens, and back to Remove when it closes.
 *
 * @param props - The component props.
 * @param props.login - The linked method from the API.
 * @param props.method - The login's sign-in method.
 * @param props.sessionEmail - The session's email, shown on the current method.
 * @param props.removeBlockedReason - Why the method can't be removed, or null when it can.
 * @param props.isConfirming - Whether Remove is waiting for confirmation.
 * @param props.isRemoving - Whether the removal is in progress.
 * @param props.onRequestRemove - Asks to confirm the removal.
 * @param props.onConfirmRemove - Removes the method.
 * @param props.onKeep - Cancels the removal.
 * @returns The method's list item.
 */
export default function SignInMethodRow({
  login,
  method,
  sessionEmail,
  removeBlockedReason,
  isConfirming,
  isRemoving,
  onRequestRemove,
  onConfirmRemove,
  onKeep,
}: SignInMethodRowProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const reasonId = useId()
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const keepButtonRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  const name = signInMethodNames[method]
  /** When the method was linked, formatted. */
  const addedAt = formatProfileDate(login.createdAt, i18n.language)
  /** When the method last opened the admin view, formatted, or undefined when never recorded. */
  const lastUsedAt = formatProfileDate(login.lastSignInAt, i18n.language)

  useEffect(() => {
    if (isConfirming) {
      keepButtonRef.current?.focus()
    } else if (wasConfirming.current) {
      removeButtonRef.current?.focus()
    }
    wasConfirming.current = isConfirming
  }, [isConfirming])

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <img
        src={methodLogos[method]}
        alt=""
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 self-start"
      />
      <div className="grid min-w-0 flex-1 basis-48 gap-1">
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-cv-ink">
          {name}
          {login.isCurrent && (
            <span className="rounded-full bg-cv-accent px-2 py-0.5 font-cv-mono text-[0.625rem] tracking-wide text-cv-accent-ink uppercase">
              {t("signInMethods.thisSession")}
            </span>
          )}
        </p>
        {login.isCurrent && sessionEmail && (
          <p className="m-0 text-sm text-cv-copy wrap-anywhere">
            {sessionEmail}
          </p>
        )}
        <p className="m-0 text-sm text-cv-muted">
          {addedAt && t("signInMethods.added", { date: addedAt })}
          {addedAt && lastUsedAt && " · "}
          {lastUsedAt && t("signInMethods.lastUsed", { date: lastUsedAt })}
        </p>
      </div>
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-2 max-sm:ml-9">
          <span className="text-sm text-cv-ink">
            {t("signInMethods.removeQuestion", { provider: name })}
          </span>
          <Button
            variant={ButtonVariant.Danger}
            size={ButtonSize.Small}
            onClick={onConfirmRemove}
            loading={isRemoving}
            loadingText={t("signInMethods.removing")}
          >
            {t("signInMethods.remove")}
          </Button>
          <Button
            ref={keepButtonRef}
            size={ButtonSize.Small}
            onClick={onKeep}
            disabled={isRemoving}
          >
            {t("signInMethods.keep")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-sm:ml-9">
          {removeBlockedReason && (
            <span id={reasonId} className="text-xs text-cv-muted">
              {removeBlockedReason}
            </span>
          )}
          <Button
            ref={removeButtonRef}
            size={ButtonSize.Small}
            onClick={onRequestRemove}
            aria-disabled={removeBlockedReason !== null || undefined}
            aria-describedby={removeBlockedReason ? reasonId : undefined}
            aria-label={t("signInMethods.removeLabel", { provider: name })}
          >
            {t("signInMethods.remove")}
          </Button>
        </div>
      )}
    </li>
  )
}
