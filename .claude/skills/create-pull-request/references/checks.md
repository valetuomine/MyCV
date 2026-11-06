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

**Frontend UI** (any change to what the user sees: components, styles, layout, motion or text): check it in a real browser with the `playwright` MCP server before committing (a large check runs in a subagent, see *Browser subagent* below). Lint and build do not show how a change looks or behaves. Follow *Servers* below, open each affected view at `http://localhost:3000/<cv-address>` (use port 3100 instead when you opened the extra frontend), and confirm:

*Servers* (the same rules apply wherever a step needs the API or the frontend running):

- Check the servers over HTTP first (3000 is the frontend, 5062 the API). The Vite dev server proxies `/api` to port 5062, so one request through port 3000 shows both. Run it with the Bash tool, because in Windows PowerShell 5 `curl` is an alias of `Invoke-WebRequest`: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health`.

  | Result | Meaning |
  |---|---|
  | `200` | Both the frontend and the API run |
  | `307` (the API runs with the `https` launch profile and redirects to HTTPS) | Both the frontend and the API run |
  | `500` (Vite's proxy got `ECONNREFUSED`) | The frontend runs, the API probably does not: confirm with `curl -s -o /dev/null -w "%{http_code}" http://localhost:5062/api/health`, because the API itself can also answer 500 |
  | Connection refused (curl exit code 7) | The frontend does not run; request `http://localhost:5062/api/health` to check the API on its own |
  | Any other status, for example `404` | Ask the user: the API may run a build without the `/api/health` endpoint |

  If the result fits no row, for example a timeout or an answer that is not from Vite, ask the user instead of starting a server. Do not use `Get-NetTCPConnection` or `netstat` to tell whether a port is free: on the user's machine both list no listening socket for 3000 or 5062 even while the servers run. If Vite says "Port 3000 is in use, trying another one", the user's server was there: stop yours at once and use theirs.
- Any server that listens on the port and that you did not start in this chat (you hold no background task or PID of it) is the user's. Use it, and never stop or restart it. If it does not work (for example the backend has crashed), tell the user instead of stopping the process.
- Start only a missing server, as a background command (`run_in_background`), and note that you started it: `dotnet run --project src/Backend/CV.WebApi --launch-profile http` for the API, `npm --prefix src/Frontend run dev -- --open false` for the frontend (`vite.config.ts` has `open: true`, which would open a stray browser window).
- Open an extra frontend next to the user's only when the check needs it (for example Vite serves stale CSS for a changed `@utility` class): `npm --prefix src/Frontend run dev -- --port 3100 --strictPort --open false`. It is yours to stop. Use it for public views only: its origin is not registered for the Microsoft sign-in. Never open an extra backend: the Vite proxy always points to port 5062.
- Stop the servers you started yourself as soon as they are no longer needed, and at the latest before the commit step: stop the background task with `TaskStop`, or use the PID you saved. Never stop a process by port or name (for example `Stop-Process -Name node` or `dotnet`). Then run the HTTP check again to confirm the server no longer answers, because stopping a wrapper can leave its child process listening.
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

**Browser subagent** (Frontend UI only): the checklist above is the same wherever it runs, but a large check fills the main chat with Playwright snapshots that are sent again on every turn. Run it in a background subagent when the work item is size M or larger **and** at least two views need checking or one of them needs a sign-in. Read the size as [code-review.md](code-review.md) does (`Effort` 3 or more, or the `Työmäärä` line, otherwise size the diff). A view is a page or a state of it; a viewport size or a theme is not another view. Otherwise (XS–S work, or one view without sign-in) check in the main chat as above, because the subagent's start-up cost would exceed the saving. In a cloud session the browser is headless: signed-in views do not count towards the rule, and the main chat only lists them under *Huomioitavaa*.

