import { useEffect, useId, useRef, useState, type JSX } from "react"
import { useFormState } from "react-hook-form"
import {
  signInMethodForProvider,
  useDeleteLoginMutation,
  useGetLoginsQuery,
} from "../../../../api/loginQueries"
import {
  isSignInMethodConfigured,
  signInMethodNames,
  useAuthSession,
} from "../../../../auth/authSession"
import { startLinkSignIn } from "../../../../auth/linkSignIn"
import SignInMethodButton from "../../../../auth/SignInMethodButton"
import type { LinkSignInResult } from "../../../../auth/signInLocationState"
import { LinkOutcome, SignInMethod } from "../../../../types"
import { secondaryButton } from "../../../components/buttonStyles"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import SignInMethodRow from "./SignInMethodRow"

interface SignInMethodsSectionProps {
  publicUrlSegment?: string
  linkResult: LinkSignInResult | null
}

/** A message shown above the list, as a status or, for failures, an alert. */
interface SectionMessage {
  text: string
  isError: boolean
}

/**
 * Describes how adding a sign-in method ended.
 *
 * @param result - The method and the outcome.
 * @returns The message to show.
 */
function describeLinkResult(result: LinkSignInResult): SectionMessage {
  const { method, outcome } = result
  const name = signInMethodNames[method]
  switch (outcome) {
    case LinkOutcome.Linked:
      return {
        text: `${name} added. You can now sign in to this CV with it.`,
        isError: false,
      }
    case LinkOutcome.AlreadyLinked:
      return { text: `That ${name} account was already added.`, isError: false }
    case LinkOutcome.LinkedElsewhere:
      return {
        text: `That ${name} account is linked to another CV, so it can't be added here.`,
        isError: true,
      }
    case LinkOutcome.SameAccount:
      return {
        text: `That's the account you're signed in with now. Choose another ${name} account to add.`,
        isError: false,
      }
    case LinkOutcome.Cancelled:
      return { text: `Adding ${name} was cancelled.`, isError: false }
    default:
      return {
        text: `${name} couldn't be added. Try again, or come back later.`,
        isError: true,
      }
  }
}

/**
 * Reads the API's problem detail from a failed request.
 *
 * @param error - The RTK Query error.
 * @returns The detail, or null when the response has none.
 */
function problemDetail(error: unknown): string | null {
  return typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "detail" in error.data &&
    typeof error.data.detail === "string"
    ? error.data.detail
    : null
}

/**
 * The CV admin view's sign-in methods: the methods linked to the CV, with
 * Remove, and buttons that add Microsoft or Google by signing in with them
 * while the current session stays. Adding leaves the page, so it waits
 * until the profile has no unsaved changes. Returning from adding one, the
 * section takes focus, which also scrolls it into view, and shows how it
 * ended. Coming back with the browser's Back button instead, the add
 * buttons work again.
 *
 * @param props - The component props.
 * @param props.publicUrlSegment - The CV to return to after adding a method.
 * @param props.linkResult - How adding a method ended, when returning from it.
 * @returns The section.
 */
