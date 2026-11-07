import type { TFunction } from "i18next"

/**
 * Reads the status of a failed RTK Query request.
 *
 * @param error - The RTK Query error.
 * @returns The HTTP status code, or a string such as `FETCH_ERROR` when the
 *   request got no response, or undefined for another error.
 */
export function errorStatus(error: unknown): unknown {
  return typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined
}

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
  const status = errorStatus(error)

  if (status === 404) {
    return { message: t("cv.notFound"), retryable: false }
  }

  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    return { message: t("cv.unreachable"), retryable: true }
  }

  return { message: t("cv.failed"), retryable: true }
}
