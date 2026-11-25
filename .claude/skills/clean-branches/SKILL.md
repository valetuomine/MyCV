---
name: clean-branches
description: 'Find the local branches and worktrees of MyCV work whose pull request is completed, show them as a table with the reasons for keeping the rest, and delete them only after the user agrees. Use when asked to clean up branches or worktrees, when the session start hint reports branches with a deleted upstream, or after a pull request was completed.'
user-invocable: true
---

# Clean branches

Pull requests are squash-merged, so `git branch --merged` never recognises a finished branch, and `git branch -D` cannot be undone. This skill decides from the pull request, not from git alone, and deletes nothing before the user says yes. The session start hook only counts branches whose upstream is `gone`; that is a hint and never proof.

## Steps

1. **List.** Run `git fetch --prune origin`, `git worktree list --porcelain` and `git branch -vv`. Note the current branch (`git branch --show-current`) and the full tip of every local branch (`git rev-parse <branch>`).
2. **Skip at once** and list with the reason: `main`, the current branch, a branch checked out in the main checkout.
3. **Look up the pull request** of every other branch with `repo_pull_request` (`action` `list`, `sourceRefName` `refs/heads/<branch>`, `status` `All`; project and repository `MyCV`). Take the one with the highest `pullRequestId` when there are several. Compare the branch tip with the pull request's `lastMergeSourceCommit.commitId`.
4. **Decide.** A branch is a candidate only when its pull request is `completed` and the branch tip equals `lastMergeSourceCommit`. Keep it, with the reason, when:
   - no pull request is found (an upstream that is `gone` is not enough),
   - the pull request is `active` or `abandoned`,
   - the tip differs from `lastMergeSourceCommit` (commits were added after the pull request, or the branch was reused),
   - its worktree has uncommitted changes (`git -C <path> status --short` prints something),
   - its worktree is locked (`locked` in `git worktree list --porcelain`) or has a detached HEAD,
   - its worktree contains a symbolic link or junction (check at least `node_modules`), because removing the folder could empty the link's target,
   - its worktree belongs to a Claude desktop app session: archive that session after the user agrees (`archive_session`), or keep it and say why, instead of removing the folder under the session.
5. **Show a table** of the candidates (branch, pull request id, worktree path or none) and a second table of the kept branches with the reason. For every candidate worktree also run `git -C <path> status --short --ignored` and list the ignored local files it would lose (such as `.env.local`, `.playwright-mcp/` and `graphify-out/`), because `git worktree remove` deletes them even when the working tree is clean. Ask the user which candidates to delete. If there are none, say so and stop.
6. **Delete after the user agrees**, one candidate at a time:
   1. Its worktree, if any: `git worktree remove <path>`, never with `--force`, and only when the working tree is clean. If git refuses, keep the branch too and report why.
   2. Then the branch: `git branch -D <branch>` (`-d` refuses squash-merged branches).
7. **Report** what was deleted and what was kept.

## Never

- Delete `main`, the current branch, a branch whose pull request is active, or a branch whose pull request was not found.
- Use `--force` with `git worktree remove`, or remove a worktree whose working tree is not clean.
- Delete anything before the user has agreed to the table.
- Change the main checkout's branch, or delete remote branches.
- Use the desktop app's `clean_up_worktrees` instead of this check; it does not look at the pull request.