export default function SignInMethodsSection({
  publicUrlSegment,
  linkResult,
}: SignInMethodsSectionProps): JSX.Element {
  const headingId = useId()
  const addHintId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const session = useAuthSession()
  const { isDirty } = useFormState<ProfileSchema>()
  const loginsQuery = useGetLoginsQuery()
  const [deleteLogin, deleteLoginState] = useDeleteLoginMutation()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [startingMethod, setStartingMethod] = useState<SignInMethod | null>(
    null,
  )
  const [message, setMessage] = useState<SectionMessage | null>(() =>
    linkResult ? describeLinkResult(linkResult) : null,
  )
  /** The linked methods, or none while they load. */
  const logins = loginsQuery.data ?? []
  /** The methods this deployment can add. */
  const addableMethods = [SignInMethod.Microsoft, SignInMethod.Google].filter(
    isSignInMethodConfigured,
  )
  /** Why the add buttons are disabled, or null when they aren't. */
  const addBlockedReason = isDirty
    ? "Save or cancel your profile changes before adding a sign-in method."
    : null
  /** Whether adding is blocked now: by unsaved changes, a redirect starting, or a session or CV not yet known. */
  const isAddDisabled =
    addBlockedReason !== null ||
    startingMethod !== null ||
    session.isBusy ||
    !session.method ||
    !publicUrlSegment

  useEffect(() => {
    if (linkResult) {
      headingRef.current?.focus()
    }
  }, [linkResult])

  useEffect(() => {
    /**
     * Re-enables the add buttons when the browser restores this page from
     * its back/forward cache, for example after Back on the provider's page.
     *
     * @param event - The page's show event.
     */
    const resetOnRestore = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        setStartingMethod(null)
      }
    }
    window.addEventListener("pageshow", resetOnRestore)
    return () => window.removeEventListener("pageshow", resetOnRestore)
  }, [])

  /**
   * Leaves for the chosen method's sign-in, which returns to this CV.
   *
   * @param method - The method to add.
   */
  const addMethod = (method: SignInMethod): void => {
    if (!publicUrlSegment || !session.method) {
      return
    }

    setMessage(null)
    setStartingMethod(method)
    startLinkSignIn(method, publicUrlSegment, session.method).catch(() => {
      setStartingMethod(null)
      setMessage({
        text: `${signInMethodNames[method]} sign-in couldn't be opened. Try again.`,
        isError: true,
      })
    })
  }

  /**
   * Removes a method after confirmation, and explains a refusal.
   *
   * @param loginId - The method to remove.
   */
  const removeLogin = async (loginId: string): Promise<void> => {
    setMessage(null)
    try {
      await deleteLogin(loginId).unwrap()
      setConfirmingId(null)
      setMessage({ text: "Sign-in method removed.", isError: false })
    } catch (error: unknown) {
      setConfirmingId(null)
      setMessage({
        text:
          problemDetail(error) ??
          "The sign-in method couldn't be removed. Try again.",
        isError: true,
      })
    }
  }

  /**
   * Tells why a method can't be removed: the API refuses the session's own
   * method and the last one.
   *
   * @param isCurrent - Whether the method is the session's.
   * @returns The reason, or null when it can be removed.
   */
  const removeBlockedReason = (isCurrent: boolean): string | null =>
    logins.length <= 1
      ? "Your only sign-in method"
      : isCurrent
        ? "You're signed in with this"
        : null

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-6 border-t border-cv-line pt-12 lg:w-3/5"
    >
      <div className="grid gap-3">
        <p className="m-0 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          Account
        </p>
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="m-0 font-cv-display text-2xl font-semibold tracking-tight outline-none"
        >
          Sign-in methods
        </h2>
        <p className="m-0 max-w-[60ch] text-pretty text-cv-copy">
          You can sign in to manage this CV with any of these. Adding one asks
          you to sign in with it, and your current session stays.
        </p>
      </div>
      {message && (
        <p
          role={message.isError ? "alert" : "status"}
          className={`m-0 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${message.isError ? "border-cv-danger text-cv-danger" : "border-cv-line text-cv-ink"}`}
        >
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2 shrink-0 rounded-full ${message.isError ? "bg-cv-danger" : "bg-cv-accent"}`}
          />
          {message.text}
        </p>
      )}
      {loginsQuery.isLoading ? (
        <div aria-busy="true" className="grid gap-3">
          <span className="sr-only">Loading sign-in methods</span>
          {[0, 1].map((row) => (
            <div
              key={row}
              className="h-14 rounded-lg bg-cv-overlay motion-safe:animate-pulse"
            />
          ))}
        </div>
      ) : loginsQuery.isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="m-0 text-sm text-cv-danger">
            Your sign-in methods couldn't be loaded.
          </p>
          <button
            type="button"
            onClick={() => void loginsQuery.refetch()}
            className={secondaryButton}
          >
            Try again
          </button>
        </div>
      ) : (
        <ul className="m-0 list-none divide-y divide-cv-line border-y border-cv-line p-0">
          {logins.map((login) => {
            const { id } = login
            /** The login's method; rows without an ID or with an unknown provider are skipped. */
            const method = signInMethodForProvider(login.provider ?? "")
            return method && id ? (
              <SignInMethodRow
                key={id}
                login={login}
                method={method}
                sessionEmail={session.account?.username || undefined}
                removeBlockedReason={removeBlockedReason(
                  login.isCurrent ?? false,
                )}
                isConfirming={confirmingId === id}
                isRemoving={deleteLoginState.isLoading && confirmingId === id}
                onRequestRemove={() => setConfirmingId(id)}
                onConfirmRemove={() => void removeLogin(id)}
                onKeep={() => setConfirmingId(null)}
              />
            ) : null
          })}
        </ul>
      )}
      {addableMethods.length > 0 && (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-3">
            {addableMethods.map((method) => (
              <SignInMethodButton
                key={method}
                method={method}
                label={
                  startingMethod === method
                    ? `Opening ${signInMethodNames[method]}…`
                    : `Add ${signInMethodNames[method]}`
                }
                disabled={isAddDisabled}
                describedBy={addBlockedReason ? addHintId : undefined}
                onSelect={addMethod}
              />
            ))}
          </div>
          {addBlockedReason && (
            <p id={addHintId} className="m-0 text-sm text-cv-muted">
              {addBlockedReason}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
