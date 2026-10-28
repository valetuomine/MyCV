# MyCV

A personal CV site: an ASP.NET Core REST API (`src/Backend`) and a React, TypeScript and Vite client (`src/Frontend`).

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

   CV pages are served at `http://localhost:3000/<cv-address>`.

## Profile pictures

Profile pictures are stored in Azure Blob Storage, in a private `profile-pictures` container that the API creates on the first upload. The API turns each upload upright, shrinks it to at most 1200 px and re-encodes it as WebP with SkiaSharp, which drops all metadata, and serves it publicly from `GET /api/Profile/{profileId}/picture`.

Locally, run the [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) storage emulator and point the API at it:

1. Start Azurite's blob service, with Docker or with Node:

   ```powershell
   docker run -p 10000:10000 mcr.microsoft.com/azure-storage/azurite azurite-blob --blobHost 0.0.0.0
   npx azurite --blobHost 127.0.0.1 --location .azurite --skipApiVersionCheck
   ```

   `.azurite` is ignored by Git, so its data stays on your machine.

2. Store the emulator connection string in User Secrets. `UseDevelopmentStorage=true` is Azurite's well-known development account, not a secret:

   ```powershell
   dotnet user-secrets set "ConnectionStrings:BlobStorage" "UseDevelopmentStorage=true" --project src/Backend/CV.WebApi
   ```

Settings, in the `BlobStorage` section or as a connection string:

| Key | Purpose |
|---|---|
| `BlobStorage:ServiceUri` | The account's blob endpoint, such as `https://<account>.blob.core.windows.net`. The API signs in with `DefaultAzureCredential`, the App Service's managed identity in production, which needs the `Storage Blob Data Contributor` role. No connection string or account key is used in production. It takes precedence over the connection string. |
| `ConnectionStrings:BlobStorage` | A connection string, for Azurite in local development. |

Without either setting the API still starts, and the public CV, its PDF and profile deletion work as before; saving or removing a picture answers `503`.

## CV PDFs

The API prints a CV's PDF (`GET /api/Profile/{profileId}/pdf`) by opening the frontend's print route `/print/<profile-id>?lang=fi|en` in headless Chromium with Playwright for .NET, so the frontend must be running and reachable from the API. Printed PDFs are cached in memory for an hour.

Settings in the `PdfPrinter` configuration section:

| Key | Default | Purpose |
|---|---|---|
| `FrontendBaseUrl` | The first `Cors:AllowedOrigins` entry, or `http://localhost:3000` in Development | The frontend origin whose print route is printed. Set it when `Cors:AllowedOrigins` lists several origins. |
| `ExecutablePath` | Empty | An installed Chrome or Chromium. When empty, the API installs Playwright's Chromium (about 150 MB) in the background at startup, into the folder named by `PLAYWRIGHT_BROWSERS_PATH` or Playwright's default. |
| `LaunchArgs` | Empty | Extra Chromium arguments, such as `--no-sandbox` in a container that runs as root. |
| `TimeoutSeconds` | `30` | How long one print, or waiting for a free print slot, may take. |
| `MaxConcurrentPrints` | `2` | How many PDFs are printed at the same time. |

In a deployment, install Chromium when deploying instead of at runtime:

- Publish for the host's runtime identifier, for example `dotnet publish -r linux-x64`, so the Playwright driver for that platform is included.
- On Linux, install Chromium with its system libraries using the script in the publish output: `pwsh playwright.ps1 install --with-deps chromium`. This needs root. Alternatively, run the API in Microsoft's Playwright for .NET container image, which has them.
- Chromium can't run in the Windows App Service sandbox, so host the API on Linux or in a container.

Public CV pages are readable without signing in. Creating and editing profiles is limited to the site administrator, who signs in with Microsoft Entra ID; that setup is not part of this README.

## Configuration and secrets

- `src/Backend/CV.WebApi/appsettings.json` is for non-secret defaults only. Local overrides such as `appsettings.Development.json` are ignored by Git.
- Backend secrets belong in .NET User Secrets for local development and a secret manager/environment variables in deployments.
- Frontend `.env.local` files are ignored by Git. `VITE_*` values are still included in the built JavaScript and are public configuration only—never put passwords, API keys, or tokens there.
- The repository ignores `.env*` and environment-specific `appsettings.*.json` files, with `.env.example` as the safe tracked template. Check `git status` before committing local configuration.
