import type { components } from "../generated/openapi"
import { SignInMethod } from "../types"
import { baseApi } from "./baseApi"

export type Login = components["schemas"]["LoginDto"]

interface LinkLoginArgs {
  linkToken: string
  sessionToken: string
}

/** A linked method, and whether it was added now or had been linked already. */
export interface LinkLoginResponse {
  login: Login
  created: boolean
}

/** The API's `provider` value for each sign-in method. */
const providerMethods: Record<string, SignInMethod> = {
  entra: SignInMethod.Microsoft,
  google: SignInMethod.Google,
}

/**
 * Maps the API's provider name to the app's sign-in method.
 *
 * @param provider - The login's `provider`, such as "entra".
 * @returns The sign-in method, or null for an unknown provider.
 */
export function signInMethodForProvider(provider: string): SignInMethod | null {
  return providerMethods[provider] ?? null
}

/** Endpoints for the signed-in user's own sign-in methods. */
export const loginQueries = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Fetches the sign-in methods of the signed-in user's CV, oldest first. */
    getLogins: builder.query<Login[], void>({
      query: () => "/api/me/logins",
      providesTags: ["Login"],
    }),
    /**
     * Links a new method. Sends the session token itself, read without any
     * redirect, and the new method's token in the body. The API answers 201
     * for a new link and 200 when it was already linked to this CV.
     */
    linkLogin: builder.mutation<LinkLoginResponse, LinkLoginArgs>({
      query: ({ linkToken, sessionToken }) => ({
        url: "/api/me/logins",
        method: "POST",
        body: { linkToken },
        headers: { Authorization: `Bearer ${sessionToken}` },
      }),
      transformResponse: (login: Login, meta) => ({
        login,
        created: meta?.response?.status === 201,
      }),
      invalidatesTags: (_result, error) => (error ? [] : ["Login"]),
    }),
    /** Removes one of the signed-in user's methods. */
    deleteLogin: builder.mutation<void, string>({
      query: (loginId) => ({
        url: `/api/me/logins/${encodeURIComponent(loginId)}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, error) => (error ? [] : ["Login"]),
    }),
  }),
})

export const {
  useGetLoginsQuery,
  useLinkLoginMutation,
  useDeleteLoginMutation,
} = loginQueries
