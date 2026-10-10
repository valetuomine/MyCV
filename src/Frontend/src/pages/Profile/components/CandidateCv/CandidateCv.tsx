import { useState, type JSX } from "react"
import type { Profile } from "../../../../api/profileQueries"
import Background from "../../../components/Background"
import CandidateSectionTransition from "./CandidateSectionTransition"
import SectionNavigationHint from "./SectionNavigationHint"
import ContentSection from "../../../components/ContentSection"
import ProfileForm from "../forms/ProfileForm"
import useCandidateSectionNavigation from "../../hooks/useCandidateSectionNavigation"

const sections = [
  {
    label: "Profile",
  },
  {
    label: "More to come...",
  },
]

interface CandidateCvProps {
  values: Profile
}

export default function CandidateCv({ values }: CandidateCvProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const { containerRef, direction, selectedIndex } =
    useCandidateSectionNavigation(sections.length, !isEditing)

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
            <ProfileForm values={values} onEditingChange={setIsEditing} />
          ) : (
            <ContentSection section={{ title: selectedSection.label }} />
          )}
        </CandidateSectionTransition>
        {!isEditing && (
          <SectionNavigationHint
            selectedIndex={selectedIndex}
            sectionCount={sections.length}
          />
        )}
      </div>
    </Background>
  )
}
