import { lazy, Suspense, type JSX } from "react"
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion"
import { Route, Routes } from "react-router-dom"
import Background from "./components/Background"
import Home from "./Profile/components/routes/Home"
import ProfileSkeleton from "./Profile/components/ProfileSkeleton"
import RouteMessage from "./Profile/components/RouteMessage"
import UnknownRoute from "./Profile/components/routes/UnknownRoute"
import { RoutePaths } from "../routePaths"
import { Tone } from "../types"

/**
 * Loads the CV route's chunk. On deep links it is also called at startup, so
 * the chunk downloads alongside the first render.
 *
 * @returns A promise of the route module.
 */
const loadCandidateProfileRoute = () =>
  import("./Profile/components/routes/CandidateProfileRoute")
/** The public CV route, loaded on demand. */
const CandidateProfileRoute = lazy(loadCandidateProfileRoute)

/**
 * The admin sign-in route, loaded on demand like the other admin and sign-in
 * routes, which keeps the form and schema libraries out of the entry chunk
 * that public visitors download.
 */
const AdminLoginRoute = lazy(() => import("../auth/routes/AdminLoginRoute"))
/** The sign-in callback route, loaded on demand. */
const AuthCallbackRoute = lazy(() => import("../auth/routes/AuthCallbackRoute"))
/** The create-profile route, loaded on demand. */
const AdminCreateProfileRoute = lazy(
  () => import("./Admin/routes/AdminCreateProfileRoute"),
)

if (window.location.pathname !== RoutePaths.Home) {
  void loadCandidateProfileRoute()
}

const signInRouteFallback = (
  <RouteMessage tone={Tone.Pending} delayed showHomeButton={false}>
    Loading
  </RouteMessage>
)

/**
 * The app's routes inside the shared background, with motion that follows
 * the user's reduced-motion setting.
 *
 * @returns The routed app.
 */
export default function App(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <Background>
          <Routes>
            <Route path={RoutePaths.Home} element={<Home />} />
            <Route
              path={RoutePaths.AuthCallback}
              element={
                <Suspense fallback={signInRouteFallback}>
                  <AuthCallbackRoute />
                </Suspense>
              }
            />
            <Route
              path={RoutePaths.AdminCreateProfile}
              element={
                <Suspense fallback={signInRouteFallback}>
                  <AdminCreateProfileRoute />
                </Suspense>
              }
            />
            <Route
              path={RoutePaths.CandidateAdminPattern}
              element={
                <Suspense fallback={signInRouteFallback}>
                  <AdminLoginRoute />
                </Suspense>
              }
            />
            <Route
              path={RoutePaths.CandidateProfilePattern}
              element={
                <Suspense fallback={<ProfileSkeleton />}>
                  <CandidateProfileRoute />
                </Suspense>
              }
            />
            <Route path="*" element={<UnknownRoute />} />
          </Routes>
        </Background>
      </LazyMotion>
    </MotionConfig>
  )
}
