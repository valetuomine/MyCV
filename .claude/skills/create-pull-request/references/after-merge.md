# After The PR Is Merged

Part of the `create-pull-request` skill. Read it when the user says a pull request was completed, or asks how or why work items moved after a merge.

This skill does not change work item states after the merge. The `main` pipeline does it in its *Update work items* stage (`templates/work-item-state-job.yml`), right after the merge commit builds. A build stage skipped because the change does not touch its area counts as passed; a failed build stops the stage:

- Linked Tasks move to `Closed`. Tasks have no `Waiting for Deployment` state.
- Linked User Stories move to `Waiting for Deployment`, except when the story still has open child Tasks, or the PR has the `Jatkuu` label. A Task PR brings in its parent story even when only the Task is linked: the story moves only when its last Task is merged.
- A merged item, including a parent story brought in by a Task, then releases its `Waiting for Predecessor` Successors by the release rule under *State* in `SKILL.md` of `write-user-story`. Only items that actually moved in that run release Successors, so a story that stays under the `Jatkuu` label or because of open Tasks releases nothing. The pipeline never sets `Waiting for Predecessor` itself.

Every move also rewrites the first description line, `Tila: <state>: <reason>`, in the same PATCH call as the state (a story that stays `In Progress` because of the `Jatkuu` label or open Tasks gets a reason too). If the description update fails, the pipeline logs a warning and sets the state alone.

While the PR is open, its PR pipeline keeps the linked items `In Progress` (see [work-item.md](work-item.md)), and the `main` pipeline moves them forward again after the merge. Moving items by hand follows *Never* in `CLAUDE.md`: never to `Waiting for Deployment`, and to `Closed` only when the user explicitly asks.

## Wake Up After The Merge

Rule: the session that did the work notices the merge itself, so the user never has to say that the pull request was completed. This applies to every session in the Claude desktop app (`CLAUDE_CODE_ENTRYPOINT` is `claude-desktop`), in the main checkout and in a worktree alike; in other sessions the user says it.

1. **Schedule the check** right after the pull request is open (step 8 of `SKILL.md`), once per pull request: call `CronList` first and schedule only when no job for this pull request id exists, because a follow-up push to an active pull request runs step 8 again. Schedule with `CronCreate` (`recurring: true`, cron `17 * * * *`, hourly at an off minute). The prompt must stand alone: the pull request id, the branch, the work item id and the steps below; the live `git rev-parse HEAD` is compared at each wake, so do not store a tip commit. Tell the user in the report that the check exists, that it lives only as long as this session, and that a recurring job expires after 30 days (it fires one last time first, with a note that it is the last run; step 2 says what to answer).
   - Why `CronCreate`: it wakes this very session with its context. `ScheduleWakeup` belongs to `/loop` dynamic mode. `mcp__scheduled-tasks` creates tasks that start a new session, which knows nothing of this work. `set_monitor` and `bind_pr` accept only GitHub pull request URLs, so an Azure DevOps pull request cannot be bound to the app's monitor.
   - The hourly interval is deliberate: a merge is not urgent, and every wake costs tokens. This is a check of the merge, never a poll of CI.
   - A job fires only while the session is idle, so a wake can come late, and it never fires after the session ends or after the 30 days. A merge that the session slept through is found by the user's message or, in a worktree, by `/clean-branches`. In the main checkout `/clean-branches` skips the checked-out branch, so the user's message or the next session start note (the main checkout is on a feature branch, not `main`) leads to *In The Main Checkout* below.
   - The job belongs to this session only. When the context limit ends this chat through `/handoff` before the merge, the new chat has no job: `/handoff` names the pull request and says that the merge check must be scheduled again (steps 1 to 3 here), and the new chat does it with `CronList` first.
   - After the merge no handoff is written: the work is in `main`, so a handoff has nothing to preserve. When the context is already over `stopTokens` at that wake, give only the short report of the case (merged, different tip or abandoned) and, in the merged case, the last step of step 3 (the switch to `main` in the main checkout, the archive in a worktree), and nothing else. A wake is not a user message, so the context-budget hook does not block it. A wake never deletes a branch or a folder: a branch goes only on the user's yes (*In The Main Checkout*) or through `/clean-branches`, and a folder only through `/clean-branches`.
