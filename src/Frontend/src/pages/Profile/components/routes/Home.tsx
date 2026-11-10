import { zodResolver } from "@hookform/resolvers/zod"
import { m as motion, type Variants } from "framer-motion"
import {
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type SubmitEvent,
} from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import { useLazyGetCandidateQuery } from "../../../../api/candidateQueries"
import {
  clearAuthReturnPaths,
  logoutReturnPublicUrlSegmentKey,
  readSignOutReason,
} from "../../../../auth/adminLoginStorage"
import {
  isSignInConfigured,
  useAuthSession,
} from "../../../../auth/authSession"
import { signedOutLocationState } from "../../../../auth/signedOutState"
import Button from "../../../components/Button"
import RHFInput from "../../../components/RHFInput"
import { RoutePaths } from "../../../../routePaths"
import { ButtonVariant } from "../../../../types"
import { describeCvLookupError } from "../../utils/describeCvLookupError"
import FeaturedCvSection from "../FeaturedCv/FeaturedCvSection"
import {
  openCvDefaultValues,
  openCvSchema,
  type OpenCvSchema,
} from "../../schemas/open-cv-schema"

/** Staggers the home page's parts in one after another. */
const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

/** Lets each part of the home page rise into place. */
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
}

/**
 * The home page: what MyCV is, a card for the CV the API features, and a
 * form that opens any CV by its link or public address. The card shows a
 * skeleton while it loads and quietly stays away when no CV is featured or
 * the request fails. The form looks the CV up before leaving, so a wrong
 * address shows its error under the field instead of an error page. Under
 * the form, a quiet link takes a CV's owner to sign in and manage it, or
 * straight to managing it when they are signed in already. While MSAL is
 * busy, for example starting up or handling a redirect, the link stays
 * hidden in its place, so its wording never switches before the eyes and
 * the form doesn't shift when it appears. Without any sign-in method set up
 * it isn't shown at all.
 *
 * It is also where a sign-out lands: it returns to the CV the user
 * signed out from, or stays here, and flags the sign-out for the notice.
 *
 * @returns A redirect to the CV after sign-out, otherwise the home page.
 */
export default function Home(): JSX.Element {
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
  const openHeadingId = useId()
  const [lookUpCandidate] = useLazyGetCandidateQuery()
  const { isSignedIn, isBusy } = useAuthSession()

  /**
   * Set before a sign-out lands here: the CV to return to, or "" to stay on
   * Home, and why the user was signed out.
   */
  const [{ logoutReturnSegment, signOutReason }] = useState(() => ({
    logoutReturnSegment: sessionStorage.getItem(
      logoutReturnPublicUrlSegmentKey,
    ),
    signOutReason: readSignOutReason(),
  }))
  const hasHandledLogout = useRef(false)

  useEffect(() => {
    clearAuthReturnPaths()
    if (logoutReturnSegment === "" && !hasHandledLogout.current) {
      hasHandledLogout.current = true
      navigate(RoutePaths.Home, {
        replace: true,
        state: signedOutLocationState(signOutReason),
      })
    }
  }, [logoutReturnSegment, navigate, signOutReason])

  if (logoutReturnSegment) {
    return (
      <Navigate
        to={RoutePaths.CandidateProfile(logoutReturnSegment)}
        replace
        state={signedOutLocationState(signOutReason)}
      />
    )
  }

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

    navigate(RoutePaths.CandidateProfile(cvAddress))
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
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center pt-20 pb-12 lg:pt-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid w-full max-w-2xl justify-items-start gap-10"
      >
        <motion.div variants={item} className="grid gap-6">
          <p className="m-0 flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-cv-accent"
            />
            MyCV
          </p>
          <div className="grid gap-4">
            <h1 className="m-0 font-cv-display text-4xl leading-tight font-semibold tracking-tighter text-balance sm:text-5xl">
              {t("home.heading")}
            </h1>
            <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-pretty text-cv-copy">
              {t("home.intro")}
            </p>
          </div>
        </motion.div>
        <FeaturedCvSection />
        <motion.section
          variants={item}
          aria-labelledby={openHeadingId}
          className="grid w-full gap-4"
        >
          <h2
            id={openHeadingId}
            className="m-0 font-cv-display text-lg font-medium tracking-tight text-cv-ink"
          >
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
                    variant={ButtonVariant.Primary}
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
      </motion.div>
    </main>
  )
}
