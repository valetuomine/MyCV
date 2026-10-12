# MyCV

For Azure SQL, App Service, Static Web Apps, and Azure DevOps Release setup, see [the Azure deployment guide](docs/azure-deployment.md).

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

3. In a separate terminal, create a profile through the local Swagger `POST /api/Profile` endpoint. The request needs a `fullName` and at least one Finnish (`fi`) translation with a `title`. The response's `candidateId` is the URL identifier; it is the Candidate row's ID, not the Profile ID.

4. Copy `src/Frontend/.env.example` to `src/Frontend/.env.local`, leave `VITE_API_BASE_URL` empty to use the local Vite proxy, then start the frontend:

   ```powershell
   Copy-Item src/Frontend/.env.example src/Frontend/.env.local
   npm --prefix src/Frontend run dev
   ```

   Set `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_TENANT_ID`, and `VITE_ENTRA_API_SCOPE` in `.env.local` from the Entra app registrations before using admin sign-in. Open `http://localhost:3000/<candidate-id>`, using `candidateId` returned when creating the profile. The frontend loads the Candidate by its ID, then loads that Candidate's profile. Vite forwards API requests to the backend. The ID appears in a public URL and is not a secret.

## Entra admin authentication

Complete these steps in the Entra admin center. Use the same tenant for both registrations.

1. **Register the API.** Go to **Identity > Applications > App registrations > New registration**. Create a single-tenant registration, for example `MyCV API`. Record its **Application (client) ID** as `<API_CLIENT_ID>` and the tenant's **Directory (tenant) ID** as `<TENANT_ID>`.

2. **Expose the API scope.** In the API registration, open **Expose an API**. Keep or set the Application ID URI to `api://<API_CLIENT_ID>`, then add a delegated scope named `access_as_user`. Enable the scope and give it a consent description. The complete scope string will be `api://<API_CLIENT_ID>/access_as_user`.

3. **Create the admin app role.** In the API registration, open **App roles > Create app role**. Set the display name to `MyCV administrator`, allowed member types to **Users/Groups**, and the value to exactly `CvAdmin`; keep it enabled. The value is case-sensitive and is what the app checks in the access token.

4. **Register the frontend.** Create another single-tenant app registration, for example `MyCV Frontend`. Under **Authentication > Add a platform > Single-page application**, add this exact redirect URI: `http://localhost:3000/auth/callback`. Do not create a client secret for the frontend; it is a public SPA.

5. **Grant the frontend API permission.** In the frontend registration, open **API permissions > Add a permission > My APIs**, select `MyCV API`, then add the delegated `access_as_user` permission. Grant admin consent for the tenant if required by your organization's consent settings.

6. **Assign admin access.** Open **Enterprise applications**, select the `MyCV API` enterprise application, then **Users and groups > Add user/group**. Assign the appropriate users or groups the `MyCV administrator` role. A user who is not assigned this API role can sign in but will not get admin controls or API access.

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

8. **Run and verify locally.** Start the API with `dotnet run --project src/Backend/CV.WebApi --launch-profile http` and the frontend with `npm --prefix src/Frontend run dev -- --strictPort`. Keep port 3000 free; the registered redirect URI must match exactly, so do not use Vite's fallback port 3001. Open `http://localhost:3000/<candidate-id>/admin`, complete Entra sign-in, and confirm the browser returns to `http://localhost:3000/<candidate-id>`. An assigned admin should see editing controls; an unassigned user should not. The API independently requires the `CvAdmin` role.

Microsoft Authenticator is used through the tenant's normal MFA flow. To require MFA, enable the method for the users under **Protection > Authentication methods > Policies**, and configure a Conditional Access policy targeting the `MyCV API` cloud app to require MFA. Conditional Access availability depends on the tenant's licensing and policy permissions; the app itself does not bypass or replace those controls.

When MSAL can no longer silently acquire an API access token, the frontend redirects through Entra for interaction and returns to the current CV route. The API validates token expiration, issuer, audience, and the `CvAdmin` role on every protected request.

## Configuration and secrets

- `src/Backend/CV.WebApi/appsettings.json` is for non-secret defaults only. Local overrides such as `appsettings.Development.json` are ignored by Git.
- Backend secrets belong in .NET User Secrets for local development and a secret manager/environment variables in deployments.
- Frontend `.env.local` files are ignored by Git. `VITE_*` values are still included in the built JavaScript and are public configuration only—never put passwords, API keys, or tokens there.
- The repository ignores `.env*` and environment-specific `appsettings.*.json` files, with `.env.example` as the safe tracked template. Check `git status` before committing local configuration.

The Profile create/update/delete/admin-read endpoints and Candidate delete endpoint require a valid Entra access token with the `CvAdmin` app role. Public profile and Candidate reads remain anonymous. CORS is not authorization.
