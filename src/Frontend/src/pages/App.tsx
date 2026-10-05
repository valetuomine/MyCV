import { useState, type JSX } from "react"
import Background from "./components/Background"
import ContentSection from "./components/ContentSection"
import Navigation from "./components/Navigation"
import ProfileForm from "./Profile/ProfileForm"

const sections = [
  {
    label: "Profile",
    index: "01",
    title: "A thoughtful builder of useful digital things.",
    body: "I turn complex ideas into calm, clear experiences, balancing product thinking with a strong eye for the details that make software feel human.",
    meta: "Based in Helsinki - Available for selected work",
  },
  {
    label: "Work Information",
    index: "02",
    title: "Experience with momentum, not just titles.",
    body: "A space for roles, responsibilities, and the kind of outcomes that show how I work with teams to move an idea from first sketch to shipped product.",
    meta: "Product design - Frontend - Creative technology",
  },
  {
    label: "Education",
    index: "03",
    title: "Curiosity is part of the toolkit.",
    body: "A place for the studies, experiments, and ongoing learning that shape how I approach new problems and unfamiliar domains.",
    meta: "Selected learning and independent study",
  },
  {
    label: "Skills",
    index: "04",
    title: "A practical range, tuned for collaboration.",
    body: "The tools and methods I reach for when a project needs both a sharp point of view and the craft to carry it through.",
    meta: "React - TypeScript - UX systems - Prototyping",
  },
  {
    label: "Contact",
    index: "05",
    title: "Let's make the next useful thing.",
    body: "For a project, a conversation, or a particularly interesting problem, this is where the door opens.",
    meta: "hello@mycv.dev - LinkedIn - GitHub",
  },
]

export default function App(): JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selectedSection = sections[selectedIndex]

  return (
    <Background>
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col py-6 sm:py-8">
        <Navigation
          sections={sections}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
        <div className="flex flex-1 items-center pb-16 pt-16 sm:pb-24 sm:pt-20">
          {selectedIndex === 0 ? (
            <ProfileForm />
          ) : (
            <ContentSection section={selectedSection} />
          )}
        </div>
      </div>
    </Background>
  )
}
