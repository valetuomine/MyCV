import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { useEffect, useState } from "react"
import {
  acquireApiAuthenticationResult,
  isEntraConfigured,
  tokenHasCvAdminRole,
} from "./entraAuth"

export default function useIsAdmin(): boolean {
  const { accounts, inProgress } = useMsal()
  const account = accounts[0]
  const [adminAccountId, setAdminAccountId] = useState<string>()

  useEffect(() => {
    let isCurrent = true

    if (
      !account ||
      inProgress !== InteractionStatus.None ||
      !isEntraConfigured
    ) {
      return () => {
        isCurrent = false
      }
    }

    void acquireApiAuthenticationResult(account).then((result) => {
      if (isCurrent) {
        setAdminAccountId(
          result && tokenHasCvAdminRole(result.accessToken)
            ? account.homeAccountId
            : undefined,
        )
      }
    })

    return () => {
      isCurrent = false
    }
  }, [account, inProgress])

  return Boolean(
    account &&
    inProgress === InteractionStatus.None &&
    adminAccountId === account.homeAccountId,
  )
}
