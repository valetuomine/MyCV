# Checks

Part of the `create-pull-request` skill. Read it in step 4 of the workflow, and run only the parts for the areas the change touches. On a follow-up push to an active pull request, the change is what is new since the last push (`git diff origin/<branch>`), not the whole pull request.

Run the same checks as the pull request pipeline for the areas the change touches. Run them from the repository root, before committing. A cloud session also follows *Checks* in [cloud-session.md](cloud-session.md). The PR and `main` pipelines use the same areas: their `Changes` stage (`templates/detect-changes-job.yml`) skips the .NET or frontend stage when the change does not touch that area. A change to `azure-pipelines.yml`, `azure-pipelines-pr.yml` or that template runs both.

**A warning is a failed check.** Fix every warning that a check prints, from ESLint, markdownlint, `dotnet build`, `dotnet test`, `tsc` or `vite build`, at whatever step the check runs, just as you fix an error. If fixing one is completely pointless, ask the user whether to add the rule to the ignore list and do not continue before they answer. Never disable a rule without their approval. Where the ignore entry goes:

| Tool | Ignore entry |
| --- | --- |
| ESLint | The rule set to `"off"` in `src/Frontend/eslint.config.js`, in a config object with the narrowest possible `files` scope |
| markdownlint | `.markdownlint-cli2.jsonc` |
| .NET build and tests | `<NoWarn>` in `src/Directory.Build.props`, with a comment that gives the reason; Sonar findings fail the Release build too, so their rule IDs go there as well |

The frontend `lint` script also lints the Node scripts in `.claude/hooks/`, `.claude/skills/usage-band/hooks/` and `.claude/skills/improve-system/scripts/` with the Sonar rules (`lint:hooks`, config `src/Frontend/eslint.hooks.config.js`). It uses `--max-warnings 0`, so one warning fails it and the PR pipeline. The warn-level rules in `eslint.config.js` stay at `warn`, so the editor still shows them.

