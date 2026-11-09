# MyCV frontend

The React, TypeScript and Vite client of MyCV. Local setup is in the repository's [README](../../README.md).

## End-to-end tests

The Playwright tests in `e2e/` check the signed-in views as two test users, one for each sign-in method, against the local frontend (`http://localhost:3000`) and the local API (`http://localhost:5062`). Each test user changes only its own test CV.

### One-time setup

1. Create the test users. Both have "Playwright" in their display name, and neither has a role:
   - **Microsoft:** a user in the app's Entra tenant, without the `CvAdmin` role. If the app's enterprise application requires assignment, assign the user to it without a role. Sign in with the user's user principal name; no mailbox is needed.
   - **Google:** a Google account. Add its address to the API's user secrets under the next free index of `Authentication:Google:AllowedSignUpEmails`, for example `dotnet user-secrets set "Authentication:Google:AllowedSignUpEmails:1" "<address>" --project src/Backend/CV.WebApi`, and restart the API.
2. Add `VITE_AUTH_STORAGE=local` to `src/Frontend/.env.development.local` and restart the dev server. It keeps the sign-in sessions in local storage, which the saved sessions hold. Only the dev server honours the variable: the app ignores it in `npm run build`, so a built app always keeps sessions in session storage and a session never outlives its tab.
3. Install Playwright's browser: `npx playwright install chromium`. The scripts need Node 22.18 or newer, which runs TypeScript files directly. The Google session is recorded in Chrome, because Google's sign-in page refuses Playwright's own Chromium.

### Recording the sessions

With the frontend running, run `npm run e2e:auth`, or `npm run e2e:auth -- microsoft` or `-- google` for one of them. A browser opens for each sign-in method: sign in with its test user yourself, MFA included, and answer **Yes** to "Stay signed in?", which lets the app renew the session silently for longer. The session is saved in `e2e/.auth/` (git-ignored), and the script refuses to save a session that is not a test user's.

The Microsoft session can also be recorded without you. Save the test user once in Windows Credential Manager; `cmdkey` asks for the password, so it stays out of the command history:

```powershell
cmdkey /generic:MyCV-e2e-microsoft /user:<test user's sign-in name> /pass
```

Then `npm run e2e:auth -- microsoft --auto` signs in by itself, without a window (`--headed` shows one), answers Yes to "Stay signed in?" and saves the session. Only this script reads the credentials, through the Windows CredRead API in a child PowerShell; nothing prints, logs or saves them, and they are never retried after a rejection. MFA, a captcha, a rejected password or any other unexpected step stops it with a message, and you sign in by hand as above. It refuses to run in CI, which uses a mock identity provider instead.

The Google session is recorded in a persistent Chrome profile outside the repository, `%LOCALAPPDATA%\MyCV\e2e\google-profile`, because Google's short-lived session cookies renew only in the profile that holds them: copied into another browser, the saved session stops signing in when the app's one-hour token ends. Sign in there once with `npm run e2e:auth -- google`. After that, `npm run e2e:auth -- google --auto` renews the session without you and without a password: it opens the profile, without a window unless `--headed` is given, lets the app renew its token silently and saves the session. It never types or clicks anything on Google's pages, so when Google asks for anything, such as an account choice, a verification or "This browser or app may not be secure", it stops at once with a message, and you sign in by hand as above. The profile holds the test user's Google sign-in, so keep it in your own user folder and delete it when you no longer need it. Only one browser can use it at a time.

### Running the tests

Start the API and its database, then run `npm run e2e`. The API check before the run doesn't reach the database, so a missing database shows only when a test saves. Playwright uses the frontend on port 3000, or starts one with `VITE_AUTH_STORAGE=local` when none runs. Before the tests, and before `e2e:auth` opens a browser, the frontend's own settings are checked: it must be the dev server, keep sessions in local storage, and send API requests to this machine. Before each sign-in method's tests, its setup project checks that the session still signs in, creates the test CV when it is missing, and saves the session again with the tokens the app renewed. Reports, traces and screenshots go to `e2e/.output/` (git-ignored). With `CI` set, failed tests are retried, a JUnit report is written to `e2e/.output/junit.xml`, and Playwright always starts its own frontend, so port 3000 must be free.

| Variable           | Default                 |
| ------------------ | ----------------------- |
| `E2E_BASE_URL`     | `http://localhost:3000` |
| `E2E_MICROSOFT_CV` | `playwright-microsoft`  |
| `E2E_GOOGLE_CV`    | `playwright-google`     |

### When a session lapses

Microsoft's refresh token for a single-page app lasts 24 hours. Because every run saves the renewed session, tests run regularly can keep a session alive longer, but Microsoft or Google can ask for a new sign-in, or MFA, at any time. The setup project then signs in again by itself and runs the tests with the new session: Microsoft when its test user is saved in Credential Manager, and Google when you have signed in to its Chrome profile (`e2e:auth -- <method> --auto` in a child process, so the credentials never reach Playwright's traces or reports). Otherwise, or when the automatic sign-in stops, it stops with a message: save the credentials, or run `npm run e2e:auth` again. Unattended runs in a pipeline need a mock identity provider instead, which is left to a later story.

### Browser checks with Claude Code

The local `.mcp.json` can add two Playwright MCP servers that open an isolated browser with a test user's saved session: `@playwright/mcp` with `--isolated --storage-state src/Frontend/e2e/.auth/microsoft.json` (and `google.json` for the other). Approve them when Claude Code asks, or add them to `enabledMcpjsonServers` in `.claude/settings.local.json`, and restart Claude Code. They read the file only when they start. Claude Code loads a renewed Microsoft session into the running `playwright-microsoft` browser with its `browser_run_code_unsafe` tool and the file `src/Frontend/e2e/mcp/load-microsoft-session.js`, and saves the browser's renewed session back with `save-microsoft-session.js`, so it needs no restart; Playwright reads and writes the session file itself, so no token passes through the chat. The `.mcp.json` arguments stay as above. The isolated `playwright-google` browser can't renew the Google session itself, so a session lasts there as long as its one-hour token: run `npm run e2e:auth -- google --auto` and load the renewed session with `load-google-session.js` the same way, without `/mcp`. Saving it back would add nothing, so it has no save script.