2. **On each wake** read the pull request with `repo_pull_request` (`action` `get`, `pullRequestId`). While it is `active`, answer with one short line and nothing else; when the wake carries the tool's note that this is the job's last run (the 30 days are over), say instead that the check ends and that the user's message takes over (in a worktree `/clean-branches` also finds the merge; in the main checkout the next session start note does). When it is `abandoned`, delete the job with `CronDelete`, tell the user and stop.
3. **When it is `completed`**, delete the job with `CronDelete`, then compare `git rev-parse HEAD` with the pull request's `lastMergeSourceCommit.commitId`:
   - **Equal:** the work is in `main`. Run the checks after a merge: `git fetch origin` and confirm that the merge commit is on `origin/main`, and read the linked work items' states (the `main` pipeline may still be running, so say what has moved and what has not). Report to the user in the language of the chat, then finish where the session runs: in the main checkout, *In The Main Checkout* below; in a worktree, archive this session as the last step (*Remove The Worktree*).
   - **Different:** commits were added after the pull request, or the branch was reused. Report it, keep the session and do not archive. In the main checkout, also leave the branch checked out and ask the user what to do with the new commits. In a worktree, the folder and the branch are cleaned with `/clean-branches` once the user is done with the session.

## In The Main Checkout

The default path (see [branch.md](branch.md)): there is no folder to remove and no session to archive, only the merged branch. When the merge check above finds the pull request `completed` with `lastMergeSourceCommit` equal to `HEAD`, or the user says the pull request was completed and `repo_pull_request` confirms it the same way:

1. Run `git status -sb`. Continue only when the current branch is still the pull request's branch and the working tree is clean; otherwise report what is there and stop, because the user may have started other work.
2. Switch back to an up-to-date `main`, so the next work starts from it and the scheduled sync (*Main checkout sync* in `.claude/rules/hooks.md`) can update the checkout again:

   ```powershell
   git fetch origin
   git switch main
   git pull --ff-only origin main
   ```

   The stop list of *In The Main Checkout* in [branch.md](branch.md) applies: if `git switch main` refuses because `main` is open in a worktree, or `git pull --ff-only` fails, stop and tell the user. If a command fails because `.git/index.lock` exists, wait a few seconds and run it again, and never delete the lock.

3. Ask the user once whether to delete the merged branch, naming it and the pull request. On a yes, run `git branch -D <branch>`; pull requests are squash-merged, so `git branch -d` refuses with "not fully merged". Without an answer the branch stays, and `/clean-branches` finds it later. A wake asks in its report and deletes nothing itself.

Do not archive a session that works in the main checkout: what archiving does to the main checkout's `HEAD` has not been tested (*Main checkout sync* in `.claude/rules/hooks.md`), and the session has no folder of its own to free. The session stays until the user closes it.

## Remove The Worktree

The exception path, for a session that ran in a git worktree.

Rule: a worktree folder exists only until its task is in `main`: after the merge its folder, branch and sessions are all removed. Each folder is about 3 GB.

When the session sees the merge by the wake-up above, or the user says the pull request was completed, and the session runs in a git worktree (`git rev-parse --git-dir` and `git rev-parse --git-common-dir` print different paths, see [branch.md](branch.md)), the worktree is done. In the main checkout, follow *In The Main Checkout* above instead. Removing it takes one approval from the user and is done by someone other than the session whose folder it is, because a session holds its own folder open:

