# Branch

Part of the `create-pull-request` skill. Read it in step 3 of the workflow, and whenever a branch name is needed.

In a worktree, follow *In A Worktree* below instead of the commands in this section.

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

## In A Worktree

A session can run in a git worktree instead of the main checkout, as the Claude desktop app does: it creates worktrees under `.claude/worktrees/`, gives each one a fresh `claude/<slug>` branch from `main`, and reuses old folders, so the folder name says nothing about the work in it. Check it first: the session is in a worktree when `git rev-parse --git-dir` and `git rev-parse --git-common-dir` print different paths (the worktree's own git folder and the main checkout's `.git`); in the main checkout, and in any of its subfolders, both print the same path.

`main` may be checked out in the main checkout, where `git switch main` in a worktree then fails, and local `main` may lag behind. Never check out local `main` in a worktree: it would also lock `main` away from the main checkout. Never switch the main checkout's branch or run a git command there that changes it (`switch`, `checkout`, `pull`, `reset`, `merge`). Branch from `origin/main` instead. Uncommitted changes carry over:

```powershell
git fetch origin
git switch -c <branch> --no-track origin/main
```

`--no-track` keeps `origin/main` from becoming the upstream, so the first `git push -u origin <branch>` sets the right one.

Run `git fetch origin` first, then check the current branch. When it is the desktop app's fresh `claude/*` branch and `git rev-parse HEAD` prints the same hash as `git rev-parse origin/main` (so it has no commits of its own and is up to date), rename it instead: `git branch -m <branch>`. Otherwise use the `switch -c` above.

Stop and tell the user if `git switch -c` refuses because the uncommitted changes conflict with `origin/main`.

The same holds at the start of the work, not only in this step: when a session starts in a worktree whose branch belongs to another work item, such as one whose pull request was already completed, create the new branch this way before changing any file.

Branch names:

| Work item | Pattern | Example |
| --- | --- | --- |
| User Story | `feat/US-<id>_<Title_slug>` | `feat/US-46_Sisaan_ja_uloskirjautumisen_UI_parannukset` |
| Several stories | `feat/US-<id>_US-<id>_<Title_slug>` | `feat/US-41_US-42_Autentikaatio` |
| Task | `feat/<id>_<Title_slug>` | `feat/37_Profile_queries` |
| Follow-up PR for the same item | add a short suffix | `feat/US-38_Kayttoliittyman_UI_muutokset_ja_parannukset_taustan_UI` |

Build the slug from the work item title:

- Replace `ä` and `å` with `a`, `ö` with `o`, and `.NET` with `dotnet`.
- Drop hyphens and other punctuation, then join the words with `_`.
- Keep the title's original capitalization.

For example, `Sisään- ja uloskirjautumisen UI - parannukset` becomes `Sisaan_ja_uloskirjautumisen_UI_parannukset`.
