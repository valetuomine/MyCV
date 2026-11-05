# MyCV

A personal CV site: an ASP.NET Core REST API (`src/Backend`) and a React, TypeScript and Vite client (`src/Frontend`), tracked in Azure DevOps (project `MyCV`). See `README.md` for local setup, `DESIGN.md` and `PRODUCT.md` for the UI and product direction.

## Workflow

Every change is tied to an Azure DevOps work item and reaches `main` through a pull request that the user approves and completes.

1. **Start from a work item.** When the user names one ("User Story 47", "Task 50"), read it first. Check its Predecessor links first: a story in `Waiting for Predecessor`, or one whose predecessor is not `Waiting for Deployment`, `Closed` or `Removed`, is not started without asking the user. The `Toteutusohje` section at the end of its description is the brief for the work: follow it, and ask its `Avoimet kysymykset` before starting. Otherwise find a matching story, or create one with `/write-user-story`.
2. **Do the work** on the working tree. Follow `/create-cv-skills` for backend APIs and their client integration, and `/setup-frontend` for the frontend shell and design.
3. **Ship it with `/create-pull-request`.** It checks that the current branch fits the work, switching to an up-to-date `main` if it does not, creates the branch, runs the pipeline checks, reviews the code and waits for the user to choose which findings to fix, splits the work into commits, pushes, opens the PR linked to the work item, and posts a reviewer comment.
4. **The user reviews and completes the PR.** While the PR is open, the PR pipeline keeps its linked work items `In Progress`, including a `Waiting for Predecessor` story (`templates/work-item-in-progress-job.yml`). After the merge, the `main` pipeline moves them forward (`templates/work-item-state-job.yml`) and releases their `Waiting for Predecessor` successors once all of those stories' predecessors are done: to `Ready for Development`, or to `New` if the story has `Avoimet kysymykset`.

When a story turns out to be investigation only, with nothing worth merging, skip the PR. Once the user agrees, discard the code, add the findings and the decision to the end of the work item's description, and move it to `Removed`. The pipeline releases successors only after a merge, so release its `Waiting for Predecessor` successors yourself when all of their predecessors are done: `New` if the story has `Avoimet kysymykset`, otherwise `Ready for Development`.

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
|---|---|
| Work item titles and descriptions | Finnish, see `/write-user-story` |
| Work item tags | `Frontend`, `Backend`, `Database`, `Pipeline`, `Skills`, `Versioning` |
| Branches | `feat/US-<id>_<Title_slug>` or `feat/<task id>_<Title_slug>` |
| Commit messages | English, `US-<id>: <imperative summary>` or `<task id>: <summary>` |
| PR titles | `User Story <id>: <work item title>` or `Task <id>: <work item title>` |
| PR reviewer comments | Finnish |
| Code, comments and docs in the repo | English |
| Frontend code comments | JSDoc only (summary, `@param`, `@returns`), on every function and every `const` with logic; no `//` comments or commented-out code. Enforced by `eslint-plugin-jsdoc`. See `references/jsdoc.md` in `/setup-frontend` |

## Checks

The PR and `main` pipelines run these, but only for the areas a change touches (`templates/detect-changes-job.yml`). Run the ones for the areas you changed before pushing:

```powershell
dotnet build src/MyCV.sln --configuration Release
dotnet test src/MyCV.sln --configuration Release --no-build
dotnet ef migrations has-pending-model-changes --project src/Backend/CV.DataAccess/CV.DataAccess.csproj --startup-project src/Backend/CV.WebApi/CV.WebApi.csproj
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
```

Format changed C# with `dotnet format` and changed frontend files with Prettier.

Check every frontend UI change in a real browser with the `playwright` MCP server before pushing: desktop and mobile, both themes, the changed interactions, reduced motion and the console. The checklist is in `references/checks.md` of `/create-pull-request`.

## Tools

