import { m as motion, type Variants } from "framer-motion"
import { useEffect, useRef, useState, type JSX } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import {
  clearAuthReturnPaths,
  logoutReturnPublicUrlSegmentKey,
  readSignOutReason,
} from "../../../../auth/adminLoginStorage"
import { signedOutLocationState } from "../../../../auth/signedOutState"
import Eyebrow from "../../../components/Eyebrow"
import { RoutePaths } from "../../../../routePaths"
import { FeaturedCvStatus } from "../../../../types"
import { homeHeadingClassName } from "../displayTypeClassNames"
import FeaturedCvAddress from "../FeaturedCv/FeaturedCvAddress"
import FeaturedCvSection from "../FeaturedCv/FeaturedCvSection"
import useFeaturedCv from "../FeaturedCv/useFeaturedCv"
import HomeFacts from "../Home/HomeFacts"
import OpenCvSection from "../Home/OpenCvSection"
import ProfileName from "../ProfileName"

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
 * The hero's two columns from `lg` up, the text and the featured card: 30rem
 * for the card at `lg` and 36rem from `xl` up. The text column keeps room for
 * the heading on at most three lines and the address on one row, so the
 * card, which is as tall as the text column, stays low, and the card keeps
 * room for a usual two-part name on one line beside its portrait. Without a
 * featured CV the hero keeps one column, so no empty track is left beside
 * the text.
 */
const heroColumnsClassName =
  "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] xl:gap-16"

/**
 * Lets a part with a blurred Pane rise into place without a fade, such as
 * the open form's field, the address pill and the featured card: a fading
 * ancestor would switch off the blur until the fade ends, so the dot grid
 * would show through and then snap away.
 */
const rise: Variants = {
  hidden: { y: 18 },
  visible: {
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 20 },
  },
}

/**
 * The home page as a landing page for a CV's viewers. The hero says what
 * MyCV is: its heading assembles letter by letter like a CV's name
 * (`ProfileName`) and lights the background with the sweep and the echo,
 * and under the intro the featured CV's link stands as an address to copy.
 * From `lg` up the featured CV's card, whose View CV is the page's one
 * primary action, stands beside the text, as tall as the text column, so
 * its edges line up with the eyebrow and the address row; a card taller
 * than the text keeps the text's rows together at the top. Without a
 * featured CV the hero is the text alone, with neither the address nor the
 * card. A language switch remounts the heading, so its reveal, the sweep and
 * the echo play again as a whole instead of re-revealing only the letters
 * whose keys changed, while the directed light stays on (`useLightHold`).
 * Below the hero come the facts about the link and, last and quiet, the form
 * that opens any CV and the owner's sign-in link. The hero keeps the light
 * traces away (`data-cv-trace-avoid`).
 *
 * A sign-out lands here first: it redirects to the CV it started from, or,
 * when it started here, replaces the entry with Home and the signed-out
 * notice's state, once.
 *
 * @returns A redirect to the CV after sign-out, otherwise the home page.
 */
export default function Home(): JSX.Element {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const hasFeaturedCv = useFeaturedCv().status !== FeaturedCvStatus.None

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
      void navigate(RoutePaths.Home, {
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

  return (
    <main className="mx-auto w-full max-w-7xl pt-24 pb-24 lg:pt-32">
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="grid gap-24 lg:gap-32"
      >
        <div
          data-cv-trace-avoid=""
          className={`grid items-center gap-12 lg:items-stretch ${hasFeaturedCv ? heroColumnsClassName : ""}`}
        >
          <div className="@container grid min-w-0 content-start justify-items-start gap-7">
            <motion.div variants={item}>
              <Eyebrow>{t("common.brand")}</Eyebrow>
            </motion.div>
            <ProfileName
              key={i18n.language}
              fullName={t("home.heading")}
              typeface="display"
              className={homeHeadingClassName}
            />
            <motion.p
              variants={item}
              className="m-0 max-w-[46ch] text-lg leading-relaxed text-pretty text-cv-copy sm:text-xl"
            >
              {t("home.intro")}
            </motion.p>
            {hasFeaturedCv && (
              <motion.div variants={rise} className="mt-2 w-full min-w-0">
                <FeaturedCvAddress />
              </motion.div>
            )}
          </div>
          {hasFeaturedCv && (
            <motion.div variants={rise} className="min-w-0">
              <FeaturedCvSection />
            </motion.div>
          )}
        </div>
        <div className="grid max-w-5xl gap-20">
          <HomeFacts variants={item} />
          <OpenCvSection
            variants={rise}
            className="max-w-2xl border-t border-cv-field-border pt-10"
          />
        </div>
      </motion.div>
    </main>
  )
}
