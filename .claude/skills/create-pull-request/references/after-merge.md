# After The PR Is Merged

Part of the `create-pull-request` skill. Read it when the user says a pull request was completed, or asks how or why work items moved after a merge.

This skill does not change work item states after the merge. The `main` pipeline does it in its *Update work items* stage (`templates/work-item-state-job.yml`), right after the merge commit builds. A build stage skipped because the change does not touch its area counts as passed; a failed build stops the stage:

- Linked Tasks move to `Closed`. Tasks have no `Waiting for Deployment` state.
- Linked User Stories move to `Waiting for Deployment`, except when the story still has open child Tasks, or the PR has the `Jatkuu` label. A Task PR brings in its parent story even when only the Task is linked: the story moves only when its last Task is merged.
- A merged item, including a parent story brought in by a Task, then releases its `Waiting for Predecessor` Successors by the release rule under *State* in `SKILL.md` of `write-user-story`. Only items that actually moved in that run release Successors, so a story that stays under the `Jatkuu` label or because of open Tasks releases nothing. The pipeline never sets `Waiting for Predecessor` itself.

Every move also rewrites the first description line, `Tila: <state>: <reason>`, in the same PATCH call as the state (a story that stays `In Progress` because of the `Jatkuu` label or open Tasks gets a reason too). If the description update fails, the pipeline logs a warning and sets the state alone.

While the PR is open, its PR pipeline keeps the linked items `In Progress` (see [work-item.md](work-item.md)), and the `main` pipeline moves them forward again after the merge. Moving items by hand follows *Never* in `CLAUDE.md`: never to `Waiting for Deployment`, and to `Closed` only when the user explicitly asks.

## Remove The Worktree

When the user says the pull request was completed, or the session sees it with `repo_pull_request`, and the session runs in a git worktree (`git rev-parse --git-dir` and `git rev-parse --git-common-dir` print different paths, see [branch.md](branch.md)), the worktree is done:

- **Claude desktop app** (`CLAUDE_CODE_ENTRYPOINT` is `claude-desktop`): offer to archive this session with `archive_session` (`self`), which removes its worktree. Archive only after the user says yes, and as the very last step: archiving `self` ends the conversation at once, so first report anything else, such as the work item states. The local feature branch stays; delete it first with `git branch -D <branch>` if the user wants. The app's `auto_archive_on_pr_close` setting follows GitHub pull requests only, so it never fires for an Azure DevOps pull request; do not change it.
- **CLI:** tell the user to remove it from the main checkout with `git worktree remove <path>`, and the merged branch with `git branch -D <branch>`. Pull requests are squash-merged, so `git branch -d` refuses with "not fully merged".

Old worktrees and branches of merged work pile up. When the user asks to clean them up, run `/clean-branches`: it checks each pull request with `repo_pull_request` (squash merges mean the branch never shows as merged into `origin/main`), compares the branch tip with `lastMergeSourceCommit`, and deletes only after the user agrees. Do not use `clean_up_worktrees` for this, and do not delete folders by hand.

## Work Items That Did Not Move

If the user says that a merged PR's work items did not move, check the latest run of the `main` pipeline for the *Update work items* stage and report what it logged, so the user can decide what to do.
