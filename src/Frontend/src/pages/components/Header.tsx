import type { JSX } from 'react'
import HeaderRow from './HeaderRow'
import HeaderText from './HeaderText'
import Navigation, { type NavigationSection } from './Navigation'

interface HeaderProps {
  sections: readonly NavigationSection[]
  selectedIndex: number
  onSelect: (index: number) => void
}

export default function Header({ sections, selectedIndex, onSelect }: HeaderProps): JSX.Element {
  return (
    <HeaderRow>
      <HeaderText className="font-cv-sans text-base font-bold tracking-normal text-cv-paper normal-case" text="MyCV" />
      <Navigation sections={sections} selectedIndex={selectedIndex} onSelect={onSelect} />
      <HeaderText className="justify-self-end font-cv-sans text-base text-cv-paper normal-case" text="Open to meaningful work" />
    </HeaderRow>
  )
}