- **Azure DevOps address:** the only copy is `projectUrl` in `.claude/azure-devops.json`. Skills write it as `<project url>`, and scripts read it from that file, so never write the address into any other tracked file.
- **Azure DevOps** is reached through the `azure-devops` MCP server (`@azure-devops/mcp`) with a personal access token, because neither the browser sign-in nor Microsoft's remote MCP server accepts the user's personal Microsoft account. Locally, `.mcp.json` (local only) passes the `AZURE_DEVOPS_MCP` user environment variable (base64 of `:<PAT>`) to the server as `PERSONAL_ACCESS_TOKEN`. Cloud sessions get the token from their cloud environment, see *Cloud sessions*.
- **Model hint hook:** `.claude/hooks/model-hint.mjs` (`UserPromptSubmit`, registered in `.claude/settings.json`) stops the first message of a chat once (later messages are never checked, and a failed lookup is not retried) when it names a `User Story <id>` or `Task <id>` whose `Työmäärä` line recommends a model and effort level. It shows the recommendation so the user can switch with `/model` and `/effort` before tokens are spent, and resending the message lets it through. It does nothing on any failure, and it cannot change the model itself.
- **Weekly usage budget:** the status line (`.claude/hooks/usage-statusline.mjs`, `statusLine` in `.claude/settings.json`) shows the weekly usage, today's cumulative limit and the five-hour window usage with the time the window resets, e.g. `Viikko 38 % / raja 42 % · 5 h 12 % (nollautuu 14:30)`; the time is left out when `resets_at` is missing or already past. It stores the weekly usage in the temp directory, and the `UserPromptSubmit` hook `.claude/hooks/usage-budget.mjs` reads it and shows a `systemMessage` warning once a day when usage nears the limit and once when it passes it. It never blocks a message. Each weekday's share is set in `.claude/hooks/usage-budget.json` (default 14 % a day, warning margin 3 percentage points). The limit is cumulative from the week's start (`resets_at` minus 7 days), so an unused day moves its share to the following days. Both scripts share `usage-budget-core.mjs`. Only a running local Claude Code CLI session reports usage, and a missing file or field is skipped silently. The VS Code chat panel does not run the status line, so it shows no numbers and the hook has nothing to read there: start sessions with `claude` in a terminal, or set `claudeCode.useTerminal` and use the "✻ Claude Code" status bar button (both need `claude` on PATH).
- **Browser checks** use the `playwright` MCP server (`@playwright/mcp`, also in `.mcp.json`). Locally it opens a visible Chrome window, so the user can sign in there for the admin views. Use the servers that are already running, start a new one only when needed and stop only your own (see *Servers* in `references/checks.md` of `/create-pull-request`). Its screenshots and logs go to `.playwright-mcp/`, which is git-ignored.
- **Git:** locally, `origin` pushes only to Azure DevOps. The `main` pipeline mirrors `main` to GitHub after each merge, so feature branches never go to GitHub.
- **Remote Control:** while the workstation is on, the user can drive a local session from the Claude app, with `/remote-control` in a running session or `claude remote-control` in the repository root to start new sessions from the phone. It has the full local toolset.
- **Cloud sessions** (claude.ai/code) clone the GitHub mirror, so `origin` is public GitHub there. Never push to it: the session's git proxy lets a push through but cannot delete the branch afterwards, so a pushed branch stays public until the `main` pipeline's next mirror run deletes it. In the `MyCV` cloud environment, the `azure-devops` MCP tools work as they do locally: the environment's setup script registers the server with a placeholder token, and a network secret adds the token to requests to `dev.azure.com` after they leave the session. Such a session runs `/write-user-story` and `/create-pull-request` from start to finish, pushing to a separate `azure` remote (`references/cloud-session.md` of that skill). Sessions in other environments cannot reach Azure DevOps. A cloud session that cannot push, because it runs in another environment or the push failed, commits its code and publishes the patch of its own commits (`git format-patch`, see `references/cloud-handoff.md` of that skill) as a private artifact, because the container and its commits are discarded. Link the artifact from the work item's discussion, or from the idea's `handoffUrl` when there is no work item. `/create-pull-request` deletes it once the pull request is open. The handoff comment and how a local chat applies the patch are in the same file.
- **Ideas page:** ideas that are not ready to become User Stories, and drafts from cloud sessions that cannot reach Azure DevOps, go to the `ideas` collection of the private `MyCV-ideat` artifact with the `ArtifactData` tool. Find its URL with the `Artifact` tool (`action: list`); it stays out of this file because the repository is mirrored publicly. Fields: `title`, `summary`, `status` (`uusi` or `luonnos`; an idea is deleted once its story exists), `tags`, `parent`, `tasks`, `descriptionHtml` (the story description as in `/write-user-story`), `handoffUrl`, `workItemId`, `source`, `createdAt` and `updatedAt`. `/write-user-story` builds stories from these ideas and deletes them once the story exists; `/check-ideas-artifact` goes through the whole collection, runs it for every idea that still needs a story, and deletes leftover ideas whose story already exists.
- **Code graph (Graphify):** a local-only knowledge graph of the code in `graphify-out/` (git-ignored; `.graphifyignore` lists what it skips), built with the global `graphify` skill and the `graphifyy` Python package (`pip install --user graphifyy`). Cloud sessions and fresh clones do not have it: when `graphify-out/graph.json` or the package is missing, use Grep and Glob. Otherwise query it first for architecture questions (`python -m graphify query "<question>" --budget 1500`, `path "A" "B"`, `explain "X"`) and verify in the files it points to, because it holds code only and goes stale. `python -m graphify update .` refreshes it without an LLM (`/create-pull-request` runs it before committing when `src` code changed); `/graphify` does a full rebuild or a docs pass. If the update warns that the graph would shrink, check why before passing `--force`.
- **Project skills** live in `.claude/skills/`. Each one is tracked through an exception in `.gitignore`. Add a new exception when you add a skill.
