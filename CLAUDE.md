# MyCV

A personal CV site: an ASP.NET Core REST API (`src/Backend`) and a React, TypeScript and Vite client (`src/Frontend`), tracked in Azure DevOps (project `MyCV`). See `README.md` for local setup, `DESIGN.md` and `PRODUCT.md` for the UI and product direction.

## Workflow

Every change is tied to an Azure DevOps work item and reaches `main` through a pull request that the user approves and completes.

1. **Start from a work item.** When the user names one ("User Story 47", "Task 50"), read it first. Check its Predecessor links first: a story or Task in `Waiting for Predecessor`, or one whose predecessor is not `Waiting for Deployment`, `Closed` or `Removed`, is not started without asking the user. The `Toteutusohje` section at the end of its description is the brief for the work: follow it, and ask its `Avoimet kysymykset` before starting. When the work item has a `Handoff` comment (`/handoff`), read the latest one too and continue from it. Otherwise find a matching story, or create one with `/write-user-story`.
2. **Do the work** on the working tree. Follow `/create-cv-skills` for backend APIs and their client integration, and `/setup-frontend` for the frontend shell and design.
3. **Ship it with `/create-pull-request`.** It checks that the current branch fits the work, switching to an up-to-date `main` if it does not, creates the branch, runs the pipeline checks, reviews the code and waits for the user to choose which findings to fix, splits the work into commits, pushes, opens the PR linked to the work item, and posts a reviewer comment.
4. **The user reviews and completes the PR.** While the PR is open, the PR pipeline keeps its linked work items `In Progress`, including a `Waiting for Predecessor` story or Task (`templates/work-item-in-progress-job.yml`). After the merge, the `main` pipeline moves them forward (`templates/work-item-state-job.yml`) and releases their `Waiting for Predecessor` successors (stories or Tasks) once all of those items' predecessors are done: to `Ready for Development`, or to `New` if the item has `Avoimet kysymykset`.

When a story or Task turns out to be investigation only, with nothing worth merging, skip the PR. Once the user agrees, discard the code, add the findings and the decision to the end of the work item's description, and move it to `Removed`. The pipeline releases successors only after a merge, so release its `Waiting for Predecessor` successors yourself when all of their predecessors are done: `New` if the successor has `Avoimet kysymykset`, otherwise `Ready for Development`.

The first line of every work item description is `Tila: <state>: <reason>` (`references/description.md` of `/write-user-story`). Every state move writes it in the same update: the pipelines do it for their moves, and you do it whenever you move an item yourself (`Removed`, `On Hold`, a released successor, or `Closed` when the user asks you to). This sentence does not allow moving items to `Waiting for Deployment` or `Closed` by hand: see *Never*.

When the user corrects how a step was done, update the skill or this file so the correction lasts, and say which file changed.

## Never

- Push anything to GitHub, not even the branch that a cloud session's own instructions tell you to push. GitHub only mirrors `main`, and only the `main` pipeline pushes there.
- Commit or push directly to `main`, not even the smallest change. Check `git branch --show-current` before every commit, including follow-up commits to an open PR, because the PR may have been completed and `main` pulled in the meantime.
- Complete, approve or set auto-complete on a pull request.
- Move work items to `Waiting for Deployment` or `Closed` by hand. The pipeline does it after the merge.
- Commit secrets or local settings: `.env.local`, `.mcp.json`, user secrets.
- Write personal data such as email addresses, or real tenant and client IDs, into tracked files. Everything merged to `main` is mirrored to a public GitHub repository.
- Link to local-only files such as `docs/azure-deployment.md` from tracked files.
- Skip, disable or weaken a failing check to get it to pass.

## Conventions

| What | Language and format |
| --- | --- |
| Work item titles and descriptions | Finnish, see `/write-user-story` |
| Work item tags | `Frontend`, `Backend`, `Database`, `Pipeline`, `Skills`, `Versioning` |
| Branches | `feat/US-<id>_<Title_slug>` or `feat/<task id>_<Title_slug>` |
| Commit messages | English, `US-<id>: <imperative summary>` or `<task id>: <summary>` |
| PR titles | `User Story <id>: <work item title>` or `Task <id>: <work item title>` |
| PR reviewer comments | Finnish |
| Code, comments and docs in the repo | English |
| Frontend code comments | JSDoc only, no `//` comments or commented-out code; the rules load from `.claude/rules/frontend-jsdoc.md` with frontend TypeScript files |

