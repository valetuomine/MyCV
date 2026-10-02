import type { JSX } from 'react'

interface HeaderTextProps {
  text: string
  className?: string
}

export default function HeaderText({ text, className = '' }: HeaderTextProps): JSX.Element {
  return <span className={className}>{text}</span>
}
