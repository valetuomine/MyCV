# Frontend Integration Patterns

## Route and data loading

- Use React Router for browser navigation. Public Candidate profiles use one route parameter only: `/:candidateId`; do not append `/profile`.
- The Static Web Apps deployment must provide SPA navigation fallback to `/index.html` so a deep link such as `/<candidateId>` loads the React app.
- Fetch server state with RTK Query (`createApi`/`fetchBaseQuery`) and generated hooks. Do not create ad-hoc `fetch` effects for endpoint-backed resources or duplicate the same data in Jotai.
- Keep RTK Query endpoint definitions in resource-specific files: `src/api/candidateQueries.ts` for Candidate operations and `src/api/profileQueries.ts` for Profile operations. Profile queries include public and admin reads; Profile POST/PUT are mutations. Share the `baseApi` instance so the store registers one reducer and middleware.
- Load `GET /api/Candidate/{candidateId}` first. Use its `profileId` to conditionally load `GET /api/Profile/{profileId}`. Handle loading, errors, unknown candidates, and candidates without a profile explicitly.
- Keep local/shared UI state in Jotai atoms where it is used across components; do not put server response caches in Jotai.
- Wrap the app with Redux Toolkit's `<Provider>`, Jotai's `<Provider>`, and `<BrowserRouter>` in the entry point. Register the RTK Query reducer and middleware in the Redux store.

## API base URL and types

- Use `VITE_API_BASE_URL` as public build-time configuration for the deployed API origin. It is not a secret. Leave it empty locally to use the Vite `/api` development proxy.
- Never place API keys, tokens, passwords, or other credentials in `VITE_*` variables.
- Derive API response types from `src/generated/openapi.ts`. After changing API DTOs or routes, regenerate OpenAPI types from the running Development API using the frontend's `generate-types` script; do not hand-edit the generated file.
- Add frontend dependencies only when absent; reuse the existing React Router, Redux Toolkit/RTK Query, Jotai, and React Redux packages.

## Form component conventions

- Define a named props interface for form-related components instead of using an inline object type in the component signature.
- Use descriptive prop names that match the value's role (for example, `values: Profile` for form data), while keeping the appropriate domain type.

## Admin mutation safety

Define Profile POST and PUT as RTK Query mutations in `profileQueries.ts`, with OpenAPI request/response types; invalidate the matching Profile query after a successful PUT.

Authentication is deferred to a future story. The current API's Profile mutations/admin read and Candidate delete are unauthenticated; do not expose or use them in production. In the future, require the `CvAdmin` API policy and Entra ID access tokens; a frontend admin flag is never authorization. Defer first-profile creation UI until that authenticated admin flow is available. When implemented, use the returned `candidateId` to navigate to `/${candidateId}`; Candidate `Id` is intentionally used as the public route identifier, never the internal Profile ID.
