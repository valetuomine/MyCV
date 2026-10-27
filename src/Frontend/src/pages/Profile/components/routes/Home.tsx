import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useRef, useState, type JSX } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import {
  clearAuthReturnPaths,
  logoutReturnPublicUrlSegmentKey,
  readSignOutReason,
} from "../../../../auth/adminLoginStorage"
import { signedOutLocationState } from "../../../../auth/signedOutState"
import Button from "../../../components/Button"
import RHFInput from "../../../components/RHFInput"
import { RoutePaths } from "../../../../routePaths"
import { ButtonVariant } from "../../../../types"
import {
  openCvDefaultValues,
  openCvSchema,
  type OpenCvSchema,
} from "../../schemas/open-cv-schema"

/**
 * The home page, where a visitor opens a CV by its link or public address.
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
   * Opens the CV the field points to, once the schema has turned it into a
   * public URL segment that isn't empty.
   */
  const submit = form.handleSubmit(({ cvAddress }) => {
    navigate(RoutePaths.CandidateProfile(cvAddress))
  })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl items-center pt-20 pb-12 lg:pt-4">
      <div className="grid w-full max-w-xl justify-items-start gap-8">
        <p className="flex items-center gap-3 font-cv-mono text-xs tracking-widest text-cv-copy uppercase">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-cv-accent"
          />
          MyCV
        </p>
        <div className="grid gap-4">
          <h1 className="m-0 font-cv-display text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            {t("home.heading")}
          </h1>
          <p className="m-0 max-w-[52ch] text-lg leading-relaxed text-pretty text-cv-copy">
            {t("home.intro")}
          </p>
        </div>
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
                <Button type="submit" variant={ButtonVariant.Primary}>
                  {t("home.submit")}
                </Button>
              }
            />
          </form>
        </FormProvider>
      </div>
    </main>
  )
}