## Checks

The PR and `main` pipelines run these, but only for the areas a change touches (`templates/detect-changes-job.yml`). Run the ones for the areas you changed before pushing:

```powershell
dotnet build src/MyCV.sln --configuration Release
dotnet test src/MyCV.sln --configuration Release --no-build
dotnet ef migrations has-pending-model-changes --project src/Backend/CV.DataAccess/CV.DataAccess.csproj --startup-project src/Backend/CV.WebApi/CV.WebApi.csproj
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
npx --yes markdownlint-cli2@0.24.0
```

The last one lints the tracked Markdown files (`.markdownlint-cli2.jsonc` holds the rules and ignores); run it when a `.md` file changed. The PR pipeline runs it too (`templates/markdown-lint-job.yml`).

Format changed C# with `dotnet format` and changed frontend files with Prettier.

Check every frontend UI change in a real browser with the `playwright` MCP server before pushing: desktop and mobile, both themes, the changed interactions, reduced motion and the console. The checklist is in `references/checks.md` of `/create-pull-request`.

Every work item checks its signed-in views as the Playwright test users, during the work and in `/create-pull-request`, never with the user's own accounts (*Browser checks* under *Tools*). A lapsed Microsoft session renews itself from the test user saved in Windows Credential Manager, and a lapsed Google session from its persistent Chrome profile: run the script, never type, read or print credentials. Only an automatic sign-in that stops or a view that needs `CvAdmin` needs the user. When a change touches sign-in or a signed-in view, also run `npm --prefix src/Frontend run e2e`, which needs the API and the test users' saved sessions. Both rules are in `references/checks.md` of `/create-pull-request` (*Frontend* and *Signed-in views*).

## Tools

