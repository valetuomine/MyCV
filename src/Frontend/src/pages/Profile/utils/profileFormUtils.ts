type GraphemeSegmenter = new (
  locales?: string,
  options?: { granularity: "grapheme" },
) => { segment(input: string): Iterable<{ segment: string }> }

const nameSuffix = /^(jr|sr|ii|iii|iv)\.?$/i

function firstGrapheme(word: string): string {
  const Segmenter = (Intl as unknown as { Segmenter?: GraphemeSegmenter })
    .Segmenter
  if (Segmenter) {
    for (const { segment } of new Segmenter(undefined, {
      granularity: "grapheme",
    }).segment(word)) {
      return segment
    }
  }

  return Array.from(word)[0] ?? ""
}

export function getInitials(fullName?: string | null): string {
  const words = (fullName ?? "").split(/\s+/).filter(Boolean)
  while (words.length > 2 && nameSuffix.test(words[words.length - 1])) {
    words.pop()
  }

  const picked =
    words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1)

  return picked.map(firstGrapheme).join("").toUpperCase()
}

export function formatProfileDate(value?: string | null): string | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? undefined
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date)
}

export function getProfileFormError(error: unknown, action: string): string {
  if (typeof error === "object" && error !== null) {
    if ("status" in error) {
      if (error.status === 400 || error.status === 422) {
        return `${action} failed. Check that every field is valid and within its length limit.`
      }

      if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") {
        return `${action} failed. Can't reach the server; check your connection and try again.`
      }

      return `${action} failed. Please try again.`
    }

    if ("message" in error && typeof error.message === "string") {
      return `${action} failed: ${error.message}`
    }

    if ("error" in error && typeof error.error === "string") {
      return `${action} failed: ${error.error}`
    }
  }

  return `${action} failed. Please try again.`
}