**Mechanical Subagents:** a subagent whose whole task is exact and checkable may run on the cheapest model: `Agent` with `model: haiku` and no `effort` (Haiku's effort support is unverified). It fits only these jobs, and the main chat reads the result before using it:

- finding files, symbols or lines (a search with a stated pattern and a short list as the answer);
- fixing a lint, `dotnet format` or Prettier warning that the main chat has already diagnosed, with the file, the line and the exact change in the prompt;
- fixing a markdownlint finding, or running the check and listing its output.

Never use `haiku` for anything that judges or decides: the code review and its delta review (*Run The Review* in [code-review.md](code-review.md) keeps `sonnet` or `opus`), the browser subagent (`sonnet`, `medium`, see *Browser subagent* below), deciding whether a finding is a bug, or any change to behavior. A mechanical subagent that finds the task is not mechanical stops and reports it, instead of guessing. The checks themselves (`dotnet`, `npm`, `markdownlint`) run in the main chat as before, and no check is dropped or weakened to make a cheaper model pass.

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

**Frontend** (anything under `src/Frontend`, the `.mjs` scripts in `.claude/hooks/`, `.claude/skills/usage-band/hooks/` or `.claude/skills/improve-system/scripts/`, or `templates/frontend-build-job.yml`):

```powershell
npm --prefix src/Frontend ci        # only when package.json or package-lock.json changed
npm --prefix src/Frontend audit --audit-level=high
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
```

The audit checks the live advisory database, so a newly published advisory can fail an unrelated frontend change. Run `npm --prefix src/Frontend audit fix` without `--force`. If that is not enough, add a scoped `overrides` entry to `package.json` or ask the user. Never lower `--audit-level`.

While a dev server runs on port 3000 (see *Servers* below), run `npm --prefix src/Frontend install` instead of `ci`: `ci` deletes `node_modules` first, fails with `EPERM` on the native module that Vite holds open, and by then has removed Vite's pre-bundled dependencies (`node_modules/.vite`), so the running server answers `504` until it restarts. If that happens to the user's server, ask the user to restart it.

When the change touches sign-in or a signed-in view and the test users' sessions exist (`src/Frontend/e2e/.auth/`), also run the Playwright tests, which need the API running: `npm --prefix src/Frontend run e2e`. The pipelines do not run them yet. Do not run them with `CI=true` while the user's frontend runs on port 3000: that mode always starts its own frontend and fails on the busy port.

**Markdown** (any changed `.md` file, skills and docs included):

```powershell
npx --yes markdownlint-cli2@0.24.0
```

It lints every tracked Markdown file with the rules in `.markdownlint-cli2.jsonc`, such as tables in the `| --- |` style. Fix what it reports instead of disabling a rule. The PR pipeline runs it too (`templates/markdown-lint-job.yml`).

**Frontend UI** (any change to what the user sees: components, styles, layout, motion or text): check it in a real browser with the Playwright MCP servers before committing (`playwright`, and for signed-in views `playwright-microsoft` and `playwright-google`, see *Signed-in views* below). The check always runs in a background browser subagent, never in the main chat (*Browser subagent* below): the main chat prepares the servers and sessions, and the views, the "Then confirm" checklist, the `page.route` block and *Screenshots* below are the subagent's work, pasted into its prompt. Lint and build do not show how a change looks or behaves. Follow *Servers* below, open each affected view at `http://localhost:3000/<cv-address>` (use port 3100 instead when you opened the extra frontend), and confirm:

*Servers* (the same rules apply wherever a step needs the API or the frontend running):

- Check the servers over HTTP first (3000 is the frontend, 5062 the API). The Vite dev server proxies `/api` to port 5062, so one request through port 3000 shows both. Run it with the Bash tool, because in Windows PowerShell 5 `curl` is an alias of `Invoke-WebRequest`: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health`.

  | Result | Meaning |
  | --- | --- |
  | `200` | Both the frontend and the API run |
  | `307` (the API runs with the `https` launch profile and redirects to HTTPS) | Both the frontend and the API run |
  | `500` (Vite's proxy got `ECONNREFUSED`) | The frontend runs, the API probably does not: confirm with `curl -s -o /dev/null -w "%{http_code}" http://localhost:5062/api/health`, because the API itself can also answer 500 |
  | Connection refused (curl exit code 7) | The frontend does not run; request `http://localhost:5062/api/health` to check the API on its own |
  | Any other status, for example `404` | Ask the user: the API may run a build without the `/api/health` endpoint |

  If the result fits no row, for example a timeout or an answer that is not from Vite, ask the user instead of starting a server. Do not use `Get-NetTCPConnection` or `netstat` to tell whether a port is free: on the user's machine both list no listening socket for 3000 or 5062 even while the servers run. If Vite says "Port 3000 is in use, trying another one", the user's server was there: stop yours at once and use theirs.
- Any server that listens on the port and that you did not start in this chat (you hold no background task or PID of it) is the user's. Use it, and never stop or restart it. If it does not work (for example the backend has crashed), tell the user instead of stopping the process.
- Start only a missing server, as a background command (`run_in_background`), and note that you started it: `dotnet run --project src/Backend/CV.WebApi --launch-profile http` for the API, `npm --prefix src/Frontend run dev -- --no-open` for the frontend (`vite.config.ts` has `open: true`, which would open a stray browser window).
- **In the Claude desktop app** (`CLAUDE_CODE_ENTRYPOINT` is `claude-desktop`), use the app's browser pane (`mcp__Claude_Browser__*`) so the user sees the app, after the same HTTP check:
  - When the user's server answers, open it as it is with `preview_start` and its `url` (`http://localhost:3000/`). Never start it again by name.
  - Start a missing server by name instead of a background command: `preview_start` with `name: api` or `name: frontend` from `.claude/launch.json` (the same commands as above, ports 5062 and 3000). Start the API first, so the frontend's proxy finds it. The API's tab opens at its root, which redirects to the Swagger UI in Development. A server started this way is yours: stop it with `preview_stop` and its `serverId`, by the same rules as a background task, and check over HTTP that it stopped.
  - In a worktree (the exception, see *In A Worktree* in [branch.md](branch.md)), the frontend needs its own `src/Frontend/node_modules` and `src/Frontend/.env.local` (both git-ignored). Check both before starting the frontend. If either is missing, tell the user and wait; do not install or copy them yourself.
  - Close the browser pane tabs you opened (`tabs_close`) when you stop your servers. Tabs the user opened are theirs.
- Open an extra frontend next to the user's only when the check needs it (for example Vite serves stale CSS for a changed `@utility` class): `npm --prefix src/Frontend run dev -- --port 3100 --strictPort --no-open`. It is yours to stop. Use it for public views only: its origin is not registered for the Microsoft sign-in. Never open an extra backend: the Vite proxy always points to port 5062.
- Stop the servers you started yourself as soon as they are no longer needed, and at the latest before the commit step: stop the background task with `TaskStop`, or use the PID you saved. Never stop a process by port or name (for example `Stop-Process -Name node` or `dotnet`). Then run the HTTP check again to confirm the server no longer answers, because stopping a wrapper can leave its child process listening.
- Close the browsers when you stop your own servers: call `browser_close` of every Playwright MCP server your chat used for a check (`playwright`, `playwright-microsoft`, `playwright-google`), and only of those, never of a server you did not call, unless a browser subagent already closed it and said so in its report. A `@playwright/mcp` Chrome window stays open until it is closed, so without this each check leaves a window behind. Never close or touch the browsers of another chat.
- Leave no empty `about:blank` window: every `@playwright/mcp` server starts its own Chrome on its first tool call, even a bare `browser_tabs` `list`, `browser_snapshot` or `browser_take_screenshot`, and the window stays blank until `browser_navigate` runs on that server. So make `browser_navigate` the first call on a server, and call no server that the check does not need. The one exception is loading a saved session with `load-microsoft-session.js` or `load-google-session.js` (*Signed-in views* below): follow it at once with `browser_navigate`. Close a blank window you find only with `browser_close` of the server that owns it, and only when it belongs to your own chat, never one that may belong to another chat, even when it is empty.
- State under *Tarkistukset* in the reviewer comment whether the check used the user's servers or ones you started, and whether the extra frontend on port 3100 was used.

Then confirm:

- It looks right on desktop (1440×900) and mobile (390×844), in both the light and the dark theme, with no horizontal scroll.
- The changed interactions work: clicks, typing, keyboard focus and animations. Every usable button changes visibly on hover, in both themes (a shadow alone doesn't show).
- With reduced motion (`browser_emulate_media`), the content still shows and the motion is off.
- Layout and focus hold in the rendered view (the subagent cannot see this file, so the bullet is complete): a long name or heading wraps on mobile (390×844) without horizontal scroll or clipped text, and every interactive element shows a visible keyboard focus when you Tab through the view, in both themes. Code review checks the remaining *Layout, motion and copy rules* below from the diff.
- The browser console has no new errors or warnings.

**Layout, motion and copy rules** (typical machine-made UI mistakes; code review checks them from the diff, the browser check from the rendered view):

- Layout: the page root clips horizontal overflow with `overflow-x: clip`, never `hidden` (`hidden` makes the root a scroll container and breaks `position: sticky`). Flexible grid columns are `minmax(0, 1fr)`, so a long word cannot widen the track: Tailwind's `grid-cols-2` already is that, while a hand-written `1fr` or `auto` track (`grid-cols-[6rem_1fr]`) is the mistake; a fixed first column such as `6rem` is fine. Large headings and names carry `overflow-wrap` and, when they are grid or flex children, `min-width: 0`: `wrap-break-word` needs the `min-w-0`, `wrap-anywhere` does not, and either one is fine.
- Motion: no `transition: all` (list the properties). Animate `transform`, `opacity`, colour and shadow, never `width`, `height`, `top` or `left`; open and close a panel with the `grid-template-rows` technique instead of animating its height. Reduced motion is covered by the checklist above.
- Focus: every interactive element has a visible `:focus-visible` style. `outline: none` is allowed only with a replacement (a ring or border change, as in `fieldClassName.ts`), or on a non-interactive element that script focuses (`tabIndex={-1}` headings and frames).
- Copy: headings and button labels end without a full stop. A change or benefit is stated relative to something ("saved as soon as you make it", "up to 10 MB"), not as a free-standing claim. A heading that renders a status or error sentence (`RouteMessage`) follows the heading rule, so its text has no full stop either; a sentence in running text, such as a description or hint, keeps it.
- Left out on purpose: the sources also ban mono-font uppercase eyebrow labels and a middle-dot separator in meta rows. The eyebrow ban conflicts with `DESIGN.md`, which defines the *Label* style (mono, uppercase, tracking 0.1em) for eyebrows and form labels and wins. The middle-dot ban conflicts with the code: the sign-in method rows (`SignInMethodRow.tsx`) and the document titles ("MyCV · CVs online" in `en.ts`) use `·` on purpose. Do not add these two rules.
- Sources: Hallmark (`Nutlope/hallmark`, MIT: *The Floor* and `sloplint`) and Unslop (`heydamir/unslop`, CC-BY-4.0, Damir Sokolovsky), reworded.

*Signed-in views* such as `/admin` and `/<cv-address>/admin` are checked as the Playwright test users, never with the user's own accounts. This holds for every work item, during the work and in `/create-pull-request`:

- Use the `playwright-microsoft` and `playwright-google` MCP servers. Each opens an isolated browser with its test user's saved session (local `.mcp.json`: `@playwright/mcp` with `--isolated --storage-state src/Frontend/e2e/.auth/microsoft.json`, and `google.json` for the other). `src/Frontend/README.md` explains how the user sets up the test users and records the sessions.
- Before the check, confirm that both sessions still sign in: `npm --prefix src/Frontend run e2e -- --project=microsoft-setup --project=google-setup`. It also creates the test CVs when they are missing and saves the sessions again with renewed tokens. When the Microsoft session has lapsed and its test user is saved in Windows Credential Manager (`MyCV-e2e-microsoft`), the setup signs in again by itself (`e2e:auth -- microsoft --auto` in a child process). The Google session renews the same way from its persistent Chrome profile (`%LOCALAPPDATA%\MyCV\e2e\google-profile`), without credentials (`e2e:auth -- google --auto`). When only an MCP browser needs a new session and the e2e setup isn't run, as when a browser subagent reports a lapsed session, run `npm --prefix src/Frontend run e2e:auth -- <microsoft|google> --auto` yourself. Claude Code's auto mode may refuse a command that opens Google's pages, even one the user approved; then ask the user to run that same command with the `!` prefix and wait, and never look for a way around the refusal. Ask the user only when the automatic sign-in stops (MFA, a captcha, a rejected password, no saved credentials, or any Google page that waits for a person): then they run `npm --prefix src/Frontend run e2e:auth -- <method>` and sign in, and you wait. Never drive Google's own pages yourself. Never type, read or print credentials or the session files: the script reads the credentials itself.
- The MCP servers read the session file only when they start. After the setup, load the file into the running `playwright-microsoft` browser with its `browser_run_code_unsafe` tool and `filename: src/Frontend/e2e/mcp/load-microsoft-session.js`, which needs no `/mcp`; Playwright reads the file itself, so no token passes through the chat. After the check, save the browser's renewed session back with `filename: src/Frontend/e2e/mcp/save-microsoft-session.js`, which saves only a Playwright test user's signed-in session. Load a renewed Google session into `playwright-google` the same way with `src/Frontend/e2e/mcp/load-google-session.js`. That isolated browser can't renew the Google session itself, so a loaded session lasts as long as its one-hour token: renew and load again when it lapses. Google has no save script, because saving would add nothing.
- Open the views on port 3000 only, because the sessions belong to that origin: the test CVs `/playwright-microsoft` and `/playwright-google` and their `/admin` views. You may edit and save these two test CVs, and nothing else.
- Only a view that needs the `CvAdmin` role, which the test users lack, needs the user's own sign-in: ask the user to sign in in the `playwright` browser window.

In the `playwright` window, never save, delete or otherwise change real data while testing; leave such steps to the user and say so. Before submitting a form or testing an error state there, block every write request in the page, so that a submit you expected to fail cannot save:

```js
await page.route("**/api/**", (route) =>
  route.request().method() === "GET" ? route.continue() : route.abort(),
);
```

Run it with `browser_run_code_unsafe`, and again after the browser restarts. Never assume a submit will fail validation: an optional field left empty is valid and saves. Screenshots and snapshots go to the ticket's folder in the git-ignored `.playwright-mcp/` folder (see *Screenshots*). List what you checked under *Tarkistukset* in the reviewer comment, and anything you could not check under *Huomioitavaa*.

**Browser subagent** (Frontend UI only): every browser check of the checklist above runs in a background subagent, whatever the size of the work item or the number of views: the first check, every re-check after review fixes, and the check of a delta review. The main chat never runs the checklist itself and never calls a Playwright tool to look at the views, not even for a single view or a quick look, because the snapshots would stay in the main chat and be sent again on every turn. A view is a page or a state of it; a viewport size or a theme is not another view. In a cloud session the browser is headless: the subagent checks the public views, and the main chat lists the signed-in views under *Huomioitavaa*.

1. **Before the subagent, the main chat prepares the environment.** It checks the servers over HTTP and starts the missing ones by *Servers* above, and for signed-in views runs the session check of *Signed-in views* above. It renews a lapsed Microsoft or Google session and loads it into the MCP browser itself, as *Signed-in views* above says, and asks the user only when the automatic sign-in stops or a view needs `CvAdmin`, and then waits for the confirmation. The main chat keeps every background task. Keep the servers running until the report has arrived and every re-check after review fixes is done, then stop them by *Servers*. The subagent never starts or stops a server and never asks for a sign-in.
2. **Start it in the background:** `Agent` with `subagent_type: general-purpose`, `model: sonnet`, `effort: medium` and `run_in_background: true`. The subagent cannot see this file, so paste into the prompt verbatim:
   - each view with its address, the MCP server to use for it (`playwright`, `playwright-microsoft` or `playwright-google`), and the changed interactions and states to try;
   - that it may save only the test CVs `/playwright-microsoft` and `/playwright-google`;
   - the "Then confirm" bullets of the checklist above (both sizes, both themes, interactions and hover, reduced motion, long names and headings wrap, keyboard focus is visible, console), and the `page.route` block, to run before any form or error state and again after a browser restart; leave out *Servers*;
   - the rules of *Screenshots* (`browser_resize` to both sizes, one theme, at most two images per view, ASCII file names), with the `filename` values `.playwright-mcp/US-<id>/us-<id>-<view>-desktop.png` and `.playwright-mcp/US-<id>/us-<id>-<view>-mobile.png` (a Task uses `.playwright-mcp/Task-<id>/task-<id>-…`), the ticket folder for every log, snapshot and helper script it writes, and the privacy check of every signed-in screenshot with the Read tool;
   - the privacy rule of the signed-in paragraph: it opens no snapshots or logs of signed-in views beyond what the check itself needs, and its report holds no content from them;
   - the collecting rule: it gets its start time as its very first step with `node -p "new Date().toISOString()"` (it has no clock of its own), and at the end of the check, also after an error or an interruption, runs `node .claude/hooks/clean-playwright-mcp.mjs --collect <US-<id> or Task-<id>> --since <start time>` before `browser_close`, which moves the files `@playwright/mcp` named itself from the root of `.playwright-mcp/` into the ticket's folder, and it states the number of moved files in its report;
   - the closing rule: at the end of the check, also after an error or an interruption, call `browser_close` of every Playwright MCP server it used and say in its report that it closed the browsers (or which one it could not close and why);
   - the blank-window rule: `browser_navigate` is the first call on every server it uses, it calls no server the check does not need, and it closes only the browsers of the servers it used, never one of another chat, even when empty;
   - the side-note rule: a problem that the change did not cause is never ignored for that reason; it goes to the report's `Sivuhuomiot` section, one line each (what, where, evidence);
   - a ban on changing real data and on editing files (running the collect command above is the one exception), and the headless rules of [cloud-session.md](cloud-session.md) when it is a cloud session.
3. **The report is short and holds no snapshot content:** each view × size × theme as ok or deviation; findings by severity; a separate `Sivuhuomiot` section by the side-note rule above; new console errors and warnings; the file names of the screenshots that passed the privacy check; the number of files moved into the ticket's folder; that it closed its browsers; images left out and why; and what could not be checked. Only the screenshots named in the report are uploaded, so the leftovers of a failed run are never uploaded.
4. **While it runs,** the main chat uses no tool of the Playwright MCP servers it uses, because the browsers are shared, and edits no UI file, because Vite would reload the page under the check. It may continue to the review in [code-review.md](code-review.md), which waits for the report and merges its findings. Never guess the result in advance. If the report shows a sign-in lapsed, renew it as *Signed-in views* above says: run `e2e:auth -- <microsoft|google> --auto` and load the session with `load-microsoft-session.js` or `load-google-session.js` yourself; ask the user only when the automatic sign-in stops, or to sign in again in the `playwright` window for a view that needs `CvAdmin`. Then start the check again. If the subagent fails, start a new one once. If it fails again, or the subagent has no `playwright` tools or cannot start a browser (as can happen in a cloud session), tell the user and list the unchecked views under *Huomioitavaa*. The main chat still does not run the check itself.
5. **After review fixes,** start a new browser subagent for the views the fixes touched, with the same prompt narrowed to those views.
6. Put the report under *Tarkistukset* in the reviewer comment, with the server note that *Servers* requires (including port 3100 if used).

**In the Claude desktop app** (`CLAUDE_CODE_ENTRYPOINT` is `claude-desktop`), the browser subagent checks the public views in the app's browser pane (`mcp__Claude_Browser__*`), so the user can watch them; a background subagent gets those tools directly. The rest of the steps above stay as they are, with these differences:

- The main chat opens the server or servers in the pane by *Servers* above before the subagent starts, and passes the subagent the pane's `tabId`.
- The pane has one shared profile that may hold the user's own sign-in on `localhost:3000`, so a public view would not be anonymous. The subagent first confirms that the page shows no signed-in state (no sign-out button or owner tools). If it does, it stops and reports it, and the main chat asks the user; neither signs the user out.
- In the prompt, map the checklist to the pane's tools: `resize_window` (custom `width` and `height`, and `colorScheme` for the theme; reset it with `preset: desktop` at the end), `computer` for clicks, hover, keys and screenshots, `read_page` or `get_page_text` for text, `read_console_messages` for the console, `javascript_tool` to inspect the page, never to read `localStorage`, `sessionStorage` or cookies. The pane cannot emulate `prefers-reduced-motion` and has no `page.route`, so the subagent checks no reduced motion, submits no form and tests no error state there; such steps go to the `playwright` server (`browser_emulate_media`) with the `page.route` block, or are listed as unchecked. Its screenshots stay in the conversation and are not files, so the pull request's images come from a `playwright` run: name both servers in the prompt, and tell it to take the *Screenshots* files with `playwright`.
- Signed-in views are still checked as the test users on `playwright-microsoft` and `playwright-google`, never in the browser pane: the pane cannot load a saved Playwright session without reading the session file, it has one shared profile that may hold the user's own sign-in, and it fits one account at a time. After the subagent's report, send the user the signed-in screenshots that passed the privacy check with `SendUserFile` (`status: normal`), so the user sees them in the app.
- If the subagent reports that it has no `mcp__Claude_Browser__*` tools, the public views go to `playwright` as above. The main chat still never runs the check itself.
- At the end, the main chat closes the pane tabs it opened, as *Servers* above says.

**Screenshots** (only for a Frontend UI change, taken by the browser subagent): while checking the changed view, take one screenshot of it on desktop (1440×900) and one on mobile (390×844) with `browser_take_screenshot`, after setting the size with `browser_resize`, and pass an ASCII `filename` inside the ticket's own folder, written from the workspace root: `.playwright-mcp/US-<id>/us-<id>-<view>-desktop.png` (a Task uses `.playwright-mcp/Task-<id>/task-<id>-<view>-desktop.png`). A relative `filename` resolves against the workspace root, so leave the `.playwright-mcp/` prefix out and the image lands in the repository root. One theme is enough, and at most two images per changed view, so pick the views that show the change best. They are saved in the git-ignored `.playwright-mcp/` folder, and step 8 uploads them to the pull request ([pull-request.md](pull-request.md)). Never copy them into the repository. Logs, snapshots and the subagent's helper scripts go to the same ticket folder: pass a `filename` there to every tool that accepts one (`browser_snapshot`, `browser_console_messages`, `browser_take_screenshot`). Files that `@playwright/mcp` names itself (`console-*.log`, `page-*.yml`) land in the root of `.playwright-mcp/`; the browser subagent moves them into the ticket's folder at the end of the check (*Browser subagent*), and the cleanup hook deletes any that are left at the first session start after they are an hour old. `@playwright/mcp` creates the subfolder itself when it saves a screenshot, so no `mkdir` is needed. A session hook deletes loose root files once they are over an hour old and other files after 14 days (see `.claude/rules/hooks.md`). Take no screenshots for backend, pipeline or skill changes.

A screenshot must not show secrets or personal data, such as tokens, email addresses, tenant or client IDs, or real data from a signed-in view. Look at every screenshot of a signed-in view (`/<cv-address>/admin`) with the Read tool before it is uploaded, and leave out any image that shows something suspicious, naming the view under *Huomioitavaa*. Read only the screenshots you took; do not open snapshots or logs from signed-in views.

**Formatting:** format the changed files the same way as User Story 32. Use `dotnet format` for C# and `npx prettier --write <files>` (from `src/Frontend`) for frontend files.

If a check fails, fix the cause and run it again. Never push code that fails a check, and never skip, disable or weaken a check to make it pass. If you cannot fix a failure, stop and report it with the error output.

**Code graph** (any change to code under `src`): this is not a pipeline check, so the rule above about failing checks does not apply to it. Run it in step 6, after the review fixes and right before committing, so the graph matches the final code. If `graphify-out/graph.json` exists, refresh the local graph so the next session's queries match the merged code. It is git-ignored, needs no LLM and is usually quick:

```powershell
python -m graphify update .
```

Skip it silently when `graphify-out/` does not exist, as in cloud sessions. If it warns that the graph would shrink, find out why (deleted files are fine) before re-running with `--force`. A failing update never blocks the PR; report it.
