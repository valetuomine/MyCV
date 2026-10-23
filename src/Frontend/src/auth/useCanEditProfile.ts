import { skipToken } from "@reduxjs/toolkit/query"
import { useGetProfileAdminQuery } from "../api/profileQueries"
import { useAuthSession } from "./authSession"

interface EditableProfileAccess {
  canEdit: boolean
  publicUrlSegment?: string
}

/**
 * Tells whether the signed-in user may edit a profile, by fetching its admin
 * view once someone is signed in and MSAL is idle. Only hides or shows edit controls; the API enforces
 * who may edit.
 *
 * @param profileId - The profile to check, once it is known.
 * @returns Whether the user can edit, and the profile's public URL segment.
 */
export default function useCanEditProfile(
  profileId?: string,
): EditableProfileAccess {
  const { isSignedIn, isBusy } = useAuthSession()
  const canCheckAccess = Boolean(isSignedIn && profileId && !isBusy)
  const profileQuery = useGetProfileAdminQuery(
    canCheckAccess && profileId ? profileId : skipToken,
  )

  return {
    canEdit: canCheckAccess && Boolean(profileQuery.data),
    publicUrlSegment: profileQuery.data?.publicUrlSegment ?? undefined,
  }
}
