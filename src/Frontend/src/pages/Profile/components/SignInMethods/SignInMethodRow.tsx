import { useEffect, useId, useRef, type JSX } from "react"
import type { Login } from "../../../../api/loginQueries"
import googleLogo from "../../../../assets/google-g-logo.svg"
import microsoftLogo from "../../../../assets/microsoft-logo.svg"
import { signInMethodNames } from "../../../../auth/authSession"
import { SignInMethod } from "../../../../types"
import { buttonBase, secondaryButton } from "../../../components/buttonStyles"
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
 * Remove asks for confirmation in place, and is disabled, with the reason
 * beside it, for the session's method and the last one. Focus moves to
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
  const reasonId = useId()
  const removeButtonRef = useRef<HTMLButtonElement>(null)
  const keepButtonRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  const name = signInMethodNames[method]
  /** When the method was linked, formatted. */
  const addedAt = formatProfileDate(login.createdAt)
  /** When the method last opened the admin view, formatted, or undefined when never recorded. */
  const lastUsedAt = formatProfileDate(login.lastSignInAt)

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
              This session
            </span>
          )}
        </p>
        {login.isCurrent && sessionEmail && (
          <p className="m-0 text-sm text-cv-copy wrap-anywhere">
            {sessionEmail}
          </p>
        )}
        <p className="m-0 text-sm text-cv-muted">
          {addedAt && `Added ${addedAt}`}
          {addedAt && lastUsedAt && " · "}
          {lastUsedAt && `Last used ${lastUsedAt}`}
        </p>
      </div>
      {isConfirming ? (
        <div className="flex flex-wrap items-center gap-2 max-sm:ml-9">
          <span className="text-sm text-cv-ink">Remove {name}?</span>
          <button
            type="button"
            onClick={onConfirmRemove}
            disabled={isRemoving}
            className={`${buttonBase} border border-cv-danger text-cv-danger hover:bg-cv-overlay`}
          >
            {isRemoving ? "Removing…" : "Remove"}
          </button>
          <button
            ref={keepButtonRef}
            type="button"
            onClick={onKeep}
            disabled={isRemoving}
            className={secondaryButton}
          >
            Keep
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 max-sm:ml-9">
          {removeBlockedReason && (
            <span id={reasonId} className="text-xs text-cv-muted">
              {removeBlockedReason}
            </span>
          )}
          <button
            ref={removeButtonRef}
            type="button"
            onClick={onRequestRemove}
            disabled={removeBlockedReason !== null}
            aria-describedby={removeBlockedReason ? reasonId : undefined}
            aria-label={`Remove ${name}`}
            className={secondaryButton}
          >
            Remove
          </button>
        </div>
      )}
    </li>
  )
}
