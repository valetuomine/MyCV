# Branch

Part of the `create-pull-request` skill. Read it in step 3 of the workflow, and whenever a branch name is needed.

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
