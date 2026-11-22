import { zodResolver } from "@hookform/resolvers/zod"
import { m as motion } from "framer-motion"
import type { TFunction } from "i18next"
import { useAtomValue } from "jotai"
import { useEffect, useState, type JSX, type RefObject } from "react"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useCreateProfileMutation } from "../../../api/profileQueries"
import { RoutePaths } from "../../../routePaths"
import { languageAtom } from "../../../state/languageAtoms"
import {
  ButtonVariant,
  SubmitFailureReason,
  type CreateProfileDraft,
  type SubmitFailure,
} from "../../../types"
import Button from "../../components/Button"
import RHFInput from "../../components/RHFInput"
import { paneReveal, revealItem, revealStagger } from "../../components/reveal"
import FormLanguageProvider from "../../Profile/components/forms/FormLanguageProvider"
import ProfileFields from "../../Profile/components/forms/ProfileFields"
import { toCreateProfileRequest } from "../../Profile/mappers/profileFormMapper"
import {
  createProfileDefaultValues,
  createProfileSchema,
  type CreateProfileSchema,
} from "../../Profile/schemas/profile-form-schema"
import { getProfileFormError } from "../../Profile/utils/profileFormUtils"

/** The props of the create-profile form. */
interface CreateProfileFormProps {
  /**
   * What the user had entered when the form last unmounted, kept by the
   * route, or null before the form has been shown.
   */
  draft: RefObject<CreateProfileDraft | null>
  /** The sign-in method and account of the current session. */
  draftOwner: string
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
 * The create-profile form on `/admin`, with a preview of the CV link; the
 * new CV opens once it is created. It mounts only once the route knows the
 * user has no CV, so its default language, and the first language it
 * edits, is the UI language at that moment (`languageAtom`). Switching the
 * UI language later leaves the form's choice alone, so the user's own
 * choice never changes under them. Its parts rise in one after another like
 * the home page's, with the fields' Panes fading themselves (`paneReveal`)
 * so their blur stays on. A failed creation is kept as its cause and worded
 * at render, so its message follows a language change. The route hides the
 * form while the user signs in again or their CV is looked up again, so the
 * form saves what the user has entered in the route's `draft` when it
 * unmounts and starts from it when it mounts again: nothing typed is lost,
 * and the language choice stays the user's. The draft is marked with the
 * session's account and used only when the same account comes back, so
 * another account signing in on the same tab starts from an empty form.
 *
 * @param props - The component props.
 * @param props.draft - What the user had entered when the form last
 *   unmounted, or null before the form has been shown.
 * @param props.draftOwner - The sign-in method and account of the current
 *   session.
 * @returns The create-profile form.
 */
export default function CreateProfileForm({
  draft,
  draftOwner,
}: Readonly<CreateProfileFormProps>): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const language = useAtomValue(languageAtom)
  const [submitFailure, setSubmitFailure] = useState<SubmitFailure | null>(null)
  const [createProfile, createState] = useCreateProfileMutation()

  /**
   * The create form, which reads its default values only when it is
   * created: the saved draft when it is this account's, otherwise the
   * defaults in the UI language. Every
   * field validates on each change, so a required field shows its message
   * as soon as it is emptied, before Save.
   */
  const form = useForm<CreateProfileSchema>({
    resolver: zodResolver(createProfileSchema),
    defaultValues:
      draft.current?.owner === draftOwner
        ? draft.current.values
        : createProfileDefaultValues(language),
    mode: "onChange",
  })

  useEffect(() => {
    return () => {
      draft.current = { owner: draftOwner, values: form.getValues() }
    }
  }, [draft, draftOwner, form])

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

      void navigate(RoutePaths.CandidateProfile(result.publicUrlSegment), {
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

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-20 pb-12 text-cv-copy lg:pt-12">
      <FormProvider {...form}>
        <motion.form
          variants={revealStagger}
          initial="hidden"
          animate="visible"
          onSubmit={submit}
          noValidate
          aria-busy={createState.isLoading}
          className="grid w-full max-w-3xl gap-6"
        >
          <motion.h1
            variants={revealItem}
            className="m-0 min-w-0 font-cv-display text-4xl font-semibold tracking-tight wrap-break-word text-cv-ink"
          >
            {t("createProfile.heading")}
          </motion.h1>
          <motion.fieldset
            variants={paneReveal}
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
          </motion.fieldset>
          <FormLanguageProvider>
            <ProfileFields isDisabled={createState.isLoading} isNew />
          </FormLanguageProvider>
          {submitError && (
            <p role="alert" className="m-0 text-sm text-cv-danger">
              {submitError}
            </p>
          )}
          <motion.div variants={revealItem} className="flex flex-wrap gap-3">
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
          </motion.div>
        </motion.form>
      </FormProvider>
    </main>
  )
}
