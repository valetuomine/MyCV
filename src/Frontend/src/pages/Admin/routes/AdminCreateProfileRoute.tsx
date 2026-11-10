import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState, type JSX } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { useGetOwnCandidateQuery } from "../../../api/candidateQueries"
import { useCreateProfileMutation } from "../../../api/profileQueries"
import {
  clearExpiredSessionMarker,
  returnAdminPathKey,
  wasExpiredSessionCleared,
} from "../../../auth/adminLoginStorage"
import {
  clearExpiredSession,
  isGoogleRenewalPending,
  isSignInConfigured,
  useAuthSession,
} from "../../../auth/authSession"
import SignInMessage from "../../../auth/SignInMessage"
import SignInRouteFallback from "../../../auth/SignInRouteFallback"
import useLoginRedirect from "../../../auth/useLoginRedirect"
import { RoutePaths } from "../../../routePaths"
import { ButtonVariant, Tone } from "../../../types"
import Button from "../../components/Button"
import RHFInput from "../../components/RHFInput"
import ProfileFields from "../../Profile/components/forms/ProfileFields"
import RouteMessage from "../../Profile/components/RouteMessage"
import {
  createProfileSchema,
  createProfileDefaultValues,
  type CreateProfileSchema,
} from "../../Profile/schemas/profile-form-schema"
import { toCreateProfileRequest } from "../../Profile/mappers/profileFormMapper"
import { getProfileFormError } from "../../Profile/utils/profileFormUtils"
import { errorStatus } from "../../Profile/utils/describeRouteError"

/**
 * Why the last creation failed: no public URL came back, or the request
 * failed.
 */
type SubmitFailure =
  { reason: "noPublicUrl" } | { reason: "request"; error: unknown }

/**
 * Turns a failed look-up of the user's own CV into a message. A missing CV
 * (404) never reaches it, and a refused sign-in (401) only once Sign in
 * again has already dropped one refused session, so signing in again won't
 * help.
 *
 * @param status - The failed look-up's status.
 * @param t - The translation function.
 * @returns The message.
 */
function describeOwnCvError(status: unknown, t: TFunction): string {
  if (status === 401) {
    return t("createProfile.sessionRefused")
  }

  return status === "FETCH_ERROR" || status === "TIMEOUT_ERROR"
    ? t("cv.unreachable")
    : t("createProfile.ownCvFailed")
}

/**
 * The `/admin` route for creating a profile. Lets the user choose a sign-in
 * method and signs them in first. Once signed in, it looks up the user's own
 * CV and sends an owner straight on to managing it; only a user without a CV
 * sees the form, with a preview of the CV link, and the new CV opens once it
 * is created. The form stays hidden during the look-up, so it never flashes
 * before the redirect. When the API no longer accepts the sign-in (401),
 * Sign in again drops the stale session and reloads, so the sign-in screen
 * takes over and returns here; retrying would only send the same token
 * again. A 401 while a silent Google renewal is leaving for Google keeps the
 * loader, and a 401 after a session was already dropped shows an error, so
 * a sign-in the API keeps refusing doesn't loop. An effect forgets the
 * dropped session once the API accepts the sign-in again. A failed creation
 * is kept as its cause and worded at render, so its message follows a
 * language change.
 *
 * @returns The sign-in screen until signed in, a loader during the look-up,
 *   a redirect to the user's own CV, a sign-in-again message when the
 *   sign-in has expired, an error message when the look-up otherwise fails,
 *   otherwise the create-profile form.
 */
