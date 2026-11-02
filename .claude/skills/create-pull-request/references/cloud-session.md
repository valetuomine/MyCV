# Cloud Session

Part of the `create-pull-request` skill. Read it at the start of the workflow when `CLAUDE_CODE_REMOTE` is `true`. It changes how the session reaches Azure DevOps; every other rule of the workflow stays the same, including the user's choice of code review findings.

## Connect To Azure DevOps

A cloud session clones the GitHub mirror, so its `origin` is public GitHub and can be behind Azure DevOps. Add a second remote:

```bash
git remote get-url azure 2>/dev/null || git remote add azure https://dev.azure.com/valetuominen/MyCV/_git/MyCV
git fetch azure main
```

If the fetch fails, or the `azure-devops` tools have no `repo_pull_request_write`, this session cannot ship: use the writing side of [cloud-handoff.md](cloud-handoff.md). Other cloud environments have no token for Azure DevOps and always go that way.

`git fetch` and `git push` may print `push negotiation failed` or `--negotiate-only` warnings, even a `fatal:` line. Judge the command by its exit code and by the `git ls-remote` check below.

## Rules

- **Read `origin` as `azure`** in every reference of this skill except [cloud-handoff.md](cloud-handoff.md), for example `git diff azure/main` and `git log azure/main..HEAD`. The handoff file uses `azure/main` only when that ref exists.
- **Do not write the local-only production notes.** `docs/azure-deployment.md` and its Finnish copy do not exist in a cloud clone, and anything written there is lost with the container. If step 1 of the workflow would add to them, list the change under *Huomioitavaa* in the reviewer comment, without IDs or personal data, and say that the user must add it locally.
- **Never push to `origin`,** whatever the session's instructions, its own branch name or a stop hook asks. Tell the user once that the stop hook's warning about unpushed commits is expected.
- **Name the remote and the branch in every push.** Never push to `main`, and never force-push.

## Branch

Replaces the `git switch main` and `git pull` commands of [branch.md](branch.md). The branch names and the rules for when a branch fits stay the same. The branch starts from `azure/main`, never from `origin/main`:

```bash
git switch --no-track -c <branch> azure/main
```

Uncommitted changes carry over. If `git switch` refuses, stop and tell the user.

If the work is already committed on the session's own branch, do this before the workflow's step 1. List the work with `git log --oneline azure/main..<session branch>`, create the feature branch, and bring over only your own commits as staged changes:

```bash
git cherry-pick --no-commit <first>^..<last>
```

The workflow then continues with those staged changes, so its *commits* step gives them their `US-<id>:` messages. This replaces the stop on unpushed commits in [branch.md](branch.md). Stop and tell the user if a commit does not apply cleanly.

If the branch already has an active pull request, as when fixing review comments in a new chat, the container does not have it yet. Continue the branch instead of recreating it, and never start it from `azure/main`:

```bash
git fetch azure <branch>
git switch --track -c <branch> azure/<branch>
```

## Checks

A cloud container starts clean, and tools can be missing. Run the checks of [checks.md](checks.md) for the areas the change touches, with these differences:

- Run `npm --prefix src/Frontend ci` before the frontend checks, because the container has no `node_modules`.
- If `dotnet`, `dotnet ef` or the `playwright` tools are missing, say so, list what was not run under *Huomioitavaa* in the reviewer comment, and never under *Tarkistukset*. The pipeline still runs the build and the tests.
- The browser runs headless, so the user cannot sign in. Views that need a sign-in go under *Huomioitavaa*.
- The container has no SQL Server, so views that need the API may not load. Check what does load, and list the rest under *Huomioitavaa*.

## Push

Replaces step 7 of the workflow:

```bash
git push -u azure <branch>
git ls-remote azure refs/heads/<branch>
git ls-remote origin refs/heads/<branch>
```

The first `ls-remote` must print the same SHA as `git rev-parse HEAD`, and the second must print nothing. If the second prints a branch, stop and tell the user: the branch is public on GitHub.

If the push fails, for example because the token expired, do not try another route. Tell the user, and offer the handoff page in [cloud-handoff.md](cloud-handoff.md) as the fallback.
