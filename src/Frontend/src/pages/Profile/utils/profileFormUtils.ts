import type { TFunction } from "i18next"
import { errorStatus } from "./describeRouteError"

type GraphemeSegmenter = new (
  locales?: string,
  options?: { granularity: "grapheme" },
) => { segment(input: string): Iterable<{ segment: string }> }

/** Matches name suffixes such as Jr. and III, which initials skip. */
const nameSuffix = /^(jr|sr|ii|iii|iv)\.?$/i

/**
 * Splits text into user-perceived characters, so accented letters and emoji
 * stay whole. Falls back to code points where `Intl.Segmenter` is missing.
 *
 * @param text - The text to split.
 * @returns The text's characters in order.
 */
export function splitGraphemes(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: GraphemeSegmenter })
    .Segmenter
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: "grapheme" }).segment(text),
      ({ segment }) => segment,
    )
  }

  return Array.from(text)
}

/**
 * Picks a word's first user-perceived character.
 *
 * @param word - The word.
 * @returns The first character, or "" for an empty word.
 */
function firstGrapheme(word: string): string {
  return splitGraphemes(word)[0] ?? ""
}

/**
 * Returns uppercase initials from the first and last names, skipping
 * trailing suffixes such as Jr., or one initial for a single name.
 *
 * @param fullName - The candidate's full name.
 * @returns Up to two uppercase initials, or "" without a name.
 */
export function getInitials(fullName?: string | null): string {
  const words = (fullName ?? "").split(/\s+/).filter(Boolean)
  while (words.length > 2 && nameSuffix.test(words[words.length - 1])) {
    words.pop()
  }

  const picked =
    words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1)

  return picked.map(firstGrapheme).join("").toUpperCase()
}

/**
 * Makes a profile link absolute, so a value saved without a scheme, such as
 * `github.com/user`, doesn't open as a path inside the app.
 *
 * @param value - The link as saved.
 * @returns The link, with `https://` added when it has no `http(s)://`.
 */
export function toExternalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

/** Matches a leading URL scheme such as `https:` or `javascript:`. */
const urlScheme = /^[a-z][a-z0-9+.-]*:/i

/**
 * Matches a host with a port and no scheme, such as `github.com:443/user`.
 * The host must contain a dot or be `localhost`, so `javascript:1/alert(1)`
 * still counts as a scheme.
 */
