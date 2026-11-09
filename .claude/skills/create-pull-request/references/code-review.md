# Code Review

Part of the `create-pull-request` skill. Read it in step 5 of the workflow, after the checks pass and before committing. It is the one step that waits for the user's decision.

## Run The Review

Run `git fetch origin` first. Review the whole change against `origin/main`: `git diff origin/main` plus the untracked files, and on a follow-up push to an active pull request only what is new since the last push (`git diff origin/<branch>`).

Read the work item yourself and copy its acceptance criteria (`Valmis, kun`) and `Toteutusohje` into the review prompt. The subagent may not load the Azure DevOps tools, and without them it would silently skip that part of the review.

Run the review in a fresh-context subagent (`Agent`, `subagent_type: general-purpose`), because the session that wrote the code is blind to its own assumptions. Pick its `model` and `effort` from the work item's size class (see `references/estimate.md` in `write-user-story`) and pass both to `Agent`:

| Size | `model` | `effort` | Why |
| --- | --- | --- | --- |
| XS, S | `sonnet` | `medium` | A small change; Sonnet finds its problems at a lower cost |
| M, L, XL | `opus` | `high` | The review is the step where a stronger model that thinks longer catches the bugs the writer missed, and it is one call with a fresh context, so the extra cost stays bounded |

Read the size from the work item's `Effort` field (1–2 is XS–S, 3 or more is M or larger), or from the `Työmäärä` line of a Task or story that has no `Effort`. If the work item has neither, size the diff with the table in `estimate.md`, and take `opus` and `high` when in doubt.

Tell the subagent to:

- Follow the `code-review-and-quality` skill: the five axes, change sizing, dead code and dependency discipline.
- Check the change against the acceptance criteria and the `Toteutusohje` you copied in, and against the decisions already made with the user, so it does not reopen them.
- Check the MyCV rules in `CLAUDE.md`: the *Never* list (secrets, personal data, real tenant and client IDs, links to local-only files) and the *Conventions* table, such as JSDoc-only frontend comments and English code and docs. For backend and client integration changes, also the patterns in `create-cv-skills`; for frontend UI, `DESIGN.md` and `setup-frontend`.
- Check the changed C# against the SonarLint rules that the build does not enforce and that earlier pull requests got flagged for (US-149): S3776, a method with cognitive complexity over 15 (split nested loops and chains of `if` into private methods); S6960, a controller with more than one responsibility (for example a controller whose endpoints use a separate set of services belongs in its own controller, with unchanged routes); S6932, request data read by hand through `Request.Form`, `Request.ReadFormAsync` or similar instead of model binding (a deliberate exception gets `[SuppressMessage]` with a `Justification`, never a silent suppression). Report each as **Should fix**, with the rule ID in the title.
- Report in the categories and format of *Report The Findings* below; give it the table and the format.
- Not edit any file.

The lint and build results are already known, so the review does not re-run them or report what they enforce. The SonarLint rules above are not among them.

In the same step, also run the built-in `code-review` skill yourself as a second pass that hunts for correctness bugs, on the same diff as the subagent. Call it as `Skill` with `skill: code-review` and `args: "<level> <target>"`, for example `args: "medium origin/main"`:

- `<level>` comes from the same size class: `medium` for XS and S, `high` for M, L and XL. Always pass it, because without it the skill reuses the level of its previous run. Never pass `max` or `ultra`, nor `--comment` or `--fix`: the user picks the fixes, and nothing is posted before the pull request exists.
- `<target>` is `origin/main`, or `origin/<branch>` on a follow-up push, as above. Run `git add -N <files>` on untracked files first, so that the diff includes them.

Start the subagent first (it runs in the background), then run the skill while it works. Treat the skill's findings as input to *Report The Findings* below, not as the report to the user, even if the skill shows them through `ReportFindings`. Do not start *Report The Findings* until the review subagent's completion notice has arrived, and until the completion notice of the browser subagent has arrived too if one is running (*Browser subagent* in [checks.md](checks.md)). Never write or guess either result yourself. If the skill fails or is unavailable, continue with the subagent's findings alone and say so under `Huomioitavaa`.

## Report The Findings

Merge the findings of the subagent and of the `code-review` skill, and the deviations that the browser subagent reported, keeping one entry when both report the same problem. Check each finding against the code and drop the ones that do not hold; a few real findings beat a long list. Sort the rest into these categories, in this order, numbered in one sequence across all of them so the user can answer with numbers:

| Category | What goes here | `code-review-and-quality` label |
| --- | --- | --- |
| **Must fix** | Bugs, security problems, data loss, broken behavior, anything on the `CLAUDE.md` *Never* list | Critical |
| **Should fix** | Unmet acceptance criteria or `Toteutusohje`, convention violations, missing tests, structural problems, missed simplifications | Required (no prefix) |
| **Could fix** | Optional improvements; the change is fine without them | Optional, Consider, Nit |
| **FYI** | Context for the user, no action | FYI |

Show each finding as:

```markdown
**1. <short title>** — [file.ts:42](src/Frontend/src/file.ts#L42)
<What is wrong and why it matters.> Fix: <the proposed change>.
```

Leave out empty categories. Add your recommendation at the end: which findings to fix and which to leave, with a reason for each one you would leave.

## Wait For The Decision

If there are Must, Should or Could fix findings, stop and ask the user which ones to fix. Numbers ("fix 1 and 3, leave the rest"), "all" and "none" are all valid answers. Do not fix anything, commit or push before the answer. With only FYI findings or none, say so and continue without stopping.

If the answer leaves a Must fix finding as it is, confirm that once before continuing.

After the answer:

1. Fix the chosen findings, and only those.
2. Run the checks of `checks.md` again for the areas the fixes touched, including the browser check for UI changes (in the main chat or in a browser subagent, by the rule in *Browser subagent* in [checks.md](checks.md)).
3. Re-read the fixes in `git diff` and confirm each one addresses its finding and changes nothing else. Do not run a second full review.
4. Continue to the commits. Fold the fixes into the commits they belong to instead of adding a separate "review fixes" commit.

## Record The Outcome

Keep the outcome for the reviewer: which findings were fixed and which were left as they are.

- **New pull request:** it goes in the `Koodikatselmointi` section of the reviewer comment (`pull-request.md`).
- **Follow-up push to an active pull request:** no new reviewer comment is posted, so post the outcome after the push as a new Finnish PR comment with `repo_pull_request_thread_write` (`action: create`, `status: Closed`), with the same `## Koodikatselmointi` section and a `## Huomioitavaa` section when it has something to say.

In both, a Must fix finding that the user chose to leave also goes under `Huomioitavaa`.
