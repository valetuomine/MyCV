# Checks

Part of the `create-pull-request` skill. Read it in step 4 of the workflow, and run only the parts for the areas the change touches.

Run the same checks as the pull request pipeline for the areas the change touches. Run them from the repository root, before committing. A cloud session also follows *Checks* in [cloud-session.md](cloud-session.md). The PR and `main` pipelines use the same areas: their `Changes` stage (`templates/detect-changes-job.yml`) skips the .NET or frontend stage when the change does not touch that area. A change to `azure-pipelines.yml`, `azure-pipelines-pr.yml` or that template runs both.

**Backend** (anything under `src/Backend`, `src/MyCV.sln` or `templates/dotnet-build-job.yml`):

```powershell
dotnet build src/MyCV.sln --configuration Release
dotnet test src/MyCV.sln --configuration Release --no-build
```

The tests are MSTest projects next to the code they test, such as `src/Backend/CV.Logic.Tests`.

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

**Frontend UI** (any change to what the user sees: components, styles, layout, motion or text): check it in a real browser with the `playwright` MCP server before committing. Lint and build do not show how a change looks or behaves. Follow *Servers* below, open each affected view at `http://localhost:3000/<cv-address>` (use port 3100 instead when you opened the extra frontend), and confirm:

*Servers* (the same rules apply wherever a step needs the API or the frontend running):

- Check the ports first: `Get-NetTCPConnection -State Listen -LocalPort 3000,5062 -ErrorAction SilentlyContinue` (3000 is the frontend, 5062 the API; add `Get-Process -Id <OwningProcess>` to see the process). An empty result is not proof that a port is free: on some machines the cmdlet lists nothing even while the servers run (and `netstat` prints its states in the system language). So before starting anything, also request `http://localhost:3000/` and `http://localhost:5062/` (any HTTP answer, even a 404, means a server is there). If 3000 answers, also confirm that `/api` reaches the backend. If Vite says "Port 3000 is in use, trying another one", the user's server was there: stop yours at once and use theirs.
- Any server that listens on the port and that you did not start in this chat (you hold no background task or PID of it) is the user's. Use it, and never stop or restart it. If it does not work (for example the backend has crashed), tell the user instead of stopping the process.
- Start only a missing server, as a background command (`run_in_background`), and note that you started it: `dotnet run --project src/Backend/CV.WebApi --launch-profile http` for the API, `npm --prefix src/Frontend run dev -- --open false` for the frontend (`vite.config.ts` has `open: true`, which would open a stray browser window).
- Open an extra frontend next to the user's only when the check needs it (for example Vite serves stale CSS for a changed `@utility` class): `npm --prefix src/Frontend run dev -- --port 3100 --strictPort --open false`. It is yours to stop. Use it for public views only: its origin is not registered for the Microsoft sign-in. Never open an extra backend: the Vite proxy always points to port 5062.
- Stop the servers you started yourself as soon as they are no longer needed, and at the latest before the commit step: stop the background task with `TaskStop`, or use the PID you saved. Never stop a process by port or name (for example `Stop-Process -Name node` or `dotnet`). Then run the port check again to confirm the port is free, because stopping a wrapper can leave its child process listening.
- State under *Tarkistukset* in the reviewer comment whether the check used the user's servers or ones you started, and whether the extra frontend on port 3100 was used.

Then confirm:

- It looks right on desktop (1440×900) and mobile (390×844), in both the light and the dark theme, with no horizontal scroll.
- The changed interactions work: clicks, typing, keyboard focus and animations. Every usable button changes visibly on hover, in both themes (a shadow alone doesn't show).
- With reduced motion (`browser_emulate_media`), the content still shows and the motion is off.
- The browser console has no new errors or warnings.

Signed-in views such as `/<cv-address>/admin` need a Microsoft sign-in in the Playwright browser window. Ask the user to sign in there, and never type credentials yourself. Never save, delete or otherwise change real data while testing; leave such steps to the user and say so. Before submitting a form or testing an error state, block every write request in the page, so that a submit you expected to fail cannot save:

```js
await page.route("**/api/**", (route) =>
  route.request().method() === "GET" ? route.continue() : route.abort(),
);
```

Run it with `browser_run_code_unsafe`, and again after the browser restarts. Never assume a submit will fail validation: an optional field left empty is valid and saves. Screenshots and snapshots go to the git-ignored `.playwright-mcp/` folder. List what you checked under *Tarkistukset* in the reviewer comment, and anything you could not check under *Huomioitavaa*.

**Screenshots** (only for a Frontend UI change): while checking the changed view, take one screenshot of it on desktop (1440×900) and one on mobile (390×844) with `browser_take_screenshot`, after setting the size with `browser_resize`, and pass an ASCII `filename` such as `us-<id>-<view>-desktop.png`. One theme is enough, and at most two images per changed view, so pick the views that show the change best. They are saved in the git-ignored `.playwright-mcp/` folder, and step 8 uploads them to the pull request ([pull-request.md](pull-request.md)). Never copy them into the repository. Take no screenshots for backend, pipeline or skill changes.

A screenshot must not show secrets or personal data, such as tokens, email addresses, tenant or client IDs, or real data from a signed-in view. Look at every screenshot of a signed-in view (`/<cv-address>/admin`) before it is uploaded, and leave out any image that shows something suspicious, naming the view under *Huomioitavaa*.

**Formatting:** format the changed files the same way as User Story 32. Use `dotnet format` for C# and `npx prettier --write <files>` (from `src/Frontend`) for frontend files.

If a check fails, fix the cause and run it again. Never push code that fails a check, and never skip, disable or weaken a check to make it pass. If you cannot fix a failure, stop and report it with the error output.
