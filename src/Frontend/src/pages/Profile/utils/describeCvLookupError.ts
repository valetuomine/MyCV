import {
  validationMessage,
  type ValidationMessage,
} from "../../../i18n/validationMessage"
import { errorStatus } from "./describeRouteError"

/**
 * Turns a failed look-up of the CV that the home page's form points to into
 * the field's message: the CV is missing, the server can't be reached, or
 * something else went wrong.
 *
 * @param error - The RTK Query error.
 * @returns The message's translation key, which the field translates.
 */
export function describeCvLookupError(error: unknown): ValidationMessage {
  const status = errorStatus(error)

  if (status === 404) {
    return validationMessage("cvNotFound")
  }

  if (status === "FETCH_ERROR" || status === "TIMEOUT_ERROR") {
    return validationMessage("cvLookupUnreachable")
  }

  return validationMessage("cvLookupFailed")
}
