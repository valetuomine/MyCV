# Code Review

Part of the `create-pull-request` skill. Read it in step 5 of the workflow, after the checks pass and before committing. It is the one step that waits for the user: for the choice of findings and for the user's own comments on the code.

Pick the review first, after `git fetch origin`:

| Situation | Review |
| --- | --- |
| The branch has no active pull request yet | *Run The Review* below: the whole change against `origin/main` |
| The branch has an active pull request (a follow-up push, such as fixes for the user's PR comments in Azure DevOps) | *Delta Review* below, with `origin/<branch>` as the base: only what changed since the last push, never the whole pull request again |
| A round of fixes for the user's own comments in this chat (*Wait For The Decision*) | *Delta Review* below, with the review snapshot as the base: only the fixes of that round |

When the rows overlap, the last row wins: fixes for comments given in this chat are always reviewed against the snapshot, also on a branch with an active pull request.

## Run The Review

Review the whole change against `origin/main`: `git diff origin/main` plus the untracked files.

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
- For C#, do not check the Sonar rules by hand: the Release build runs `SonarAnalyzer.CSharp` (`src/Directory.Build.props`) and fails on any finding, including S3776, S6960 and S6932. Only review a `[SuppressMessage]` that the change adds: it must carry a `Justification` that really explains the exception, and a silent suppression (`#pragma`, `.editorconfig`) is a **Should fix**.
- Report in the categories and format of *Report The Findings* below; give it the table and the format.
- Not edit any file.

The lint and build results are already known, so the review does not re-run them or report what they enforce.

In the same step, also run the built-in `code-review` skill yourself as a second pass that hunts for correctness bugs, on the same diff as the subagent. Call it as `Skill` with `skill: code-review` and `args: "<level> <target>"`, for example `args: "medium origin/main"`:

- `<level>` comes from the same size class: `medium` for XS and S, `high` for M, L and XL. Always pass it, because without it the skill reuses the level of its previous run. Never pass `max` or `ultra`, nor `--comment` or `--fix`: the user picks the fixes, and nothing is posted before the pull request exists.
- `<target>` is `origin/main`. Run `git add -N <files>` on untracked files first, so that the diff includes them.

Start the subagent first (it runs in the background), then run the skill while it works. Treat the skill's findings as input to *Report The Findings* below, not as the report to the user, even if the skill shows them through `ReportFindings`. Do not start *Report The Findings* until the review subagent's completion notice has arrived, and until the completion notice of the browser subagent has arrived too if one is running (*Browser subagent* in [checks.md](checks.md)). Never write or guess either result yourself. If the skill fails or is unavailable, continue with the subagent's findings alone and say so under `Huomioitavaa`.

## Delta Review

A delta review looks only at what changed on top of code that was already reviewed: the fixes since the last push of an active pull request, or one round of fixes for the user's own comments in this chat. Code outside the delta was reviewed before, so it is not reviewed again.

1. **Find the base.** On a follow-up push, it is `origin/<branch>`, so the delta also includes local commits that were not pushed yet. For a round of fixes in this chat, it is the review snapshot taken before the fixes (*Wait For The Decision*).
2. **Show the delta.** Run `git add -N <files>` on new untracked files, then `git diff <base> --stat` and `git diff <base>`. If the delta is empty, there is nothing to review: say so and continue.
3. **Collect what the delta answers.** On a follow-up push, read the pull request's comment threads with `repo_pull_request_thread` (the active ones, and the ones closed since the last push) and copy each comment with its file and line. For a round in this chat, copy the user's comments and the findings they chose to fix. Also copy the work item's acceptance criteria (`Valmis, kun`) and `Toteutusohje`, as context only.
4. **Run one review subagent** (`Agent`, `subagent_type: general-purpose`, in the background). Pick its `model` and `effort` from the size of the delta, not of the work item, with the table in *Run The Review*: a delta of a few files is XS or S (`sonnet`, `medium`). Paste the base and the diff commands into the prompt, and tell it to:
   - Review only the lines in the delta. Read the surrounding code only to judge them, and report a problem in unchanged code only when the delta causes it.
   - Check that each change does what the comment or finding it answers asked, and changes nothing else.
   - Apply the same rules as *Run The Review*: the `code-review-and-quality` axes, the MyCV rules of `CLAUDE.md`, the Sonar note, the categories and format of *Report The Findings*, and no file edits.
5. **Do not run the `code-review` skill** in a delta review. Its targets cover a whole branch or a whole uncommitted diff, not a delta from a base of your choice, so it would review the whole pull request again.
6. **Check the UI part** if the delta changes what the user sees: a browser subagent checks only the views that the delta touches (*Browser subagent* in [checks.md](checks.md)).

Then continue with *Report The Findings* and *Wait For The Decision* as after a full review, and wait for both subagents' completion notices first.

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

Always stop here, after every review, full or delta, even with no findings, and end the message with two questions in Finnish:

1. **Which findings to fix**, when there are Must, Should or Could fix findings. Numbers ("fix 1 and 3, leave the rest"), "all" and "none" are all valid answers.
2. **Whether the user has their own comments on the code changes** before they are committed and pushed, for example: `Onko sinulla omia kommentteja koodimuutoksiin ennen kuin ne commitoidaan ja pusketaan? Kirjoita ne tähän, tai vastaa "ei".` The comments can point to a file and line or describe a change in words.

Do not fix anything, commit or push before the answer. If the answer leaves a Must fix finding as it is, confirm that once before continuing. If a comment is unclear or conflicts with the work item or a decision already made, ask about it before changing code.

After the answer:

1. **Take the review snapshot** at the start of every round of fixes, before changing any file. It records the reviewed state, so the next delta review sees only this round's fixes. It uses a temporary index and an unreferenced commit, so it moves no branch and leaves the real index and the working tree as they are:

   ```bash
   tmp=$(mktemp); cp "$(git rev-parse --git-path index)" "$tmp"
   GIT_INDEX_FILE="$tmp" git add -A
   tree=$(GIT_INDEX_FILE="$tmp" git write-tree); rm "$tmp"
   snapshot=$(git commit-tree "$tree" -p HEAD -m "Review snapshot")
   echo "$snapshot"
   ```

   Write the printed hash into your reply, so that it survives a compaction or a `/handoff`: it is the base of this round's delta review when the round has comments of the user's own.
2. **Fix** the chosen findings and the user's comments, and nothing else.
3. **Run the checks** of `checks.md` again for the areas the fixes touched. A UI change gets its browser check from a browser subagent, for the views the fixes touched only (*Browser subagent* in [checks.md](checks.md)).
4. **Review the fixes.**
   - When the round had comments of the user's own, run a *Delta Review* above against the snapshot, then *Report The Findings* and *Wait For The Decision* again. Repeat until the user has no more comments and picks no more findings to fix.
   - When the round fixed only review findings, re-read the fixes in `git diff` and confirm each one addresses its finding and changes nothing else. Do not run another review.
5. **Continue to the commits.** Fold the fixes into the commits they belong to instead of adding a separate "review fixes" commit. The snapshot commits are not on any branch: leave them, and never push or reference them.

## Record The Outcome

Keep the outcome for the reviewer: which findings were fixed and which were left as they are, and the user's own comments with what changed for each one (in a word or two, no personal data).

- **New pull request:** it goes in the `Koodikatselmointi` section of the reviewer comment (`pull-request.md`).
- **Follow-up push to an active pull request:** no new reviewer comment is posted, so post the outcome after the push as a new Finnish PR comment with `repo_pull_request_thread_write` (`action: create`, `status: Closed`), with the same `## Koodikatselmointi` section and a `## Huomioitavaa` section when it has something to say.

In both, a Must fix finding that the user chose to leave also goes under `Huomioitavaa`.
