# MyCV

## Run the API and frontend locally

The Vite development server proxies `/api` requests to the ASP.NET Core API, so the browser uses the frontend origin and does not need a client-side API key or a separate CORS configuration.

1. Store the database connection string in .NET User Secrets (not in `appsettings*.json`):

   ```powershell
   dotnet user-secrets set "ConnectionStrings:CV" "Server=localhost;Database=CV;Trusted_Connection=True;Encrypt=False" --project src/Backend/CV.WebApi
   ```

   If your connection string contains a password or other credential, keep it in User Secrets or a deployment secret store. Never put it in source files, `.env` files, frontend variables, or command history that is shared.

2. Create/update the local database, then start the API:

   ```powershell
   dotnet ef database update --project src/Backend/CV.DataAccess --startup-project src/Backend/CV.WebApi
   dotnet run --project src/Backend/CV.WebApi --launch-profile http
   ```

   The API and Swagger UI are available at `http://localhost:5062` and `http://localhost:5062/swagger`.

3. Copy `src/Frontend/.env.example` to `src/Frontend/.env.local`, leave `VITE_API_BASE_URL` empty to use the local Vite proxy, then start the frontend in a separate terminal:

   ```powershell
   Copy-Item src/Frontend/.env.example src/Frontend/.env.local
   npm --prefix src/Frontend run dev
   ```

   Set `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, and `VITE_ENTRA_API_SCOPE` in `.env.local` from the Entra app registrations (see [Entra admin authentication](#entra-admin-authentication)). Creating and editing a profile requires sign-in.

4. Create a profile: open `http://localhost:3000/admin` and sign in with Entra. Enter the full name, a Finnish title, and the CV address: lowercase letters, numbers and hyphens, for example `etunimi-sukunimi`. After saving, the browser opens the CV at `http://localhost:3000/<cv-address>`. The signed-in user becomes the profile's owner. The CV address is public and not a secret.

## Entra admin authentication

Complete these steps in the Entra admin center. Use the same tenant for both registrations.

1. **Register the API.** Go to **Identity > Applications > App registrations > New registration**. Create a single-tenant registration, for example `MyCV API`. Record its **Application (client) ID** as `<API_CLIENT_ID>` and the tenant's **Directory (tenant) ID** as `<TENANT_ID>`.

2. **Expose the API scope.** In the API registration, open **Expose an API**. Keep or set the Application ID URI to `api://<API_CLIENT_ID>`, then add a delegated scope named `access_as_user`. Enable the scope and give it a consent description. The complete scope string will be `api://<API_CLIENT_ID>/access_as_user`.

3. **Create the admin app role.** In the API registration, open **App roles > Create app role**. Set the display name to `MyCV administrator`, allowed member types to **Users/Groups**, and the value to exactly `CvAdmin`; keep it enabled. The value is case-sensitive and is what the app checks in the access token.

4. **Register the frontend.** Create another single-tenant app registration, for example `MyCV Frontend`. Under **Authentication > Add a platform > Single-page application**, add this exact redirect URI: `http://localhost:3000/auth/callback`. Do not create a client secret for the frontend; it is a public SPA.

5. **Grant the frontend API permission.** In the frontend registration, open **API permissions > Add a permission > My APIs**, select `MyCV API`, then add the delegated `access_as_user` permission. Grant admin consent for the tenant if required by your organization's consent settings.

6. **Assign admin access.** Open **Enterprise applications**, select the `MyCV API` enterprise application, then **Users and groups > Add user/group**. Assign the appropriate users or groups the `MyCV administrator` role. A user with this role can manage every profile. A user without it can still sign in, create a profile, and edit the profiles they own.

7. **Configure local settings.** Copy `src/Frontend/.env.example` to `src/Frontend/.env.local` and set these values (all are public IDs/scope, not secrets):

   ```dotenv
   VITE_API_BASE_URL=
   VITE_ENTRA_CLIENT_ID=<FRONTEND_CLIENT_ID>
   VITE_ENTRA_TENANT_ID=<TENANT_ID>
   VITE_ENTRA_API_SCOPE=api://<API_CLIENT_ID>/access_as_user
   ```

   Configure the API using .NET User Secrets from the repository root:

   ```powershell
   dotnet user-secrets set "AzureAd:TenantId" "<TENANT_ID>" --project src/Backend/CV.WebApi
   dotnet user-secrets set "AzureAd:ApiClientId" "<API_CLIENT_ID>" --project src/Backend/CV.WebApi
   dotnet user-secrets set "AzureAd:Audience" "api://<API_CLIENT_ID>" --project src/Backend/CV.WebApi
   ```

   Set `AzureAd:Audience` to the API's **Application ID URI**, which must match the access token's `aud` claim. With the URI configured in step 2, this is `api://<API_CLIENT_ID>`. Restart the API after changing User Secrets, and restart Vite after changing `.env.local`.

8. **Run and verify locally.** Start the API with `dotnet run --project src/Backend/CV.WebApi --launch-profile http` and the frontend with `npm --prefix src/Frontend run dev -- --strictPort`. Keep port 3000 free; the registered redirect URI must match exactly, so do not use Vite's fallback port 3001. Open `http://localhost:3000/<cv-address>/admin`, complete Entra sign-in, and confirm the browser returns to `http://localhost:3000/<cv-address>`. The profile's owner and users with the `CvAdmin` role should see editing controls; other users should not. The API checks ownership or the `CvAdmin` role independently.

Microsoft Authenticator is used through the tenant's normal MFA flow. To require MFA, enable the method for the users under **Protection > Authentication methods > Policies**, and configure a Conditional Access policy targeting the `MyCV API` cloud app to require MFA. Conditional Access availability depends on the tenant's licensing and policy permissions; the app itself does not bypass or replace those controls.

When MSAL can no longer silently acquire an API access token, the frontend redirects through Entra for interaction and returns to the current CV route. The API validates token expiration, issuer and audience on every protected request, and checks profile ownership or the `CvAdmin` role before changing data.

## Configuration and secrets

- `src/Backend/CV.WebApi/appsettings.json` is for non-secret defaults only. Local overrides such as `appsettings.Development.json` are ignored by Git.
- Backend secrets belong in .NET User Secrets for local development and a secret manager/environment variables in deployments.
- Frontend `.env.local` files are ignored by Git. `VITE_*` values are still included in the built JavaScript and are public configuration only—never put passwords, API keys, or tokens there.
- The repository ignores `.env*` and environment-specific `appsettings.*.json` files, with `.env.example` as the safe tracked template. Check `git status` before committing local configuration.

Creating a profile requires a valid Entra access token, and the signed-in user becomes the profile's owner. The Profile update, delete and admin-read endpoints and the Candidate delete endpoint also require the caller to be the profile's owner or to have the `CvAdmin` app role. Public profile and Candidate reads remain anonymous. CORS is not authorization.
