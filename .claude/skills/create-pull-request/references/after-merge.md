# After The PR Is Merged

Part of the `create-pull-request` skill. Read it when the user asks how or why work items moved after a merge.

This skill does not change work item states after the merge. The `main` pipeline does it in its *Update work items* stage (`templates/work-item-state-job.yml`), right after the merge commit builds. A build stage skipped because the change does not touch its area counts as passed; a failed build stops the stage:

- Linked Tasks move to `Closed`. Tasks have no `Waiting for Deployment` state.
- Linked User Stories move to `Waiting for Deployment`, except when the story still has open child Tasks, or the PR has the `Jatkuu` label. A Task PR brings in its parent story even when only the Task is linked: the story moves only when its last Task is merged.
- A merged item, including a parent story brought in by a Task, then releases its `Waiting for Predecessor` Successors by the release rule under *State* in `SKILL.md` of `write-user-story`. Only items that actually moved in that run release Successors, so a story that stays under the `Jatkuu` label or because of open Tasks releases nothing. The pipeline never sets `Waiting for Predecessor` itself.

Every move also rewrites the first description line, `Tila: <state>: <reason>`, in the same PATCH call as the state (a story that stays `In Progress` because of the `Jatkuu` label or open Tasks gets a reason too). If the description update fails, the pipeline logs a warning and sets the state alone.

While the PR is open, its PR pipeline keeps the linked items `In Progress` (see [work-item.md](work-item.md)), and the `main` pipeline moves them forward again after the merge. Moving items by hand follows *Never* in `CLAUDE.md`: never to `Waiting for Deployment`, and to `Closed` only when the user explicitly asks.

If the user says that a merged PR's work items did not move, check the latest run of the `main` pipeline for the *Update work items* stage and report what it logged, so the user can decide what to do.
