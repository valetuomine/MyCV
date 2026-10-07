import type { JSX } from "react"
import { Route, Routes } from "react-router-dom"
import CandidateProfileRoute from "./Profile/components/CandidateProfileRoute"
import Home from "./Profile/components/Home"
import UnknownRoute from "./Profile/components/UnknownRoute"

export default function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:candidateId" element={<CandidateProfileRoute />} />
      <Route path="*" element={<UnknownRoute />} />
    </Routes>
  )
}
