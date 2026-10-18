import {
  AuthError,
  BrowserAuthErrorCodes,
  EventType,
  InteractionRequiredAuthError,
  InteractionType,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
  type EventError,
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

// MSAL completes a redirect sign-in on the page that started it, and only
// reports a failure (e.g. the user cancelled) through its event stream.
let redirectSignInError: EventError = null
const redirectSignInErrorListeners = new Set<() => void>()

function setRedirectSignInError(error: EventError): void {
  redirectSignInError = error
  redirectSignInErrorListeners.forEach((listener) => listener())
}

msalInstance.addEventCallback((message) => {
  if (
    message.eventType === EventType.ACQUIRE_TOKEN_FAILURE &&
    message.interactionType === InteractionType.Redirect
  ) {
    setRedirectSignInError(message.error)
  }
})

export function subscribeRedirectSignInError(listener: () => void): () => void {
  redirectSignInErrorListeners.add(listener)
  return () => redirectSignInErrorListeners.delete(listener)
}

export function getRedirectSignInError(): EventError {
  return redirectSignInError
}

export function clearRedirectSignInError(): void {
  if (redirectSignInError) {
    setRedirectSignInError(null)
  }
}

export function isSignInCancelled(error: unknown): boolean {
  return (
    error instanceof AuthError &&
    (error.errorCode === BrowserAuthErrorCodes.userCancelled ||
      error.errorCode === "access_denied")
  )
}

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
