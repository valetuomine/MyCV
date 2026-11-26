# Branch

Part of the `create-pull-request` skill. Read it in step 3 of the workflow, and whenever a branch name is needed.

Work starts in the main checkout by default, as in a terminal: one session at a time, the same folder, and a branch from an up-to-date `main`. A git worktree is the exception, for a second session that writes code at the same time or for an experiment; it follows *In A Worktree* below instead of the commands in this section. The session is in a worktree when `git rev-parse --git-dir` and `git rev-parse --git-common-dir` print different paths; in the main checkout, and in any of its subfolders, both print the same path.

In the Claude desktop app, the session's place is chosen when it starts: a session started in the project folder without a worktree works in the main checkout (`get_session` shows `cwd` as the project folder and no worktree). A session that Claude starts with `start_session` gets the same folder with `use_worktree: false`, and its own worktree with `true`.

## In The Main Checkout

First check whether the current local branch fits the work. Keep it only if it is the feature branch for this work item **and** its pull request is still active (check with `repo_pull_request`). In every other case the branch is wrong for this work: you are on `main`, on another work item's branch, or on a branch whose pull request was already completed or abandoned. Then start over from an up-to-date `main` and continue the flow. Do this before changing any file, also at the start of the work and not only in this step. This session's own uncommitted changes carry over through both switches:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c <branch>
```

Before leaving a wrong branch, run `git log --oneline origin/main..HEAD` and `git status -sb`. Commits there that were never pushed, or that are not part of a completed pull request, would be left behind. Stop and ask the user what to do with them.

Stop and tell the user if:

- `git status -sb` shows changes that do not belong to this work item, or `list_sessions` shows another active session in the main checkout. Ask the user and suggest a worktree (*In A Worktree* below) instead of carrying the changes over. Only this session's own uncommitted changes carry over.
- `git switch` refuses because the uncommitted changes conflict with the other branch.
- `git switch main` refuses because `main` is checked out in a worktree. Never check out `main` in a worktree for this reason.
- `git pull --ff-only` fails because local `main` has diverged from `origin/main`. Never commit on `main` to fix it.

**With the scheduled sync.** When `sync-main-checkout.mjs` is scheduled (*Main checkout sync* in `.claude/rules/hooks.md`), it fast-forwards the main checkout every 15 minutes while it is on `main` with a clean working tree, so the `git pull` above is often already done. While the checkout is on a feature branch, or has uncommitted changes, the script changes nothing and logs why, and the session start note quotes that line: on a feature branch that is expected. Switching back to `main` after the merge (*In The Main Checkout* in [after-merge.md](after-merge.md)) lets it update the checkout again. If a git command fails because `.git/index.lock` exists, the script may be running: wait a few seconds and run the command again; never delete the lock file, and tell the user if it stays. The usage-band plugin loads from the main checkout's current branch, so on a feature branch it runs that branch's version, which is current because the branch starts from an up-to-date `main`.

## In A Worktree

Use a worktree only when another session already writes in the main checkout, or for an experiment that must not touch it. The Claude desktop app creates worktrees under `.claude/worktrees/`, gives each one a fresh `claude/<slug>` branch from `main`, and reuses old folders, so the folder name says nothing about the work in it. Each folder is about 3 GB and needs its own `node_modules` and `.env.local` for the frontend.

Never check out local `main` in a worktree: `main` may be checked out in the main checkout, and a worktree on `main` would lock it away from there. Never switch the main checkout's branch from a worktree session, or run a git command there that changes it (`switch`, `checkout`, `pull`, `reset`, `merge`): another session may be working in it. Run `git fetch origin`, then check the current branch:

- It is the desktop app's fresh `claude/*` branch and `git rev-parse HEAD` prints the same hash as `git rev-parse origin/main` (no commits of its own, up to date): rename it with `git branch -m <branch>`.
- Otherwise branch from `origin/main`. `--no-track` keeps `origin/main` from becoming the upstream, so the first `git push -u origin <branch>` sets the right one. Uncommitted changes carry over:

```powershell
git switch -c <branch> --no-track origin/main
```

Stop and tell the user if `git switch -c` refuses because the uncommitted changes conflict with `origin/main`. As in the main checkout, do this before changing any file: a worktree whose branch belongs to another work item, such as one whose pull request was already completed, gets the new branch first.

## Branch Names

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
