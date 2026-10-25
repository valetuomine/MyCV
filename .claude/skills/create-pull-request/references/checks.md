# Checks

Part of the `create-pull-request` skill. Read it in step 4 of the workflow, and run only the parts for the areas the change touches.

Run the same checks as the pull request pipeline for the areas the change touches. Run them from the repository root, before committing. The PR and `main` pipelines use the same areas: their `Changes` stage (`templates/detect-changes-job.yml`) skips the .NET or frontend stage when the change does not touch that area. A change to `azure-pipelines.yml`, `azure-pipelines-pr.yml` or that template runs both.

**Backend** (anything under `src/Backend`, `src/MyCV.sln` or `templates/dotnet-build-job.yml`):

```powershell
dotnet build src/MyCV.sln --configuration Release
```

If entities, configurations or the DbContext changed, also check that a migration exists for every model change:

```powershell
dotnet ef migrations has-pending-model-changes --project src/Backend/CV.DataAccess/CV.DataAccess.csproj --startup-project src/Backend/CV.WebApi/CV.WebApi.csproj
```

If it reports pending changes, add the missing migration with `dotnet ef migrations add <Name>` and run the check again.

**Frontend** (anything under `src/Frontend` or `templates/frontend-build-job.yml`):

```powershell
npm --prefix src/Frontend ci        # only when package.json or package-lock.json changed
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
```

**Frontend UI** (any change to what the user sees: components, styles, layout, motion or text): check it in a real browser with the `playwright` MCP server before committing. Lint and build do not show how a change looks or behaves. Start the API and `npm --prefix src/Frontend run dev` if they are not running, open each affected view at `http://localhost:3000/<cv-address>`, and confirm:

- It looks right on desktop (1440×900) and mobile (390×844), in both the light and the dark theme, with no horizontal scroll.
- The changed interactions work: clicks, typing, keyboard focus and animations. Every usable button changes visibly on hover, in both themes (a shadow alone doesn't show).
- With reduced motion (`browser_emulate_media`), the content still shows and the motion is off.
- The browser console has no new errors or warnings.

Signed-in views such as `/<cv-address>/admin` need a Microsoft sign-in in the Playwright browser window. Ask the user to sign in there, and never type credentials yourself. Never save, delete or otherwise change real data while testing; leave such steps to the user and say so. Screenshots and snapshots go to the git-ignored `.playwright-mcp/` folder. List what you checked under *Tarkistukset* in the reviewer comment, and anything you could not check under *Huomioitavaa*.

**Formatting:** format the changed files the same way as User Story 32. Use `dotnet format` for C# and `npx prettier --write <files>` (from `src/Frontend`) for frontend files.

If a check fails, fix the cause and run it again. Never push code that fails a check, and never skip, disable or weaken a check to make it pass. If you cannot fix a failure, stop and report it with the error output.
