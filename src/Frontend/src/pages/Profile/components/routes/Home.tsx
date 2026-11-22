import { m as motion } from "framer-motion"
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
import {
  paneReveal,
  revealItem,
  revealStagger,
} from "../../../components/reveal"
import { RoutePaths } from "../../../../routePaths"
import { FeaturedCvStatus } from "../../../../types"
import { homeHeadingClassName } from "../displayTypeClassNames"
import FeaturedCvAddress from "../FeaturedCv/FeaturedCvAddress"
import FeaturedCvSection from "../FeaturedCv/FeaturedCvSection"
import useFeaturedCv from "../FeaturedCv/useFeaturedCv"
import HomeFacts from "../Home/HomeFacts"
import OpenCvSection from "../Home/OpenCvSection"
import ProfileName from "../ProfileName"

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
 * The home page as a landing page for a CV's viewers. The hero says what
 * MyCV is: its heading assembles letter by letter like a CV's name
 * (`ProfileName`) and lights the background with the sweep and the echo,
 * and under the intro the featured CV's link stands as an address to copy.
 * From `lg` up the featured CV's card, whose View CV is the page's one
 * primary action, stands beside the text, as tall as the text column, so
 * its edges line up with the eyebrow and the address row; a card taller
 * than the text keeps the text's rows together at the top. Without a
 * featured CV the hero is the text alone, with neither the address nor the
 * card, and so it is while the featured CV's request is still checking
 * whether one exists: the second column and the skeletons come only once
 * it does. The parts rise in one after another (`revealStagger`); the parts
 * with a blurred Pane (the address, the card and the open form) fade only
 * their Panes and the pieces beside them (`paneReveal`), so none of them
 * shows before its turn and their blur never switches off. A language
 * switch remounts the heading, so its reveal, the sweep and the echo play
 * again as a whole instead of re-revealing only the letters whose keys
 * changed, while the directed light stays on (`useLightHold`). Below the
 * hero come the facts about the link and, last and quiet, the form that
 * opens any CV and the owner's sign-in link. The hero keeps the light traces
 * away (`data-cv-trace-avoid`).
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
  const featuredStatus = useFeaturedCv().status
  /**
   * Whether a featured CV is known to exist, loading or loaded. While its
   * request is still checking, the hero keeps one column and shows no
   * skeleton, so a page without a featured CV never jumps.
   */
  const hasFeaturedCv =
    featuredStatus === FeaturedCvStatus.Loading ||
    featuredStatus === FeaturedCvStatus.Ready

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
        variants={revealStagger}
        initial="hidden"
        animate="visible"
        className="grid gap-24 lg:gap-32"
      >
        <div
          data-cv-trace-avoid=""
          className={`grid items-center gap-12 lg:items-stretch ${hasFeaturedCv ? heroColumnsClassName : ""}`}
        >
          <div className="@container grid min-w-0 content-start justify-items-start gap-7">
            <motion.div variants={revealItem}>
              <Eyebrow>{t("common.brand")}</Eyebrow>
            </motion.div>
            <ProfileName
              key={i18n.language}
              fullName={t("home.heading")}
              typeface="display"
              className={homeHeadingClassName}
            />
            <motion.p
              variants={revealItem}
              className="m-0 max-w-[46ch] text-lg leading-relaxed text-pretty text-cv-copy sm:text-xl"
            >
              {t("home.intro")}
            </motion.p>
            {hasFeaturedCv && (
              <motion.div variants={paneReveal} className="mt-2 w-full min-w-0">
                <FeaturedCvAddress />
              </motion.div>
            )}
          </div>
          {hasFeaturedCv && (
            <motion.div variants={paneReveal} className="min-w-0">
              <FeaturedCvSection />
            </motion.div>
          )}
        </div>
        <div className="grid max-w-5xl gap-20">
          <HomeFacts variants={revealItem} />
          <OpenCvSection variants={paneReveal} className="max-w-2xl" />
        </div>
      </motion.div>
    </main>
  )
}
