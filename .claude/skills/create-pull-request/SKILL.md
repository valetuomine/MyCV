---
name: create-pull-request
description: 'Ship finished MyCV work as an Azure DevOps pull request end to end: create or reuse the work item, create the branch, split the changes into commits, run the pipeline checks, push, and open the PR linked to the work item. Use when the user asks to create a PR, ship, open a pull request, or "make this ready for review".'
argument-hint: '[work item ID, or what the change is about]'
user-invocable: true
---

# Create A Pull Request

Use this workflow to take changes in the working tree all the way to an open pull request in the `MyCV` repository (Azure DevOps organization `valetuominen`, project `MyCV`). The user's only manual step is to review and complete the pull request, so every other step happens here without asking for approval in between. Stop and ask only when something below says so.

## Never Commit On `main`

Every change reaches `main` through a pull request, however small: a one-line fix, a typo, a skill or README tweak. No commit is ever made on local `main`, not even one you plan to move to a branch later.

- Run `git branch --show-current` right before **every** `git commit`, including follow-up commits to a pull request that is already open. The user may have completed the PR, switched branches or pulled `main` since your last step.
- If it prints `main`, do not commit. Go through *Branch*: it creates a feature branch and the uncommitted changes carry over.
- If it prints a feature branch, confirm that its pull request is still active before committing. If the PR was completed or abandoned, the new commits need a new branch and a new pull request: run the whole workflow again.

## Workflow

1. **Inspect the changes.** Run `git status` and `git diff` (including untracked files) and understand what the change does. If there is nothing to commit, stop and tell the user.
2. **Resolve the work item.** See *Work Item*.
3. **Check the current branch and create the feature branch.** If the current branch is wrong for this work, switch to `main` and pull from `origin` first. See *Branch*.
4. **Run the checks.** See *Checks*. Fix anything that fails before continuing.
5. **Commit** the changes as several focused commits. See *Commits*.
6. **Push** the branch: `git push -u origin <branch>`. The `origin` remote pushes only to Azure DevOps; the pipeline copies `main` to GitHub after the merge, so feature branches never go to GitHub.
7. **Open the pull request** and post the reviewer comment. See *Pull Request*.
8. **Report** the PR link, the work item link, the commit list and the check results to the user.

## Work Item

Every pull request is linked to a User Story, or to a Task when the work is one Task of a larger story.

- If the user names a work item ID, read it and use it.
- Otherwise search for an existing story that matches the change (WIQL on title, state not `Closed`). Reuse it if it clearly covers the change.
- Otherwise create a new User Story with the `write-user-story` skill. In this workflow, skip that skill's draft-approval step: create the story directly, because the user reviews everything in the pull request. Base the description on the actual diff.
- If the change clearly belongs to more than one story (as with User Stories 41 and 42), link all of them.
- Move the work item to `In Progress` if it is `New`, or if it is a User Story already in `Waiting for Deployment` from an earlier PR: new work on it is in progress again. Leave `Closed` items as they are. The PR pipeline (`templates/work-item-in-progress-job.yml`) applies the same rule to every PR, including PRs created by hand.
- When you reuse an existing work item, check that its description still matches the work. Compare it with the diff, and for a follow-up PR also with the earlier PRs on the item. If the description does not cover this change, update it in the style of the `write-user-story` skill: add a bullet under `Muutokset:` or extend the `Lisäksi` line, and fix any sentence the change made untrue. Keep the existing wording otherwise. Do this without asking, because the user reviews it with the pull request.

If it is unclear whether the change is a new story, a Task under an existing story, or part of an existing story, ask the user once before creating anything.

## Branch

