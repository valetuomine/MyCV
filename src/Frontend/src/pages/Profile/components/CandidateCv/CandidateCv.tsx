import type { JSX } from "react"
import type { Profile } from "../../../../api/profileQueries"
import Background from "../../../components/Background"
import CandidateSectionTransition from "./CandidateSectionTransition"
import SectionNavigationHint from "./SectionNavigationHint"
import ContentSection from "../../../components/ContentSection"
import ProfileForm from "../../ProfileForm"
import useCandidateSectionNavigation from "../../hooks/useCandidateSectionNavigation"

const sections = [
  {
    label: "Profile",
  },
  {
    label: "More to come...",
  },
]

export default function CandidateCv({
  profile,
}: {
  profile: Profile
}): JSX.Element {
  const { containerRef, direction, selectedIndex } =
    useCandidateSectionNavigation(sections.length)

  const selectedSection = sections[selectedIndex]

  return (
    <Background>
      <div
        ref={containerRef}
        className="mx-auto flex min-h-screen w-full max-w-6xl flex-col py-6 sm:py-8"
      >
        <CandidateSectionTransition
          direction={direction}
          sectionIndex={selectedIndex}
          sectionLabel={selectedSection.label}
        >
          {selectedIndex === 0 ? (
            <ProfileForm profile={profile} />
          ) : (
            <ContentSection section={{ title: selectedSection.label }} />
          )}
        </CandidateSectionTransition>
        <SectionNavigationHint
          selectedIndex={selectedIndex}
          sectionCount={sections.length}
        />
      </div>
    </Background>
  )
}
