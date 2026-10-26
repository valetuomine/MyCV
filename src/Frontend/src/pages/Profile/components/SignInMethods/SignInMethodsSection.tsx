import { useEffect, useId, useRef, useState, type JSX } from "react"
import { useFormState } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  signInMethodForProvider,
  useDeleteLoginMutation,
  useGetLoginsQuery,
  useLinkLoginMutation,
} from "../../../../api/loginQueries"
import { clearLinkSignInMarker } from "../../../../auth/adminLoginStorage"
import {
  isSignInMethodConfigured,
  signInMethodNames,
  useAuthSession,
} from "../../../../auth/authSession"
import { isSignInCancelled } from "../../../../auth/entraAuth"
import {
  completeLinkSignIn,
  startLinkSignIn,
  type LinkSignInPopupResult,
} from "../../../../auth/linkSignIn"
import SignInMethodButton from "../../../../auth/SignInMethodButton"
import type { LinkSignInResult } from "../../../../auth/signInLocationState"
import {
  cancelSignInPopup,
  prefersSignInPopup,
} from "../../../../auth/signInPopup"
import { LinkOutcome, SignInFailure, SignInMethod } from "../../../../types"
import Button from "../../../components/Button"
import LinkPopupMessage from "./LinkPopupMessage"
import type { ProfileSchema } from "../../schemas/profile-form-schema"
import SignInMethodRow from "./SignInMethodRow"

interface SignInMethodsSectionProps {
  publicUrlSegment?: string
  linkResult: LinkSignInResult | null
}

/**
 * A message shown above the list, as a status or, for failures, an alert.
 * It is kept as its key and worded at render, so it follows a language
 * change. The API's problem detail, when given, is shown as it came.
 */
interface SectionMessage {
  key:
    | "linked"
    | "alreadyLinked"
    | "linkedElsewhere"
    | "sameAccount"
    | "cancelled"
    | "failed"
    | "openFailed"
    | "removed"
    | "removeFailed"
  method?: SignInMethod
  detail?: string
  showMicrosoftWindowHint?: boolean
  isError: boolean
}

/**
 * How far adding a method has got: its popup is open, its new login is
 * being saved, or the browser is leaving for its redirect.
 */
interface LinkProgress {
  method: SignInMethod
  step: "popup" | "saving" | "redirect"
}

/**
 * Describes how adding a sign-in method ended.
 *
 * @param result - The method and the outcome.
 * @returns The message to show.
 */
