# MyCV

A personal CV site: an ASP.NET Core REST API (`src/Backend`) and a React, TypeScript and Vite client (`src/Frontend`), tracked in Azure DevOps (project `MyCV`). See `README.md` for local setup, `DESIGN.md` and `PRODUCT.md` for the UI and product direction.

## Workflow

Every change is tied to an Azure DevOps work item and reaches `main` through a pull request that the user approves and completes.

1. **Start from a work item.** When the user names one ("User Story 47", "Task 50"), read it first. Check its Predecessor links first: a story or Task in `Waiting for Predecessor`, or one whose predecessor is not `Waiting for Deployment`, `Closed` or `Removed`, is not started without asking the user. The `Toteutusohje` section at the end of its description is the brief for the work: follow it, and ask its `Avoimet kysymykset` before starting. When the work item has a `Handoff` comment (`/handoff`), read the latest one too and continue from it. Otherwise find a matching story, or create one with `/write-user-story`.
2. **Do the work** on the working tree. Follow `/create-cv-skills` for backend APIs and their client integration, and `/setup-frontend` for the frontend shell and design.
3. **Ship it with `/create-pull-request`.** It checks that the current branch fits the work, switching to an up-to-date `main` if it does not, creates the branch, runs the pipeline checks, reviews the code and waits for the user to choose which findings to fix and to give their own comments, reviews only the new changes after fixes for those comments or on a follow-up push (a delta review), splits the work into commits, pushes, opens the PR linked to the work item, and posts a reviewer comment.
4. **The user reviews and completes the PR.** While the PR is open, the PR pipeline keeps its linked work items `In Progress`, including a `Waiting for Predecessor` story or Task (`templates/work-item-in-progress-job.yml`). After the merge, the `main` pipeline moves them forward (`templates/work-item-state-job.yml`) and releases their `Waiting for Predecessor` successors by the release rule under *State* in `/write-user-story`.

When a story or Task turns out to be investigation only, with nothing worth merging, skip the PR. Once the user agrees, discard the code, add the findings and the decision to the end of the work item's description, and move it to `Removed`. The pipeline releases successors only after a merge, so release its `Waiting for Predecessor` successors yourself by the same release rule.

The brief of a session started from another session (`start_session`) writes every work item as `US-<id>` or `Task-<id>`, never as `User Story <id>` or `Task <id>` anywhere in the brief, so the *model hint* hook does not stop its first message, which nobody would resend.

The first line of every work item description is `Tila: <state>: <reason>` (`references/description.md` of `/write-user-story`). Every state move writes it in the same update: the pipelines do it for their moves, and you do it whenever you move an item yourself (`Removed`, `On Hold`, a released successor, or `Closed` when the user explicitly asks, see *Never*).

When the user corrects how a step was done, update the skill or this file so the correction lasts, and say which file changed.

## Sivuhuomiot

A side note is a bug or gap that you, the browser check or the code review notice while working and that the current change did not cause. Never skip it because it is outside this change: it is ticketed or deliberately rejected.

1. Write one line for each: what was seen, where, and the evidence (file and line, view and size, or the log line).
2. Always ask whether to ticket it, and never write it to the ideas page without asking. In the desktop app, propose a session card (`mcp__ccd_session__start_session`, `initiation: own_initiative`) whose brief says: check for duplicates, write the story with `/write-user-story`, do not implement it. In a terminal, ask with `AskUserQuestion`. A turn shows at most three cards, so group several side notes into one card whose brief lists them, or ask in text once the limit is reached. When there is no one to ask (a cloud session or a background subagent), hold the side note and list it in the report or `/handoff`.
3. Do not fix a side note in the same PR unless the user asks for it.
4. A ticketed side note goes under `Sivuhuomiot` in the reviewer comment (`references/pull-request.md` of `/create-pull-request`) with the ticket link, and a rejected one under `Huomioitavaa` with the reason, never under both. Side notes that are not yet handled go into `/handoff`.

The browser subagent and the code review report side notes in their own `Sivuhuomiot` section, outside the numbered fix list; the main chat shows it to the user.

## Never

- Skip an observed bug or gap by saying it is not part of this change (*Sivuhuomiot*).
- Push anything to GitHub, not even the branch that a cloud session's own instructions tell you to push. GitHub only mirrors `main`, and only the `main` pipeline pushes there.
- Commit or push directly to `main`, not even the smallest change. Check `git branch --show-current` before every commit, including follow-up commits to an open PR, because the PR may have been completed and `main` pulled in the meantime.
- Complete, approve or set auto-complete on a pull request.
- Move work items to `Waiting for Deployment` by hand, or to `Closed` unless the user explicitly asks for that item. The pipeline does both after the merge.
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

