import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { skipToken } from "@reduxjs/toolkit/query"
import { useGetProfileAdminQuery } from "../api/profileQueries"

interface EditableProfileAccess {
  canEdit: boolean
  publicUrlSegment?: string
}

export default function useCanEditProfile(
  profileId?: string,
): EditableProfileAccess {
  const { accounts, inProgress } = useMsal()
  const canCheckAccess = Boolean(
    accounts[0] && profileId && inProgress === InteractionStatus.None,
  )
  const profileQuery = useGetProfileAdminQuery(
    canCheckAccess && profileId ? profileId : skipToken,
  )

  return {
    canEdit: canCheckAccess && Boolean(profileQuery.data),
    publicUrlSegment: profileQuery.data?.publicUrlSegment ?? undefined,
  }
}
