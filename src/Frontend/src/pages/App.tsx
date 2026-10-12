import { lazy, Suspense, type JSX } from "react"
import { LazyMotion, MotionConfig, domAnimation } from "framer-motion"
import { Route, Routes } from "react-router-dom"
import AdminLoginRoute from "../auth/AdminLoginRoute"
import AuthCallbackRoute from "../auth/AuthCallbackRoute"
import Background from "./components/Background"
import Home from "./Profile/components/Home"
import ProfileSkeleton from "./Profile/components/ProfileSkeleton"
import UnknownRoute from "./Profile/components/UnknownRoute"

const loadCandidateProfileRoute = () =>
  import("./Profile/components/CandidateProfileRoute")
const CandidateProfileRoute = lazy(loadCandidateProfileRoute)

// Start fetching the route chunk alongside the first render on deep links.
if (window.location.pathname !== "/") {
  void loadCandidateProfileRoute()
}

export default function App(): JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <Background>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth/callback" element={<AuthCallbackRoute />} />
            <Route path="/:candidateId/admin" element={<AdminLoginRoute />} />
            <Route
              path="/:candidateId"
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
