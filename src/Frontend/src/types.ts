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

export const ButtonVariant = {
  Primary: "primary",
  Secondary: "secondary",
  Danger: "danger",
  Icon: "icon",
  Text: "text",
  Brand: "brand",
} as const

export type ButtonVariant = (typeof ButtonVariant)[keyof typeof ButtonVariant]

export const ButtonSize = {
  Small: "small",
  Medium: "medium",
} as const

export type ButtonSize = (typeof ButtonSize)[keyof typeof ButtonSize]

export const SignInFailure = {
  Cancelled: "cancelled",
  Failed: "failed",
} as const

export type SignInFailure = (typeof SignInFailure)[keyof typeof SignInFailure]

export const SignOutReason = {
  User: "user",
  Idle: "idle",
} as const

export type SignOutReason = (typeof SignOutReason)[keyof typeof SignOutReason]

export const SignInMethod = {
  Microsoft: "microsoft",
  Google: "google",
} as const

export type SignInMethod = (typeof SignInMethod)[keyof typeof SignInMethod]

export const SignInPopupOutcome = {
  SignedIn: "signed-in",
  Cancelled: "cancelled",
  Failed: "failed",
  Blocked: "blocked",
} as const

export type SignInPopupOutcome =
  (typeof SignInPopupOutcome)[keyof typeof SignInPopupOutcome]

export const LinkOutcome = {
  Linked: "linked",
  AlreadyLinked: "already-linked",
  LinkedElsewhere: "linked-elsewhere",
  SameAccount: "same-account",
  Cancelled: "cancelled",
  Failed: "failed",
  SessionExpired: "session-expired",
} as const

export type LinkOutcome = (typeof LinkOutcome)[keyof typeof LinkOutcome]
