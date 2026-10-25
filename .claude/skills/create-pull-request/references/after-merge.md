# After The PR Is Merged

Part of the `create-pull-request` skill. Read it when the user asks how or why work items moved after a merge.

This skill does not change work item states after the merge. The `main` pipeline does it in its *Update work items* stage (`templates/work-item-state-job.yml`), right after the merge commit builds. A build stage skipped because the change does not touch its area counts as passed; a failed build stops the stage:

- Linked Tasks move to `Closed`. Tasks have no `Waiting for Deployment` state.
- Linked User Stories move to `Waiting for Deployment`, except when the story still has open child Tasks, or the PR has the `Jatkuu` label. So a Task PR may also link its parent story: the story moves only when its last Task is merged.

Never move work items to `Waiting for Deployment` or `Closed` when the PR is created. While the PR is open, its PR pipeline keeps the linked items `In Progress` (see [work-item.md](work-item.md)), and the `main` pipeline moves them forward again after the merge.

If the user says that a merged PR's work items did not move, check the latest run of the `main` pipeline for the *Update work items* stage and report what it logged. Move the items by hand only if the user asks.
