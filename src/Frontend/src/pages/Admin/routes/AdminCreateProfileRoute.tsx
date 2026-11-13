import { zodResolver } from "@hookform/resolvers/zod"
import { useState, type JSX } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { useGetOwnCandidateQuery } from "../../../api/candidateQueries"
import { useCreateProfileMutation } from "../../../api/profileQueries"
import { returnAdminPathKey } from "../../../auth/adminLoginStorage"
import {
  isGoogleRenewalPending,
  isSignInConfigured,
  useAuthSession,
} from "../../../auth/authSession"
import SignInMessage from "../../../auth/SignInMessage"
import SignInRouteFallback from "../../../auth/SignInRouteFallback"
import useLoginRedirect from "../../../auth/useLoginRedirect"
import { RoutePaths } from "../../../routePaths"
import { ButtonVariant, SubmitFailureReason, Tone } from "../../../types"
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
  | { reason: typeof SubmitFailureReason.NoPublicUrl }
  | { reason: typeof SubmitFailureReason.Request; error: unknown }

/**
 * Turns a failed look-up of the user's own CV into a message. A missing CV
 * (404) never reaches it, and a refused sign-in (401) only shows once the
 * shared sign-in-again message (`SessionExpiredMessage`) has closed.
 *
 * @param status - The failed look-up's status.
 * @param t - The translation function.
 * @returns The message.
 */
function describeOwnCvError(status: unknown, t: TFunction): string {
  if (status === 401) {
    return t("sessionExpired.refusedAgain")
  }

  return status === "FETCH_ERROR" || status === "TIMEOUT_ERROR"
    ? t("cv.unreachable")
    : t("createProfile.ownCvFailed")
}

/**
 * Words a failed creation.
 *
 * @param failure - Why the creation failed.
 * @param t - The translation function.
 * @returns The message to show under the form.
 */
function describeSubmitFailure(failure: SubmitFailure, t: TFunction): string {
  return failure.reason === SubmitFailureReason.NoPublicUrl
    ? t("createProfile.noPublicUrl")
    : getProfileFormError(failure.error, t("formErrors.creation"), t)
}

/**
 * The `/admin` route for creating a profile. Lets the user choose a sign-in
 * method and signs them in first. Once signed in, it looks up the user's own
 * CV and sends an owner straight on to managing it; only a user without a CV
 * sees the form, with a preview of the CV link, and the new CV opens once it
 * is created. The form stays hidden during the look-up, so it never flashes
 * before the redirect. When the API no longer accepts the sign-in (401),
 * the shared `SessionExpiredMessage` offers to sign in again over the
 * route, and signing in again refetches the look-up through its `Session`
 * tag. A 401 while a silent Google renewal is leaving for Google keeps the
 * loader. A failed creation
 * is kept as its cause and worded at render, so its message follows a
 * language change.
 *
 * @returns The sign-in screen until signed in, a loader during the look-up,
 *   a redirect to the user's own CV, an error message when the look-up fails,
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
        setSubmitFailure({ reason: SubmitFailureReason.NoPublicUrl })
        return
      }

      navigate(RoutePaths.CandidateProfile(result.publicUrlSegment), {
        replace: true,
      })
    } catch (error: unknown) {
      setSubmitFailure({ reason: SubmitFailureReason.Request, error })
    }
  })

  /** The failed creation's message, in the active language. */
  const submitError = submitFailure
    ? describeSubmitFailure(submitFailure, t)
    : undefined

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
