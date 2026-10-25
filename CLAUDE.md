# MyCV

A personal CV site: an ASP.NET Core REST API (`src/Backend`) and a React, TypeScript and Vite client (`src/Frontend`), tracked in Azure DevOps (organization `valetuominen`, project `MyCV`). See `README.md` for local setup, `DESIGN.md` and `PRODUCT.md` for the UI and product direction.

## Workflow

Every change is tied to an Azure DevOps work item and reaches `main` through a pull request that the user approves and completes.

1. **Start from a work item.** When the user names one ("User Story 47", "Task 50"), read it first. The `Toteutusohje` section at the end of its description is the brief for the work: follow it, and ask its `Avoimet kysymykset` before starting. Otherwise find a matching story, or create one with `/write-user-story`.
2. **Do the work** on the working tree. Follow `/create-cv-skills` for backend APIs and their client integration, and `/setup-frontend` for the frontend shell and design.
3. **Ship it with `/create-pull-request`.** It checks that the current branch fits the work, switching to an up-to-date `main` if it does not, creates the branch, runs the pipeline checks, splits the work into commits, pushes, opens the PR linked to the work item, and posts a reviewer comment.
4. **The user reviews and completes the PR.** While the PR is open, the PR pipeline keeps its linked work items `In Progress` (`templates/work-item-in-progress-job.yml`). After the merge, the `main` pipeline moves them forward (`templates/work-item-state-job.yml`).

When a story turns out to be investigation only, with nothing worth merging, skip the PR. Once the user agrees, discard the code, add the findings and the decision to the end of the work item's description, and move it to `Removed`.

When the user corrects how a step was done, update the skill or this file so the correction lasts, and say which file changed.

## Never

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
| Frontend code comments | JSDoc only (summary, `@param`, `@returns`), on every function and every `const` with logic; no `//` comments or commented-out code. Enforced by `eslint-plugin-jsdoc`. See *Frontend Conventions* in `/setup-frontend` |

## Checks

The PR and `main` pipelines run these, but only for the areas a change touches (`templates/detect-changes-job.yml`). Run the ones for the areas you changed before pushing:

```powershell
dotnet build src/MyCV.sln --configuration Release
dotnet ef migrations has-pending-model-changes --project src/Backend/CV.DataAccess/CV.DataAccess.csproj --startup-project src/Backend/CV.WebApi/CV.WebApi.csproj
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
```

Format changed C# with `dotnet format` and changed frontend files with Prettier.

Check every frontend UI change in a real browser with the `playwright` MCP server before pushing: desktop and mobile, both themes, the changed interactions, reduced motion and the console. The checklist is in `/create-pull-request`.

## Tools

- **Azure DevOps** is reached through the `azure-devops` MCP server (`.mcp.json`, local only). It signs in with a personal access token from the `AZURE_DEVOPS_MCP` user environment variable (base64 of `:<PAT>`), which `.mcp.json` passes to the server as `PERSONAL_ACCESS_TOKEN`, because the browser sign-in does not accept the user's personal Microsoft account.
- **Browser checks** use the `playwright` MCP server (`@playwright/mcp`, also in `.mcp.json`). It opens a visible Chrome window, so the user can sign in there for the admin views. Its screenshots and logs go to `.playwright-mcp/`, which is git-ignored.
- **Git:** `origin` pushes only to Azure DevOps. The `main` pipeline mirrors `main` to GitHub after each merge, so feature branches never go to GitHub.
- **Project skills** live in `.claude/skills/`. Each one is tracked through an exception in `.gitignore`. Add a new exception when you add a skill.