The PR and `main` pipelines run these, but only for the areas a change touches (`templates/detect-changes-job.yml`). Run the ones for the areas you changed before pushing; `references/checks.md` of `/create-pull-request` says when each one applies:

```powershell
dotnet build src/MyCV.sln --configuration Release
dotnet test src/MyCV.sln --configuration Release --no-build
dotnet ef migrations has-pending-model-changes --project src/Backend/CV.DataAccess/CV.DataAccess.csproj --startup-project src/Backend/CV.WebApi/CV.WebApi.csproj
npm --prefix src/Frontend audit --audit-level=high
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
npx --yes markdownlint-cli2@0.24.0
```

A warning is a failed check: fix it, or ask the user whether to add the rule to the ignore list.

Format changed C# with `dotnet format` and changed frontend files with Prettier.

Check every frontend UI change in a real browser before pushing (*Browser checks* under *Tools*). Every work item checks its signed-in views as the Playwright test users, during the work and in `/create-pull-request`, never with the user's own accounts, and never types, reads or prints credentials. When a change touches sign-in or a signed-in view, also run `npm --prefix src/Frontend run e2e`, which needs the API and the test users' saved sessions. How the sessions renew, when the user is needed, the checklist and the e2e details are in `references/checks.md` of `/create-pull-request` (*Frontend*, *Frontend UI*, *Signed-in views* and *Browser subagent*).

## Tools

