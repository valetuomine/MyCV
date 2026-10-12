import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from "@azure/msal-browser"

const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID?.trim() ?? ""
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim() ?? ""

export const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim() ?? ""
export const isEntraConfigured = Boolean(clientId && tenantId && apiScope)
export const redirectUri = `${window.location.origin}/auth/callback`
let isTokenRedirectInProgress = false

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: clientId || "00000000-0000-0000-0000-000000000000",
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : "https://login.microsoftonline.com/organizations",
    redirectUri,
  },
})

export async function acquireApiAuthenticationResult(
  account?: AccountInfo,
): Promise<AuthenticationResult | null> {
  if (!isEntraConfigured || !apiScope) {
    return null
  }

  const selectedAccount =
    account ??
    msalInstance.getActiveAccount() ??
    msalInstance.getAllAccounts()[0]

  if (!selectedAccount) {
    return null
  }

  try {
    const result = await msalInstance.acquireTokenSilent({
      account: selectedAccount,
      scopes: [apiScope],
    })
    msalInstance.setActiveAccount(result.account)
    return result
  } catch (error) {
    if (
      error instanceof InteractionRequiredAuthError &&
      !isTokenRedirectInProgress
    ) {
      isTokenRedirectInProgress = true
      void msalInstance
        .acquireTokenRedirect({
          account: selectedAccount,
          scopes: [apiScope],
          redirectUri,
          redirectStartPage: window.location.href,
        })
        .catch(() => {
          isTokenRedirectInProgress = false
        })
    }

    return null
  }
}

export function tokenHasCvAdminRole(accessToken: string): boolean {
  try {
    const encodedPayload = accessToken.split(".")[1]
    if (!encodedPayload) {
      return false
    }

    const normalizedPayload = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=")
    const claims = JSON.parse(atob(normalizedPayload)) as { roles?: unknown }

    return Array.isArray(claims.roles) && claims.roles.includes("CvAdmin")
  } catch {
    return false
  }
}
