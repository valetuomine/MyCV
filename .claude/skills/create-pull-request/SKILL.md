---
name: create-pull-request
description: 'Ship finished MyCV work as an Azure DevOps pull request end to end: create or reuse the work item, create the branch, run the pipeline checks, review the code and let the user pick the fixes, split the changes into commits, push, and open the PR linked to the work item. Use when the user asks to create a PR, ship, open a pull request, or "make this ready for review".'
argument-hint: '[work item ID, or what the change is about]'
user-invocable: true
model: sonnet
---

# Create A Pull Request

Use this workflow to take changes in the working tree all the way to an open pull request in the `MyCV` repository (Azure DevOps organization `valetuominen`, project `MyCV`). The user's manual steps are to decide which code review findings to fix and to review and complete the pull request, so every other step happens here without asking for approval in between. Stop and ask only when something below says so.

## Never Commit On `main`

Every change reaches `main` through a pull request, however small: a one-line fix, a typo, a skill or README tweak. No commit is ever made on local `main`, not even one you plan to move to a branch later.

- Run `git branch --show-current` right before **every** `git commit`, including follow-up commits to a pull request that is already open. The user may have completed the PR, switched branches or pulled `main` since your last step.
- If it prints `main`, do not commit. Go through [references/branch.md](references/branch.md): it creates a feature branch and the uncommitted changes carry over.
- If it prints a feature branch, confirm that its pull request is still active before committing. If the PR was completed or abandoned, the new commits need a new branch and a new pull request: run the whole workflow again.

## Workflow

Each step has its rules in a reference file. Read a file when you reach its step, and skip the files of steps that do not apply, such as `pull-request.md` when the branch already has an active pull request.

1. **Inspect the changes.** Run `git status` and `git diff` (including untracked files) and understand what the change does. If there is nothing to commit, stop and tell the user. If the change adds something production needs, such as a new setting or secret, an external service, a migration that drops or moves data, a redirect URI or origin, or a runtime dependency, add it to the local-only production notes `docs/azure-deployment.md` and their Finnish copy `docs/azure-deployment.fi.md`, with a change log row in both. Put the public-safe part, without IDs or personal data, in `README.md`.
2. **Resolve the work item.** Read [references/work-item.md](references/work-item.md).
3. **Check the current branch and create the feature branch.** If the current branch is wrong for this work, switch to `main` and pull from `origin` first. Read [references/branch.md](references/branch.md).
4. **Run the checks.** Read [references/checks.md](references/checks.md) and run only the parts for the areas the change touches. Fix anything that fails before continuing.
5. **Review the code** and wait for the user to choose which findings to fix. Read [references/code-review.md](references/code-review.md).
6. **Commit** the changes as several focused commits. Read [references/commits.md](references/commits.md).
7. **Push** the branch: `git push -u origin <branch>`. The `origin` remote pushes only to Azure DevOps; the pipeline copies `main` to GitHub after the merge, so feature branches never go to GitHub.
8. **Open the pull request** and post the reviewer comment. Read [references/pull-request.md](references/pull-request.md). If the branch already has an active pull request, as when fixing review comments, the push updates it: skip creating a new one.
9. **Report** the PR link, the work item link, the commit list and the check results to the user, and end with the follow-up prompts. See *Report* below and [references/follow-up-prompts.md](references/follow-up-prompts.md).

How the pipelines move the work items after the merge, and what to do when they did not move, is in [references/after-merge.md](references/after-merge.md). Read it only when the user asks about work item states after a merge.

## Report

End with:

- The PR link: `https://dev.azure.com/valetuominen/MyCV/_git/MyCV/pullrequest/<id>`
- The work item link, whether it was created or reused, and whether its description or `Toteutusohje` was added or updated
- The branch name and the list of commits
- The check results
- The code review findings that were fixed and those left as they are
- Any changes left uncommitted because they were unrelated
- What was added to the production notes, if anything
- The follow-up prompts, last
