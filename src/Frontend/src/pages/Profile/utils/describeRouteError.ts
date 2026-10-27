import type { TFunction } from "i18next"

/**
 * Turns a failed CV request into a message, and tells whether retrying could
 * help: not for a missing CV, but yes for network and server errors.
 *
 * @param error - The RTK Query error.
 * @param t - The translation function.
 * @returns The message and whether to offer a retry.
 */
export function describeRouteError(
  error: unknown,
  t: TFunction,
): {
  message: string
  retryable: boolean
} {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? error.status
      : undefined

  if (status === 404) {
    return { message: t("cv.notFound"), retryable: false }
  }

  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    return { message: t("cv.unreachable"), retryable: true }
  }

  return { message: t("cv.failed"), retryable: true }
}