- **Azure DevOps address:** the only copy is `projectUrl` in `.claude/azure-devops.json`. Skills write it as `<project url>`, and scripts read it from that file, so never write the address into any other tracked file.
- **Azure DevOps** is reached through the `azure-devops` MCP server (`@azure-devops/mcp`) with a personal access token, because neither the browser sign-in nor Microsoft's remote MCP server accepts the user's personal Microsoft account. Locally, `.mcp.json` (local only) passes the `AZURE_DEVOPS_MCP` user environment variable (base64 of `:<PAT>`) to the server as `PERSONAL_ACCESS_TOKEN`. Cloud sessions get the token from their cloud environment, see *Cloud sessions*.
- **Model hint hook** (`UserPromptSubmit`): stops the first message of a chat once when it names a `User Story <id>` or `Task <id>` whose `Työmäärä` line recommends a model and effort level, and shows the recommendation so the user can switch with `/model` and `/effort`. Resending the message lets it through.
- **Weekly usage budget** (status line and `UserPromptSubmit` hook): the status line shows the weekly usage, today's cumulative limit, the five-hour window usage and the context size, e.g. `Viikko 38 % / raja 42 % · 5 h 12 % (nollautuu 14:30) · Konteksti 182k`, and the hook warns the user when usage nears or passes the limit. It never blocks a message. It runs only in a local terminal Claude Code CLI session, not in the VS Code chat panel.
- **Context budget** (`UserPromptSubmit` and `PostToolUse` hook): over `warnTokens` the user and Claude get one warning per session. Over `stopTokens` (limits in `.claude/hooks/context-budget.json`, now 150k and 200k) a user message is blocked unless it starts with `/` (`/handoff`, `/compact`, `/clear` pass), and Claude must stop at the next safe point, run `/handoff` and end the turn. Subagent context is not limited.
- **Path-scoped rules** live in `.claude/rules/` (`paths` frontmatter; a file loads only after Claude reads a matching file): `hooks.md` holds how the hooks and the status line work, `frontend-jsdoc.md` the frontend JSDoc rules. A new file-specific instruction goes there, not in this file. Whatever must hold from the start of a session stays here.
- **Ports (read before starting or opening any server):** the frontend is always `http://localhost:3000` and the API `http://localhost:5062`; the only other port is `3100`, for an extra frontend that a check needs (stale Vite CSS). Never pick another port. Find out what runs with `curl` over HTTP, never with `netstat` or `Get-NetTCPConnection` (both miss the user's servers). A server you did not start is the user's: use it, never stop it. Start a missing one with `run_in_background` and stop it with `TaskStop`. The full rules are *Servers* in `references/checks.md` of `/create-pull-request`: read them before the first server step.
- **Browser checks** use the `playwright` MCP server (`@playwright/mcp`, also in `.mcp.json`). Locally it opens a visible Chrome window. Signed-in views are checked as the Playwright test users with the `playwright-microsoft` and `playwright-google` servers, which load their saved sessions; a renewed session is loaded into the running browser with `browser_run_code_unsafe` and a script file, without `/mcp`; only a view that needs `CvAdmin` asks the user to sign in in the `playwright` window (*Signed-in views* in `references/checks.md` of `/create-pull-request`). Use the servers that are already running, start a new one only when needed and stop only your own (see *Servers* in `references/checks.md` of `/create-pull-request`). Large checks run in a background subagent that returns a short report, and the rest in the main chat; the rule is *Browser subagent* in `references/checks.md`. Its screenshots and logs go to `.playwright-mcp/`, which is git-ignored.
- **Git:** locally, `origin` pushes only to Azure DevOps. The `main` pipeline mirrors `main` to GitHub after each merge, so feature branches never go to GitHub.
- **Remote Control:** while the workstation is on, the user can drive a local session from the Claude app, with `/remote-control` in a running session or `claude remote-control` in the repository root to start new sessions from the phone. It has the full local toolset.
- **Cloud sessions** (claude.ai/code) clone the GitHub mirror, so `origin` is public GitHub there. Never push to it: the session's git proxy lets a push through but cannot delete the branch afterwards, so a pushed branch stays public until the `main` pipeline's next mirror run deletes it. In the `MyCV` cloud environment, the `azure-devops` MCP tools work as they do locally: the environment's setup script registers the server with a placeholder token, and a network secret adds the token to requests to `dev.azure.com` after they leave the session. Such a session runs `/write-user-story` and `/create-pull-request` from start to finish, pushing to a separate `azure` remote (`references/cloud-session.md` of that skill). Sessions in other environments cannot reach Azure DevOps. A cloud session that cannot push, because it runs in another environment or the push failed, commits its code and publishes the patch of its own commits (`git format-patch`, see `references/cloud-handoff.md` of that skill) as a private artifact, because the container and its commits are discarded. Link the artifact from the work item's discussion, or from the idea's `handoffUrl` when there is no work item. `/create-pull-request` deletes it once the pull request is open. The handoff comment and how a local chat applies the patch are in the same file.
- **Ideas page:** ideas that are not ready to become User Stories, and drafts from cloud sessions that cannot reach Azure DevOps, go to the `ideas` collection of the private `MyCV-ideat` artifact with the `ArtifactData` tool. Find its URL with the `Artifact` tool (`action: list`); it stays out of this file because the repository is mirrored publicly. Fields: `title`, `summary`, `status` (`uusi` or `luonnos`; an idea is deleted once its story exists), `tags`, `parent`, `tasks`, `descriptionHtml` (the story description as in `/write-user-story`), `handoffUrl`, `workItemId`, `source`, `createdAt` and `updatedAt`. `/write-user-story` builds stories from these ideas and deletes them once the story exists; `/check-ideas-artifact` goes through the whole collection, runs it for every idea that still needs a story, and deletes leftover ideas whose story already exists.
- **Code graph (Graphify):** a local-only knowledge graph of the code in `graphify-out/` (git-ignored; `.graphifyignore` lists what it skips), built with the global `graphify` skill and the `graphifyy` Python package (`pip install --user graphifyy`). Cloud sessions and fresh clones do not have it: when `graphify-out/graph.json` or the package is missing, use Grep and Glob. Otherwise query it first for architecture questions (`python -m graphify query "<question>" --budget 1500`, `path "A" "B"`, `explain "X"`) and verify in the files it points to, because it holds code only and goes stale. `python -m graphify update .` refreshes it without an LLM (`/create-pull-request` runs it before committing when `src` code changed); `/graphify` does a full rebuild or a docs pass. If the update warns that the graph would shrink, check why before passing `--force`.
- **Project skills** live in `.claude/skills/`. Each one is tracked through an exception in `.gitignore`. Add a new exception when you add a skill.