export default function AdminCreateProfileRoute(): JSX.Element {
  const { t } = useTranslation()
  const { isSignedIn, isBusy } = useAuthSession()
  const navigate = useNavigate()
  const [submitFailure, setSubmitFailure] = useState<SubmitFailure | null>(null)
  const [createProfile, createState] = useCreateProfileMutation()
  /** Whether the user is signed in and settled, so their own CV can be looked up. */
  const canLookUpOwnCv = isSignInConfigured && isSignedIn && !isBusy
  const ownCandidate = useGetOwnCandidateQuery(undefined, {
    skip: !canLookUpOwnCv,
    refetchOnMountOrArgChange: true,
  })
  /** The status of the failed own-CV look-up, or null while it hasn't failed. */
  const ownCvErrorStatus = ownCandidate.isError
    ? errorStatus(ownCandidate.error)
    : null
  /** Whether the API accepted the sign-in: it found the user's CV or none. */
  const isSignInAccepted = ownCandidate.isSuccess || ownCvErrorStatus === 404
  const [isSigningInAgain, setIsSigningInAgain] = useState(false)
  const [signInAgainFailed, setSignInAgainFailed] = useState(false)

  useEffect(() => {
    if (isSignInAccepted) {
      clearExpiredSessionMarker()
    }
  }, [isSignInAccepted])

  const loginRedirect = useLoginRedirect({
    enabled: true,
    redirectPath: RoutePaths.AdminCreateProfile,
    storageKey: returnAdminPathKey,
    storageValue: RoutePaths.AdminCreateProfile,
  })

  const form = useForm<CreateProfileSchema>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: createProfileDefaultValues,
  })

  const { handleSubmit } = form

  const publicUrlSegment = useWatch({
    control: form.control,
    name: "publicUrlSegment",
  })

  /**
   * Validates and creates the profile, then opens it at its public URL.
   * Shows an error when creation fails or no public URL comes back.
   */
  const submit = handleSubmit(async (data) => {
    setSubmitFailure(null)

    try {
      const result = await createProfile(toCreateProfileRequest(data)).unwrap()
      if (!result.publicUrlSegment) {
        setSubmitFailure({ reason: "noPublicUrl" })
        return
      }

      navigate(RoutePaths.CandidateProfile(result.publicUrlSegment), {
        replace: true,
      })
    } catch (error: unknown) {
      setSubmitFailure({ reason: "request", error })
    }
  })

  /**
   * Drops the refused session, which reloads the page into the sign-in
   * screen. Shows an error under the buttons when it can't be dropped.
   */
  const signInAgain = (): void => {
    setSignInAgainFailed(false)
    setIsSigningInAgain(true)
    clearExpiredSession().catch(() => {
      setIsSigningInAgain(false)
      setSignInAgainFailed(true)
    })
  }

  /** The failed creation's message, in the active language. */
  const submitError =
    submitFailure === null
      ? undefined
      : submitFailure.reason === "noPublicUrl"
        ? t("createProfile.noPublicUrl")
        : getProfileFormError(submitFailure.error, t("formErrors.creation"), t)

  if (!canLookUpOwnCv) {
    return (
      <SignInMessage
        {...loginRedirect}
        title={t("createProfile.signInTitle")}
        description={t("createProfile.signInDescription")}
        pendingTitle={t("createProfile.signInPending")}
        backLabel={t("common.openCv")}
        onBack={() => navigate(RoutePaths.Home)}
      />
    )
  }

  if (ownCandidate.isFetching || ownCandidate.isUninitialized) {
    return <SignInRouteFallback />
  }

  if (ownCandidate.currentData?.publicUrlSegment) {
    return (
      <Navigate
        to={RoutePaths.CandidateAdmin(
          ownCandidate.currentData.publicUrlSegment,
        )}
        replace
      />
    )
  }

  if (ownCvErrorStatus === 401 && isGoogleRenewalPending()) {
    return <SignInRouteFallback />
  }

  if (ownCvErrorStatus === 401 && !wasExpiredSessionCleared()) {
    return (
      <RouteMessage
        description={t("createProfile.sessionExpiredDescription")}
        actions={
          <>
            <Button
              variant={ButtonVariant.Primary}
              onClick={signInAgain}
              loading={isSigningInAgain}
            >
              {t("createProfile.signInAgain")}
            </Button>
            <Button
              onClick={() => navigate(RoutePaths.Home)}
              disabled={isSigningInAgain}
            >
              {t("common.openCv")}
            </Button>
            {signInAgainFailed && (
              <p role="alert" className="m-0 basis-full text-sm text-cv-danger">
                {t("createProfile.signInAgainFailed")}
              </p>
            )}
          </>
        }
      >
        {t("createProfile.sessionExpiredTitle")}
      </RouteMessage>
    )
  }

  if (ownCvErrorStatus !== null && ownCvErrorStatus !== 404) {
    return (
      <RouteMessage
        tone={Tone.Error}
        onRetry={() => void ownCandidate.refetch()}
      >
        {describeOwnCvError(ownCvErrorStatus, t)}
      </RouteMessage>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-20 pb-12 text-cv-copy lg:pt-12">
      <FormProvider {...form}>
        <form
          onSubmit={submit}
          noValidate
          aria-busy={createState.isLoading}
          className="grid w-full max-w-3xl gap-6"
        >
          <h1 className="m-0 font-cv-display text-4xl font-semibold tracking-tight text-cv-ink">
            {t("createProfile.heading")}
          </h1>
          <fieldset
            disabled={createState.isLoading}
            className="m-0 grid min-w-0 gap-5 border-0 p-0"
          >
            <legend className="sr-only">
              {t("createProfile.publicAddress")}
            </legend>
            <RHFInput<CreateProfileSchema>
              name="publicUrlSegment"
              label={t("createProfile.cvLink")}
              maxLength={100}
              required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              description={
                <>
                  {t("createProfile.cvLinkPreview")}{" "}
                  <span className="break-all text-cv-ink">
                    {window.location.origin}/
                    {publicUrlSegment || t("createProfile.cvLinkPlaceholder")}
                  </span>
                </>
              }
            />
          </fieldset>
          <ProfileFields isDisabled={createState.isLoading} />
          {submitError && (
            <p role="alert" className="m-0 text-sm text-cv-danger">
              {submitError}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant={ButtonVariant.Primary}
              loading={createState.isLoading}
              loadingText={t("createProfile.creating")}
            >
              {t("createProfile.submit")}
            </Button>
            <Button
              onClick={() => navigate(RoutePaths.Home)}
              disabled={createState.isLoading}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      </FormProvider>
    </main>
  )
}
