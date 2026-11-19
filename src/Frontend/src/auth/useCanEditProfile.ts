import { skipToken } from "@reduxjs/toolkit/query"
import { useGetProfileAdminQuery } from "../api/profileQueries"
import { useAuthSession } from "./authSession"

interface EditableProfileAccess {
  canEdit: boolean
  publicUrlSegment?: string
}

/**
 * Tells whether the signed-in user may edit a profile, by fetching its admin
 * view once someone is signed in and MSAL is idle, as a background check
 * without the sign-in-again message or a token redirect on a 401
 * (`reportsRefusal: false`). It shares the edit view's cache entry, so
 * the data loaded by `/:publicUrlSegment/admin` or the edit view is reused,
 * and once the edit view has filled the entry, its later refetches report a
 * 401 as the edit view's do. The edit view skips the check while it is open,
 * so its own reporting request is never folded into a background one that
 * is still in flight. Only hides or shows edit controls; the API enforces
 * who may edit.
 *
 * @param profileId - The profile to check, once it is known.
 * @param skip - Whether to leave the check out, such as while the edit view
 * loads the same entry itself.
 * @returns Whether the user can edit, and the profile's public URL segment.
 */
export default function useCanEditProfile(
  profileId?: string,
  skip = false,
): EditableProfileAccess {
  const { isSignedIn, isBusy } = useAuthSession()
  const canCheckAccess = Boolean(!skip && isSignedIn && profileId && !isBusy)
  const profileQuery = useGetProfileAdminQuery(
    canCheckAccess && profileId
      ? { profileId, reportsRefusal: false }
      : skipToken,
  )

  return {
    canEdit: canCheckAccess && Boolean(profileQuery.data),
    publicUrlSegment: profileQuery.data?.publicUrlSegment ?? undefined,
  }
}
