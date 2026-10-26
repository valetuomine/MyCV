import type { JSX } from "react"
import { LanguageCode } from "../../types"

interface LanguageFlagProps {
  language: LanguageCode
}

/**
 * A language's flag: Finland's for Finnish and the United Kingdom's for
 * English. It is drawn inline, because Windows shows emoji flags as letters,
 * and cropped to one 3:2 box, so both flags take the same room. The Union
 * Jack's red diagonals are centred, a simplification that can't be seen at
 * this size. It is decorative, so the button around it carries the name.
 *
 * @param props - The component props.
 * @param props.language - The language whose flag to draw.
 * @returns The flag.
 */
export default function LanguageFlag({
  language,
}: LanguageFlagProps): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-3 w-[1.125rem] shrink-0 overflow-hidden rounded-[2px] ring-1 ring-cv-line"
    >
      {language === LanguageCode.Finnish ? (
        <svg
          viewBox="0 0 18 11"
          preserveAspectRatio="xMidYMid slice"
          className="size-full"
        >
          <rect width="18" height="11" className="fill-cv-flag-white" />
          <rect x="5" width="3" height="11" className="fill-cv-flag-fi-blue" />
          <rect y="4" width="18" height="3" className="fill-cv-flag-fi-blue" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 60 30"
          preserveAspectRatio="xMidYMid slice"
          className="size-full"
        >
          <rect width="60" height="30" className="fill-cv-flag-uk-blue" />
          <path
            d="M0 0 60 30M60 0 0 30"
            strokeWidth="6"
            className="stroke-cv-flag-white"
          />
          <path
            d="M0 0 60 30M60 0 0 30"
            strokeWidth="2"
            className="stroke-cv-flag-uk-red"
          />
          <path
            d="M30 0v30M0 15h60"
            strokeWidth="10"
            className="stroke-cv-flag-white"
          />
          <path
            d="M30 0v30M0 15h60"
            strokeWidth="6"
            className="stroke-cv-flag-uk-red"
          />
        </svg>
      )}
    </span>
  )
}
