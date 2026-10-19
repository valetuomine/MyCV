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

const loadCandidateProfileRoute = () =>
  import("./Profile/components/routes/CandidateProfileRoute")
const CandidateProfileRoute = lazy(loadCandidateProfileRoute)

// Admin and sign-in routes keep the form and schema libraries out of the
// entry chunk that public visitors download.
const AdminLoginRoute = lazy(() => import("../auth/routes/AdminLoginRoute"))
const AuthCallbackRoute = lazy(() => import("../auth/routes/AuthCallbackRoute"))
const AdminCreateProfileRoute = lazy(
  () => import("./Admin/routes/AdminCreateProfileRoute"),
)

// Start fetching the route chunk alongside the first render on deep links.
if (window.location.pathname !== RoutePaths.Home) {
  void loadCandidateProfileRoute()
}

const signInRouteFallback = (
  <RouteMessage tone={Tone.Pending} delayed showHomeButton={false}>
    Loading
  </RouteMessage>
)

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
