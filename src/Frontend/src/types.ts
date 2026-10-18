export const InputType = {
  Text: "text",
  Email: "email",
  Tel: "tel",
  Url: "url",
} as const

export type InputType = (typeof InputType)[keyof typeof InputType]

export const LanguageCode = {
  Finnish: "fi",
  English: "en",
} as const

export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode]

export const Theme = {
  Light: "light",
  Dark: "dark",
} as const

export type Theme = (typeof Theme)[keyof typeof Theme]

export const CopyStatus = {
  Idle: "idle",
  Copied: "copied",
  Error: "error",
} as const

export type CopyStatus = (typeof CopyStatus)[keyof typeof CopyStatus]

export const Tone = {
  Neutral: "neutral",
  Pending: "pending",
  Error: "error",
} as const

export type Tone = (typeof Tone)[keyof typeof Tone]

export const SignInFailure = {
  Cancelled: "cancelled",
  Failed: "failed",
} as const

export type SignInFailure = (typeof SignInFailure)[keyof typeof SignInFailure]