function describeLinkResult(result: LinkSignInResult): SectionMessage {
  const { method, outcome } = result
  switch (outcome) {
    case LinkOutcome.Linked:
      return { key: "linked", method, isError: false }
    case LinkOutcome.AlreadyLinked:
      return { key: "alreadyLinked", method, isError: false }
    case LinkOutcome.LinkedElsewhere:
      return { key: "linkedElsewhere", method, isError: true }
    case LinkOutcome.SameAccount:
      return { key: "sameAccount", method, isError: false }
    case LinkOutcome.Cancelled:
      return { key: "cancelled", method, isError: false }
    default:
      return { key: "failed", method, isError: true }
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
 * while the current session stays. On devices with a mouse or trackpad, the
 * provider opens in a popup right in the click, and the add buttons give
 * way to `LinkPopupMessage`, whose Cancel takes focus; leaving the view
 * cancels the popup. The outcome then shows here without a reload: after
 * Cancel, closing Google's window or the timeout, focus returns to the
 * method's add button, described by the message, otherwise to the heading.
 * On touch devices, and when the browser blocks the popup, adding leaves for
 * a redirect instead. Adding can leave the page, so it waits until the
 * profile has no unsaved changes. Returning from a redirect, the section
 * takes focus, which also scrolls it into view, and shows how it ended.
 * Coming back from a redirect with the browser's Back button instead shows
 * the method as cancelled, like a cancelled popup, and drops the stale
 * linking marker; MSAL's own `user_cancelled` rejection of that redirect
 * is then no error. An add button is keyed by whether its method was just
 * cancelled, so it mounts again and its `autoFocus` applies.
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
  const { t } = useTranslation()
  const headingId = useId()
  const addHintId = useId()
  const messageId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const session = useAuthSession()
  const { isDirty } = useFormState<ProfileSchema>()
  const loginsQuery = useGetLoginsQuery()
  const [deleteLogin, deleteLoginState] = useDeleteLoginMutation()
  const [linkLogin] = useLinkLoginMutation()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [linkProgress, setLinkProgress] = useState<LinkProgress | null>(null)
  const [cancelledMethod, setCancelledMethod] = useState<SignInMethod | null>(
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
  const addBlockedReason = isDirty ? t("signInMethods.addBlocked") : null
  /** Whether adding is blocked now: by unsaved changes, adding under way, or a session or CV not yet known. */
  const isAddDisabled =
    addBlockedReason !== null ||
    linkProgress !== null ||
    session.isBusy ||
    !session.method ||
    !publicUrlSegment
  /** The method whose redirect is leaving the page, or null. */
  const redirectingMethod =
    linkProgress?.step === "redirect" ? linkProgress.method : null

  useEffect(() => {
    if (linkResult) {
      headingRef.current?.focus()
    }
  }, [linkResult])

  useEffect(() => {
    if (!redirectingMethod) {
      return
    }

    /**
     * Shows the redirect as cancelled, re-enables the add buttons and drops
     * the linking marker when the browser restores this page from its
     * back/forward cache, after Back on the provider's page.
     *
     * @param event - The page's show event.
     */
    const cancelOnRestore = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        clearLinkSignInMarker()
        setLinkProgress(null)
        setMessage(
          describeLinkResult({
            method: redirectingMethod,
            outcome: LinkOutcome.Cancelled,
          }),
        )
        setCancelledMethod(redirectingMethod)
      }
    }
    window.addEventListener("pageshow", cancelOnRestore)
    return () => window.removeEventListener("pageshow", cancelOnRestore)
  }, [redirectingMethod])

  useEffect(() => cancelSignInPopup, [])

  /**
   * Completes a linking popup's result and shows how it ended, in place.
   * A cancelled popup skips the saving step, so its add button mounts again
   * enabled and takes focus.
   *
   * @param method - The method being added.
   * @param popupResult - What the popup brought back.
   */
  const finishPopup = async (
    method: SignInMethod,
    popupResult: LinkSignInPopupResult,
  ): Promise<void> => {
    const isCancelled = popupResult.failure === SignInFailure.Cancelled
    if (!isCancelled) {
      setLinkProgress({ method, step: "saving" })
    }

    const outcome = await completeLinkSignIn({
      ...popupResult,
      submit: (linkToken, sessionToken) =>
        linkLogin({ linkToken, sessionToken }).unwrap(),
    })
    setLinkProgress(null)
    setMessage({
      ...describeLinkResult({ method, outcome }),
      showMicrosoftWindowHint: isCancelled && method === SignInMethod.Microsoft,
    })
    if (isCancelled) {
      setCancelledMethod(method)
    } else {
      headingRef.current?.focus()
    }
  }

  /**
   * Starts adding the chosen method in the click: the popup, whose result
   * shows here, or the redirect that returns to this CV.
   *
   * @param method - The method to add.
   */
  const addMethod = (method: SignInMethod): void => {
    if (!publicUrlSegment || !session.method) {
      return
    }

    setMessage(null)
    setCancelledMethod(null)
    setLinkProgress({
      method,
      step: prefersSignInPopup() ? "popup" : "redirect",
    })
    startLinkSignIn({
      method,
      publicUrlSegment,
      sessionMethod: session.method,
      onRedirect: () => setLinkProgress({ method, step: "redirect" }),
    }).then(
      (popupResult) =>
        popupResult ? finishPopup(method, popupResult) : undefined,
      (error: unknown) => {
        if (isSignInCancelled(error)) {
          return
        }

        setLinkProgress(null)
        setMessage({ key: "openFailed", method, isError: true })
      },
    )
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
      setMessage({ key: "removed", isError: false })
    } catch (error: unknown) {
      setConfirmingId(null)
      setMessage({
        key: "removeFailed",
        detail: problemDetail(error) ?? undefined,
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
      ? t("signInMethods.onlyMethod")
      : isCurrent
        ? t("signInMethods.currentMethod")
        : null

  /** The message's text in the active language, or the API's detail as it came. */
  const messageText = message
    ? (message.detail ??
      t(`signInMethods.${message.key}`, {
        provider: message.method ? signInMethodNames[message.method] : "",
      }) +
        (message.showMicrosoftWindowHint
          ? t("signIn.microsoftWindowHint")
          : ""))
    : null

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-6 border-t border-cv-line pt-12 lg:w-3/5"
    >
      <div className="grid gap-3">
        <p className="m-0 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          {t("signInMethods.eyebrow")}
        </p>
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="m-0 font-cv-display text-2xl font-semibold tracking-tight outline-none"
        >
          {t("signInMethods.heading")}
        </h2>
        <p className="m-0 max-w-[60ch] text-pretty text-cv-copy">
          {t("signInMethods.intro")}
        </p>
      </div>
      {message && (
        <p
          id={messageId}
          role={message.isError ? "alert" : "status"}
          className={`m-0 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${message.isError ? "border-cv-danger text-cv-danger" : "border-cv-line text-cv-ink"}`}
        >
          <span
            aria-hidden="true"
            className={`mt-1.5 size-2 shrink-0 rounded-full ${message.isError ? "bg-cv-danger" : "bg-cv-accent"}`}
          />
          {messageText}
        </p>
      )}
      {loginsQuery.isLoading ? (
        <div aria-busy="true" className="grid gap-3">
          <span className="sr-only">{t("signInMethods.loading")}</span>
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
            {t("signInMethods.loadFailed")}
          </p>
          <Button onClick={() => void loginsQuery.refetch()}>
            {t("common.tryAgain")}
          </Button>
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
      {linkProgress?.step === "popup" ? (
        <LinkPopupMessage
          method={linkProgress.method}
          onCancel={cancelSignInPopup}
        />
      ) : (
        addableMethods.length > 0 && (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-3">
              {addableMethods.map((method) => (
                <SignInMethodButton
                  key={`${method}-${method === cancelledMethod}`}
                  method={method}
                  label={
                    linkProgress?.method === method
                      ? linkProgress.step === "saving"
                        ? t("signInMethods.adding", {
                            provider: signInMethodNames[method],
                          })
                        : t("signInMethods.opening", {
                            provider: signInMethodNames[method],
                          })
                      : t("signInMethods.add", {
                          provider: signInMethodNames[method],
                        })
                  }
                  disabled={isAddDisabled}
                  autoFocus={method === cancelledMethod}
                  describedBy={
                    [
                      addBlockedReason ? addHintId : null,
                      method === cancelledMethod && message ? messageId : null,
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
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
        )
      )}
    </section>
  )
}
