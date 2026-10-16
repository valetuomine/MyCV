import { lazy, Suspense, type JSX } from "react"
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion"
import { Route, Routes } from "react-router-dom"
import AdminLoginRoute from "../auth/routes/AdminLoginRoute"
import AuthCallbackRoute from "../auth/routes/AuthCallbackRoute"
import AdminCreateProfileRoute from "./Admin/routes/AdminCreateProfileRoute"
import Background from "./components/Background"
import Home from "./Profile/components/routes/Home"
import ProfileSkeleton from "./Profile/components/ProfileSkeleton"
import UnknownRoute from "./Profile/components/routes/UnknownRoute"
import { RoutePaths } from "../routePaths"

const loadCandidateProfileRoute = () =>
  import("./Profile/components/routes/CandidateProfileRoute")
const CandidateProfileRoute = lazy(loadCandidateProfileRoute)

// Start fetching the route chunk alongside the first render on deep links.
if (window.location.pathname !== RoutePaths.Home) {
  void loadCandidateProfileRoute()
}

export default function App(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <Background>
          <Routes>
            <Route path={RoutePaths.Home} element={<Home />} />
            <Route
              path={RoutePaths.AuthCallback}
              element={<AuthCallbackRoute />}
            />
            <Route
              path={RoutePaths.AdminCreateProfile}
              element={<AdminCreateProfileRoute />}
            />
            <Route
              path={RoutePaths.CandidateAdminPattern}
              element={<AdminLoginRoute />}
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
