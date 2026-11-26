---
name: clean-branches
description: 'Find the local branches and worktrees of MyCV work whose pull request is completed, show them as a table with the reasons for keeping the rest, and delete them, including an empty leftover worktree folder, only after the user agrees. Use when asked to clean up branches or worktrees, when the session start hint reports branches with a deleted upstream, or after a pull request was completed.'
user-invocable: true
---

# Clean branches

Pull requests are squash-merged, so `git branch --merged` never recognises a finished branch, and `git branch -D` cannot be undone. This skill decides from the pull request, not from git alone, and deletes nothing before the user says yes. It enforces the worktree lifecycle rule in *Remove The Worktree* in `create-pull-request/references/after-merge.md`. Run it after every merge, from the main checkout or another session, because the session that did the work cannot remove its own folder. The table in step 5 is the only approval the removal needs, and it cannot be given in advance. The session start hook only counts branches whose upstream is `gone`; that is a hint and never proof.

## Steps

1. **List.** Run `git fetch --prune origin`, `git worktree list --porcelain` and `git branch -vv`. Note the current branch (`git branch --show-current`) and the full tip of every local branch (`git rev-parse <branch>`).
2. **Skip at once** and list with the reason: `main`, the current branch, a branch checked out in the main checkout, and the worktree this session runs in (`git rev-parse --show-toplevel`; a detached HEAD there has no current branch, so compare the path), together with the branch whose tip its HEAD is.
3. **Look up the pull requests** of every other branch with `repo_pull_request` (`action` `list`, `sourceRefName` `refs/heads/<branch>`, `status` `All`; project and repository `MyCV`). Consider all of them, never only the one with the highest `pullRequestId`, because a reused branch name can have several and a newer abandoned or active one must not hide an older completed one. Compare the branch tip with each completed pull request's `lastMergeSourceCommit.commitId`.
4. **Decide.** A branch is a candidate only when none of its pull requests is `active` and at least one is `completed` with `lastMergeSourceCommit` equal to the branch tip. Keep it, with the reason, when:
   - no pull request is found (an upstream that is `gone` is not enough),
   - any of its pull requests is `active`, even when an older one is completed,
   - none of its pull requests is `completed` (all `abandoned`),
   - the tip differs from the `lastMergeSourceCommit` of every completed pull request (commits were added after the pull request, or the branch was reused),
   - its worktree has uncommitted changes (`git -C <path> status --short` prints something),
   - its worktree is locked (`locked` in `git worktree list --porcelain`),
   - its worktree has a detached HEAD that is not the tip of a candidate branch,
   - its worktree contains a symbolic link or junction (check at least `node_modules`), because removing the folder could empty the link's target,
   - its worktree belongs to a live Claude desktop app session: archive that session after the user agrees (`archive_session`), or keep it and say why, instead of removing the folder under the session.

   Archiving a desktop session detaches its worktree's HEAD at the branch tip, and the worktree folder stays (checked on a throwaway session with its own worktree, US-229). A detached worktree whose HEAD equals the tip of a candidate branch belongs to that branch, and an already archived session does not keep it: it is a candidate with the branch.
5. **Show a table** of the candidates (branch, the completed pull request whose `lastMergeSourceCommit` equals the tip, as its id and the highest id when several match, worktree path or none) and a second table of the kept branches with the reason. For every candidate worktree also run `git -C <path> status --short --ignored` and list the ignored local files it would lose (such as `.env.local`, `.playwright-mcp/` and `graphify-out/`), because `git worktree remove` deletes them even when the working tree is clean. Ask the user which candidates to delete. If there are none, say so and stop.
6. **Delete after the user agrees**, one candidate at a time:
   1. Its worktree, if any: `git worktree remove <path>`, never with `--force`, and only when the working tree is clean. If git refuses, keep the branch too and report why.
   2. Then the branch: `git branch -D <branch>` (`-d` refuses squash-merged branches).

   **Exception: `git worktree remove` fails with "Permission denied".** A live session, an open window or a terminal holds the folder, and git has often already dropped the worktree. Keep the branch for now, report it and ask the user to close the session or window. After the user has closed it, check `git worktree list`:
   - The worktree is no longer listed and the folder is empty: delete the folder (without `-Recurse` or `-Force`) and then the branch. The approval in step 5 covers this.
   - The folder is not empty or the worktree is still listed: keep both and report it.
7. **Report** what was deleted and what was kept.

## Never

- Delete `main`, the current branch, a branch with an active pull request, or a branch with no pull request found.
- Use `--force` with `git worktree remove`, or remove a worktree whose working tree is not clean.
- Delete anything before the user has agreed to the table. The agreement cannot be given in advance, and no wake-up, hook or other session gives it for the user.
- Change the main checkout's branch, or delete remote branches.
- Use the desktop app's `clean_up_worktrees` instead of this check; it does not look at the pull request.
