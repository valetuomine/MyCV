export function getProfileFormError(error: unknown, action: string): string {
  if (typeof error === "object" && error !== null) {
    if ("status" in error) {
      return `${action} failed (${String(error.status)}).`
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
