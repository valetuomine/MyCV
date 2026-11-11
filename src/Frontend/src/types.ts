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

export const DownloadStatus = {
  Idle: "idle",
  Pending: "pending",
  Error: "error",
} as const

export type DownloadStatus =
  (typeof DownloadStatus)[keyof typeof DownloadStatus]

export const PdfLoadStatus = {
  Starting: "starting",
  Pending: "pending",
  Ready: "ready",
  NoViewer: "no-viewer",
  Error: "error",
} as const

export type PdfLoadStatus = (typeof PdfLoadStatus)[keyof typeof PdfLoadStatus]

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
  Segment: "segment",
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

/** Why creating a profile failed: no public URL came back, or the request failed. */
export const SubmitFailureReason = {
  NoPublicUrl: "no-public-url",
  Request: "request",
} as const

export type SubmitFailureReason =
  (typeof SubmitFailureReason)[keyof typeof SubmitFailureReason]

/**
 * Why the API refused the signed-in session: it expired, so signing in
 * again may help, or it was refused again right after signing in again.
 */
export const SessionRefusal = {
  Expired: "expired",
  RefusedAgain: "refusedAgain",
} as const

export type SessionRefusal =
  (typeof SessionRefusal)[keyof typeof SessionRefusal]

/** Whether an RTK Query request reads data or changes it. */
export const RequestType = {
  Query: "query",
  Mutation: "mutation",
} as const

export type RequestType = (typeof RequestType)[keyof typeof RequestType]

export const ActivityEvent = {
  PointerDown: "pointerdown",
  PointerMove: "pointermove",
  KeyDown: "keydown",
  Wheel: "wheel",
  TouchStart: "touchstart",
  Scroll: "scroll",
} as const

export type ActivityEvent = (typeof ActivityEvent)[keyof typeof ActivityEvent]

export const IdleMessageType = {
  Activity: "activity",
  SignOut: "signOut",
} as const

export type IdleMessageType =
  (typeof IdleMessageType)[keyof typeof IdleMessageType]

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

/**
 * Where signing in again over a refused session has got: not started, the
 * popup open, how the popup ended, leaving for the sign-in route, or
 * failing to drop the session before leaving.
 */
export const SignInAgainStep = {
  Idle: "idle",
  Popup: "popup",
  Cancelled: "cancelled",
  Failed: "failed",
  Blocked: "blocked",
  Leaving: "leaving",
  ClearFailed: "clear-failed",
} as const

export type SignInAgainStep =
  (typeof SignInAgainStep)[keyof typeof SignInAgainStep]

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