- **Azure DevOps address:** the only copy is `projectUrl` in `.claude/azure-devops.json`. Skills write it as `<project url>`, and scripts read it from that file, so never write the address into any other tracked file.
- **Azure DevOps** is reached through the `azure-devops` MCP server (`@azure-devops/mcp`) with a personal access token, because neither the browser sign-in nor Microsoft's remote MCP server accepts the user's personal Microsoft account. Locally, `.mcp.json` (local only) passes the `AZURE_DEVOPS_MCP` user environment variable (base64 of `:<PAT>`) to the server as `PERSONAL_ACCESS_TOKEN`. Cloud sessions get the token from their cloud environment, see *Cloud sessions*.
- **Hooks** (details in `.claude/rules/hooks.md`): the *model hint* hook stops the first message of a chat once to show the model and effort level that the named work item's `Työmäärä` line recommends; resending the message lets it through. The *weekly usage budget* status line and hook show the usage against today's limit and warn, but never block; the status line runs only in a local terminal Claude Code CLI session. In the desktop app and the VS Code chat panel the project's `usage-band` plugin (`.claude/skills/usage-band/`) shows the same numbers above the prompt, gives the budget and context notices, and blocks over `stopTokens` and runs `/handoff` by itself. The classic hooks run there too, so the model hint comes from `model-hint.mjs`, a context warning can show twice, and the budget hook may read an old CLI reading. The *code graph* hook (`graphify-session.mjs`, `SessionStart`) refreshes the code graph and gives its summary at the start of a session (see *Code graph* below). The *context budget* hook warns once over `warnTokens`; over `stopTokens` it blocks user messages that do not start with `/`, and Claude must stop at the next safe point, run `/handoff` and end the turn. The limits are in `.claude/hooks/context-budget.json`. The *Playwright cleanup* hook deletes loose files in the root of `.playwright-mcp/` once they are over an hour old at the next session start, and other files older than 14 days.
- **Path-scoped rules** live in `.claude/rules/` (`paths` frontmatter; a file loads only after Claude reads a matching file): `hooks.md` holds how the hooks and the status line work, `frontend-jsdoc.md` the only copy of the frontend JSDoc rules. A new file-specific instruction goes there, not in this file. Whatever must hold from the start of a session stays here.
- **Ports (read before starting or opening any server):** the frontend is always `http://localhost:3000` and the API `http://localhost:5062`; the only other port is `3100`, for an extra frontend that a check needs (stale Vite CSS). Never pick another port. Find out what runs with `curl` over HTTP, never with `netstat` or `Get-NetTCPConnection` (both miss the user's servers). A server you did not start is the user's: use it, never stop it. Start a missing one with `run_in_background` and stop it with `TaskStop` (in the desktop app, `preview_start` and `preview_stop`). The full rules are *Servers* in `references/checks.md` of `/create-pull-request`: read them before the first server step.
- **Browser checks** use the `playwright` MCP server (`@playwright/mcp`, also in `.mcp.json`), which opens a visible Chrome window locally, and for signed-in views the `playwright-microsoft` and `playwright-google` servers with the test users' saved sessions (*Signed-in views* in `references/checks.md` of `/create-pull-request`). Use the servers that are already running, start a new one only when needed and stop only your own (*Servers* in the same file). Every check runs in a background subagent that returns a short report, never in the main chat (*Browser subagent* in the same file). Screenshots and logs go to the ticket's folder `.playwright-mcp/US-<id>/` (a Task: `Task-<id>`), which is git-ignored and cleaned by a session hook (`.claude/rules/hooks.md`). Every check closes its browsers when it ends.
- **Git:** locally, `origin` pushes only to Azure DevOps. The `main` pipeline mirrors `main` to GitHub after each merge, so feature branches never go to GitHub.
- **Worktrees:** the Claude desktop app runs sessions in git worktrees under `.claude/worktrees/` and reuses their folders, so a worktree folder's name is only a label and says nothing about the work in it. In a worktree, branch from `origin/main` and never change the main checkout's branch; when the worktree's branch belongs to other, already merged work, create the work's branch before changing any file (*In A Worktree* in `references/branch.md` of `/create-pull-request`). After the merge, the worktree is removed (*Remove The Worktree* in `references/after-merge.md` of the same skill).
- **Claude desktop app** (`CLAUDE_CODE_ENTRYPOINT` is `claude-desktop`): `.claude/launch.json` starts the `frontend` and the `api` in the app's browser pane, the diff pane shows the changes while a review waits for the user, and public views are checked in the browser pane (*Servers* and *Browser subagent* in `references/checks.md`, *Wait For The Decision* in `references/code-review.md` of `/create-pull-request`).
- **Remote Control:** while the workstation is on, the user can drive a local session from the Claude app, with `/remote-control` in a running session or `claude remote-control` in the repository root to start new sessions from the phone. It has the full local toolset.
- **Cloud sessions** (claude.ai/code) clone the GitHub mirror, so `origin` is public GitHub there. Never push to it: the session's git proxy lets a push through but cannot delete the branch afterwards, so a pushed branch stays public until the `main` pipeline's next mirror run deletes it. In the `MyCV` cloud environment, the `azure-devops` MCP tools work as they do locally: the environment's setup script registers the server with a placeholder token, and a network secret adds the token to requests to `dev.azure.com` after they leave the session. Such a session runs `/write-user-story` and `/create-pull-request` from start to finish, pushing to a separate `azure` remote (`references/cloud-session.md` of that skill). Sessions in other environments cannot reach Azure DevOps. A cloud session that cannot push, because it runs in another environment or the push failed, commits its code and publishes the patch of its own commits (`git format-patch`, see `references/cloud-handoff.md` of that skill) as a private artifact, because the container and its commits are discarded. Link the artifact from the work item's discussion, or from the idea's `handoffUrl` when there is no work item. `/create-pull-request` deletes it once the pull request is open. The handoff comment and how a local chat applies the patch are in the same file.
- **Ideas page:** ideas that are not ready to become User Stories, and drafts from cloud sessions that cannot reach Azure DevOps, go to the `ideas` collection of the private `MyCV-ideat` artifact with the `ArtifactData` tool. Find its URL with the `Artifact` tool (`action: list`); it stays out of this file because the repository is mirrored publicly. Fields: `title`, `summary`, `status` (`uusi` or `luonnos`; an idea is deleted once its story exists), `tags`, `parent`, `tasks`, `descriptionHtml` (the story description as in `/write-user-story`), `handoffUrl`, `workItemId`, `source`, `createdAt` and `updatedAt`. `/write-user-story` builds stories from these ideas and deletes them once the story exists; `/check-ideas-artifact` goes through the whole collection and runs it for every idea that still needs a story.
- **Code graph (Graphify):** a local-only knowledge graph of the code in `graphify-out/` (git-ignored; `.graphifyignore` lists what it skips), built with the global `graphify` skill and the `graphifyy` Python package (`pip install --user graphifyy`). Cloud sessions and fresh clones do not have it: when `graphify-out/graph.json` or the package is missing, use Grep and Glob. Otherwise start every implementation task, not only architecture questions, with `python -m graphify query "<question>" --budget 1500` (also `path "A" "B"`, `explain "X"`, `affected "X"`) before reading files, and verify in the files it points to, because it holds code only and goes stale. The `SessionStart` hook `graphify-session.mjs` refreshes a graph that is behind HEAD at the start of every session and gives you its summary; in a worktree it copies the main checkout's graph and updates the copy, and it stays silent without a graph or the package (`.claude/rules/hooks.md`). `python -m graphify update .` refreshes it without an LLM (`/create-pull-request` runs it before committing when `src` code changed); `/graphify` does a full rebuild or a docs pass. If the update warns that the graph would shrink, check why before passing `--force`.
- **Project skills** live in `.claude/skills/`. Each one is tracked through an exception in `.gitignore`. Add a new exception when you add a skill.
