# Frontend Integration Patterns

## Route and data loading

- Keep components rendered directly by React Router in feature-local `routes` folders (for example, `pages/Profile/components/routes`, `pages/Admin/routes`, and `auth/routes`). Keep reusable UI and route helpers with their feature components, outside the route folders.
- Keep frontend route patterns and navigation destinations in `src/routePaths.ts` as the `RoutePaths` object. Use PascalCase members (for example, `RoutePaths.Home`) for fixed routes and path builders rather than repeating path strings in route registration, navigation, or authentication redirects. Keep API endpoint URLs with their RTK Query endpoints.
- Use React Router for browser navigation. Public Candidate profiles use one route parameter only: `/:publicUrlSegment`; do not append `/profile`.
- The Static Web Apps deployment must provide SPA navigation fallback to `/index.html` so a deep link such as `/<publicUrlSegment>` loads the React app.
- Fetch server state with RTK Query (`createApi`/`fetchBaseQuery`) and generated hooks. Do not create ad-hoc `fetch` effects for endpoint-backed resources or duplicate the same data in Jotai.
- Keep RTK Query endpoint definitions in resource-specific files: `src/api/candidateQueries.ts` for Candidate operations and `src/api/profileQueries.ts` for Profile operations. Profile queries include public and admin reads; Profile POST/PUT are mutations. Share the `baseApi` instance so the store registers one reducer and middleware.
- Load `GET /api/Candidate/{publicUrlSegment}` first. Use its `profileId` to conditionally load `GET /api/Profile/{profileId}`. Handle loading, errors, unknown candidates, and candidates without a profile explicitly.
- Keep local/shared UI state in Jotai atoms where it is used across components; do not put server response caches in Jotai.
- Wrap the app with Redux Toolkit's `<Provider>`, Jotai's `<Provider>`, and `<BrowserRouter>` in the entry point. Register the RTK Query reducer and middleware in the Redux store.

## Sign-in and sign-out

- Start sign-in with `useEntraLoginRedirect` from the route that needs it, and set its `redirectPath` (MSAL's `redirectStartPage`) to that same route, for example `RoutePaths.CandidateAdmin(publicUrlSegment)` rather than the public profile. MSAL completes a redirect on the start page, so a cancelled or failed sign-in lands back on the screen that can explain it and offer a retry. Once an account exists, that route forwards to its destination with `<Navigate replace>`. `src/auth/entraAuth.ts` sets the active account on `LOGIN_SUCCESS`, so routes never call `setActiveAccount` themselves.
- MSAL reports redirect failures only through its event stream. `src/auth/entraAuth.ts` records `ACQUIRE_TOKEN_FAILURE` events for redirect interactions in a small store; read it with `useSyncExternalStore(subscribeRedirectSignInError, getRedirectSignInError)`. While a failure is recorded, never start another redirect automatically; wait for the user's retry, otherwise a cancel loops straight back to Microsoft. Use `isSignInCancelled` to tell a cancel (`user_cancelled`, `access_denied`) from a real error. Call `clearRedirectSignInError()` on retry and when the screen that showed the failure unmounts.
- Treat auth return-path session-storage values in `src/auth/adminLoginStorage.ts` as one-shot navigation markers, not authentication or database state. Clear them all with `clearAuthReturnPaths()` after reading in the callback, on redirect failure, at the authenticated destination once MSAL is idle, and when abandoning the flow for Home. When a value must survive the clearing effect, read it during render in a `useState` initializer.
- Sign-out must return to a public route rather than the protected route that would immediately start sign-in again. Entra only redirects to registered URIs and does not accept wildcards, so `postLogoutRedirectUri` is always `RoutePaths.Home`. Before `logoutRedirect`, `SignOutButton` stores the current profile's `publicUrlSegment` under `logoutReturnPublicUrlSegmentKey`, or `""` when there is none (for example on `/admin`). Home then forwards to that public profile with `<Navigate replace>`, or stays on Home for `""`. Both pass `signedOutLocationState` (`src/auth/signedOutState.ts`) so `SignedOutNotice` can confirm the sign-out; the notice then replaces the router state so a reload does not replay it.

## API base URL and types

- Use `VITE_API_BASE_URL` as public build-time configuration for the deployed API origin. It is not a secret. Leave it empty locally to use the Vite `/api` development proxy.
- Never place API keys, tokens, passwords, or other credentials in `VITE_*` variables.
- Derive API response types from `src/generated/openapi.ts`. After changing API DTOs or routes, regenerate OpenAPI types from the running Development API using the frontend's `generate-types` script; do not hand-edit the generated file.
- Add frontend dependencies only when absent; reuse the existing React Router, Redux Toolkit/RTK Query, Jotai, and React Redux packages.

## Form component conventions

- Define a named props interface for form-related components instead of using an inline object type in the component signature.
- Use descriptive prop names that match the value's role (for example, `values: Profile` for form data), while keeping the appropriate domain type.
- When create and update forms share fields, extract only the common field rendering into a reusable component. Keep `useForm`, create-only `defaultValues`, authentication, API mutations, submit/cancel actions, and mutation status in the owning route or form controller.
- Keep create-only fields such as `publicUrlSegment` outside the shared Profile fields. Use the base `ProfileSchema` for common field names and extend it with `CreateProfileSchema` for create-only data.
- Keep typed create-form defaults beside the matching Zod schema and pass them to `useForm` from the route. Initialize required nested collections (such as Finnish and English translation rows); do not embed defaults or submission behavior in shared field-rendering components.
- In form controllers, destructure the React Hook Form methods used by the component (for example, `handleSubmit` and `reset`) from the `useForm` result instead of repeatedly accessing them through the form object. Use `useWatch` for field subscriptions in React Compiler components; calling `form.watch()` triggers the compiler's `incompatible-library` warning and skips compilation. Only destructure `reset` when the controller has a reset flow, such as cancelling edits.
- For edit forms hydrated from RTK Query, map the API result to the form shape and pass it through React Hook Form's `values` option so asynchronously loaded data populates the form; reset to the same mapped values when cancelling edits. Reserve `defaultValues` for fixed initial state such as a blank create form.

## Admin mutation safety

Define Profile POST and PUT as RTK Query mutations in `profileQueries.ts`, with OpenAPI request/response types; invalidate the matching Profile query after a successful PUT.

Profile POST requires authentication and the API assigns the validated Entra `oid` claim as the candidate owner. Profile update/delete/admin-read and Candidate delete are permitted to that owner or a caller with the global `CvAdmin` role; the API is the authorization boundary. The frontend may query the admin Profile endpoint to determine whether to show editing controls, but must not treat that result as security enforcement. The frontend uses MSAL with the delegated `access_as_user` scope, attaches the access token to RTK Query requests, and silently acquires/renews tokens where possible. On an interaction-required MSAL error, redirect through Entra and return to the current route. Entra client configuration, the API audience, and tenant MFA setup are kept out of the repository, which is public. When creating a Profile, use the returned `publicUrlSegment` for the public route; `candidateId` remains an internal identifier and is never the public URL.