- **Claude desktop app** (`CLAUDE_CODE_ENTRYPOINT` is `claude-desktop`): after the report, archive this session with `archive_session` (`self`) without asking in the chat first. The app shows its own approval card for the call, and that card is the user's answer. Archive as the very last step: archiving `self` ends the conversation at once, so first report everything else, such as the work item states. Archiving does not remove the folder: the app only detaches its HEAD and the folder stays.
  - The folder and the branch are removed afterwards with `/clean-branches`, which the user runs from the main checkout or another session, never from inside the folder itself. Its table is the one approval that the removal needs. Say so in the report.
  - `delete_session` is not used: it removes the worktree and its branch, but it also deletes the session's transcript, it never targets the calling session, and it asks the user in every permission mode. `/clean-branches` keeps the transcript and checks the pull request first.
  - A live Remote Control session, an open Explorer window or a terminal in the folder makes the removal fail with "Permission denied" (*Delete after the user agrees* in `clean-branches`).
  - The app's `auto_archive_on_pr_close` setting follows GitHub pull requests only, so it never fires for an Azure DevOps pull request; do not change it.
- **CLI:** tell the user to remove it from the main checkout with `git worktree remove <path>`, and the merged branch with `git branch -D <branch>`. Pull requests are squash-merged, so `git branch -d` refuses with "not fully merged".

`/clean-branches` gets no advance approval for a branch. At the time of the merge the user cannot know what the folder holds later, the removal cannot be undone, and `git worktree remove` also deletes the ignored files (`.env.local`, `.playwright-mcp/`, `graphify-out/`), which the skill lists in its table before it asks.

Old worktrees and branches of merged work pile up. Run `/clean-branches` after a merge, and whenever the session start hint reports leftovers or the user asks: it checks each pull request with `repo_pull_request` (squash merges mean the branch never shows as merged into `origin/main`), compares the branch tip with `lastMergeSourceCommit`, and deletes only after the user agrees. Do not use `clean_up_worktrees` for this, and do not delete folders by hand, except an empty leftover folder after `git worktree list` no longer shows it.

## Record The Actual Usage

Rule: after the merge, compare what the work really used with its `Työmäärä` line, so the size table in `references/estimate.md` of `write-user-story` improves from real numbers. Do it once per merged work item, as part of the merge report of step 3 of *Wake Up After The Merge* (or of *In The Main Checkout*, when the user reports the merge), when the session did the work itself (a session that only sees a merge it did not work on has no figures).

1. **Get the figure.** In the Claude desktop app, read this session's usage with `get_usage` (`mcp__ccd_session_mgmt__get_usage`). Elsewhere, or when it gives no token total, ask the user once for the figure of `/usage`. With neither, write `ei mitattu` and skip step 3; never guess a number.
2. **Compare.** Read the work item's `Työmäärä` line (size class, token range, model) and say whether the actual total fell below, inside or above the range. If the chat was split in two (*Plan And Implement Separately* in `estimate.md`), add the planning chat's figure to the implementation chat's.
3. **Record it.** Add one comment to the work item with `wit_work_item_comment_write` (`action: add`, `format: Markdown`), in Finnish, starting with `Toteutunut kulutus:`: the size class, the estimated range, the actual tokens, the model and effort level used, and one sentence on what drove the difference. A comment is not a state change, so it needs no `Tila:` update.
4. **Adjust the table only on evidence.** Change the *Size Classes* table in `estimate.md` (and say so, as `CLAUDE.md` does for corrections) when the actual total fell outside the range of its class for the second work item of that class in a row (find the earlier ones with `wit_query` or `wit_work_item` by searching the discussions for `Toteutunut kulutus:`), or the user says the class was wrong. One miss alone is only a comment. Then ask the user whether to ticket the table change as a side note (*Sivuhuomiot* in `CLAUDE.md`); never change the table as a commit on `main` and never inside the merged pull request.

## Work Items That Did Not Move

If the user says that a merged PR's work items did not move, check the latest run of the `main` pipeline for the *Update work items* stage and report what it logged, so the user can decide what to do.
