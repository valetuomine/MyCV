# Work Item

Part of the `create-pull-request` skill. Read it in step 2 of the workflow.

Every pull request is linked to a User Story, or to a Task when the work is one Task of a larger story.

- If the user names a work item ID, read it and use it.
- Otherwise search for an existing story that matches the change (WIQL on title, state not `Closed`). Reuse it if it clearly covers the change.
- Otherwise create a new User Story with the `write-user-story` skill. In this workflow, skip that skill's draft-approval step: create the story directly, because the user reviews everything in the pull request. Base the description, including its `Toteutusohje`, on the actual diff and on what was decided with the user in this chat.
- If the change clearly belongs to more than one story (as with User Stories 41 and 42), link all of them.
- Move the work item to `In Progress` if it is `New`, or if it is a User Story already in `Waiting for Deployment` from an earlier PR: new work on it is in progress again. Leave `Closed` items as they are. The PR pipeline (`templates/work-item-in-progress-job.yml`) applies the same rule to every PR, including PRs created by hand.
- When you reuse an existing work item, check that its description still matches the work. Compare it with the diff, and for a follow-up PR also with the earlier PRs on the item. If the description does not cover this change, update it in the style of the `write-user-story` skill: add a bullet under `Muutokset:` or extend the `Lisäksi` line, and fix any sentence the change made untrue. Keep the existing wording otherwise. Do this without asking, because the user reviews it with the pull request.
- Keep the work item's `Toteutusohje` (see `references/implementation-prompt.md` in `write-user-story`) true to the work as well, so that the next chat can pick up from the story alone:
  - If the item has no `Toteutusohje`, add one based on the diff and this chat.
  - If the work departed from it, such as a different approach, a renamed file, or a decision the user made during the work, update the affected parts and record the decision with its reason.
  - For a follow-up PR on a story that continues (`Jatkuu`), add or update a `Tilanne` part right after `Tavoite`: what is done and in which PR, and what remains. The next chat starts from what remains.
- Name skills in a `Toteutusohje` you write or update, and in the follow-up prompts, as `references/choosing-skills.md` in `write-user-story` says: installed skills first. Never install a skill during this workflow; a skill that the remaining work needs but no installed skill covers becomes the first step of what remains, with its install command.

If it is unclear whether the change is a new story, a Task under an existing story, or part of an existing story, ask the user once before creating anything.