First check whether the current local branch fits the work. Keep it only if it is the feature branch for this work item **and** its pull request is still active (check with `repo_pull_request`). In every other case the branch is wrong for this work: you are on `main`, on another work item's branch, or on a branch whose pull request was already completed or abandoned. Then start over from an up-to-date `main` and continue the flow. Uncommitted changes carry over through both switches:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c <branch>
```

Before leaving a wrong branch, run `git log --oneline origin/main..HEAD` and `git status -sb`. Commits there that were never pushed, or that are not part of a completed pull request, would be left behind. Stop and ask the user what to do with them.

Stop and tell the user if:

- `git switch` refuses because the uncommitted changes conflict with the other branch.
- `git pull --ff-only` fails because local `main` has diverged from `origin/main`. Never commit on `main` to fix it.

Branch names:

| Work item | Pattern | Example |
|---|---|---|
| User Story | `feat/US-<id>_<Title_slug>` | `feat/US-46_Sisaan_ja_uloskirjautumisen_UI_parannukset` |
| Several stories | `feat/US-<id>_US-<id>_<Title_slug>` | `feat/US-41_US-42_Autentikaatio` |
| Task | `feat/<id>_<Title_slug>` | `feat/37_Profile_queries` |
| Follow-up PR for the same item | add a short suffix | `feat/US-38_Kayttoliittyman_UI_muutokset_ja_parannukset_taustan_UI` |

Build the slug from the work item title:

- Replace `ä` and `å` with `a`, `ö` with `o`, and `.NET` with `dotnet`.
- Drop hyphens and other punctuation, then join the words with `_`.
- Keep the title's original capitalization.

For example, `Sisään- ja uloskirjautumisen UI - parannukset` becomes `Sisaan_ja_uloskirjautumisen_UI_parannukset`.

## Checks

Run the same checks as the pull request pipeline for the areas the change touches. Run them from the repository root, before committing.

**Backend** (anything under `src/Backend`):

```powershell
dotnet build src/MyCV.sln --configuration Release
```

If entities, configurations or the DbContext changed, also check that a migration exists for every model change:

```powershell
dotnet ef migrations has-pending-model-changes --project src/Backend/CV.DataAccess/CV.DataAccess.csproj --startup-project src/Backend/CV.WebApi/CV.WebApi.csproj
```

If it reports pending changes, add the missing migration with `dotnet ef migrations add <Name>` and run the check again.

**Frontend** (anything under `src/Frontend`):

```powershell
npm --prefix src/Frontend ci        # only when package.json or package-lock.json changed
npm --prefix src/Frontend run lint
npm --prefix src/Frontend run build
```

**Formatting:** format the changed files the same way as User Story 32. Use `dotnet format` for C# and `npx prettier --write <files>` (from `src/Frontend`) for frontend files.

If a check fails, fix the cause and run it again. Never push code that fails a check, and never skip, disable or weaken a check to make it pass. If you cannot fix a failure, stop and report it with the error output.

## Commits

Check the branch before each commit as described in *Never Commit On `main`*.

Split the changes into several commits, one per logical step. A reviewer should be able to read the commits in order and follow the change. Typical order:

1. Database: entities, configurations and the migration
2. Backend: services, DTOs and controllers
3. Generated API types (`src/Frontend/src/generated/openapi.ts`)
4. Frontend: API queries, state, components and pages
5. Skills and documentation (`.claude/skills`, `README.md`, `DESIGN.md`)

Merge steps that only make sense together into one commit, and leave out steps the change does not have. A small change can be a single commit.

Commit message format, in English, with an imperative summary:

| Work item | Format | Example |
|---|---|---|
| User Story | `US-<id>: <summary>` | `US-46: Improve Microsoft sign-in and sign-out experience` |
| Several stories | `US-<id> && US-<id>: <summary>` | `US-41 && US-42: Implement authentication and admin login features` |
| Task | `<id>: <summary>` | `37: Refactor profile queries and forms` |

- Keep the summary line under about 72 characters. Add a body with short bullets when the commit needs more explanation.
- End every message with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Stage files by name. Never use `git add -A` or `git add .`.
- Never commit secrets or local settings: `.env.local`, `.mcp.json`, user secrets, credentials.
- Leave changes that have nothing to do with this work item unstaged, and mention them in the report.

## Pull Request

Create the PR with `repo_pull_request_write` (`action: create`):

| Parameter | Value |
|---|---|
| `project` | `MyCV` |
| `repositoryId` | `MyCV` |
| `sourceRefName` | `refs/heads/<branch>` |
| `targetRefName` | `refs/heads/main` |
| `title` | See below |
| `description` | See below |
| `workItems` | The linked work item IDs, space-separated |

Title, using the work item title as written in Azure DevOps:

| Work item | Format | Example |
|---|---|---|
| User Story | `User Story <id>: <title>` | `User Story 46: Sisään- ja uloskirjautumisen UI - parannukset` |
| Several stories | `User Story <id> & User Story <id>: <shared title>` | `User Story 41 & User Story 42: Autentikaatio` |
| Task | `Task <id>: <title>` | `Task 37: Profile - Queries` |
| Follow-up PR | add ` - <tarkennus>` | `User Story 38: Käyttöliittymän UI-muutokset ja parannukset - Taustan UI-parannukset` |

Description: only the commit list, in the same format as the earlier PRs, so that the squash merge commit on `main` looks the same as before. One link per commit, oldest first, separated by blank lines, followed by the attribution line:

```markdown
- [US-46: Move project skills from .github/skills to .claude/skills](https://dev.azure.com/valetuominen/MyCV/_git/MyCV/commit/<full sha>?refName=refs/heads/<branch>)

- [US-46: Improve Microsoft sign-in and sign-out experience](https://dev.azure.com/valetuominen/MyCV/_git/MyCV/commit/<full sha>?refName=refs/heads/<branch>)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Get each full SHA with `git log --reverse --format='%H %s' origin/main..HEAD` after pushing.

Labels: when the PR is a follow-up for a story that is still being worked on (like User Story 38, which had several PRs), pass `labels: ["Jatkuu"]`. The pipeline then leaves the story `In Progress` after the merge. See *After The PR Is Merged*.

### Reviewer Comment

Right after creating the PR, post the additional information as a PR comment with `repo_pull_request_thread_write` (`action: create`), in Finnish:

```markdown
## Yhteenveto
<One or two sentences: what this PR changes and why.>

## Tarkistukset
- <Each check that was run and its result, for example "dotnet build: OK", "npm run lint: OK".>

## Huomioitavaa
- <Anything the reviewer must know or do: new migrations, new configuration values or environment variables, manual setup steps, known limitations. Leave the section out when there is nothing.>
```

Do not set auto-complete, do not complete the PR, and do not add reviewers. The user approves and completes every PR themselves.

## After The PR Is Merged

This skill does not change work item states after the merge. The `main` pipeline does it in its *Update work items* stage (`templates/work-item-state-job.yml`), right after the merge commit builds:

- Linked Tasks move to `Closed`. Tasks have no `Waiting for Deployment` state.
- Linked User Stories move to `Waiting for Deployment`, except when the story still has open child Tasks, or the PR has the `Jatkuu` label. So a Task PR may also link its parent story: the story moves only when its last Task is merged.

Never move work items to `Waiting for Deployment` or `Closed` when the PR is created. While the PR is open, its PR pipeline keeps the linked items `In Progress` (see *Work Item*), and the `main` pipeline moves them forward again after the merge.

If the user says that a merged PR's work items did not move, check the latest run of the `main` pipeline for the *Update work items* stage and report what it logged. Move the items by hand only if the user asks.

## Report

End with:

- The PR link: `https://dev.azure.com/valetuominen/MyCV/_git/MyCV/pullrequest/<id>`
- The work item link, whether it was created or reused, and whether its description was updated
- The branch name and the list of commits
- The check results
- Any changes left uncommitted because they were unrelated
