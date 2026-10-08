import { lazy, Suspense, type JSX } from "react"
import { Route, Routes } from "react-router-dom"
import Home from "./Profile/components/Home"
import UnknownRoute from "./Profile/components/UnknownRoute"

const CandidateProfileRoute = lazy(
  () => import("./Profile/components/CandidateProfileRoute"),
)

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/:candidateId"
        element={
          <Suspense fallback={<p role="status">Loading profile page...</p>}>
            <CandidateProfileRoute />
          </Suspense>
        }
      />
      <Route path="*" element={<UnknownRoute />} />
    </Routes>
  )
}
