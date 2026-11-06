---
name: handoff
description: 'Write the state of the current MyCV work to the work item as a Handoff comment and print a ready start message for a new chat. Use when the context limit stops the chat (context-budget hook), or when asked to hand off, continue in a new chat or save the work state.'
argument-hint: '[optional work item id]'
user-invocable: true
---

# Handoff

Moves a long task to a new chat with a small context. The context-budget hook (`.claude/hooks/context-budget.mjs`) stops the chat at the limit and tells you to run this skill. Do not commit or push in this skill, except in a cloud session (see the last paragraph).

## Steps

1. **Find the work item.** Use the id in the arguments, else the one the chat works on (the branch name `feat/US-<id>_...` or `feat/<id>_...`, or the id the user named). With none, skip step 3 and print the message without the `Implement ...` and work item lines.
2. **Collect the state** with `git branch --show-current` and `git status --short`: the branch, the uncommitted changes (file list, not diffs), what is done and what remains against the `Toteutus` steps and the `Valmis, kun` criteria, the decisions made that the work item does not record, open problems and the next step.
3. **Write the comment** in Finnish with `wit_work_item_comment_write` (`action: add`, `format: Markdown`), titled `Handoff` as its first line, with the headings `Haara`, `Commitoimattomat muutokset`, `Tehty`, `Jäljellä`, `Päätökset` and `Seuraava askel`. Keep it short and concrete: file names and facts, no narration.
4. **Print the start message** in English in its own `text` block, in the kickoff prompt form of `write-user-story` (`references/kickoff-prompt.md`): the role line, `Implement User Story <id>: <title>.` (or the Task form), a line `Read the work item in Azure DevOps and follow the Toteutusohje at the end of its description, then read its latest Handoff comment and continue from it.`, the `Branch:` line, the `Skills:` line when the chat used some, the line `When every Valmis, kun criterion holds, ship the change with /create-pull-request.` and the last line `Reply to me in Finnish, even though this prompt is in English.` Add `The changes are in the working tree of this checkout: do not discard them.` when there are uncommitted changes.
5. Tell the user, in Finnish, to open a new chat and paste the message.

In a cloud session the container and its commits are discarded, so unfinished work must leave it before the comment is written. Commit it on the feature branch (never `main`), then push the branch to the `azure` remote when the session runs in the `MyCV` environment (`.claude/skills/create-pull-request/references/cloud-session.md`), or otherwise publish the patch as steps 1–3 of `.claude/skills/create-pull-request/references/cloud-handoff.md` say. Put the pushed branch or the patch page URL in the Handoff comment and the start message.
