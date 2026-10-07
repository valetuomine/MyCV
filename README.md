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

   Open `http://localhost:3000/<candidate-id>`, using `candidateId` returned when creating the profile. The frontend loads the Candidate by its ID, then loads that Candidate's profile. Vite forwards both API requests to the backend. The ID appears in a public URL and is not a secret.

## Configuration and secrets

- `src/Backend/CV.WebApi/appsettings.json` is for non-secret defaults only. Local overrides such as `appsettings.Development.json` are ignored by Git.
- Backend secrets belong in .NET User Secrets for local development and a secret manager/environment variables in deployments.
- Frontend `.env.local` files are ignored by Git. `VITE_*` values are still included in the built JavaScript and are public configuration only—never put passwords, API keys, or tokens there.
- The repository ignores `.env*` and environment-specific `appsettings.*.json` files, with `.env.example` as the safe tracked template. Check `git status` before committing local configuration.

## API authorization note

Authentication is deferred to a future story. Profile create/update/delete, admin-read, and Candidate delete endpoints are currently unauthenticated. Do not expose the API publicly or use those endpoints in production until authentication and authorization are implemented and verified. CORS is not authorization.