const hostAndPort = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+|localhost):\d+(?:[/?#]|$)/i

/** Matches an `http` or `https` address with a host. */
const httpAddress = /^https?:\/\/[^/\\?#]/i

/**
 * Trims the characters that match a test from both ends of a text. A loop
 * instead of a regular expression, because one that anchors a repeated
 * character to the end backtracks over long runs of it.
 *
 * @param value - The text.
 * @param isTrimmed - Tells, from the code point that starts at an index, whether the
 *   character there is trimmed.
 * @returns The text without the matching characters at either end.
 */
function trimEnds(value: string, isTrimmed: (code: number) => boolean): string {
  let start = 0
  let end = value.length
  while (start < end && isTrimmed(value.codePointAt(start) ?? Number.NaN)) {
    start++
  }
  while (end > start && isTrimmed(value.codePointAt(end - 1) ?? Number.NaN)) {
    end--
  }

  return value.slice(start, end)
}

/**
 * Trims the C0 controls and spaces that browsers drop from both ends of a
 * link before they read its scheme.
 *
 * @param value - The link.
 * @returns The link without leading or trailing controls and spaces.
 */
function trimControls(value: string): string {
  return trimEnds(value, (code) => code <= 0x20)
}

/**
 * Tells whether a profile link may be saved, by the same rule as the API's
 * `ProfileLinkUri`: an `http` or `https` address, or a link without a
 * scheme, such as `github.com/user`. Browsers ignore tabs and line breaks
 * and trim controls and spaces before they read the scheme, so the check
 * does too.
 *
 * @param value - The link as typed; empty means no link.
 * @returns Whether the link may be saved.
 */
export function isAllowedProfileLink(value: string | null): boolean {
  const normalized = trimControls((value ?? "").replace(/[\t\n\r]/g, ""))

  if (
    !normalized ||
    !urlScheme.test(normalized) ||
    hostAndPort.test(normalized)
  ) {
    return true
  }

  return httpAddress.test(normalized) && URL.canParse(normalized)
}

/** The UTF-16 code of `/`. */
const slashCode = 0x2f

/**
 * Accepts a bare public URL segment or a full CV link and returns the segment.
 *
 * @param input - What the visitor typed.
 * @returns The link's last path segment, or the input without slashes.
 */
export function extractPublicUrlSegment(input: string): string {
  const value = input.trim()
  try {
    const segments = new URL(value).pathname.split("/").filter(Boolean)
    return segments[segments.length - 1] ?? ""
  } catch {
    return trimEnds(value, (code) => code === slashCode)
  }
}

/**
 * Formats a profile date for display in the given language.
 *
 * @param value - An ISO date string from the API.
 * @param language - The language to format the date in.
 * @returns The date as, for example, "Oct 21, 2026" in English or
 *   "21.10.2026" in Finnish, or undefined when it is missing or invalid.
 */
export function formatProfileDate(
  value: string | null | undefined,
  language: string,
): string | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? undefined
    : new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(date)
}

/** A change to the profile picture, each saved at once. */
export type PictureChange = "upload" | "google" | "remove"

/**
 * Turns a failed profile picture change into a message, by the status code
 * first, because the API's problem detail is English only: a file too large
 * (413) or of the wrong type (415), a profile the user may not change (401,
 * 403, 404), a picture changed at the same time elsewhere (409), storage or
 * Google not answering (502), storage not set up yet (503), and a Google
 * account without a usable picture (400 on the Google change). Network
 * failures and anything else get the general messages that name the change.
 *
 * @param error - The error from the request, or `{ status: 413 }` when the browser found the file too large.
 * @param change - Which change failed.
 * @param t - The translation function.
 * @returns The message to show in the picture section.
 */
export function getProfilePictureError(
  error: unknown,
  change: PictureChange,
  t: TFunction,
): string {
  const status = errorStatus(error)
  const action = t(`profilePicture.actions.${change}`)

  switch (status) {
    case 413:
      return t("profilePicture.errors.tooLarge")
    case 415:
      return t("profilePicture.errors.unsupportedType")
    case 401:
    case 403:
    case 404:
      return t("profilePicture.errors.notAllowed")
    case 409:
      return t("profilePicture.errors.changedElsewhere")
    case 502:
      return t("profilePicture.errors.serviceUnreachable")
    case 503:
      return t("profilePicture.errors.storageNotSetUp")
    case 400:
      return change === "google"
        ? t("profilePicture.errors.googleUnavailable")
        : t("formErrors.failed", { action })
    case "FETCH_ERROR":
    case "TIMEOUT_ERROR":
      return t("formErrors.unreachable", { action })
    default:
      return t("formErrors.failed", { action })
  }
}

/**
 * Turns a failed profile request into a message that starts with the action.
 * Explains the creation refusals first (403 for a Google account that isn't
 * invited, 409 for a sign-in that already has a CV), then prefers the API's
 * problem detail, which stays in the API's language, then explains
 * validation and network failures. Any other failure, such as one raised in
 * the browser, gets the general message, because its own text is English
 * only.
 *
 * @param error - The error from the request.
 * @param action - What failed, such as "Profile update", in the active language.
 * @param t - The translation function.
 * @returns The message to show under the form.
 */
export function getProfileFormError(
  error: unknown,
  action: string,
  t: TFunction,
): string {
  const status = errorStatus(error)
  if (status === 403) {
    return t("formErrors.googleNotInvited")
  }

  if (status === 409) {
    return t("formErrors.alreadyHasCv")
  }

  const detail = problemDetail(error)
  if (detail !== undefined) {
    return detail
  }

  switch (status) {
    case 400:
    case 422:
      return t("formErrors.invalid", { action })
    case "FETCH_ERROR":
    case "TIMEOUT_ERROR":
      return t("formErrors.unreachable", { action })
    default:
      return t("formErrors.failed", { action })
  }
}

/**
 * Reads the problem detail from a failed RTK Query request's response body.
 *
 * @param error - The error from the request.
 * @returns The `detail` text, or undefined when the body has none.
 */
function problemDetail(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "detail" in error.data &&
    typeof error.data.detail === "string"
  ) {
    return error.data.detail
  }

  return undefined
}
