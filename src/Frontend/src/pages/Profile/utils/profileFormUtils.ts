import type { TFunction } from "i18next"

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
  if (typeof error === "object" && error !== null) {
    if ("status" in error && error.status === 403) {
      return t("formErrors.googleNotInvited")
    }

    if ("status" in error && error.status === 409) {
      return t("formErrors.alreadyHasCv")
    }

    if (
      "data" in error &&
      typeof error.data === "object" &&
      error.data !== null &&
      "detail" in error.data &&
      typeof error.data.detail === "string"
    ) {
      return error.data.detail
    }

    if ("status" in error) {
      if (error.status === 400 || error.status === 422) {
        return t("formErrors.invalid", { action })
      }

      if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") {
        return t("formErrors.unreachable", { action })
      }

      return t("formErrors.failed", { action })
    }
  }

  return t("formErrors.failed", { action })
}
