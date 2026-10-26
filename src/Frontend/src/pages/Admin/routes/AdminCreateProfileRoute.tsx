import { zodResolver } from "@hookform/resolvers/zod"
import { useState, type JSX } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useCreateProfileMutation } from "../../../api/profileQueries"
import { returnAdminPathKey } from "../../../auth/adminLoginStorage"
import { isSignInConfigured, useAuthSession } from "../../../auth/authSession"
import SignInMessage from "../../../auth/SignInMessage"
import useLoginRedirect from "../../../auth/useLoginRedirect"
import { translateValidationMessage } from "../../../i18n/validationMessage"
import { RoutePaths } from "../../../routePaths"
import { ButtonVariant } from "../../../types"
import Button from "../../components/Button"
import ProfileFields from "../../Profile/components/forms/ProfileFields"
import {
  createProfileSchema,
  createProfileDefaultValues,
  type CreateProfileSchema,
} from "../../Profile/schemas/profile-form-schema"
import { toCreateProfileRequest } from "../../Profile/mappers/profileFormMapper"
import { getProfileFormError } from "../../Profile/utils/profileFormUtils"

/**
 * Why the last creation failed: no public URL came back, or the request
 * failed.
 */
type SubmitFailure =
  { reason: "noPublicUrl" } | { reason: "request"; error: unknown }

/**
 * The `/admin` route for creating a profile. Lets the user choose a sign-in
 * method and signs them in first, then shows the form with a preview of the CV link, and opens the new CV once it
 * is created. A failed creation is kept as its cause and worded at render,
 * so its message follows a language change.
 *
 * @returns The sign-in screen until signed in, then the create-profile form.
 */
export default function AdminCreateProfileRoute(): JSX.Element {
  const { t } = useTranslation()
  const { isSignedIn, isBusy } = useAuthSession()
  const navigate = useNavigate()
  const [submitFailure, setSubmitFailure] = useState<SubmitFailure | null>(null)
  const [createProfile, createState] = useCreateProfileMutation()
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

  const publicUrlSegmentError = translateValidationMessage(
    t,
    form.formState.errors.publicUrlSegment?.message,
  )

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

  /** The failed creation's message, in the active language. */
  const submitError =
    submitFailure === null
      ? undefined
      : submitFailure.reason === "noPublicUrl"
        ? t("createProfile.noPublicUrl")
        : getProfileFormError(submitFailure.error, t("formErrors.creation"), t)

  if (!isSignInConfigured || !isSignedIn || isBusy) {
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
            <div className="grid min-w-0 gap-2">
              <label
                htmlFor="profile-public-url-segment"
                className="font-cv-mono text-xs tracking-wide text-cv-muted uppercase"
              >
                {t("createProfile.cvLink")}
              </label>
              <input
                id="profile-public-url-segment"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={100}
                {...form.register("publicUrlSegment")}
                aria-invalid={publicUrlSegmentError ? true : undefined}
                aria-describedby={
                  publicUrlSegmentError
                    ? "profile-public-url-segment-error"
                    : undefined
                }
                className="min-h-11 min-w-0 rounded-lg border border-cv-field bg-cv-wash px-3.5 py-2.5 text-cv-ink transition-colors outline-none placeholder:text-cv-meta hover:border-cv-muted focus:border-cv-accent focus:ring-3 focus:ring-cv-accent/20 aria-invalid:border-cv-danger aria-invalid:ring-cv-danger/20"
              />
              <p className="m-0 min-w-0 text-sm text-cv-muted">
                {t("createProfile.cvLinkPreview")}{" "}
                <span className="break-all text-cv-ink">
                  {window.location.origin}/
                  {publicUrlSegment || t("createProfile.cvLinkPlaceholder")}
                </span>
              </p>
              {publicUrlSegmentError && (
                <span
                  id="profile-public-url-segment-error"
                  role="alert"
                  className="text-sm text-cv-danger"
                >
                  {publicUrlSegmentError}
                </span>
              )}
            </div>
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