1. **Before the subagent, the main chat prepares the environment.** It checks the servers over HTTP and starts the missing ones by *Servers* above, and for signed-in views asks the user to sign in in the visible Playwright window and waits for the confirmation. The main chat keeps every background task. Keep the servers running until the report has arrived and every re-check after review fixes is done, then stop them by *Servers*. The subagent never starts or stops a server and never asks for a sign-in.
2. **Start it in the background:** `Agent` with `subagent_type: general-purpose`, `model: sonnet`, `effort: medium` and `run_in_background: true`. The subagent cannot see this file, so paste into the prompt verbatim:
   - each view with its address, and the changed interactions and states to try;
   - the "Then confirm" bullets of the checklist above (both sizes, both themes, interactions and hover, reduced motion, console), and the `page.route` block, to run before any form or error state and again after a browser restart; leave out *Servers*;
   - the rules of *Screenshots*, with the names `us-<id>-<view>-desktop.png` and `us-<id>-<view>-mobile.png` (a Task uses `task-<id>`), and the privacy check of every signed-in screenshot with the Read tool;
   - the privacy rule of the signed-in paragraph: it opens no snapshots or logs of signed-in views beyond what the check itself needs, and its report holds no content from them;
   - a ban on changing real data and on editing files, and the headless rules of [cloud-session.md](cloud-session.md) when it is a cloud session.
3. **The report is short and holds no snapshot content:** each view × size × theme as ok or deviation; findings by severity; new console errors and warnings; the file names of the screenshots that passed the privacy check; images left out and why; and what could not be checked. Only the screenshots named in the report are uploaded, so the leftovers of a failed run are never uploaded.
4. **While it runs,** the main chat uses no `playwright` tool, because the browser is shared, and edits no UI file, because Vite would reload the page under the check. It may continue to the review in [code-review.md](code-review.md), which waits for the report and merges its findings. Never guess the result in advance. If the report shows the sign-in lapsed, ask the user to sign in again and start the check again. If the subagent fails or the `playwright` tools are missing, run the check in the main chat, or list it under *Huomioitavaa*.
5. **After review fixes,** re-check the changed views by the same rule as above.
6. Put the report under *Tarkistukset* in the reviewer comment, with the server note that *Servers* requires (including port 3100 if used).

**Screenshots** (only for a Frontend UI change): while checking the changed view, take one screenshot of it on desktop (1440×900) and one on mobile (390×844) with `browser_take_screenshot`, after setting the size with `browser_resize`, and pass an ASCII `filename` such as `us-<id>-<view>-desktop.png`. One theme is enough, and at most two images per changed view, so pick the views that show the change best. They are saved in the git-ignored `.playwright-mcp/` folder, and step 8 uploads them to the pull request ([pull-request.md](pull-request.md)). Never copy them into the repository. Take no screenshots for backend, pipeline or skill changes.

A screenshot must not show secrets or personal data, such as tokens, email addresses, tenant or client IDs, or real data from a signed-in view. Look at every screenshot of a signed-in view (`/<cv-address>/admin`) with the Read tool before it is uploaded, and leave out any image that shows something suspicious, naming the view under *Huomioitavaa*. Read only the screenshots you took; do not open snapshots or logs from signed-in views.

**Formatting:** format the changed files the same way as User Story 32. Use `dotnet format` for C# and `npx prettier --write <files>` (from `src/Frontend`) for frontend files.

If a check fails, fix the cause and run it again. Never push code that fails a check, and never skip, disable or weaken a check to make it pass. If you cannot fix a failure, stop and report it with the error output.

**Code graph** (any change to code under `src`): this is not a pipeline check, so the rule above about failing checks does not apply to it. Run it in step 6, after the review fixes and right before committing, so the graph matches the final code. If `graphify-out/graph.json` exists, refresh the local graph so the next session's queries match the merged code. It is git-ignored, needs no LLM and is usually quick:

```powershell
python -m graphify update .
```

Skip it silently when `graphify-out/` does not exist, as in cloud sessions. If it warns that the graph would shrink, find out why (deleted files are fine) before re-running with `--force`. A failing update never blocks the PR; report it.
