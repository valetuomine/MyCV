import { zodResolver } from "@hookform/resolvers/zod"
import { m as motion, type Variants } from "framer-motion"
import { useId, type JSX, type SubmitEvent } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useLazyGetCandidateQuery } from "../../../../api/candidateQueries"
import {
  isSignInConfigured,
  useAuthSession,
} from "../../../../auth/authSession"
import { RoutePaths } from "../../../../routePaths"
import { ButtonVariant } from "../../../../types"
import Button from "../../../components/Button"
import { headingClassName } from "../../../components/headingClassName"
import RHFInput from "../../../components/RHFInput"
import {
  openCvDefaultValues,
  openCvSchema,
  type OpenCvSchema,
} from "../../schemas/open-cv-schema"
import { describeCvLookupError } from "../../utils/describeCvLookupError"

interface OpenCvSectionProps {
  variants?: Variants
  className?: string
}

/**
 * The home page's quiet way to any CV: a form that opens a CV by its link or
 * public address, and under it a link that takes a CV's owner to sign in and
 * manage it, or straight to managing it when they are signed in already. The
 * form looks the CV up before leaving, so a wrong address shows its error
 * under the field instead of an error page. While MSAL is busy, for example
 * starting up or handling a redirect, the owner link stays hidden in its
 * place, so its wording never switches before the eyes and nothing shifts
 * when it appears. Without any sign-in method set up it isn't shown at all.
 * The section rises in without a fade, because its field is a blurred Pane
 * and a fading ancestor would switch off the blur until the fade ends.
 *
 * @param props - The component props.
 * @param props.variants - The section's entrance, started by the page.
 * @param props.className - Layout classes from the page.
 * @returns The open form and the owner link.
 */
export default function OpenCvSection({
  variants,
  className = "",
}: Readonly<OpenCvSectionProps>): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const form = useForm<OpenCvSchema>({
    resolver: zodResolver(openCvSchema),
    defaultValues: openCvDefaultValues,
  })
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = form
  const headingId = useId()
  const [lookUpCandidate] = useLazyGetCandidateQuery()
  const { isSignedIn, isBusy } = useAuthSession()

  /**
   * Looks up the CV the field points to, once the schema has turned it into
   * a public URL segment that isn't empty, and opens it. A missing CV or a
   * failed request becomes the field's error instead, which the submit's
   * shake then shows.
   */
  const lookUpAndOpen = handleSubmit(async ({ cvAddress }) => {
    const { error } = await lookUpCandidate(cvAddress, true)
    if (error) {
      setError(
        "cvAddress",
        { type: "lookup", message: describeCvLookupError(error) },
        { shouldFocus: true },
      )
      return
    }

    void navigate(RoutePaths.CandidateProfile(cvAddress))
  })

  /**
   * Submits the form unless a look-up is already running. The loading button
   * blocks clicks but not a second Enter in the field, which would start
   * another look-up and end the first one's loading state early.
   *
   * @param event - The form's submit event.
   */
  const submit = (event: SubmitEvent<HTMLFormElement>): void => {
    if (isSubmitting) {
      event.preventDefault()
      return
    }

    void lookUpAndOpen(event)
  }

  return (
    <motion.section
      variants={variants}
      aria-labelledby={headingId}
      className={`grid w-full gap-4 ${className}`}
    >
      <h2 id={headingId} className={headingClassName}>
        {t("home.openHeading")}
      </h2>
      <FormProvider {...form}>
        <form noValidate onSubmit={submit} className="grid w-full">
          <RHFInput<OpenCvSchema>
            name="cvAddress"
            label={t("home.inputLabel")}
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            action={
              <Button
                type="submit"
                variant={ButtonVariant.Secondary}
                loading={isSubmitting}
                loadingText={t("home.opening")}
              >
                {t("home.submit")}
              </Button>
            }
          />
        </form>
      </FormProvider>
      {isSignInConfigured && (
        <p
          className={`m-0 flex flex-wrap items-center gap-x-3.5 text-sm text-cv-copy transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${isBusy ? "invisible opacity-0" : "visible opacity-100"}`}
        >
          {!isSignedIn && t("home.ownerPrompt")}
          <Button
            to={RoutePaths.AdminCreateProfile}
            variant={ButtonVariant.Text}
          >
            {isSignedIn ? t("home.ownerManage") : t("home.ownerSignIn")}
          </Button>
        </p>
      )}
    </motion.section>
  )
}
